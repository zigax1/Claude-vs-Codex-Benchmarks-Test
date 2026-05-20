# Task 3 — Codex (GPT-5.5) — notes

- **Time:** not displayed in CLI screenshot (multi-step)
- **Attempts:** 1; Codex self-verified with its own stdio smoke test before reporting done
- **What worked:** `npx tsc --noEmit` clean. My independent `initialize` + `tools/list` handshake passed. Codex's own QA ran `get_top_stories({limit:3})`, `get_story({id:8863})`, `get_user({username:"jl"})`, plus a missing-user case that returned the expected MCP error. Three-way error categorization in `fetchJson` (network / HTTP / JSON parse). `HnItem` type is more thorough than Claude's — covers `parts`, `dead`, `deleted`, `parent`, full `HnItemType` union.
- **What broke:** nothing observed.
- **Subjective:** the best Codex output of the five tasks. Slightly longer (230 LOC vs Claude's ~140) but the extra lines are types and structured error handling, not bloat.
