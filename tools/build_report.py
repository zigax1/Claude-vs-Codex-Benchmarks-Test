#!/usr/bin/env python3
"""One-shot build: validate results.json, regenerate chart.png, RESULTS.md, RESULTS.html."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FIELDS = {"correctness", "code_quality", "edge_cases", "cost_usd"}


def validate(data: dict) -> list[str]:
    issues: list[str] = []
    if not data.get("tasks"):
        return ["results.json has no tasks yet"]
    seen_ids = set()
    for i, t in enumerate(data["tasks"]):
        for key in ("id", "name", "claude", "codex"):
            if key not in t:
                issues.append(f"task[{i}] missing '{key}'")
        if t.get("id") in seen_ids:
            issues.append(f"duplicate task id {t['id']}")
        seen_ids.add(t.get("id"))
        for side in ("claude", "codex"):
            if side not in t:
                continue
            missing = REQUIRED_FIELDS - set(t[side])
            if missing:
                issues.append(f"task {t.get('id', i)} {side} missing fields: {sorted(missing)}")
            for f in ("correctness", "code_quality", "edge_cases"):
                if f in t[side] and not (0 <= t[side][f] <= 10):
                    issues.append(f"task {t.get('id', i)} {side}.{f} out of range 0-10: {t[side][f]}")
    return issues


def run(*args: str) -> None:
    print(f"$ {' '.join(args)}", flush=True)
    r = subprocess.run(args, cwd=ROOT)
    if r.returncode != 0:
        sys.exit(r.returncode)


def main() -> None:
    data = json.loads((ROOT / "results.json").read_text())
    issues = validate(data)
    if issues:
        print("results.json validation issues:", flush=True)
        for s in issues:
            print(f"  - {s}", flush=True)
        if not data.get("tasks"):
            print("(rendering empty-state placeholders anyway)", flush=True)
        else:
            sys.exit(1)
    run(sys.executable, str(ROOT / "chart.py"))
    run(sys.executable, str(ROOT / "tools" / "render_report.py"))
    print("done", flush=True)


if __name__ == "__main__":
    main()
