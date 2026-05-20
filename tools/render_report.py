#!/usr/bin/env python3
"""Render RESULTS.md and RESULTS.html from results.json.

Both files live at the repo root. HTML is single-file with embedded CSS,
no external dependencies — open it in any browser, drop it into GitHub
Pages, or hand it to another agent.
"""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_PATH = ROOT / "results.json"
MD_PATH = ROOT / "RESULTS.md"
HTML_PATH = ROOT / "RESULTS.html"


def quality(scores: dict) -> float:
    return scores["correctness"] * 0.6 + scores["code_quality"] * 0.25 + scores["edge_cases"] * 0.15


def fmt_money(x: float) -> str:
    return f"${x:.4f}" if x < 0.01 else f"${x:.2f}"


def winner(task: dict) -> str:
    cq = quality(task["claude"])
    gq = quality(task["codex"])
    if abs(cq - gq) < 1e-9:
        return "tie"
    return "claude" if cq > gq else "codex"


def render_markdown(data: dict) -> str:
    tasks = data["tasks"]
    meta = data["meta"]
    if not tasks:
        return "# Results\n\n_results.json is empty — no tasks scored yet._\n"

    claude_total = sum(t["claude"]["cost_usd"] for t in tasks)
    codex_total = sum(t["codex"]["cost_usd"] for t in tasks)
    claude_wins = sum(1 for t in tasks if winner(t) == "claude")
    codex_wins = sum(1 for t in tasks if winner(t) == "codex")
    ties = sum(1 for t in tasks if winner(t) == "tie")

    cheaper, expensive = (codex_total, claude_total) if codex_total < claude_total else (claude_total, codex_total)
    cheaper_label = "Codex" if codex_total < claude_total else "Claude"
    pct = (expensive - cheaper) / expensive * 100 if expensive > 0 else 0

    cheaper_pct_int = round(pct)
    lines = []
    lines.append(f"# Results")
    lines.append("")
    lines.append(f"> **{meta['claude_model']}** vs **{meta['codex_model']}** — {len(tasks)} modern agentic-dev tasks, {meta['runs_per_task']} run per model, same prompts both sides.")
    lines.append(f"> Run {meta['date']} by {meta['runner']}.")
    lines.append("")
    lines.append("![Chart](chart.png)")
    lines.append("")
    lines.append("## Headline")
    lines.append("")
    lines.append("| | Claude Opus 4.7 | Codex (GPT-5.5) |")
    lines.append("|---|:---:|:---:|")
    lines.append(f"| **Quality wins** | **{claude_wins}** / {len(tasks)} | {codex_wins} / {len(tasks)}" + (f" ({ties} tie)" if ties else "") + " |")
    lines.append(f"| **Total cost** | {fmt_money(claude_total)} | **{fmt_money(codex_total)}** |")
    claude_won_names = ", ".join(t["name"] for t in tasks if winner(t) == "claude") or "—"
    codex_won_names  = ", ".join(t["name"] for t in tasks if winner(t) == "codex")  or "—"
    lines.append(f"| **Tasks won** | {claude_won_names} | {codex_won_names} |")
    lines.append("")
    lines.append(f"_{cheaper_label} was **{cheaper_pct_int}% cheaper** on these deliverables._")
    lines.append("")
    lines.append("## Per-task scoreboard")
    lines.append("")
    lines.append("| # | Task | Claude | Codex | Winner | Claude $ | Codex $ |")
    lines.append("|:-:|------|:------:|:-----:|:------:|---------:|--------:|")
    for t in tasks:
        cq = quality(t["claude"])
        gq = quality(t["codex"])
        w = winner(t)
        w_emoji = {"claude": "Claude", "codex": "Codex", "tie": "Tie"}[w]
        lines.append(
            f"| {t['id']} | {t['name']} | {cq:.2f} | {gq:.2f} | **{w_emoji}** | {fmt_money(t['claude']['cost_usd'])} | {fmt_money(t['codex']['cost_usd'])} |"
        )
    lines.append("")
    lines.append("## Per-task detail")
    lines.append("")
    for t in tasks:
        cq = quality(t["claude"])
        gq = quality(t["codex"])
        w = winner(t)
        w_str = {"claude": "Claude wins", "codex": "Codex wins", "tie": "Tie"}[w]
        lines.append(f"### Task {t['id']} — {t['name']}  ·  _{w_str}_")
        lines.append("")
        lines.append("| Model | Correctness · 60% | Code quality · 25% | Edge cases · 15% | **Quality** | Cost | Tokens (in / out) |")
        lines.append("|-------|:-----------------:|:------------------:|:----------------:|:-----------:|-----:|:-----------------:|")
        for label, side in (("Claude", t["claude"]), ("Codex", t["codex"])):
            tok = side.get("tokens", {})
            tok_str = f"{tok.get('input_tokens', '?')} / {tok.get('output_tokens', '?')}" if tok else "—"
            lines.append(
                f"| **{label}** | {side['correctness']} | {side['code_quality']} | {side['edge_cases']} | "
                f"**{quality(side):.2f}** | {fmt_money(side['cost_usd'])} | {tok_str} |"
            )
        lines.append("")
        if t["claude"].get("notes"):
            lines.append(f"> **Claude — observations.** {t['claude']['notes']}")
            lines.append("")
        if t["codex"].get("notes"):
            lines.append(f"> **Codex — observations.** {t['codex']['notes']}")
            lines.append("")

    lines.append("## Pricing assumptions")
    lines.append("")
    lines.append("- **Claude Opus 4.7:** $5 input / $25 output per MTok — verified against <https://platform.claude.com/docs/en/about-claude/pricing>.")
    lines.append("- **GPT-5.5:** $1.25 input / $10 output per MTok — placeholder using the GPT-5 family rate (OpenAI pricing page blocks automated fetch). Verify against your Codex dashboard.")
    lines.append("")
    lines.append("Token counts use `tiktoken` (`o200k_base`) for both models, with a 1.35× correction on Claude per Anthropic's documented Opus 4.7 tokenizer drift. Costs reflect input prompts + final code artifacts only — NOT reasoning tokens or tool-call overhead.")
    lines.append("")
    lines.append("## Reproduce")
    lines.append("")
    lines.append("```bash")
    lines.append("# After editing results.json or pricing constants in tools/count_tokens.py:")
    lines.append("python tools/build_report.py    # validates, regenerates chart.png + RESULTS.md + RESULTS.html")
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


HTML_TMPL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  :root {{
    --bg: #0F0F14;
    --bg-card: #16161D;
    --bg-card-2: #1C1C25;
    --border: #2A2A33;
    --text: #E6E6E6;
    --dim: #8A8A8A;
    --claude: #DA7756;
    --codex: #10A37F;
    --tie: #9A8FB8;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: var(--bg); color: var(--text); }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    padding: 0 24px 80px;
  }}
  .wrap {{ max-width: 1080px; margin: 0 auto; }}
  header {{ padding: 48px 0 24px; }}
  h1 {{ font-size: 32px; margin: 0 0 6px; letter-spacing: -0.01em; font-weight: 700; }}
  h2 {{ font-size: 22px; margin: 40px 0 14px; letter-spacing: -0.01em; }}
  h3 {{ font-size: 17px; margin: 28px 0 10px; }}
  .sub {{ color: var(--dim); font-size: 14px; }}
  .chart {{ margin: 18px 0 8px; }}
  .chart img {{ width: 100%; border: 1px solid var(--border); border-radius: 12px; display: block; }}
  .headline {{
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    margin: 12px 0 4px;
  }}
  .stat {{
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
    padding: 18px 20px;
  }}
  .stat .label {{ color: var(--dim); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }}
  .stat .value {{ font-size: 28px; font-weight: 700; margin-top: 4px; }}
  .stat .sub {{ margin-top: 6px; font-size: 13px; }}
  .claude {{ color: var(--claude); }}
  .codex {{ color: var(--codex); }}
  .tie {{ color: var(--tie); }}
  table {{
    width: 100%; border-collapse: collapse; margin: 8px 0 6px;
    background: var(--bg-card); border-radius: 10px; overflow: hidden;
    border: 1px solid var(--border);
    font-size: 14px;
  }}
  th, td {{ padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }}
  thead th {{ background: var(--bg-card-2); color: var(--dim); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }}
  tbody tr:last-child td {{ border-bottom: none; }}
  td.num, th.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .task {{
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
    padding: 18px 22px; margin: 12px 0;
  }}
  .task header {{ padding: 0; margin: 0 0 10px; display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }}
  .task h3 {{ margin: 0; }}
  .badge {{ font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }}
  .badge.claude {{ background: rgba(218,119,86,0.12); color: var(--claude); }}
  .badge.codex {{ background: rgba(16,163,127,0.12); color: var(--codex); }}
  .badge.tie {{ background: rgba(154,143,184,0.12); color: var(--tie); }}
  .notes {{ font-size: 14px; color: var(--text); margin-top: 8px; }}
  .notes b {{ color: var(--dim); font-weight: 600; }}
  a {{ color: var(--claude); }}
  code, pre {{ font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 13px; }}
  pre {{ background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; overflow-x: auto; }}
  footer {{ color: var(--dim); font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }}
  .empty {{
    background: var(--bg-card); border: 1px dashed var(--border); border-radius: 12px;
    padding: 32px; text-align: center; color: var(--dim);
  }}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>{title}</h1>
  <div class="sub">{subtitle}</div>
</header>
{body}
<footer>
  Generated by <code>tools/render_report.py</code> from <code>results.json</code>.
  Recompute by editing pricing constants in <code>tools/count_tokens.py</code> and re-running the renderer.
</footer>
</div>
</body>
</html>
"""


def render_html(data: dict) -> str:
    tasks = data["tasks"]
    meta = data["meta"]
    title = f"{meta['claude_model']} vs {meta['codex_model']}"
    subtitle = f"{len(tasks)} modern agentic-dev tasks · {meta['runs_per_task']} run(s) each · same prompts · {meta['date']} · {meta['runner']}"

    if not tasks:
        body = '<div class="empty">No tasks scored yet. Once Codex outputs are in and graded, <code>results.json</code> will populate and this page will render.</div>'
        return HTML_TMPL.format(title=html.escape(title), subtitle=html.escape(subtitle), body=body)

    claude_total = sum(t["claude"]["cost_usd"] for t in tasks)
    codex_total = sum(t["codex"]["cost_usd"] for t in tasks)
    claude_wins = sum(1 for t in tasks if winner(t) == "claude")
    codex_wins = sum(1 for t in tasks if winner(t) == "codex")
    ties = sum(1 for t in tasks if winner(t) == "tie")

    cheaper, expensive = (codex_total, claude_total) if codex_total < claude_total else (claude_total, codex_total)
    cheaper_label = "Codex" if codex_total < claude_total else "Claude"
    pct = (expensive - cheaper) / expensive * 100 if expensive > 0 else 0

    parts = []
    parts.append('<div class="chart"><img src="chart.png" alt="Quality and cost comparison"></div>')

    tie_text = f' · Ties <b>{ties}</b>' if ties else ''
    parts.append(f'''<div class="headline">
      <div class="stat">
        <div class="label">Quality wins</div>
        <div class="value"><span class="claude">{claude_wins}</span> &nbsp;·&nbsp; <span class="codex">{codex_wins}</span></div>
        <div class="sub">Claude · Codex{tie_text}</div>
      </div>
      <div class="stat">
        <div class="label">Total cost</div>
        <div class="value"><span class="claude">{fmt_money(claude_total)}</span> &nbsp;·&nbsp; <span class="codex">{fmt_money(codex_total)}</span></div>
        <div class="sub">{cheaper_label} was <b>{pct:.0f}% cheaper</b></div>
      </div>
    </div>''')

    parts.append('<h2>Per-task scores</h2>')
    parts.append('<table><thead><tr>'
                 '<th class="num">#</th><th>Task</th>'
                 '<th class="num">Claude</th><th class="num">Codex</th>'
                 '<th class="num">Claude cost</th><th class="num">Codex cost</th>'
                 '<th>Winner</th></tr></thead><tbody>')
    for t in tasks:
        w = winner(t)
        w_label = {"claude": "Claude", "codex": "Codex", "tie": "Tie"}[w]
        parts.append(f'<tr>'
                     f'<td class="num">{t["id"]}</td>'
                     f'<td>{html.escape(t["name"])}</td>'
                     f'<td class="num">{quality(t["claude"]):.2f}</td>'
                     f'<td class="num">{quality(t["codex"]):.2f}</td>'
                     f'<td class="num">{fmt_money(t["claude"]["cost_usd"])}</td>'
                     f'<td class="num">{fmt_money(t["codex"]["cost_usd"])}</td>'
                     f'<td><span class="badge {w}">{w_label}</span></td>'
                     f'</tr>')
    parts.append('</tbody></table>')

    parts.append('<h2>Per-task detail</h2>')
    for t in tasks:
        w = winner(t)
        w_label = {"claude": "Claude wins", "codex": "Codex wins", "tie": "Tie"}[w]
        parts.append(f'<div class="task"><header><h3>Task {t["id"]} — {html.escape(t["name"])}</h3>'
                     f'<span class="badge {w}">{w_label}</span></header>')
        parts.append('<table><thead><tr>'
                     '<th>Model</th>'
                     '<th class="num">Correctness</th><th class="num">Code quality</th><th class="num">Edge cases</th>'
                     '<th class="num">Quality</th><th class="num">Cost</th><th class="num">Time</th>'
                     '<th>Tokens (in/out)</th></tr></thead><tbody>')
        for label, klass, side in (("Claude", "claude", t["claude"]), ("Codex", "codex", t["codex"])):
            tok = side.get("tokens", {})
            tok_str = f"{tok.get('input_tokens', '?')} / {tok.get('output_tokens', '?')}" if tok else "—"
            parts.append(f'<tr><td><b class="{klass}">{label}</b></td>'
                         f'<td class="num">{side["correctness"]}</td>'
                         f'<td class="num">{side["code_quality"]}</td>'
                         f'<td class="num">{side["edge_cases"]}</td>'
                         f'<td class="num">{quality(side):.2f}</td>'
                         f'<td class="num">{fmt_money(side["cost_usd"])}</td>'
                         f'<td class="num">{side.get("time_min", "—")}</td>'
                         f'<td>{tok_str}</td></tr>')
        parts.append('</tbody></table>')
        for label, klass, side in (("Claude", "claude", t["claude"]), ("Codex", "codex", t["codex"])):
            if side.get("notes"):
                parts.append(f'<div class="notes"><b class="{klass}">{label}:</b> {html.escape(side["notes"])}</div>')
        parts.append('</div>')

    parts.append('<h2>Pricing assumptions</h2>')
    parts.append('<p>Token counts come from <code>tools/count_tokens.py</code>. Costs use the per-million-token rates set at the top of that file. Verify against the current published rates:</p>')
    parts.append('<ul><li><a href="https://www.anthropic.com/pricing">anthropic.com/pricing</a></li>'
                 '<li><a href="https://openai.com/api/pricing">openai.com/api/pricing</a></li></ul>')

    parts.append('<h2>Reproduce</h2>')
    parts.append('<pre>'
                 '# Paste the same prompts into Claude and Codex; save outputs under outputs/{claude,codex}/\n'
                 'python tools/count_tokens.py prompts/task-01-scraper.md outputs/claude/task-01-scraper/scraper.js claude-opus-4-7\n'
                 'python chart.py\n'
                 'python tools/render_report.py'
                 '</pre>')

    return HTML_TMPL.format(title=html.escape(title), subtitle=html.escape(subtitle), body="\n".join(parts))


def main() -> None:
    data = json.loads(RESULTS_PATH.read_text())
    MD_PATH.write_text(render_markdown(data))
    HTML_PATH.write_text(render_html(data))
    print(f"wrote {MD_PATH} ({MD_PATH.stat().st_size} bytes)")
    print(f"wrote {HTML_PATH} ({HTML_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
