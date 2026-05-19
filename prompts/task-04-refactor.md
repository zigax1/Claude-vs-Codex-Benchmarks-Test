# Task 4 — Refactor a messy TypeScript Express server

**Time budget:** ~30 min

## Prompt (paste verbatim into both Claude and Codex)

Refactor the following Express server file into a clean modular structure. Split into: `routes/`, `services/`, `middleware/`, `db/`, `types/`. Don't change behavior. Don't add new features. Just clean structure, proper TypeScript types, and good separation of concerns. Output every file with its path.

> Input file: `prompts/task-04-input.ts` (paste the full contents of that file inline)

## Pass criteria

- Behavior preserved (same routes, same responses, same status codes)
- Reasonable module boundaries (auth in middleware, db queries in db/, business logic in services/)
- No `any` types where avoidable
- Imports/exports clean
- Files small (<100 lines each)
