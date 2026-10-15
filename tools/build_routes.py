"""產生川花每個網址的頁面＋網站地圖。

為什麼要這支：網站其實只有一份 index.html，畫面靠「布幕」切換。
為了讓 /about/、/quiz/result/cactus/ 這些網址「直接打開也找得到」、Google 也收得到，
每個網址都放一份 index.html 的副本，只換掉 <head> 裡的標題、簡介和正牌網址。
打開後由 index.html 最下面的「網址管理員」照網址擺好畫面。

用法（改完 index.html 之後在專案資料夾跑）：
    python tools/build_routes.py

會更新：各網址資料夾的 index.html、404.html、sitemap.xml、tools/generated.txt（產生過的清單）
"""

from __future__ import annotations

import datetime
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://riverflower2025.com"
SOURCE = ROOT / "index.html"
MANIFEST = ROOT / "tools" / "generated.txt"


def load_routes(text: str) -> dict[str, dict]:
    block = re.search(r'<script type="application/json" id="route-meta">(.*?)</script>', text, re.S)
    if not block:
        raise SystemExit("index.html 裡找不到 #route-meta")
    # 16 種植物結果（/quiz/result/xxx/）不做成正式網址頁（小麻糬 2026-10-15）：
    # 網址照樣會變、按返回也正常，只是交給 404.html 接手，不放進網站地圖。
    return json.loads(block.group(1))


def replace_once(text: str, pattern: str, replacement: str) -> str:
    new, count = re.subn(pattern, lambda _: replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"index.html 的 <head> 找不到：{pattern}")
    return new


def page_for(text: str, path: str, meta: dict) -> str:
    title = html.escape(meta["title"], quote=True)
    desc = html.escape(meta["desc"], quote=True)
    url = SITE + path
    text = replace_once(text, r"<title>[^<]*</title>", f"<title>{title}</title>")
    text = replace_once(text, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">')
    text = replace_once(text, r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title}">')
    text = replace_once(text, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">')
    text = replace_once(text, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')
    text = replace_once(text, r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">')
    text = replace_once(text, r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{title}">')
    text = replace_once(text, r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{desc}">')
    return text


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    text = SOURCE.read_text(encoding="utf-8")
    routes = load_routes(text)

    previous = set(MANIFEST.read_text(encoding="utf-8").split()) if MANIFEST.exists() else set()
    generated = []
    for path, meta in routes.items():
        if path == "/":
            continue
        target = ROOT / path.strip("/") / "index.html"
        write(target, page_for(text, path, meta))
        generated.append(target.relative_to(ROOT).as_posix())

    # 不認得的網址（例：測驗第 3 題、預約第 2 步）由 404.html 接手，網址管理員會擺好畫面
    not_found = replace_once(text, r'<link rel="canonical" href="[^"]*">', '<meta name="robots" content="noindex">')
    write(ROOT / "404.html", not_found)

    for stale in sorted(previous - set(generated)):
        stale_path = ROOT / stale
        if stale_path.exists():
            stale_path.unlink()

    write(MANIFEST, "\n".join(sorted(generated)) + "\n")

    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url>\n    <loc>{SITE}{path}</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n" for path in routes
    )
    write(ROOT / "sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')

    print(f"產生 {len(generated)} 個網址頁、404.html、sitemap.xml（共 {len(routes)} 個網址）")


if __name__ == "__main__":
    main()
