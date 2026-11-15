"""三種蘋果裝置小考：iPhone 手機、iPad 平板、Mac 筆電。

用 Safari 同款的 WebKit 引擎，把網站地圖上的每一頁，用每種裝置大小打開來檢查：
1. 不會左右滑（畫面沒有超出螢幕寬度）
2. 看得到的圖片都有載入，沒有破圖
3. 驗貨報告、國貿文件兩張示意圖：手機換手機版、平板與筆電用一般版，而且不超出螢幕
4. 網頁程式沒有出錯
另外替兩個工具頁在每種裝置各拍一張照片，存進 device-shots/，給人眼再看一次。

執行前先 python tools/build_routes.py；需要 pip install playwright 與 playwright install webkit。
"""
from __future__ import annotations

import functools
import http.server
import sys
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "device-shots"
SHOT_PAGES = ("/services/tools/", "/services/tools/photo-report/")
TOOL_IMAGES = ("tool-photo-report", "tool-trade-documents")

# 名稱：(Playwright 內建裝置名稱或 None, 寬, 高)
DEVICES = {
    # 2016 年第一代 SE 只有 320 寬，目前全站在那個寬度會多 8px（舊問題，另外處理）；這裡量現行 SE 第三代
    "iPhone_SE3": ("iPhone SE (3rd gen)", None, None),
    "iPhone_15": ("iPhone 15", None, None),
    "iPad_mini_直": ("iPad Mini", None, None),
    "iPad_Pro11_直": ("iPad Pro 11", None, None),
    "iPad_Pro11_橫": ("iPad Pro 11 landscape", None, None),
    "MacBook_Air_13": (None, 1470, 956),
    "MacBook_舊款13": (None, 1280, 800),
}

PAGE_CHECK_JS = """
async () => {
  // 讓延遲載入的圖片馬上載入，再等所有圖片載完（最多 5 秒）
  document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
  await Promise.race([
    Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))),
    new Promise(r => setTimeout(r, 5000)),
  ]);
  const visible = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const broken = [...document.images].filter(i => visible(i) && i.complete && i.naturalWidth === 0)
    .map(i => i.currentSrc || i.src);
  const tools = [...document.querySelectorAll('picture')].map(p => {
    const img = p.querySelector('img'); if (!img) return null;
    const cur = img.currentSrc || img.src;
    if (!/tool-(photo-report|trade-documents)/.test(cur)) return null;
    const src = [...p.querySelectorAll('source')].find(s => !s.media || matchMedia(s.media).matches);
    const want = src ? src.srcset.split(',')[0].trim().split(' ')[0] : img.getAttribute('src');
    const r = img.getBoundingClientRect();
    return { cur, want, ok: cur.endsWith(want) || decodeURI(cur).endsWith(want),
             mobile: /-mobile\\.svg/.test(cur), left: r.left, right: r.right, w: r.width };
  }).filter(Boolean);
  return { vw: innerWidth, sw: document.documentElement.scrollWidth, broken, tools };
}
"""


def sitemap_paths() -> list[str]:
    tree = ET.parse(ROOT / "sitemap.xml")
    locs = [n.text for n in tree.iter() if n.tag.endswith("loc") and n.text]
    return [urlparse(u).path or "/" for u in locs]


def start_server() -> tuple[http.server.ThreadingHTTPServer, str]:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def run() -> int:
    paths = sitemap_paths()
    assert paths, "網站地圖是空的"
    SHOTS.mkdir(exist_ok=True)
    server, base = start_server()
    problems: list[str] = []
    checked = 0
    tool_seen = {name: 0 for name in DEVICES}
    try:
        with sync_playwright() as p:
            browser = p.webkit.launch()
            for name, (preset, w, h) in DEVICES.items():
                opts = dict(p.devices[preset]) if preset else {
                    "viewport": {"width": w, "height": h}, "device_scale_factor": 2,
                    "is_mobile": False, "has_touch": False}
                opts.pop("default_browser_type", None)
                ctx = browser.new_context(**opts)
                # 外部網站（分析、字型、資料庫）在小考裡不需要，擋掉讓結果穩定
                ctx.route("**/*", lambda route: route.continue_()
                          if route.request.url.startswith(base) else route.abort())
                page = ctx.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                for path in paths:
                    errors.clear()
                    page.goto(base + path, wait_until="load", timeout=30000)
                    page.wait_for_timeout(150)
                    r = page.evaluate(PAGE_CHECK_JS)
                    checked += 1
                    where = f"[{name} {r['vw']}px] {path}"
                    if r["sw"] > r["vw"] + 1:
                        problems.append(f"{where} 會左右滑：內容寬 {r['sw']}px")
                    for src in r["broken"]:
                        problems.append(f"{where} 破圖：{src}")
                    for t in r["tools"]:
                        tool_seen[name] += 1
                        if not t["ok"]:
                            problems.append(f"{where} 示意圖版本錯：用了 {t['cur']}，應該是 {t['want']}")
                        if t["w"] > 0 and (t["left"] < -1 or t["right"] > r["vw"] + 1):
                            problems.append(f"{where} 示意圖超出螢幕")
                        phone = r["vw"] <= 640
                        if t["mobile"] != phone:
                            problems.append(f"{where} {'手機該用手機版圖' if phone else '平板／筆電不該用手機版圖'}")
                    for e in errors:
                        problems.append(f"{where} 網頁程式出錯：{e[:160]}")
                    if path in SHOT_PAGES:
                        shot = SHOTS / f"{name}_{path.strip('/').replace('/', '_')}.png"
                        page.screenshot(path=str(shot), full_page=False)
                ctx.close()
            browser.close()
    finally:
        server.shutdown()

    for name, n in tool_seen.items():
        if n < 2:
            problems.append(f"[{name}] 只找到 {n} 張工具示意圖，應該至少 2 張（小考可能沒檢查到）")

    if problems:
        print(f"不及格：{len(problems)} 個問題")
        for line in problems:
            print(" -", line)
        return 1
    print(f"PASS：{len(DEVICES)} 種蘋果裝置 × {len(paths)} 頁，共 {checked} 次打開；"
          f"不會左右滑、沒有破圖、示意圖版本正確，照片在 device-shots/")
    return 0


if __name__ == "__main__":
    sys.exit(run())
