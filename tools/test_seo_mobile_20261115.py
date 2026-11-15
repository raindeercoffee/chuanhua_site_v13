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

    print(f"PASS：{len(services)} 個服務、{len(articles)} 篇文章、"
          f"{sum(len(s['children']) for s in services)} 個施工子頁，"
          "QC 獨立頁、轉址、sitemap 與 4 張 SVG 已通過程式檢查")


if __name__ == "__main__":
    run()
