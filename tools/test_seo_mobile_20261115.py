"""全站 SEO、手機示意圖與「零施工中」總關卡。執行前先 python tools/build_routes.py。"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from build_services import BANNED as SERVICE_BANNED

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://riverflower2025.com"


def assert_contains(path: Path, value: str, what: str) -> None:
    text = path.read_text(encoding="utf-8")
    assert value in text, f"{what}: {path}"


# 9 個詳細說明頁都要是正式內容；服務資料多了或少了子頁，這份名單也要一起改。
READY_CHILDREN = {
    "/services/website/maintenance/",
    "/services/content/content-types/",
    "/services/tools/tool-types/",
    "/services/workflow/integrations/",
    "/services/ad-ops/sheet-spec/",
    "/services/ads/platforms/",
    "/services/ads-audit/report/",
    "/services/brand-marketing/touchpoints/",
    "/services/website/types/",
}
BANNED = SERVICE_BANNED  # 和產生器共用同一份禁用詞清單
UNFINISHED = ("施工中", "準備中", "即將上線", "正在細心整理中")
# 網站地圖網址數：35 個既有網址＋9 個詳細說明頁（/ai/demo/ 已退場成轉址，不算）＋2026-11-23 新增 10 篇開花筆記。
SITEMAP_COUNT = 54


def feature_section(html: str, feature: str) -> str:
    """取出某一張布幕（feature-page）的內容；布幕裡還有小區塊，所以找到下一張布幕為止。"""
    match = re.search(r'<section class="feature-page[^"]*" data-feature="' + re.escape(feature) + r'"[^>]*>(.*?)</section>'
                      r'(?=\s*(?:<section class="feature-page|<!-- SERVICES:END))', html, re.S)
    assert match, f"找不到布幕：{feature}"
    return match.group(1)


def check_ready_child(service: dict, child: dict, path: str, html: str, sitemap_urls: list[str]) -> None:
    url = SITE + path
    assert url in sitemap_urls, f"說明頁沒有出現在 sitemap：{path}"
    assert 'name="robots" content="noindex' not in html, f"說明頁仍被 noindex：{path}"
    assert f'<link rel="canonical" href="{url}">' in html, f"說明頁 canonical 錯誤：{path}"
    title = f'<title>{child["title"]}｜{service["name"]}｜川花</title>'
    assert title in html, f"說明頁標題錯誤：{path}"
    assert '"@type": "BreadcrumbList"' in html and f'"item": "{url}"' in html, f"說明頁沒有麵包屑結構化資料：{path}"
    body = feature_section(html, f'service-{service["slug"]}-{child["slug"]}')
    text = re.sub(r"<[^>]+>", "", body)
    for word in UNFINISHED:
        assert word not in text, f"說明頁還有「{word}」：{path}"
    for word in BANNED:
        assert word not in text, f"說明頁用了禁用詞「{word}」：{path}"
    assert body.count('class="svc-intro"') >= 1, f"說明頁沒有引言：{path}"
    assert body.count('<ul class="svc-items">') >= 2, f"說明頁少於 2 個段落區塊：{path}"
    assert body.count("<details>") >= 2, f"說明頁常見問題少於 2 題：{path}"
    for href, label in ((f"/services/{service['slug']}/", f"回到{service['name']}"),
                        ("/ai/quote/", "填寫需求詢價"), ("/contact/", "找川花聊聊")):
        assert f'href="{href}"' in body and label in body, f"說明頁缺少行動按鈕「{label}」：{path}"
    if path == "/services/website/maintenance/":
        assert '<table class="svc-maint-table">' in body, "年度維護方案頁沒有月維護比較表"
        assert "NT$3,000／月" in body and "NT$8,000／月" in body, "年度維護方案頁價格不對"


def price_book() -> dict:
    """讀全站唯一的價目表（服務頁試算 assets/item-estimator.js）。"""
    js = (ROOT / "assets/item-estimator.js").read_text(encoding="utf-8")
    base = re.search(r"const make = .*?base: (\d+),", js)
    maint = re.search(r"commonMaintenance = \{ none: 0, basic: (\d+), full: (\d+) \}", js)
    assert base and maint, "讀不到價目表的起價或維護費"
    items: dict[str, set[int]] = {}
    for name, price in re.findall(r"item\('([^']+)','[^']*',(\d+)", js):
        items.setdefault(name, set()).add(int(price))
    assert items, "讀不到價目表的項目"
    return {"base": int(base.group(1)), "basic": int(maint.group(1)), "full": int(maint.group(2)), "items": items}


def check_prices(services: list[dict], book: dict) -> None:
    """一張價目表：網站上寫出來的每個金額，都要對得上價目表。"""
    base, items = book["base"], book["items"]
    for service in services:
        plans = service["maintenance"]
        assert plans["basic"]["price"] == book["basic"] and plans["advanced"]["price"] == book["full"],             f"{service['name']} 的月維護價格跟價目表不同"
    # 一對一諮詢只在合作與諮詢頁出現，不在服務試算裡。
    allowed = {base, book["basic"], book["full"], 3600} | {p for ps in items.values() for p in ps}
    allowed.add(base + min(items["最新消息與部落格"]))  # 品牌故事官網＝起價＋部落格
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    visible = re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", home, flags=re.S)
    visible = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", visible))
    texts = {"網頁": visible,
             "服務資料": (ROOT / "content/services.json").read_text(encoding="utf-8"),
             "文章": (ROOT / "content/notes.json").read_text(encoding="utf-8"),
             "驗貨頁": (ROOT / "services/tools/photo-report/index.html").read_text(encoding="utf-8")}
    for where, text in texts.items():
        for amount in re.findall(r"NT\$ ?([\d,]+)", text):
            value = int(amount.replace(",", ""))
            assert value in allowed, f"{where}寫了價目表沒有的金額 NT${amount}"
        for name, prices in items.items():
            for amount in re.findall(re.escape(name) + r"[：:｜]\s*(?:每頁 )?NT\$([\d,]+)", text):
                assert int(amount.replace(",", "")) in prices, f"{where}的「{name}」寫 NT${amount}，價目表是 {sorted(prices)}"
        for amount in re.findall(r"(?:起價|基本方案)\s*NT\$ ?([\d,]+)|NT\$ ?([\d,]+)\s*起", text):
            value = int((amount[0] or amount[1]).replace(",", ""))
            assert value == base, f"{where}的起價寫 NT${value:,}，價目表是 NT${base:,}"
    quote = re.search(r"const startQuote=.*?startQuote\(\);", home, re.S)
    assert quote, "找不到詢價頁程式"
    literal = re.search(r"(?<![\w.])\d{4,}(?!\w)", quote.group(0))
    assert not literal, f"詢價頁又自己寫了數字 {literal and literal.group(0)}，價格應該從價目表讀"
    assert "AI 搜尋內容整理" not in home, "已拿掉的加購又出現了"
    assert "品牌文案整理" in items, "價目表少了品牌文案整理"


def run() -> None:
    services = json.loads((ROOT / "content/services.json").read_text(encoding="utf-8"))["services"]
    articles = json.loads((ROOT / "content/notes.json").read_text(encoding="utf-8"))["articles"]
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    sitemap_urls = [node.text for node in ET.fromstring(sitemap).iter()
                    if node.tag.endswith("}loc") or node.tag == "loc"]
    assert len(sitemap_urls) == len(set(sitemap_urls)), "網站地圖含重複網址"
    assert len(sitemap_urls) == SITEMAP_COUNT, f"網站地圖網址數應為 {SITEMAP_COUNT}，實際 {len(sitemap_urls)}"
    child_paths = {f"/services/{s['slug']}/{c['slug']}/" for s in services for c in s["children"]}
    assert child_paths == READY_CHILDREN, f"詳細說明頁名單不一致：{sorted(child_paths ^ READY_CHILDREN)}"
    check_prices(services, price_book())

    for service in services:
        path = f"/services/{service['slug']}/"
        html = (ROOT / path.strip("/") / "index.html").read_text(encoding="utf-8")
        assert SITE + path in sitemap_urls, f"服務沒有出現在 sitemap：{path}"
        assert f'<link rel="canonical" href="{SITE}{path}">' in html, f"canonical 錯誤：{path}"
        assert re.search(r"<title>[^<]+</title>", html), f"沒有 SEO 標題：{path}"
        assert '<meta name="description" content="' in html, f"沒有描述：{path}"
        assert '"@type": "Service"' in html, f"沒有 Service 結構化資料：{path}"
        assert 'name="robots" content="noindex' not in html, f"服務頁被 noindex：{path}"
        for child in service["children"]:
            child_path = path + child["slug"] + "/"
            child_html = (ROOT / child_path.strip("/") / "index.html").read_text(encoding="utf-8")
            check_ready_child(service, child, child_path, child_html, sitemap_urls)

    for article in articles:
        path = "/notes/" + article["slug"] + "/"
        html = (ROOT / path.strip("/") / "index.html").read_text(encoding="utf-8")
        assert SITE + path in sitemap_urls, f"文章沒有出現在 sitemap：{path}"
        assert f'<link rel="canonical" href="{SITE}{path}">' in html, f"文章 canonical 錯誤：{path}"
        assert '"@type": "Article"' in html, f"沒有 Article 結構化資料：{path}"
        assert 'name="robots" content="noindex' not in html, f"文章被 noindex：{path}"

    report = "/services/tools/photo-report/"
    assert SITE + report in sitemap_urls, "QC 獨立頁未加入 sitemap"
    report_html = (ROOT / report.strip("/") / "index.html").read_text(encoding="utf-8")
    assert "tool-photo-report-mobile.svg" in report_html, "QC 獨立頁沒有手機版圖"

    for slug in ("photo-report", "trade-documents"):
        for suffix in ("", "-mobile"):
            path = ROOT / "assets" / f"tool-{slug}{suffix}.svg"
            root = ET.parse(path).getroot()
            assert root.tag.endswith("svg"), f"SVG 非有效根節點：{path}"
            assert root.get("role") == "img", f"SVG 可及性角色缺漏：{path}"
        assert_contains(ROOT / "services/tools/index.html", f"tool-{slug}-mobile.svg", "工具頁手機圖沒有引用")

    css = (ROOT / "assets/services.css").read_text(encoding="utf-8")
    assert ".svc-app-cover img{aspect-ratio:3/4" in css, "手機圖片比例未設置"
    assert "20261115-no-construction" in (ROOT / "index.html").read_text(encoding="utf-8"), "CSS 快取版本未更新"

    for alias in ("/ai/website/", "/ai/workflow/", "/ai/content/", "/ai/tools/",
                  "/services/marketing-planning/", "/services/brand-strategy/"):
        html = (ROOT / alias.strip("/") / "index.html").read_text(encoding="utf-8")
        assert '<meta http-equiv="refresh"' in html, f"舊連結未轉址：{alias}"
        assert SITE + alias not in sitemap_urls, f"轉址頁不應列入 sitemap：{alias}"

    skip_dirs = {".git", "node_modules", "device-shots", ".scratch"}
    pages = [p for p in ROOT.rglob("*.html") if not skip_dirs & set(p.relative_to(ROOT).parts)]
    # 網頁以外，前台會載入的程式、樣式和內容資料也一起掃，避免執行時才冒出施工字。
    pages += [p for folder in ("assets", "content") for p in (ROOT / folder).rglob("*")
              if p.suffix in {".js", ".css", ".json"}]
    pages.append(ROOT / "sitemap.xml")
    assert len(pages) > 50, "掃到的網頁太少，路徑可能錯了"
    for page in pages:
        text = page.read_text(encoding="utf-8")
        for phrase in UNFINISHED + ("svc-construction", "互動展示 →", 'href="/ai/demo/"'):
            assert phrase not in text, f"網站仍有施工字或舊互動展示連結「{phrase}」：{page.relative_to(ROOT)}"

    demo_html = (ROOT / "ai/demo/index.html").read_text(encoding="utf-8")
    assert re.search(r'<meta http-equiv="refresh" content="0;url=/services/tools/"', demo_html), \
        "舊互動展示網址沒有轉到 AI 客製工具開發頁"
    assert SITE + "/ai/demo/" not in sitemap_urls, "舊互動展示轉址頁不應列入 sitemap"
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'data-feature="demo"' not in home, "母版仍有互動展示空白區塊"
    assert home.count('<a class="btn" href="/services/tools/" data-route>看工具示意 →</a>') == 2, \
        "AI 客製化服務頁的兩顆按鈕沒有改成看工具示意"

    print(f"PASS：{len(services)} 個服務、{len(articles)} 篇文章、"
          f"{len(READY_CHILDREN)} 個正式說明頁、0 個施工中，"
          f"網站地圖 {len(sitemap_urls)} 個網址、價格全對上價目表；QC 獨立頁、轉址與 4 張 SVG 已通過程式檢查")


if __name__ == "__main__":
    run()
