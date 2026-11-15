"""施工分支 SEO 與手機示意圖回歸測試。執行前先 python tools/build_routes.py。"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://riverflower2025.com"


def assert_contains(path: Path, value: str, what: str) -> None:
    text = path.read_text(encoding="utf-8")
    assert value in text, f"{what}: {path}"


# 已寫好正式內容的詳細說明頁；後續任務卡寫完一頁就把網址加進來。
READY_CHILDREN = {
    "/services/website/maintenance/",
    "/services/content/content-types/",
    "/services/tools/tool-types/",
    "/services/workflow/integrations/",
    "/services/ad-ops/sheet-spec/",
    "/services/ads/platforms/",
    "/services/ads-audit/report/",
}
BANNED = ("立即", "現在就", "名額", "限時", "下單", "不是", "而是", "與其", "不如", "上稿自動化")
UNFINISHED = ("施工中", "準備中", "即將上線", "正在細心整理中")


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


def run() -> None:
    services = json.loads((ROOT / "content/services.json").read_text(encoding="utf-8"))["services"]
    articles = json.loads((ROOT / "content/notes.json").read_text(encoding="utf-8"))["articles"]
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    sitemap_urls = [node.text for node in ET.fromstring(sitemap).iter()
                    if node.tag.endswith("}loc") or node.tag == "loc"]
    assert len(sitemap_urls) == len(set(sitemap_urls)), "網站地圖含重複網址"

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
            if child_path in READY_CHILDREN:
                check_ready_child(service, child, child_path, child_html, sitemap_urls)
                continue
            assert SITE + child_path not in sitemap_urls, f"施工頁混入 sitemap：{child_path}"
            assert 'name="robots" content="noindex, follow"' in child_html, f"施工頁未設 noindex：{child_path}"

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
    assert "20261115-seo-rwd" in (ROOT / "index.html").read_text(encoding="utf-8"), "CSS 快取版本未更新"

    for alias in ("/ai/website/", "/ai/workflow/", "/ai/content/", "/ai/tools/",
                  "/services/marketing-planning/", "/services/brand-strategy/"):
        html = (ROOT / alias.strip("/") / "index.html").read_text(encoding="utf-8")
        assert '<meta http-equiv="refresh"' in html, f"舊連結未轉址：{alias}"
        assert SITE + alias not in sitemap_urls, f"轉址頁不應列入 sitemap：{alias}"

    skip_dirs = {".git", "node_modules", "device-shots", ".scratch"}
    pages = [p for p in ROOT.rglob("*.html") if not skip_dirs & set(p.relative_to(ROOT).parts)]
    for page in pages:
        text = page.read_text(encoding="utf-8")
        for phrase in ("即將上線", "準備中", "互動展示 →", 'href="/ai/demo/"'):
            assert phrase not in text, f"網頁仍有施工字或舊互動展示連結「{phrase}」：{page.relative_to(ROOT)}"

    demo_html = (ROOT / "ai/demo/index.html").read_text(encoding="utf-8")
    assert re.search(r'<meta http-equiv="refresh" content="0;url=/services/tools/"', demo_html), \
        "舊互動展示網址沒有轉到 AI 客製工具開發頁"
    assert SITE + "/ai/demo/" not in sitemap_urls, "舊互動展示轉址頁不應列入 sitemap"
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'data-feature="demo"' not in home, "母版仍有互動展示空白區塊"
    assert home.count('<a class="btn" href="/services/tools/" data-route>看工具示意 →</a>') == 2, \
        "AI 客製化服務頁的兩顆按鈕沒有改成看工具示意"

    print(f"PASS：{len(services)} 個服務、{len(articles)} 篇文章、"
          f"{len(READY_CHILDREN)} 個正式說明頁、"
          f"{sum(len(s['children']) for s in services) - len(READY_CHILDREN)} 個施工子頁，"
          "QC 獨立頁、轉址、sitemap 與 4 張 SVG 已通過程式檢查")


if __name__ == "__main__":
    run()
