"""把服務資料放進共用布幕，同時登記三層服務網址。"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ""
GROUPS = ("品牌行銷", "AI 與數位工具")
SECTIONS = (("intro", "服務介紹"), ("contents", "服務內容"), ("process", "交付流程"),
            ("pricing", "報價與試算"), ("contact", "聯絡我們"), ("faq", "常見問題"))


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def unique_object(pairs: list[tuple]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"服務資料有重複欄位：{key}")
        result[key] = value
    return result


PLANS = (("basic", "基本"), ("advanced", "進階"))


def check_maintenance(service: dict) -> None:
    """月維護比較表：價格跟 item-estimator.js 的每月維護同步；每格是 true（✓）、false（—）或一小段文字（次數）。"""
    label = service["slug"] + ".maintenance"
    plan = service.get("maintenance")
    if not isinstance(plan, dict) or set(plan) != {"basic", "advanced", "rows"}:
        raise ValueError(f"{label} 必須有 basic、advanced、rows")
    for key, _ in PLANS:
        price = plan[key].get("price") if isinstance(plan[key], dict) else None
        if type(price) is not int or price < 0:
            raise ValueError(f"{label}.{key}.price 必須是整數金額")
    rows = plan["rows"]
    if not isinstance(rows, list) or not 4 <= len(rows) <= 8:
        raise ValueError(f"{label}.rows 必須有四到八列")
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"item", "basic", "advanced"} or not isinstance(row["item"], str) or not row["item"].strip():
            raise ValueError(f"{label}.rows 每列要有 item、basic、advanced")
        if any(not isinstance(row[key], bool) and (not isinstance(row[key], str) or not row[key].strip()) for key, _ in PLANS):
            raise ValueError(f"{label}.rows「{row['item']}」的格子要是 true、false 或文字")


def maintenance_table(service: dict) -> str:
    plan = service["maintenance"]
    cell = lambda value: ('<span class="svc-maint-yes" aria-label="包含">✓</span>' if value is True else
                          '<span class="svc-maint-no" aria-label="不包含">—</span>' if value is False else esc(value))
    head = "".join(f'<th scope="col">{name}<small>NT${plan[key]["price"]:,}／月</small></th>' for key, name in PLANS)
    rows = "".join(f'<tr><th scope="row">{esc(row["item"])}</th>'
                   + "".join(f'<td>{cell(row[key])}</td>' for key, _ in PLANS) + '</tr>' for row in plan["rows"])
    return ('<div class="svc-maint"><h3>月維護方案</h3>'
            '<p>上線之後，川花繼續陪著照顧。依需要選基本或進階，內容與費用在需求訪談時一起確認。</p>'
            '<div class="svc-maint-scroll"><table class="svc-maint-table">'
            f'<caption>{esc(service["name"])}・月維護方案比較</caption>'
            f'<thead><tr><th scope="col">項目</th>{head}</tr></thead><tbody>{rows}</tbody></table></div></div>')


def load_services() -> list[dict]:
    data = json.loads((ROOT / "content" / "services.json").read_text(encoding="utf-8"),
                      object_pairs_hook=unique_object)
    if not isinstance(data, dict) or set(data) != {"services"} or not isinstance(data["services"], list):
        raise ValueError("服務資料必須是 services 陣列")
    services = data["services"]
    expected = {"ads", "brand-marketing", "ads-audit", "website", "workflow", "content", "tools", "ad-ops"}
    if len(services) != 8 or any(not isinstance(s, dict) for s in services):
        raise ValueError("服務資料必須包含八個服務物件")
    if {s.get("slug") for s in services} != expected:
        raise ValueError("服務代稱缺漏或重複")
    for service in services:
        label = service["slug"]
        for field in ("name", "summary", "description", "group", "flower"):
            if not isinstance(service.get(field), str) or not service[field].strip():
                raise ValueError(f"{label}.{field} 必須有文字")
        if not isinstance(service.get("subtitle"), str) or service["group"] not in GROUPS:
            raise ValueError(f"{label} 副標或分組錯誤")
        if not (service["flower"].startswith("assets/quiz-plants/") or service["flower"] == "assets/entry-5-xinyi.png") or not (ROOT / service["flower"]).is_file():
            raise ValueError(f"{label} 必須使用既有手繪小花")
        if not isinstance(service.get("intro"), list) or not 2 <= len(service["intro"]) <= 3 or any(not isinstance(p, str) or not p.strip() for p in service["intro"]):
            raise ValueError(f"{label}.intro 必須有二至三段")
        for field in ("audience", "problems", "pricingFactors"):
            values = service.get(field)
            if not isinstance(values, list) or not values or any(not isinstance(v, str) or not v.strip() for v in values):
                raise ValueError(f"{label}.{field} 必須是文字清單")
        for field, low, high, keys in (
            ("items", 4, 8, ("title", "description")),
            ("steps", 4, 6, ("title", "description", "duration")),
            ("faqs", 3, 5, ("question", "answer")),
            ("children", 1, 2, ("slug", "title", "description")),
        ):
            values = service.get(field)
            if not isinstance(values, list) or not low <= len(values) <= high:
                raise ValueError(f"{label}.{field} 數量錯誤")
            if any(not isinstance(v, dict) or any(not isinstance(v.get(k), str) or not v[k].strip() for k in keys) for v in values):
                raise ValueError(f"{label}.{field} 欄位錯誤")
        check_maintenance(service)
        if "applications" in service:
            applications = service["applications"]
            if label != "tools" or not isinstance(applications, list) or len(applications) != 2:
                raise ValueError("工具服務必須有兩張功能示意卡")
            if {app.get("id") for app in applications} != {"photo-report", "trade-documents"}:
                raise ValueError("功能示意卡代稱錯誤或重複")
            for app in applications:
                if set(app) != {"id", "name", "eyebrow", "summary", "features", "note"}:
                    raise ValueError("功能示意卡欄位錯誤")
                if any(not isinstance(app.get(key), str) or not app[key].strip()
                       for key in ("name", "eyebrow", "summary", "note")):
                    raise ValueError("功能示意卡缺少文字")
                if not isinstance(app["features"], list) or len(app["features"]) != 3 or any(
                    not isinstance(item, str) or not item.strip() for item in app["features"]
                ):
                    raise ValueError("功能示意卡必須有三項功能說明")
        child_slugs = [c["slug"] for c in service["children"]]
        if len(set(child_slugs)) != len(child_slugs) or any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) for slug in child_slugs):
            raise ValueError(f"{label} 的子頁代稱不安全或重複")
    if any(sum(s["group"] == group for s in services) != 4 for group in GROUPS):
        raise ValueError("每組必須各有四個服務")
    if len({s["flower"] for s in services}) != 8:
        raise ValueError("每個服務必須使用不同植物")
    return services


def service_path(service: dict) -> str:
    return f"/services/{service['slug']}/"


def link(path: str, label: str, classes: str = "", extra: str = "") -> str:
    return f'<a class="{esc(classes)}" href="{BASE}{esc(path)}" data-route{extra}>{esc(label)}</a>'


def flower(service: dict, classes: str = "svc-flower") -> str:
    return (f'<img class="{classes}" src="{BASE}/{esc(service["flower"])}" alt="" '
            'aria-hidden="true" loading="lazy" width="52" height="72">')


PLANTS = ("rockrose", "frankincense", "immortelle", "cinnamon", "cedar", "eucalyptus", "lavender", "chamomile",
          "rosemary", "rose", "jasmine", "olive", "mint", "lemon", "geranium", "sweetorange")


def plant_mark(plant: str, classes: str) -> str:
    return (f'<span class="{classes}" aria-hidden="true"><img src="{BASE}/assets/quiz-plants/{plant}.png" '
            'alt="" loading="lazy" width="42" height="54"></span>')


def card(service: dict) -> str:
    subtitle = f'<span class="svc-card-subtitle">{esc(service["subtitle"])}</span>' if service["subtitle"] else ""
    return (f'<a class="svc-card" href="{BASE}{service_path(service)}" data-route>'
            f'{flower(service)}<h3>{esc(service["name"])}</h3>{subtitle}'
            f'<p>{esc(service["summary"])}</p><span class="svc-card-more">了解服務 →</span></a>')


def breadcrumb(service: dict, child: dict | None = None) -> str:
    parts = [link("/services/", "服務項目")]
    if child:
        parts += [link(service_path(service), service["name"]), f'<span aria-current="page">{esc(child["title"])}</span>']
    else:
        parts += [f'<span aria-current="page">{esc(service["name"])}</span>']
    return '<nav class="svc-breadcrumb" aria-label="麵包屑">' + '<span aria-hidden="true"> / </span>'.join(parts) + '</nav>'


# 川花的體質：放在客人「決定要不要聯絡」之前，是一段不催促的信任說明。
# 不寫客戶名稱或可辨認的客戶故事（客戶在意）。
NATURE = (
    ("01", "細心", "像替幼苗澆水", "在我們開始合作之前，我們會先仔細地將您的品牌競品作全面調查，再加上多年的實戰行銷經驗，給予您最需要的「照顧」。"),
    ("02", "溫柔", "沒有任何急迫，只是陪著你梳理", "當行銷策略卡住、市場緊縮時，我們與您在同一條船上，陪你一起找出卡在哪裡，再一步一步往前走。"),
    ("03", "靈活", "跟著季節換盆", "隨著品牌成長，市場換季、平台改規則…川花團隊獨一無二的細膩與靈敏總能在第一時間抓緊市場動脈，提供最適合您的新策略。"),
    ("04", "穩定", "根扎得夠深", "我們的客戶，大多一起走了十年以上。從品牌剛起步的那一天，一路陪到現在。花會換季，根一直都在。"),
)


def nature_block() -> str:
    cards = "".join(f'<article class="nature-card"><span class="nature-no">{no}</span>'
                    f'<h4>{esc(name)}<small>{esc(hint)}</small></h4><p>{esc(text)}</p></article>'
                    for no, name, hint, text in NATURE)
    return ('<div class="nature">'
            '<p class="nature-kicker">OUR NATURE</p>'
            '<h3 class="nature-title">跟川花合作，這是我們想讓您感受到的</h3>'
            f'<div class="nature-grid">{cards}</div>'
            '<p class="nature-quote">像一條川流：表面柔軟，遇到石頭會轉彎；底下的方向，從來沒有變。</p></div>')


# 服務總覽頁（中層文案）：每組大標下面的小標與約 100 字說明。
# 比首頁卡片深、比各服務專屬頁淺；不寫客戶名稱、不寫成果數字。
GROUP_INTROS = {
    "品牌行銷": ("先聽懂品牌，再讓它被看見",
              "每個品牌都有自己的土壤和花期。川花會先花時間聽懂你的品牌，看清市場與競品，"
              "再用長年親手操作廣告與行銷的實戰經驗，決定在哪裡播種、什麼時候澆水。"
              "從定位、廣告到官網，我們一路陪著，讓品牌在對的地方慢慢開花。"),
    "AI 與數位工具": ("把重複的事交給工具，把時間還給品牌",
                 "工具貴在順手，多了反成負擔。川花會先陪你看懂每天的工作怎麼流動，"
                 "哪裡總是卡住、哪裡一直重做，再帶著長年在行銷第一線的實戰經驗，把 AI 與自動化接進真實的流程。"
                 "像替河道清開石頭，讓團隊的時間流回更重要的事。"),
}


def overview(services: list[dict]) -> str:
    groups = []
    for group in GROUPS:
        identity = "brand" if group == GROUPS[0] else "digital"
        subtitle, intro = GROUP_INTROS[group]
        groups.append(f'<section class="svc-group" aria-labelledby="svc-group-{identity}">'
                      f'<h2 id="svc-group-{identity}">{esc(group)}</h2>'
                      f'<p class="svc-group-subtitle">{esc(subtitle)}</p><p class="svc-group-intro">{esc(intro)}</p>'
                      '<div class="svc-card-grid">'
                      + "".join(card(s) for s in services if s["group"] == group) + '</div></section>')
    return ('<section class="feature-page svc-page svc-overview" data-feature="services" hidden>'
            '<div class="st-top">' + link("/home/", "← 回到首頁", "st-back") + '</div>'
            '<header class="svc-head">'
            f'{flower(services[0], "svc-head-flower")}<p class="svc-kicker">陪品牌慢慢開花</p>'
            '<h1 id="feature-services-title" tabindex="-1">服務項目</h1>'
            '<p>從品牌想說的話，到每天想少做一點的雜事。<br>一起找到適合你的下一步。</p></header>'
            + "".join(groups)
            + '<section class="svc-group svc-trust" aria-label="跟川花合作">' + nature_block()
            + '<div class="svc-actions svc-trust-actions">' + link("/contact/", "找川花聊聊 →", "btn svc-button svc-button-soft")
            + '</div></section></section>')


def application_cards(service: dict) -> str:
    if not service.get("applications"):
        return ""
    cards = []
    for app in service["applications"]:
        goal = app["id"]
        features = "".join(f'<li>{esc(item)}</li>' for item in app["features"])
        quote = link(f"/ai/quote/?kind=custom&goal={goal}", "帶一份範例，聊聊你的需求 →",
                     "svc-app-quote", f' data-quote-kind="custom" data-quote-goal="{goal}"')
        cards.append(
            f'<article class="svc-app" id="svc-app-{goal}">'
            f'<div class="svc-app-cover"><img src="/assets/tool-{goal}.svg?v=20261114-qc" '
            f'alt="{esc(app["name"])}操作畫面示意，使用虛構資料" width="900" height="600" loading="lazy"></div>'
            '<div class="svc-app-body"><span class="svc-app-label">功能示意</span>'
            f'<p class="svc-app-eyebrow">{esc(app["eyebrow"])}</p><h3>{esc(app["name"])}</h3>'
            f'<p>{esc(app["summary"])}</p><details><summary>看看可以做什麼</summary>'
            f'<ul>{features}</ul><p class="svc-app-note">{esc(app["note"])}</p></details>'
            f'{quote}</div></article>')
    return ('<section class="svc-section svc-applications" aria-labelledby="svc-applications-title">'
            '<h2 id="svc-applications-title">照片報告與文件整理工具</h2>'
            '<p class="svc-app-lead">把照片整理好，把文件資料填清楚，讓每天重複的工作少一點。</p>'
            '<div class="svc-app-grid">' + "".join(cards) + '</div></section>')


def detail(service: dict, services: list[dict]) -> str:
    slug = service["slug"]
    feature = "service-" + slug
    prefix = "svc-" + slug + "-"
    # 標題、各段與流程各自使用不同的既有手繪植物。
    header_plant = service["flower"].rsplit("/", 1)[-1].removesuffix(".png")
    plants = [plant for plant in PLANTS if plant != header_plant]
    audience = "".join(f'<li>{esc(text)}</li>' for text in service["audience"])
    problems = "".join(f'<li>{esc(text)}</li>' for text in service["problems"])
    intro = (''.join('<p class="svc-intro">' + esc(p) + '</p>' for p in service["intro"]) + '<div class="svc-intro-grid">'
             '<div><h3>適合這樣的你</h3><ul>' + audience + '</ul></div>'
             '<div><h3>陪你一起解開</h3><ul>' + problems + '</ul></div></div>')
    items = '<ul class="svc-items">' + "".join(
        f'<li><h3>{esc(item["title"])}</h3><p>{esc(item["description"])}</p></li>' for item in service["items"]) + '</ul>'
    items += '<nav class="svc-child-links" aria-label="延伸服務說明">' + "".join(
        link(service_path(service) + child["slug"] + "/", child["title"] + " →", "svc-child-link") for child in service["children"]) + '</nav>'
    process = '<ol class="svc-steps">' + "".join(
        f'<li>{plant_mark(plants[6 + index - 1], "svc-step-mark")}<div><span class="svc-step-number">{index:02}</span>'
        f'<h3>{esc(step["title"])}</h3><p>{esc(step["description"])}</p><p class="svc-step-duration">{esc(step["duration"])}</p></div></li>'
        for index, step in enumerate(service["steps"], 1)) + '</ol>'
    pricing = ('<div class="svc-pricing"><p class="svc-price">起價 NT$49,000</p>'
               '<p>費用會依實際工作範圍調整，以下是需求訪談時會一起確認的事：</p><ul>'
               + "".join(f'<li>{esc(text)}</li>' for text in service["pricingFactors"])
               + '</ul><p class="svc-price-note">實際報價以需求訪談為準</p></div>'
               + f'<div class="svc-estimator" data-service="{slug}"><p>互動試算即將上線</p></div>'
               + maintenance_table(service))
    faq = '<div class="svc-faq">' + "".join(
        f'<details><summary>{esc(item["question"])}</summary><p>{esc(item["answer"])}</p></details>' for item in service["faqs"]) + '</div>'
    quote_kind = "website" if slug == "website" else "custom"
    contact = (nature_block() + '<div class="svc-actions">'
               + link("/ai/quote/", "填寫需求詢價 →", "btn svc-button", f' data-quote-kind="{quote_kind}"')
               + link("/contact/", "找川花聊聊 →", "btn svc-button svc-button-soft") + '</div>')
    contents = dict(intro=intro, contents=items, process=process, pricing=pricing, contact=contact, faq=faq)
    sections = "".join(f'<section class="svc-section svc-section-{key}" id="{prefix}{key}" tabindex="-1">'
                       f'{plant_mark(plants[index], "svc-section-mark")}<h2>{label}</h2>{contents[key]}</section>'
                       for index, (key, label) in enumerate(SECTIONS))
    related = sorted((other for other in services if other["slug"] != slug), key=lambda other: other["group"] != service["group"])[:3]
    subtitle = f'<p class="svc-kicker">{esc(service["subtitle"])}</p>' if service["subtitle"] else ""
    return (f'<section class="feature-page svc-page svc-detail" data-feature="{feature}" hidden>'
            '<div class="st-top">' + link("/services/", "← 回到服務項目", "st-back") + '</div>'
            + breadcrumb(service) + '<header class="svc-head svc-head-detail">' + flower(service, "svc-head-flower") + subtitle
            + f'<h1 id="feature-{feature}-title" tabindex="-1">{esc(service["name"])}</h1><p>{esc(service["summary"])}</p></header>'
            f'<div class="svc-layout"><div class="svc-body">{application_cards(service)}{sections}</div></div>'
            '<nav class="svc-related" aria-label="其他服務"><h2>其他服務</h2><div class="svc-card-grid">'
            + "".join(card(other) for other in related) + '</div></nav></section>')


def child_page(service: dict, child: dict) -> str:
    feature = f'service-{service["slug"]}-{child["slug"]}'
    return (f'<section class="feature-page svc-page svc-child" data-feature="{feature}" hidden>'
            '<div class="st-top">' + link(service_path(service), "← 回到" + service["name"], "st-back") + '</div>'
            + breadcrumb(service, child) + '<header class="svc-head">'
            f'<h1 id="feature-{feature}-title" tabindex="-1">{esc(child["title"])}</h1><p>{esc(child["description"])}</p></header>'
            '<div class="svc-construction">' + flower(service, "svc-construction-flower")
            + '<p class="svc-kicker">施工中</p><h2>這一頁正在細心整理中</h2>'
            '<p>先留一點空間，讓更完整的說明慢慢長出來。<br>如果你已有想法，歡迎先和川花聊聊。</p>'
            + link(service_path(service), "回到" + service["name"] + " →", "btn svc-button") + '</div></section>')


def route_meta(feature: str, title: str, description: str) -> dict:
    return {"layer": "feature", "feature": feature, "title": title + "｜川花", "desc": description}


def render_services(text: str) -> str:
    services = load_services()
    start, end = "<!-- SERVICES:START -->", "<!-- SERVICES:END -->"
    if text.count(start) != 1 or text.count(end) != 1 or text.index(start) >= text.index(end):
        raise ValueError("首頁必須恰有一組順序正確的 SERVICES 標記")
    pages = [overview(services)]
    for service in services:
        pages += [detail(service, services)]
        pages += [child_page(service, child) for child in service["children"]]
    text = re.sub(re.escape(start) + r".*?" + re.escape(end),
                  lambda _: start + "\n" + "\n".join(pages) + "\n" + end, text, flags=re.S)
    block = re.search(r'<script type="application/json" id="route-meta">(.*?)</script>', text, re.S)
    if not block:
        raise ValueError("首頁缺少 route-meta")
    routes = json.loads(block.group(1), object_pairs_hook=unique_object)
    # 本產生器只管理服務樹；筆記、詢價與其他既有路由原樣保留。
    routes = {path: meta for path, meta in routes.items() if not path.startswith("/services/")}
    routes["/services/"] = route_meta("services", "服務項目｜品牌行銷・AI 與數位工具", "川花的八項服務，從品牌行銷、數位廣告到官網製作與 AI 工具，依你的需要一步步了解。")
    for service in services:
        path = service_path(service)
        meta = route_meta("service-" + service["slug"], service["name"], service["description"])
        routes[path] = meta
        if service["slug"] in {"website", "workflow", "content", "tools"}:
            routes[f'/ai/{service["slug"]}/'] = {**meta, "redirectTo": path}
        for child in service["children"]:
            routes[path + child["slug"] + "/"] = route_meta(
                f'service-{service["slug"]}-{child["slug"]}', child["title"] + "｜" + service["name"], child["description"])
    payload = json.dumps(routes, ensure_ascii=False, indent=2).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return re.sub(r'<script type="application/json" id="route-meta">.*?</script>',
                  lambda _: '<script type="application/json" id="route-meta">\n' + payload + '\n</script>', text, count=1, flags=re.S)
