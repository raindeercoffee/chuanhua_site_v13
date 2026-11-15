"""既有驗貨工具的獨立、可直接閱讀的服務說明；不載入全站布幕。"""
import html
import json
import re

PATH = "/services/tools/photo-report/"
TITLE = "驗貨報告工具｜照片整理・QC 報告製作｜川花"
DESCRIPTION = "驗貨照片整理、QC 驗貨報告製作，依既有表單規劃照片分類、檢查紀錄與固定格式匯出。由驗貨人員判讀品質、確認內容後使用。"


def render_photo_report(source, service):
    esc = lambda value: html.escape(value, quote=True)
    app = next(a for a in service["applications"] if a["id"] == "photo-report")
    # 只沿用正式站的公開名片、分析與分享標記，不帶入任何其他頁面正文。
    company = re.search(r'<script type="application/ld\+json">.*?</script>', source, re.S)
    if not company or '"ProfessionalService"' not in company.group():
        raise ValueError("找不到正式站公司名片")
    head = source[:company.start()]
    head = re.sub(r'<script>\s*// 直接打開內頁時.*?</script>', '', head, flags=re.S)
    url = "https://riverflower2025.com" + PATH
    head = re.sub(r'<title>.*?</title>', '<title>' + esc(TITLE) + '</title>', head)
    for attr, name, value in (
        ('name', 'description', DESCRIPTION), ('property', 'og:title', TITLE),
        ('property', 'og:description', DESCRIPTION), ('property', 'og:url', url),
        ('name', 'twitter:title', TITLE), ('name', 'twitter:description', DESCRIPTION),
    ):
        head = re.sub(r'<meta ' + attr + '="' + name + r'" content="[^"]*">',
                      f'<meta {attr}="{name}" content="{esc(value)}">', head)
    head = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', head)
    schema = [
        {"@context": "https://schema.org", "@type": "Service", "name": app["name"],
         "url": url, "description": DESCRIPTION, "serviceType": "驗貨照片整理與報告工具客製開發",
         "provider": {"@type": "Organization", "@id": "https://riverflower2025.com/#organization", "name": "川花有限公司"}, "areaServed": "TW"},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": "https://riverflower2025.com" + path}
            for i, (name, path) in enumerate((("川花", "/"), ("客製工具開發", "/services/tools/"), (app["name"], PATH)), 1)]}
    ]
    schema_json = json.dumps(schema, ensure_ascii=False).replace('<', '\\u003c')
    features = ''.join('<li>' + esc(t) + '</li>' for t in app["features"])
    return head + company.group() + f'''
<script type="application/ld+json">{schema_json}</script>
<style>
:root{{color-scheme:light}}*{{box-sizing:border-box}}body{{margin:0;background:#f7f6f0;color:#294651;font:17px/1.85 system-ui,"Microsoft JhengHei",sans-serif}}a{{color:#275b75;text-underline-offset:4px}}a:focus-visible{{outline:3px solid #b46655;outline-offset:5px}}header,main,footer{{max-width:1040px;margin:auto;padding:24px}}header{{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d5dfdf}}.logo{{width:140px;height:auto}}nav{{font-size:14px}}.hero{{padding:44px 0 24px;max-width:820px}}h1,h2,h3{{font-family:"Noto Serif TC","Microsoft JhengHei",serif;line-height:1.5;color:#244d60}}h1{{font-size:clamp(32px,5vw,48px);margin:8px 0 16px}}h2{{font-size:26px;margin:0 0 18px}}h3{{font-size:19px;margin:0 0 8px}}p{{margin:0 0 16px}}.kicker{{font-size:15px;color:#715047}}.actions{{display:flex;gap:14px;flex-wrap:wrap;margin:24px 0}}.button{{display:inline-block;min-height:48px;padding:11px 20px;border:1px solid #37637a;border-radius:26px;text-decoration:none}}.primary{{background:#37637a;color:white}}section{{padding:32px 0;border-bottom:1px solid #d5dfdf}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:28px}}.grid>div{{min-width:0}}li{{margin-bottom:10px}}ul,ol{{padding-left:24px}}figure{{margin:20px 0}}figure img{{max-width:100%;height:auto;border-radius:18px}}figcaption,.note{{font-size:14px;color:#576a70}}.faq article{{margin:24px 0}}footer{{font-size:14px}}@media(max-width:650px){{header,main,footer{{padding:20px}}.grid{{grid-template-columns:1fr}}.hero{{padding-top:28px}}h2{{font-size:24px}}}}
</style></head><body>
<header><a href="/home/" aria-label="川花首頁"><img class="logo" src="/assets/logo-h-color.png" width="280" height="100" alt="川花"></a><a href="/services/">服務項目</a></header>
<main>
<nav aria-label="麵包屑"><a href="/home/">川花</a> / <a href="/services/tools/">客製工具開發</a> / <span aria-current="page">驗貨報告工具</span></nav>
<div class="hero"><p class="kicker">照片整理・QC 報告製作</p><h1>驗貨報告工具</h1>
<p>驗貨照片散在手機和資料夾，每次做報告都要重新找、重新排。川花從你原本的報告格式開始，規劃照片分類、檢查紀錄和報告匯出的工具。</p>
<p>適合需要反覆整理產品、蔬果或出貨照片的品管、採購與貿易團隊。</p>
<div class="actions"><a class="button primary" href="/ai/quote/?kind=custom&amp;goal=photo-report">整理我的驗貨報告需求 →</a><a class="button" href="/contact/">直接和川花聊聊</a></div>
<p class="note">客製開發服務介紹。下方為功能示意，畫面均為虛構資料；實際功能依雙方確認的需求製作。</p></div>
<section><h2>驗貨照片怎麼整理成報告？</h2><div class="grid"><div><ol>
<li><strong>先分日期與品項：</strong>整理同一批貨的照片，保留對應關係。</li>
<li><strong>補上檢查紀錄：</strong>由驗貨人員填寫結果與異常說明。</li>
<li><strong>依固定格式預覽：</strong>核對照片、品項與文字是否一致。</li>
<li><strong>確認後匯出保存：</strong>交給團隊或客戶接續查看。</li></ol>
<p>{esc(app["note"])} 工具協助整理，不會替代人員作出品質判定。</p></div><figure><picture><source media="(max-width: 650px)" srcset="/assets/tool-photo-report-mobile.svg?v=20261115-rwd" type="image/svg+xml"><img src="/assets/tool-photo-report.svg?v=20261115-rwd" width="900" height="600" alt="虛構驗貨報告：人工判定待確認、抽樣20件，缺點分級為嚴重0件、主要2件、次要1件"></picture><figcaption>功能示意：可依實際需求設計抽樣、缺點分級及判定欄位，結果由驗貨人員確認。</figcaption></figure></div></section>
<section><h2>可以依工作方式規劃哪些功能？</h2><ul>{features}</ul><p>先從一種報告、一份表格開始。欄位、照片數量、匯出格式與保存方式，在需求討論時一起確認。</p></section>
<section><h2>討論前，先準備這三樣</h2><ol><li>一份去除客戶名稱、個資與機密的舊報告。</li><li>幾張可公開討論的照片，以及照片與品項的對應方式。</li><li>現在最花時間的步驟，以及希望交付的檔案格式。</li></ol><p>不必先整理成技術規格。聯絡後再約定安全的範例提供方式；這個頁面不收件、不上傳照片。</p></section>
<section><h2>驗貨報告工具怎麼計費？</h2><p>川花客製工具開發起價為 NT$49,000。驗貨工具的實際報價，依報告格式、欄位、照片處理、匯出與保存需求確認；起價不代表所有功能都包含。</p><p><a href="/services/tools/">了解客製工具的合作流程與報價範圍 →</a></p></section>
<section class="faq"><h2>驗貨報告與 QC 工具常見問題</h2>
<article><h3>這裡可以直接下載驗貨報告範本嗎？</h3><p>目前是客製工具的服務說明，沒有通用範本下載。可以帶既有表單討論，依團隊的工作方式規劃工具。</p></article>
<article><h3>會自動判斷照片中的商品合不合格嗎？</h3><p>品質狀況由驗貨人員判讀。這項服務著重照片與文字整理、固定格式報告製作，並非產線自動瑕疵檢測。</p></article>
<article><h3>已經有自己的報告格式，也能討論嗎？</h3><p>可以先提供去除敏感資料的舊報告。需要哪些欄位、照片怎麼排列、最後交付什麼格式，會在開發前確認。</p></article>
<article><h3>提單、裝箱單和國貿文件也放在這裡嗎？</h3><p>文件欄位擷取是另一個應用情境。可以到<a href="/services/tools/#svc-app-trade-documents">國貿文件整理介紹</a>看範圍，再一起確認需求。</p></article></section>
<section><h2>先從你手上的一份報告開始</h2><p>告訴川花：現在怎麼整理、卡在哪一步、最後要交給誰。我們先確認範圍，再討論適合的做法。</p><div class="actions"><a class="button primary" href="/ai/quote/?kind=custom&amp;goal=photo-report">整理我的需求 →</a><a class="button" href="/contact/">找川花說話</a></div></section>
</main><footer><p>川花有限公司 · <a href="/services/tools/">客製工具開發</a> · <a href="/policy/">隱私與服務條款</a></p></footer>
</body></html>'''
