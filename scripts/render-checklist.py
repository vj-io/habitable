"""Render devpost/checklist.md to public/plan/checklist.html (styled like the other plan pages).
Usage: python3 scripts/render-checklist.py   (stdlib only; handles this file's subset of Markdown)."""
import html, pathlib, re

src = pathlib.Path("devpost/checklist.md").read_text()
src = re.sub(r"^---\n.*?\n---\n", "", src, flags=re.S)

def inline(t: str) -> str:
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    return t

out, items, para = [], [], []
def flush_para():
    if para: out.append(f"<p>{inline(' '.join(para))}</p>"); para.clear()
def flush_items():
    if items:
        out.append('<ul class="items">' + "".join(items) + "</ul>"); items.clear()

cur = None
for line in src.splitlines():
    if m := re.match(r"^(#{1,3}) (.*)", line):
        flush_para(); flush_items(); n = len(m.group(1)); slug = re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")
        out.append(f'<h{n} id="{slug}">{inline(m.group(2))}</h{n}>'); continue
    if m := re.match(r"^- (\[[ x]\] )?(.*)", line):
        flush_para(); box = m.group(1)
        mark = '<span class="box done">✓</span>' if box == "[x] " else '<span class="box">&nbsp;</span>' if box else ""
        items.append(f"<li>{mark}<div>{inline(m.group(2))}"); items[-1] += "</div></li>"; cur = len(items) - 1; continue
    if line.startswith("  ") and items and cur is not None:
        items[cur] = items[cur][:-11] + f'<span class="more">{inline(line.strip())}</span></div></li>'; continue
    if not line.strip():
        flush_para(); cur = None; continue
    flush_items(); para.append(line.strip())
flush_para(); flush_items()

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Habitable — build checklist (5-build)</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=JetBrains+Mono:wght@500;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>
:root {{ --paper:#f3eee5; --paper-2:#fcf9f3; --ink:#1d1b20; --muted:#625e57; --marker:#ffcf3f; --mint:#23946a; }}
body {{ margin:0; color:var(--ink); font:16px/1.55 Archivo, system-ui, sans-serif; background:var(--paper);
  background-image:linear-gradient(rgba(29,27,32,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(29,27,32,.06) 1px,transparent 1px); background-size:28px 28px; }}
main {{ max-width:860px; margin:0 auto; padding:28px 18px 60px; }}
.top {{ font:600 .8rem/1 'JetBrains Mono', monospace; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }}
h1 {{ font-weight:800; font-size:2.4rem; letter-spacing:-.03em; margin:.4rem 0 1rem; }}
h1 span {{ background:linear-gradient(transparent 58%, var(--marker) 58%, var(--marker) 92%, transparent 92%); }}
h2 {{ font-weight:800; font-size:1.5rem; margin:2rem 0 .6rem; letter-spacing:-.02em; }}
p {{ margin:.5rem 0; }}
ul.items {{ list-style:none; padding:0; margin:0; }}
ul.items li {{ display:flex; gap:12px; background:var(--paper-2); border:2.5px solid var(--ink); border-radius:6px 3px 7px 4px; padding:12px 14px; margin:10px 0; }}
.box {{ flex:none; width:22px; height:22px; border:2.5px solid var(--ink); border-radius:4px; display:grid; place-items:center; font-weight:800; margin-top:2px; }}
.box.done {{ background:var(--marker); }}
.more {{ display:block; color:var(--muted); font-size:.92rem; margin-top:4px; }}
code {{ font:500 .85em 'JetBrains Mono', monospace; background:rgba(29,27,32,.06); padding:1px 4px; border-radius:3px; }}
a {{ color:inherit; text-decoration-thickness:2px; text-underline-offset:3px; }}
#revisions + ul.items li {{ border-color:var(--mint); }}
</style></head><body><main>
<p class="top">Habitable · 5-build checklist · rendered from <a href="https://github.com/vj-io/habitable/blob/main/devpost/checklist.md">devpost/checklist.md</a></p>
<h1><span>Build checklist</span></h1>
{chr(10).join(out)}
</main></body></html>
"""
pathlib.Path("public/plan/checklist.html").write_text(page)
print("wrote public/plan/checklist.html", len(page), "bytes")
