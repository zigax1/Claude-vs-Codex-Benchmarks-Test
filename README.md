# Claude Opus 4.7 vs Codex (GPT-5.5)

> 5 modern agentic-dev tasks. Same prompts both sides. Fixed rubric. Every output public so anyone can diff for themselves.

![Chart](chart.png)

## The surprise

**Codex narrowly beat Claude Opus 4.7 at writing an MCP server — on Anthropic's own protocol.** That was Codex's only win in the benchmark, but it's the one I didn't see coming. The numbers and the side-by-side code are in [`outputs/claude/task-03-mcp/`](outputs/claude/task-03-mcp/) and [`outputs/codex/task-03-mcp/`](outputs/codex/task-03-mcp/) — judge for yourself. Both servers pass the stdio handshake and `tools/list`; Codex's edge is in type definitions and three-way error categorization (network / HTTP / JSON parse) in the fetch helper.

## TL;DR

| | Claude Opus 4.7 | Codex (GPT-5.5) |
|---|:---:|:---:|
| Quality wins | **4 / 5** | 1 / 5 |
| Total spend | $0.30 | **$0.08** |
| Tasks won | scraper · debug · refactor · e2e agent | **mcp server** |

Claude won 4 of 5 on quality; Codex was 73% cheaper. The repo is the proof — every file each model wrote is in [`outputs/`](outputs/), every score has written justification in [RESULTS.md](RESULTS.md), every smoke test is reproducible.

The most embarrassing single finding (for Codex): **it hallucinated a Playwright matcher** on the debug task — `toHaveCountGreaterThan(0)`, which does not exist in the library. The fix would throw at runtime. See [`outputs/codex/task-02-debug/fixed-test.ts`](outputs/codex/task-02-debug/fixed-test.ts) and the side-by-side with Claude's working fix.

## The 5 tasks

Each task picks a concrete chunk of agentic-dev work that a human engineer would actually ship.

| # | Task | What it measures | Time budget |
|---|------|------------------|:-----------:|
| 1 | [HN scraper](prompts/task-01-scraper.md) | Web automation with Playwright; output discipline; Ask HN edge case | 25 min |
| 2 | [Flaky test debug](prompts/task-02-debug.md) | Race-condition diagnosis; correct fix; technically right explanation | 20 min |
| 3 | [MCP server](prompts/task-03-mcp-server.md) | Multi-file TypeScript; `@modelcontextprotocol/sdk` over stdio; tool schemas | 40 min |
| 4 | [Express refactor](prompts/task-04-refactor.md) | Module boundaries; type discipline; behavior preservation | 30 min |
| 5 | [End-to-end agent](prompts/task-05-e2e-agent.md) | HN → Readability → gpt-4o-mini summarize → markdown; graceful failure | 50 min |

The exact text fed to each model is in [`prompts/`](prompts/). For Task 4 the messy input file ([`prompts/task-04-input.ts`](prompts/task-04-input.ts)) is the file both models had to clean up.

## Per-task headline

| # | Task | Winner | Score gap | Why |
|---|------|:------:|:---------:|-----|
| 1 | HN scraper | Claude | 8.8 vs 8.6 | Both produced 30 valid items; Claude extracts ISO timestamps, Codex's code is slightly more idiomatic. Narrow Claude edge. |
| 2 | Flaky test debug | Claude | 9.6 vs 5.1 | Codex hallucinated `toHaveCountGreaterThan` — code would throw at runtime. Claude's fix uses real matchers and works. |
| 3 | MCP server | **Codex** | 9.6 vs 9.8 | Codex's only win. Better type definitions for `HnItem`, three-way error categorization in fetch helper. |
| 4 | Express refactor | Claude | 9.4 vs 6.4 | Codex's structural split is finer (15 files vs 11), but it omits `package.json`/`tsconfig.json` and fails `tsc --noEmit` with 4 strict-mode errors. |
| 5 | End-to-end agent | Claude | 9.6 vs 8.6 | Both produce valid markdown digests with graceful per-article failure. Claude additionally suppresses jsdom CSS warnings via `VirtualConsole`; Codex floods stderr with 344KB of parse noise per run. |

Full breakdown with score components and notes: [RESULTS.md](RESULTS.md) (or the prettier [RESULTS.html](RESULTS.html)).

## Rubric

Each task is graded 0–10 on three axes:

- **Correctness — 60%.** Does it actually work?
- **Code quality — 25%.** Readable, idiomatic, no obvious smells.
- **Edge cases — 15%.** Errors, retries, malformed input, the unhappy path.

`quality = correctness * 0.6 + code_quality * 0.25 + edge_cases * 0.15`

## How costs are measured

- Token counts come from [`tools/count_tokens.py`](tools/count_tokens.py) — `tiktoken` with `o200k_base` for both models, with a 1.35× correction applied to Claude per Anthropic's documented Opus 4.7 tokenizer drift.
- Per-task tallies in [`tools/measure_costs.py`](tools/measure_costs.py) sum input prompts plus every code file each model wrote (excludes runtime artifacts, sample outputs, and verification logs).
- Rates:
  - **Claude Opus 4.7** — $5 input / $25 output per MTok ([source](https://platform.claude.com/docs/en/about-claude/pricing))
  - **GPT-5.5** — $1.25 input / $10 output per MTok (placeholder using the GPT-5 family rate; verify against your Codex dashboard)
- These costs reflect input prompts + final code artifacts only. They do NOT include reasoning tokens, multi-pass refinement, or tool-call overhead, so absolute numbers are a lower bound. Relative comparison between models is preserved.

## Reproduce

```bash
# Tooling
pip install tiktoken matplotlib

# Per-output node deps (for runtime smoke tests)
cd outputs/claude/task-01-scraper && npm install && npx playwright install chromium && cd ../../..
cd outputs/claude/task-03-mcp && npm install && cd ../../..
cd outputs/claude/task-04-refactor && npm install && cd ../../..
cd outputs/claude/task-05-agent && npm install && cd ../../..
# (mirror the four above for outputs/codex/...)

# Re-score (edit results.json), or just regenerate everything from current scores
python tools/build_report.py    # validates, regenerates chart.png + RESULTS.md + RESULTS.html
```

## What's in this repo

```
.
├── README.md            ← this file
├── RESULTS.md           ← per-task breakdown, regenerated from results.json
├── RESULTS.html         ← same, single-file dark-themed view
├── chart.png            ← regenerated from results.json
├── chart.py             ← matplotlib chart generator
├── results.json         ← source of truth — scores, costs, notes
├── prompts/             ← one .md per task plus the Task 4 input file
└── outputs/
    ├── claude/          ← every file Claude wrote, plus _notes.md per task
    │   ├── task-01-scraper/
    │   ├── task-02-debug/
    │   ├── task-03-mcp/
    │   ├── task-04-refactor/
    │   └── task-05-agent/
    └── codex/           ← every file Codex wrote, plus _notes.md per task
        ├── task-01-scraper/
        ├── task-02-debug/
        ├── task-03-mcp/
        ├── task-04-refactor/
        └── task-05-agent/
```

The `_notes.md` in each output folder records: time, attempts, what worked, what broke, and a one-sentence subjective take. They're the difference between "this looks like a benchmark" and "this *is* a benchmark."

## What this is not

- Not a leaderboard. Two models, five tasks, one run each. Real but narrow.
- Not a "vibe check." Every score has a written justification.
- Not an Anthropic or OpenAI marketing artifact. The numbers say what they say.

## License

MIT.
