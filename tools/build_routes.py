"""產生川花每個網址的頁面＋網站地圖。

為什麼要這支：網站其實只有一份 index.html，畫面靠「布幕」切換。
為了讓 /about/、/quiz/result/rockrose/ 這些網址「直接打開也找得到」、Google 也收得到，
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

from build_services import load_services, render_services

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://riverflower2025.com"
SOURCE = ROOT / "index.html"
MANIFEST = ROOT / "tools" / "generated.txt"
NOTES = ROOT / "content" / "notes.json"
NOTE_IDS = ["06", "07", "10", "01", "02", "03", "04", "05", "08"]
NOTE_SCHEMA_ID = "note-schema"
NOTE_CATEGORIES = ("流程自動化", "品牌內容", "AI 導入", "網站建置")
# 文末連到服務的那段話要像朋友順口提起：不催促、不推銷，也不用 AI 腔的對比句。
SERVICE_NOTE_BANNED = ("立即", "現在就", "名額", "限時", "下單", "不是", "而是", "與其", "不如", "上稿自動化")
SERVICE_TOKEN = re.compile(r"\{([a-z-]+)\}")


def unique_object(pairs: list[tuple]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"JSON 欄位重複：{key}")
        result[key] = value
    return result


def safe_json(value: object) -> str:
    # JSON 會放進 script；來源字串不能提早關閉 script 標籤。
    return (json.dumps(value, ensure_ascii=False, indent=2)
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))


def require_text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} 必須是非空白文字")
    return value


def load_notes() -> list[dict]:
    data = json.loads(NOTES.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    if not isinstance(data, dict) or set(data) != {"articles"}:
        raise ValueError("筆記資料根物件必須只有 articles")
    articles = data["articles"]
    if not isinstance(articles, list) or any(not isinstance(a, dict) for a in articles):
        raise ValueError("articles 必須是文章物件陣列")
    if [a.get("id") for a in articles] != NOTE_IDS:
        raise ValueError("文章編號與順序必須恰為 " + "、".join(NOTE_IDS))
    slugs = set()
    service_slugs = {service["slug"] for service in load_services()}
    article_fields = {"id", "slug", "title", "description", "keywords", "category", "sourceFile", "blocks",
                      "serviceNote"}
    for article in articles:
        label = f"筆記 {article['id']}"
        if set(article) != article_fields:
            raise ValueError(f"{label} 欄位缺漏或多出未知欄位")
        for key in ("slug", "title", "description", "category", "sourceFile"):
            require_text(article[key], f"{label}.{key}")
        slug = article["slug"]
        if len(slug) > 120 or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs:
            raise ValueError(f"{label} 網址代稱不安全或重複")
        slugs.add(slug)
        if article["category"] not in NOTE_CATEGORIES:
            raise ValueError(f"{label} 分類不在允許清單")
        # serviceNote：文末一段話，用 {服務代稱} 標出要連到的服務專屬頁（1～2 個）。
        service_note = require_text(article["serviceNote"], f"{label}.serviceNote")
        linked = SERVICE_TOKEN.findall(service_note)
        if not 1 <= len(linked) <= 2 or len(set(linked)) != len(linked) or not set(linked) <= service_slugs:
            raise ValueError(f"{label} serviceNote 要用 {{服務代稱}} 連到 1～2 個不同的服務")
        if "{" in SERVICE_TOKEN.sub("", service_note) or any(w in service_note for w in SERVICE_NOTE_BANNED):
            raise ValueError(f"{label} serviceNote 有多餘的大括號，或用了推銷、AI 腔字眼")
        if any(c in article["sourceFile"] for c in "/\\:") or not article["sourceFile"].endswith(".txt"):
            raise ValueError(f"{label} 來源只可記錄文字稿檔名")
        keywords = article["keywords"]
        if not isinstance(keywords, list) or not keywords:
            raise ValueError(f"{label} 關鍵字必須是非空陣列")
        for keyword in keywords:
            require_text(keyword, f"{label} 關鍵字")
        blocks = article["blocks"]
        if not isinstance(blocks, list) or not blocks:
            raise ValueError(f"{label} 必須有正文區塊")
        for block in blocks:
            if not isinstance(block, dict):
                raise ValueError(f"{label} 正文區塊必須是物件")
            kind = block.get("type")
            if kind in ("p", "h2"):
                if set(block) != {"type", "text"}:
                    raise ValueError(f"{label} {kind} 區塊欄位錯誤")
                require_text(block["text"], f"{label} {kind} 文字")
            elif kind in ("ul", "ol"):
                if set(block) != {"type", "items"} or not isinstance(block["items"], list) or not block["items"]:
                    raise ValueError(f"{label} 清單區塊格式錯誤")
                for item in block["items"]:
                    require_text(item, f"{label} 清單項目")
            elif kind == "qa":
                if set(block) != {"type", "question", "answer"}:
                    raise ValueError(f"{label} 問答區塊欄位錯誤")
                require_text(block["question"], f"{label} 問題")
                require_text(block["answer"], f"{label} 回答")
            else:
                raise ValueError(f"{label} 有未知正文區塊：{kind}")
    return articles


def note_path(article: dict) -> str:
    return f"/notes/{article['slug']}/"


def note_link(article: dict, label: str | None = None) -> str:
    title = html.escape(article["title"] if label is None else label, quote=True)
    url = html.escape("" + note_path(article), quote=True)
    return f'<a href="{url}" data-route>{title}</a>'


def render_service_note(article: dict, names: dict[str, str]) -> str:
    """把 {服務代稱} 換成服務專屬頁連結，連結文字一律用服務現行名稱。"""
    parts = SERVICE_TOKEN.split(article["serviceNote"])
    for index, part in enumerate(parts):
        if index % 2:
            parts[index] = (f'<a href="/services/{part}/" data-route>'
                            f'{html.escape(names[part], quote=True)}</a>')
        else:
            parts[index] = html.escape(part, quote=True)
    return f'<div class="note-service-link"><p>{"".join(parts)}</p></div>'


def render_filters(articles: list[dict]) -> str:
    """分類按鈕跟著文章產生：沒有文章的分類不出現，以後增減文章不必手改。"""
    present = [c for c in NOTE_CATEGORIES if any(a["category"] == c for a in articles)]
    return "\n".join(
        f'<button class="topic-tab" type="button" data-notes-filter="{html.escape(c, quote=True)}" '
        f'aria-pressed="{"true" if c == "全部" else "false"}">{html.escape(c)}</button>'
        for c in ["全部", *present])


def render_block(block: dict) -> str:
    kind = block["type"]
    if kind in ("p", "h2"):
        return f'<{kind}>{html.escape(block["text"], quote=True)}</{kind}>'
    if kind in ("ul", "ol"):
        items = "".join(f"<li>{html.escape(item, quote=True)}</li>" for item in block["items"])
        return f"<{kind}>{items}</{kind}>"
    if kind == "qa":
        question = html.escape(block["question"], quote=True)
        answer = html.escape(block["answer"], quote=True)
        return f'<dl class="note-qa"><dt>{question}</dt><dd>{answer}</dd></dl>'
    raise ValueError(f"未知正文區塊：{kind}")


def replace_marked(text: str, marker: str, content: str) -> str:
    start, end = f"<!-- {marker}:START -->", f"<!-- {marker}:END -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"首頁必須恰有一組 {marker} 標記")
    pattern = re.escape(start) + r".*?" + re.escape(end)
    rendered, count = re.subn(pattern, lambda _: start + "\n" + content + "\n" + end, text, flags=re.S)
    if count != 1:
        raise ValueError(f"{marker} 標記順序錯誤")
    return rendered


def render_notes(text: str, articles: list[dict]) -> str:
    routes = load_routes(text)
    if "/notes/" not in routes or routes["/notes/"].get("feature") != "notes":
        raise ValueError("首頁缺少既有開花筆記路由")
    # 每篇筆記各用一株既有手繪植物，維持小花尺寸。
    note_plants = ("lavender", "chamomile", "rosemary", "rose", "jasmine", "olive", "mint", "lemon", "geranium", "eucalyptus")
    names = {service["slug"]: service["name"] for service in load_services()}
    cards, pages = [], []
    for number, article in enumerate(articles):
        plant = note_plants[number % len(note_plants)]
        flower = (f'<img class="fl-icon" src="/assets/quiz-plants/{plant}.png" '
                  'alt="" aria-hidden="true" loading="lazy" width="26" height="26">')
        identity = article["id"]
        title = html.escape(article["title"], quote=True)
        description = html.escape(article["description"], quote=True)
        category = html.escape(article["category"], quote=True)
        url = html.escape("" + note_path(article), quote=True)
        cards.append(
            f'<a class="note-card" href="{url}" data-route data-note-id="{identity}" data-note-category="{category}">'
            f'{flower}<p class="note-category">{category}</p><h2 class="note-card-title">{title}</h2>'
            f'<p class="note-excerpt">{description}</p><span class="note-read">閱讀筆記 →</span></a>'
        )
        related = sorted((other for other in articles if other["id"] != identity),
                         key=lambda other: other["category"] != article["category"])[:2]
        prose = "\n".join(render_block(block) for block in article["blocks"])
        pages.append(
            f'<section class="feature-page note-article" data-feature="note-{identity}" data-note-id="{identity}" hidden>\n'
            '<div class="st-top"><a class="st-back" href="/notes/" data-route>← 回到開花筆記</a></div>\n'
            f'<header class="st-head"><h1 id="feature-note-{identity}-title" tabindex="-1">{title}</h1>'
            f'<p class="note-category">{category}</p><p class="note-deck">{description}</p></header>\n'
            f'<div class="note-prose">\n{prose}\n</div>\n'
            + render_service_note(article, names) + '\n'
            '<nav class="note-related" aria-label="相關筆記"><h2>讓想法繼續開花</h2>'
            + "".join(note_link(other) for other in related) + '</nav>\n'
            '</section>'
        )
    text = replace_marked(text, "NOTES-FILTERS", render_filters(articles))
    text = replace_marked(text, "NOTES-LIST", "\n".join(cards))
    text = replace_marked(text, "NOTE-ARTICLES", "\n".join(pages))
    # 只移除本生成器曾建立的筆記文章，不動其他頁面路由。
    routes = {path: meta for path, meta in routes.items()
              if not (path.startswith("/notes/") and meta.get("layer") == "feature"
                      and str(meta.get("feature", "")).startswith("note-"))}
    routes["/notes/"] = {**routes["/notes/"], "title": "開花筆記｜川花 RIVER FLOWER"}
    routes["/notes/"]["schema"] = route_schema("/notes/", articles, routes["/notes/"]["desc"])
    for article in articles:
        path = note_path(article)
        if path in routes:
            raise ValueError(f"文章路由與既有網址重複：{path}")
        routes[path] = {"layer": "feature", "feature": "note-" + article["id"],
                        "title": article["title"] + "｜開花筆記｜川花", "desc": article["description"],
                        "schema": route_schema(path, articles)}
    # 正式站：每個網址都可被收錄，清掉任何殘留的 noindex 標記。
    for meta in routes.values():
        meta.pop("noindex", None)
    return replace_once(text, r'<script type="application/json" id="route-meta">.*?</script>',
                        '<script type="application/json" id="route-meta">\n' + safe_json(routes) + '\n</script>')


def remove_note_schema(text: str) -> str:
    return re.sub(r'<script\b(?=[^>]*\bid=[\'"]' + NOTE_SCHEMA_ID + r'[\'"])[^>]*>.*?</script>\s*',
                  "", text, flags=re.S | re.I)


def route_schema(path: str, articles: list[dict], description: str = "") -> list[dict]:
    url = SITE + path
    if path == "/notes/":
        return [{"@context": "https://schema.org", "@type": "CollectionPage", "@id": url + "#webpage",
                 "name": "開花筆記", "description": description, "url": url,
                 "mainEntity": {"@type": "ItemList", "numberOfItems": len(articles), "itemListElement": [
                     {"@type": "ListItem", "position": i, "name": a["title"], "url": SITE + note_path(a)}
                     for i, a in enumerate(articles, 1)]}}]
    article = next((a for a in articles if note_path(a) == path), None)
    if article is None:
        return []
    return [
        {"@context": "https://schema.org", "@type": "Article", "@id": url + "#article", "name": article["title"], "headline": article["title"],
         "description": article["description"], "url": url, "mainEntityOfPage": {"@type": "WebPage", "@id": url},
         "keywords": article["keywords"],
         "publisher": {"@type": "Organization", "@id": SITE + "/#organization", "name": "川花有限公司"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "川花", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "開花筆記", "item": SITE + "/notes/"},
            {"@type": "ListItem", "position": 3, "name": article["title"], "item": url}]}
    ]


def load_routes(text: str) -> dict[str, dict]:
    block = re.search(r'<script type="application/json" id="route-meta">(.*?)</script>', text, re.S)
    if not block:
        raise SystemExit("index.html 裡找不到 #route-meta")
    # 16 種植物結果（/quiz/result/xxx/）不做成正式網址頁（小麻糬 2026-10-15）：
    # 網址照樣會變、按返回也正常，只是交給 404.html 接手，不放進網站地圖。
    return json.loads(block.group(1), object_pairs_hook=unique_object)


def replace_once(text: str, pattern: str, replacement: str) -> str:
    new, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"index.html 的 <head> 找不到：{pattern}")
    return new


def page_for(text: str, path: str, meta: dict, articles: list[dict] | None = None) -> str:
    text = remove_note_schema(text)
    text = re.sub(r'<meta\b(?=[^>]*\bdata-route-noindex\b)[^>]*>\s*', "", text, flags=re.I)
    title = html.escape(meta["title"], quote=True)
    desc = html.escape(meta["desc"], quote=True)
    url = SITE + meta.get("redirectTo", path)
    if path in {"/services/marketing-planning/", "/services/brand-strategy/"}:
        target = "/services/brand-marketing/"
        text = replace_once(text, r"</head>", f'<meta http-equiv="refresh" content="0;url={target}">\n<script>location.replace({json.dumps(target)});</script>\n</head>')
    text = replace_once(text, r"<title>[^<]*</title>", f"<title>{title}</title>")
    text = replace_once(text, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">')
    text = replace_once(text, r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title}">')
    text = replace_once(text, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">')
    text = replace_once(text, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')
    text = replace_once(text, r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">')
    text = replace_once(text, r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{title}">')
    text = replace_once(text, r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{desc}">')
    is_article = any(note_path(a) == path for a in (articles or []))
    text = replace_once(text, r'<meta property="og:type" content="[^"]*">',
                        '<meta property="og:type" content="' + ("article" if is_article else "website") + '">')
    schema = meta.get("schema", []) if path == "/notes/" or is_article else []
    if not isinstance(schema, list):
        raise ValueError(f"{path} 的 schema 必須是陣列")
    if schema:
        script = '<script type="application/ld+json" id="' + NOTE_SCHEMA_ID + '">\n'
        script += safe_json(schema) + '\n</script>\n</head>'
        text = replace_once(text, r"</head>", script)
    if meta.get("noindex"):
        text = replace_once(text, r"</head>", '<meta name="robots" content="noindex, follow" data-route-noindex>\n</head>')
    return text


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def render_legacy_service_routes(text: str) -> str:
    """Keep retired service addresses and their former child pages reachable."""
    block = re.search(r'<script type="application/json" id="route-meta">(.*?)</script>', text, re.S)
    if not block:
        raise ValueError("首頁缺少 route-meta")
    routes = json.loads(block.group(1), object_pairs_hook=unique_object)
    redirects = {
        "/services/marketing-planning/": "/services/brand-marketing/",
        "/services/marketing-planning/campaigns/": "/services/brand-marketing/",
        "/services/brand-strategy/": "/services/brand-marketing/",
        "/services/brand-strategy/content-framework/": "/services/brand-marketing/",
        "/services/copy-skill/": "/services/content/",
        "/services/copy-skill/voice-guide/": "/services/content/",
    }
    for old, new in redirects.items():
        if new not in routes:
            raise ValueError(f"舊網址的目的地不存在：{new}")
        routes[old] = {**routes[new], "redirectTo": new}
    payload = safe_json(routes)
    return text[:block.start(1)] + "\n" + payload + "\n" + text[block.end(1):]


def main() -> None:
    text = SOURCE.read_text(encoding="utf-8")
    text = render_services(text)
    text = render_legacy_service_routes(text)
    articles = load_notes()
    text = render_notes(text, articles)
    routes = load_routes(text)
    # 根頁永遠維持自己的 metadata，不殘留任一篇文章的搜尋資料。
    text = page_for(text, "/", routes["/"], articles)
    write(SOURCE, text)

    previous = set(MANIFEST.read_text(encoding="utf-8").split()) if MANIFEST.exists() else set()
    generated = []
    for path, meta in routes.items():
        if path == "/":
            continue
        target = ROOT / path.strip("/") / "index.html"
        write(target, page_for(text, path, meta, articles))
        generated.append(target.relative_to(ROOT).as_posix())

    # 不認得的網址（例：測驗第 3 題、預約第 2 步）由 404.html 接手，網址管理員會擺好畫面
    not_found = replace_once(text, r'<link rel="canonical" href="[^"]*">', '<meta name="robots" content="noindex">')
    write(ROOT / "404.html", not_found)

    for stale in sorted(previous - set(generated)):
        stale_path = ROOT / stale
        if stale_path.exists():
            stale_path.unlink()
        # 下架的網址連資料夾一起收掉，免得留下空殼資料夾。
        folder = stale_path.parent
        while folder != ROOT and folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
            folder = folder.parent

    write(MANIFEST, "\n".join(sorted(generated)) + "\n")

    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url>\n    <loc>{SITE}{path}</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n"
        # 正式站：所有不是轉址的網址都列入網站地圖。
        for path, meta in routes.items()
        if not meta.get("redirectTo") and (not meta.get("noindex") or path.startswith(("/notes/", "/services/")))
    )
    write(ROOT / "sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')

    print(f"產生 {len(generated)} 個網址頁、404.html、sitemap.xml（共 {len(routes)} 個網址）")


if __name__ == "__main__":
    main()
