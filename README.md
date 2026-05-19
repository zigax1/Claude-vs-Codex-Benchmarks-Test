# Claude Opus 4.7 vs Codex (GPT-5.5) — real-task benchmark

Five real AI-dev tasks, identical prompts, both models, transparent scoring. No marketing numbers. If Codex wins, the README says Codex wins.

![Chart](chart.png)

## Read this first

- **Quality** is graded against a fixed rubric: correctness (60%) + code quality (25%) + edge case handling (15%).
- **Cost** is computed from real token counts (`tools/count_tokens.py`) and the per-million-token rates encoded in that file. Sources are linked; rates can be updated and the report re-rendered.
- **Outputs are in the repo.** `outputs/claude/` and `outputs/codex/` contain every file each model produced, plus smoke-test logs where applicable.
- Final numbers and per-task winner are in [RESULTS.md](RESULTS.md) (or the prettier [RESULTS.html](RESULTS.html)).

## The 5 tasks

| # | Task | What's measured | Time budget |
|---|------|-----------------|-------------|
| 1 | [Build an HN scraper](prompts/task-01-scraper.md) | Real-world web automation with Playwright; output discipline; Ask HN edge case | 25 min |
| 2 | [Debug a flaky Playwright test](prompts/task-02-debug.md) | Race-condition diagnosis; correct fix; clear explanation | 20 min |
| 3 | [Write an MCP server](prompts/task-03-mcp-server.md) | Multi-file TypeScript; correct use of `@modelcontextprotocol/sdk`; stdio transport | 40 min |
| 4 | [Refactor a messy Express server](prompts/task-04-refactor.md) | Module boundaries; behavior preservation; type discipline | 30 min |
| 5 | [End-to-end agent](prompts/task-05-e2e-agent.md) | HN scrape → Readability → gpt-4o-mini summarize → markdown; graceful per-item failure | 50 min |

The exact text fed to each model lives in `prompts/`. The Task 4 input file (`prompts/task-04-input.ts`) is the deliberately-tangled Express server both models had to clean up.

## Methodology

1. The same prompt is pasted into each model — no system prompt, no tool hints, no model-specific phrasing.
2. Each output is saved verbatim under `outputs/<model>/task-NN-*/`.
3. Runnable outputs are smoke-tested (typecheck, run with the documented command, basic sanity check on the result). The same depth of test is applied to both sides.
4. Scores are assigned per the rubric. Notes capture *why* — not just the number.
5. Token counts come from `tools/count_tokens.py`. Costs use the rates at the top of that file (TODO: verify against current published Anthropic and OpenAI pricing before publishing).
6. `chart.py` and `tools/render_report.py` produce the chart, MD, and HTML from `results.json`.

## Reproduce

```bash
# 1. Install
pip install tiktoken matplotlib
cd outputs/claude/task-01-scraper && npm install && npx playwright install chromium
cd ../task-03-mcp && npm install
cd ../task-04-refactor && npm install
cd ../task-05-agent && npm install
cd ../../..

# 2. Run a task with each model (same prompt, no extras). Save outputs.

# 3. Count tokens and compute cost
python tools/count_tokens.py \
  prompts/task-01-scraper.md \
  outputs/claude/task-01-scraper/scraper.js \
  claude-opus-4-7

# 4. Score in results.json (correctness, code_quality, edge_cases, cost_usd, time_min, notes)

# 5. Generate chart and report
python chart.py
python tools/render_report.py
```

## File layout

```
claude-vs-codex-benchmark/
  README.md            # this file
  RESULTS.md           # generated, per-task breakdown
  RESULTS.html         # generated, single-file dark-themed view
  chart.png            # generated, chart from results.json
  chart.py             # matplotlib chart generator
  results.json         # source of truth — scores, costs, notes
  prompts/             # one .md per task + the Task 4 input file
  outputs/
    claude/            # everything Claude produced
    codex/             # everything Codex produced
  tools/
    count_tokens.py    # tokenize + price
    render_report.py   # RESULTS.md + RESULTS.html
    sample_results.json # for testing chart and renderer
```

## What this is not

- Not a leaderboard. Two models, five tasks, one run each. Real but narrow.
- Not a "vibe check." Every score has a written justification in RESULTS.
- Not an Anthropic or OpenAI marketing artifact. The numbers say what they say.

## License

MIT.
