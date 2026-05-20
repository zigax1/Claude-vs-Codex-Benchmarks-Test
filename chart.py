#!/usr/bin/env python3
"""Generate chart.png from results.json — mirrors the X-post styling."""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).parent
RESULTS_PATH = ROOT / "results.json"
OUT_PATH = ROOT / "chart.png"

CLAUDE_COLOR = "#DA7756"
CODEX_COLOR = "#10A37F"
BG = "#0F0F14"
TEXT = "#E6E6E6"
DIM = "#8A8A8A"
GRID = "#23232A"


def quality(scores: dict) -> float:
    return scores["correctness"] * 0.6 + scores["code_quality"] * 0.25 + scores["edge_cases"] * 0.15


def short_name(name: str) -> str:
    return name.replace(" ", "\n", 1)


def main() -> None:
    data = json.loads(RESULTS_PATH.read_text())
    tasks = data["tasks"]
    if not tasks:
        print("results.json has no tasks yet; skipping chart")
        return

    names = [short_name(t["name"]) for t in tasks]
    claude_q = [quality(t["claude"]) for t in tasks]
    codex_q = [quality(t["codex"]) for t in tasks]

    claude_total = sum(t["claude"]["cost_usd"] for t in tasks)
    codex_total = sum(t["codex"]["cost_usd"] for t in tasks)

    claude_wins = [t["name"] for t in tasks if quality(t["claude"]) > quality(t["codex"])]
    codex_wins = [t["name"] for t in tasks if quality(t["codex"]) > quality(t["claude"])]
    ties = [t["name"] for t in tasks if quality(t["claude"]) == quality(t["codex"])]

    cheaper, expensive = (codex_total, claude_total) if codex_total < claude_total else (claude_total, codex_total)
    cheaper_label = "Codex" if codex_total < claude_total else "Claude"
    pct_diff = (expensive - cheaper) / expensive * 100 if expensive > 0 else 0

    plt.rcParams.update({
        "font.family": ["Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans", "sans-serif"],
        "axes.facecolor": BG,
        "figure.facecolor": BG,
        "savefig.facecolor": BG,
        "text.color": TEXT,
        "axes.labelcolor": TEXT,
        "xtick.color": TEXT,
        "ytick.color": TEXT,
    })

    fig = plt.figure(figsize=(16, 9))
    ax = fig.add_axes([0.05, 0.13, 0.66, 0.70])
    panel = fig.add_axes([0.74, 0.05, 0.24, 0.88])
    panel.set_axis_off()

    x = np.arange(len(names))
    w = 0.36
    bars1 = ax.bar(x - w / 2, claude_q, w, color=CLAUDE_COLOR, label="Claude Opus 4.7")
    bars2 = ax.bar(x + w / 2, codex_q, w, color=CODEX_COLOR, label="Codex (GPT-5.5)")

    for b in list(bars1) + list(bars2):
        ax.text(
            b.get_x() + b.get_width() / 2,
            b.get_height() + 0.12,
            f"{b.get_height():.1f}",
            ha="center", va="bottom",
            color=TEXT, fontsize=12, fontweight="bold",
        )

    ax.set_ylim(0, 10.5)
    ax.set_xticks(x)
    ax.set_xticklabels(names, fontsize=11)
    ax.set_ylabel("Quality score  (correctness + code quality + edge cases)", color=DIM, fontsize=10)
    ax.grid(axis="y", color=GRID, linestyle="--", linewidth=0.6)
    ax.set_axisbelow(True)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(left=False, bottom=False)

    leg = ax.legend(loc="upper left", frameon=False, fontsize=12, handlelength=1.6)
    for text in leg.get_texts():
        text.set_color(TEXT)

    fig.text(0.05, 0.93, "Claude Opus 4.7  vs  Codex (GPT-5.5)",
             color=TEXT, fontsize=24, fontweight="bold")
    fig.text(
        0.05, 0.89,
        f"{len(tasks)} real tasks · {data['meta']['runs_per_task']} run(s) each · same prompts · {data['meta']['date'][:7]}",
        color=DIM, fontsize=12,
    )

    panel.text(0, 0.96, "TOTAL COST", color=DIM, fontsize=11, fontweight="bold")
    panel.text(0, 0.88, f"${claude_total:.2f}", color=CLAUDE_COLOR, fontsize=36, fontweight="bold")
    panel.text(0, 0.83, f"Claude  ({len(tasks)} tasks)", color=DIM, fontsize=11)
    panel.text(0, 0.74, f"${codex_total:.2f}", color=CODEX_COLOR, fontsize=36, fontweight="bold")
    panel.text(0, 0.69, f"Codex  ({len(tasks)} tasks)", color=DIM, fontsize=11)
    if pct_diff > 0.5:
        panel.text(0, 0.60, f"{cheaper_label} was {pct_diff:.0f}% cheaper",
                   color=TEXT, fontsize=13, fontweight="bold")
    else:
        panel.text(0, 0.60, "Costs were within 1%", color=TEXT, fontsize=13, fontweight="bold")

    def fmt_wins(names: list[str]) -> str:
        return "\n".join(n.lower() for n in names)

    panel.text(0, 0.46, "WINS  (quality)", color=DIM, fontsize=11, fontweight="bold")
    panel.text(0, 0.36, f"{len(claude_wins)}", color=CLAUDE_COLOR, fontsize=36, fontweight="bold")
    panel.text(0.13, 0.39, "Claude", color=TEXT, fontsize=13, fontweight="bold")
    if claude_wins:
        panel.text(0.13, 0.34, fmt_wins(claude_wins), color=DIM, fontsize=9.5, va="top")
    panel.text(0, 0.18, f"{len(codex_wins)}", color=CODEX_COLOR, fontsize=36, fontweight="bold")
    panel.text(0.13, 0.21, "Codex", color=TEXT, fontsize=13, fontweight="bold")
    if codex_wins:
        panel.text(0.13, 0.16, fmt_wins(codex_wins), color=DIM, fontsize=9.5, va="top")
    if ties:
        panel.text(0, 0.04, f"Ties: {len(ties)}", color=DIM, fontsize=11)
        panel.text(0.13, 0.04, " · ".join(ties).lower(), color=DIM, fontsize=10)

    fig.text(
        0.05, 0.045,
        f"Method · Each task run {data['meta']['runs_per_task']}× on each model with identical prompts. "
        "Quality score = correctness (60%) + code quality (25%) + edge case handling (15%).",
        color=DIM, fontsize=10, style="italic",
    )
    fig.text(0.05, 0.018, "Raw results & repo → github.com/zigax1/Claude-vs-Codex-Benchmarks-Test",
             color=CLAUDE_COLOR, fontsize=10)

    fig.savefig(OUT_PATH, dpi=120)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
