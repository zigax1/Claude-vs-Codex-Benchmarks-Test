#!/usr/bin/env python3
"""For each task, tally the input prompt tokens and the total output tokens
(across every file each model wrote) and compute USD cost per side.

Output is JSON to stdout, suitable for pasting into results.json[].claude/codex
under the "tokens" and "cost_usd" fields.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import tiktoken

ROOT = Path(__file__).resolve().parent.parent

ENC = tiktoken.get_encoding("o200k_base")

CLAUDE_TOKEN_CORRECTION = 1.35

PRICING = {
    "claude-opus-4-7": {"input_per_mtok": 5.00,  "output_per_mtok": 25.00},
    "gpt-5.5":         {"input_per_mtok": 1.25,  "output_per_mtok": 10.00},
}

# (prompt_files, output_dir) per task.
# Task 4 has TWO prompt inputs: the instruction and the messy file.
TASKS = [
    (1, "Build HN scraper",   ["prompts/task-01-scraper.md"],                                        "task-01-scraper"),
    (2, "Debug flaky test",   ["prompts/task-02-debug.md"],                                          "task-02-debug"),
    (3, "Write MCP server",   ["prompts/task-03-mcp-server.md"],                                     "task-03-mcp"),
    (4, "Refactor TS module", ["prompts/task-04-refactor.md", "prompts/task-04-input.ts"],           "task-04-refactor"),
    (5, "E2E agent",          ["prompts/task-05-e2e-agent.md"],                                      "task-05-agent"),
]

# Files we skip when totaling output tokens — these are not "code Codex/Claude wrote",
# they are runtime/install artifacts, verification logs, or captured sample outputs.
SKIP_NAMES = {"package-lock.json", "output-sample.json", "smoke-output.jsonl", "smoke-output.log"}
SKIP_DIRS = {"node_modules", "dist", "_verification"}
SKIP_SUFFIXES = {".log", ".jsonl"}


def collect_output_files(out_dir: Path) -> list[Path]:
    files: list[Path] = []
    for p in out_dir.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.name in SKIP_NAMES:
            continue
        if p.suffix in SKIP_SUFFIXES:
            continue
        files.append(p)
    return sorted(files)


def count_text(text: str, model: str) -> int:
    raw = len(ENC.encode(text))
    return round(raw * CLAUDE_TOKEN_CORRECTION) if model.startswith("claude") else raw


def cost(in_tok: int, out_tok: int, model: str) -> float:
    rates = PRICING[model]
    return (in_tok * rates["input_per_mtok"] + out_tok * rates["output_per_mtok"]) / 1_000_000


def main() -> None:
    results = []
    for task_id, task_name, prompt_files, out_dirname in TASKS:
        prompt_text = "\n\n".join((ROOT / p).read_text() for p in prompt_files)

        per_task = {"id": task_id, "name": task_name, "prompt_files": prompt_files, "models": {}}

        for side, model_id, side_dirname in (("claude", "claude-opus-4-7", "claude"), ("codex", "gpt-5.5", "codex")):
            out_dir = ROOT / "outputs" / side_dirname / out_dirname
            if not out_dir.exists():
                per_task["models"][side] = {"error": f"missing: {out_dir.relative_to(ROOT)}"}
                continue
            files = collect_output_files(out_dir)
            output_text = "\n\n".join(f.read_text(errors="replace") for f in files)
            in_tok = count_text(prompt_text, model_id)
            out_tok = count_text(output_text, model_id)
            per_task["models"][side] = {
                "model": model_id,
                "input_tokens": in_tok,
                "output_tokens": out_tok,
                "cost_usd": round(cost(in_tok, out_tok, model_id), 4),
                "output_files": [str(f.relative_to(ROOT)) for f in files],
            }

        results.append(per_task)

    json.dump(results, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
