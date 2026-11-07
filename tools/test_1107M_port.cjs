// 1107-M：12_1 搬進 V13 正式站之後的檢查（網站在根目錄）。
// 用法：先跑搬家腳本與 python tools/build_routes.py，在這個資料夾開本機伺服器
//   python -m http.server 18952 --bind 127.0.0.1
// 再 TEST_BASE=http://127.0.0.1:18952 node tools/test_1107M_port.cjs
// 檢查：沒有測試站字樣、沒有 noindex（404 除外）、每頁有 GA4、canonical/og:url 是正式網址、
//       CNAME 在、V13 舊 13 個網址都 200、網站地圖、選單／花朵入口／服務卡／筆記站內換頁正常。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:18952').replace(/\/$/, '');
const SITE = 'https://riverflower2025.com';
const GA = 'G-HQS0EMVEEE';
const OLD_V13 = ['/', '/home/', '/about/', '/services/', '/cases/', '/courses/', '/team/', '/policy/',
  '/resonance/', '/contact/', '/studio/', '/studio/flow/', '/quiz/'];
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

async function get(path) {
  const res = await fetch(BASE + path);
  return {status: res.status, text: await res.text()};
}
const attr = (html, re) => (html.match(re) || [])[1];

function checkPage(path, html) {
  const head = html.split('</head>')[0];
  ok(!html.includes('chuanhua_site_v12_1'), `${path}：不可有測試站路徑`);
  ok(!html.includes('raindeercoffee'), `${path}：不可有測試站網域`);
  ok(!/noindex/i.test(html), `${path}：不可有 noindex`);
  ok(head.includes(`gtag/js?id=${GA}`) && head.includes(`gtag('config', '${GA}')`), `${path}：<head> 要有 GA4`);
  const canonical = attr(head, /<link rel="canonical" href="([^"]*)">/);
  const ogUrl = attr(head, /<meta property="og:url" content="([^"]*)">/);
  ok(canonical === SITE + path, `${path}：canonical 要是 ${SITE + path}（實際 ${canonical}）`);
  ok(ogUrl === canonical, `${path}：og:url 要和 canonical 一樣（實際 ${ogUrl}）`);
  ok(head.includes(`"@id": "${SITE}/#organization"`), `${path}：要有公司結構化資料`);
  ok(attr(head, /<meta property="og:image" content="([^"]*)">/).startsWith(SITE + '/assets/'), `${path}：og:image 要是正式網址`);
}

async function checkFiles() {
  const cname = await get('/CNAME');
  ok(cname.status === 200 && cname.text.trim() === 'riverflower2025.com', 'CNAME 要在且是 riverflower2025.com');
  const robots = await get('/robots.txt');
  ok(robots.text.includes(`Sitemap: ${SITE}/sitemap.xml`), 'robots.txt 的 Sitemap 要指向正式網址');
  const llms = await get('/llms.txt');
  ok(llms.status === 200 && !llms.text.includes('chuanhua_site_v12_1'), 'llms.txt 要在且沒有測試站路徑');
  const nf = await get('/404.html');
  ok(nf.text.includes('<meta name="robots" content="noindex">') && nf.text.includes(GA), '404.html 保留 noindex 且有 GA4');
  ok(!nf.text.includes('chuanhua_site_v12_1'), '404.html 沒有測試站路徑');

  const sitemap = await get('/sitemap.xml');
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok(locs.length > OLD_V13.length, `網站地圖網址數 ${locs.length} 要多於舊版 13 個`);
  ok(locs.every(u => u.startsWith(SITE + '/')), '網站地圖每個網址都要是正式網址');
  const paths = locs.map(u => u.slice(SITE.length));
  for (const old of OLD_V13) ok(paths.includes(old), `網站地圖要有舊網址 ${old}`);
  for (const p of new Set([...OLD_V13, ...paths])) {
    const page = await get(p);
    ok(page.status === 200, `${p} 要回 200（實際 ${page.status}）`);
    checkPage(p, page.text);
  }
  return paths;
}

async function robotsCount(page) {
  return page.locator('meta[name="robots"]').count();
}
async function canonical(page) {
  return page.locator('link[rel="canonical"]').getAttribute('href');
}

async function checkBrowser(width) {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    const page = await browser.newPage({viewport: {width, height: 850}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const tag = `${width}`;

    // 花朵入口：圖要載得到，點了網址換成根目錄下的 /about/
    await page.goto(BASE + '/', {waitUntil: 'load'});
    ok(await page.evaluate(() => Array.isArray(window.dataLayer)), `${tag} GA4 的 dataLayer 要存在`);
    const flower = page.locator('.g-flower.bloomed[data-target="#about"]');
    await flower.waitFor({timeout: 8000});
    ok(await flower.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), `${tag} 花朵圖要載得到`);
    await page.waitForTimeout(1500);
    await flower.click();
    await page.waitForURL(BASE + '/about/', {timeout: 5000});
    ok(await robotsCount(page) === 0, `${tag} 花朵進 /about/ 後不可有 robots 標記`);
    ok(await canonical(page) === SITE + '/about/', `${tag} 花朵進 /about/ 後 canonical 要跟著換`);

    // 上方選單：關於我們 → /about/，聯絡 → /contact/
    await page.goto(BASE + '/home/', {waitUntil: 'load'});
    await page.waitForTimeout(1200);
    if (width < 1000) {
      await page.locator('#burger').click();
      await page.waitForFunction(() => document.querySelector('#navLinks').classList.contains('open'));
    }
    await page.locator('#navLinks a', {hasText: '找川花說話'}).click();
    await page.waitForURL(BASE + '/contact/', {timeout: 4000});
    ok(await robotsCount(page) === 0, `${tag} 選單換頁後不可有 robots 標記`);

    // 服務總頁 → 點一張服務卡 → 服務專屬頁
    await page.goto(BASE + '/services/', {waitUntil: 'load'});
    const card = page.locator('[data-feature="services"] a.svc-card').first();
    await card.waitFor({state: 'visible', timeout: 5000});
    const href = await card.getAttribute('href');
    ok(/^\/services\/[a-z-]+\/$/.test(href), `${tag} 服務卡連結要是根目錄網址（實際 ${href}）`);
    await card.click();
    await page.waitForURL(BASE + href, {timeout: 4000});
    ok(await canonical(page) === SITE + href, `${tag} 服務頁 canonical 要是 ${SITE + href}`);

    // 開花筆記 → 點第一篇 → 文章頁（og:type=article、沒有 robots 標記）
    await page.goto(BASE + '/notes/', {waitUntil: 'load'});
    const note = page.locator('a.note-card').first();
    await note.waitFor({state: 'visible', timeout: 5000});
    const noteHref = await note.getAttribute('href');
    ok(/^\/notes\/[a-z0-9-]+\/$/.test(noteHref), `${tag} 筆記連結要是根目錄網址（實際 ${noteHref}）`);
    await note.click();
    await page.waitForURL(BASE + noteHref, {timeout: 4000});
    await page.waitForTimeout(300);
    ok(await robotsCount(page) === 0, `${tag} 筆記文章頁不可有 robots 標記`);
    ok(await canonical(page) === SITE + noteHref, `${tag} 筆記 canonical 要跟著換`);
    ok(await page.locator('meta[property="og:type"]').getAttribute('content') === 'article', `${tag} 筆記 og:type 要是 article`);

    // 開花教室 → 預約按鈕 → 預約卡打開，網址留在根目錄
    await page.goto(BASE + '/studio/', {waitUntil: 'load'});
    const book = page.locator('#csOpen');
    await book.waitFor({state: 'visible', timeout: 6000});
    await book.click();
    await page.waitForFunction(() => document.querySelector('#consult').classList.contains('open'), null, {timeout: 4000});
    const bookPath = new URL(page.url()).pathname;
    ok(bookPath.startsWith('/') && !bookPath.includes('chuanhua'), `${tag} 預約卡網址要在根目錄（實際 ${bookPath}）`);
    ok(await robotsCount(page) === 0, `${tag} 預約卡打開後不可有 robots 標記`);

    ok(errors.length === 0, `${tag} 不可有頁面錯誤：${errors.join(' / ')}`);
  } finally { await browser.close(); }
}

(async () => {
  const paths = await checkFiles();
  console.log(`通過：檔案與 ${paths.length} 個網站地圖網址（含舊 13 個）都是正式網址、有 GA4、沒有 noindex`);
  for (const width of [1280, 390]) {
    await checkBrowser(width);
    console.log(`通過 ${width}：花朵入口、選單、服務卡、開花筆記、預約卡都在根目錄、沒有 noindex`);
  }
  console.log(`全部通過（${checks} 項檢查）`);
})().catch(e => { console.error(e); process.exit(1); });
