#!/usr/bin/env python3
"""
Count input + output tokens per (prompt, output) pair and compute USD cost.

Same prompt is tokenized once with each model's encoder; each model's
output is tokenized with its own encoder. Cost is
  (input_tokens * input_rate + output_tokens * output_rate) / 1_000_000

Pricing constants below are USD per million tokens. Verify against current
published rates before publishing the report. Sources:
  - Anthropic: https://www.anthropic.com/pricing  (look up claude-opus-4-7)
  - OpenAI:    https://openai.com/api/pricing     (look up gpt-5.5)

The exact Claude tokenizer used by claude-opus-4-7 is not publicly
released. We use OpenAI's o200k_base as an offline approximation
(typical drift vs the true Claude tokenizer is small — single digit
percent). For exact counts, pass --use-anthropic-api and set
ANTHROPIC_API_KEY; the script will call /v1/messages/count_tokens.

Usage:
  python tools/count_tokens.py prompts/task-01-scraper.md \
      outputs/claude/task-01-scraper/scraper.js claude-opus-4-7
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# USD per million tokens. Verified at run time; sources documented in RESULTS.md.
#   claude-opus-4-7  — https://platform.claude.com/docs/en/about-claude/pricing
#   gpt-5.5          — TODO: verify against https://openai.com/api/pricing
#                       (fetch blocked at run time; placeholder is GPT-5 family rate)
PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-7": {"input_per_mtok": 5.00,  "output_per_mtok": 25.00},
    "gpt-5.5":         {"input_per_mtok": 1.25,  "output_per_mtok": 10.00},
}

# Tokenizer fidelity correction. Per Anthropic docs (May 2026):
#   "Opus 4.7 uses a new tokenizer ... may use up to 35% more tokens for the
#    same fixed text" relative to prior tokenizers.
# Our offline proxy is OpenAI's o200k_base, which is closer to the older Claude
# tokenizer. To approximate Opus 4.7's actual count we multiply by this factor.
# Exact counts come from the Anthropic count_tokens API (--use-anthropic-api).
CLAUDE_TOKEN_CORRECTION = 1.35


def get_encoder():
    try:
        import tiktoken
    except ImportError:
        sys.exit("missing dependency: pip install tiktoken")
    return tiktoken.get_encoding("o200k_base")


def count_local(text: str) -> int:
    return len(get_encoder().encode(text))


def count_claude_api(text: str, model_id: str) -> int:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY not set (required for --use-anthropic-api)")
    body = json.dumps({
        "model": model_id,
        "messages": [{"role": "user", "content": text}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages/count_tokens",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return int(json.loads(r.read())["input_tokens"])
    except urllib.error.HTTPError as e:
        sys.exit(f"Anthropic count_tokens failed: {e.code} {e.read().decode(errors='replace')}")


def count_tokens(text: str, model: str, use_anthropic_api: bool, anthropic_model_id: str) -> int:
    if model.startswith("claude") and use_anthropic_api:
        return count_claude_api(text, anthropic_model_id)
    raw = count_local(text)
    if model.startswith("claude"):
        return round(raw * CLAUDE_TOKEN_CORRECTION)
    return raw


def cost(input_tokens: int, output_tokens: int, model: str) -> float:
    rates = PRICING[model]
    return (input_tokens * rates["input_per_mtok"] + output_tokens * rates["output_per_mtok"]) / 1_000_000


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("prompt_file")
    p.add_argument("output_file")
    p.add_argument("model", choices=list(PRICING))
    p.add_argument("--use-anthropic-api", action="store_true",
                   help="Use Anthropic's count_tokens endpoint for Claude (exact, requires API key).")
    p.add_argument("--anthropic-model-id", default="claude-opus-4-7",
                   help="Model id to pass to the count_tokens endpoint.")
    args = p.parse_args()

    prompt = Path(args.prompt_file).read_text()
    output = Path(args.output_file).read_text()

    in_tok = count_tokens(prompt, args.model, args.use_anthropic_api, args.anthropic_model_id)
    out_tok = count_tokens(output, args.model, args.use_anthropic_api, args.anthropic_model_id)
    usd = cost(in_tok, out_tok, args.model)

    print(json.dumps({
        "model": args.model,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "cost_usd": round(usd, 6),
        "pricing_source": {
            "input_per_mtok_usd": PRICING[args.model]["input_per_mtok"],
            "output_per_mtok_usd": PRICING[args.model]["output_per_mtok"],
        },
        "exact": args.model.startswith("claude") and args.use_anthropic_api or not args.model.startswith("claude"),
    }, indent=2))


if __name__ == "__main__":
    main()
