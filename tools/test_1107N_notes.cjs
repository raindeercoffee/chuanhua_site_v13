// 1107N 開花筆記：下架「AI 做的商品圖和影片可以商用嗎？」（09）後剩 9 篇；
// 畫面上、網站地圖、結構化資料出現的篇數都要等於實際文章數；每篇文末自然連到 1～2 個服務專屬頁。
// 用法：先跑 python tools/build_routes.py，在上一層開本機伺服器，再 node tools/test_1107N_notes.cjs
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:18951').replace(/\/$/, '');

const EXPECTED_NOTES = 9; // spec N1：下架 09 後剩 9 篇
const REMOVED_SLUG = 'ai-image-video-commercial-use';
const REMOVED_TITLE = '授權注意事項';
const SERVICE_SLUGS = ['ads', 'brand-marketing', 'ads-audit', 'website', 'workflow', 'content', 'tools', 'ad-ops'];
const BANNED = ['立即', '現在就', '名額', '限時', '下單', '不是', '而是', '與其', '不如', '上稿自動化'];

async function text(page, path) {
  const res = await page.request.get(BASE + path);
  return {status: res.status(), body: await res.text()};
}

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    const probe = await browser.newPage();

    // 1. 下架的文章頁打不開；首頁原始碼、網站地圖、llms.txt 都不再提到它
    assert.equal((await text(probe, `/notes/${REMOVED_SLUG}/`)).status, 404, '下架文章頁要是 404');
    for (const path of ['/', '/notes/', '/sitemap.xml', '/llms.txt', '/404.html']) {
      const {status, body} = await text(probe, path);
      assert.equal(status, 200, path + ' 要能開');
      assert.ok(!body.includes(REMOVED_SLUG), path + ' 不可再有下架文章網址');
      assert.ok(!body.includes(REMOVED_TITLE), path + ' 不可再有下架文章標題');
    }

    // 2. 網站地圖的文章網址數 = 9
    const sitemap = (await text(probe, '/sitemap.xml')).body;
    const noteUrls = sitemap.match(/<loc>[^<]*\/notes\/[a-z0-9-]+\/<\/loc>/g) || [];
    assert.equal(noteUrls.length, EXPECTED_NOTES, '網站地圖文章數');

    // 3. 文章列表結構化資料：清單長度與 numberOfItems 都是 9
    const notesHtml = (await text(probe, '/notes/')).body;
    const ld = notesHtml.match(/<script type="application\/ld\+json" id="note-schema">([\s\S]*?)<\/script>/);
    assert.ok(ld, '/notes/ 要有結構化資料');
    const list = JSON.parse(ld[1]).find(x => x['@type'] === 'CollectionPage').mainEntity;
    assert.equal(list.itemListElement.length, EXPECTED_NOTES, '結構化資料清單長度');
    assert.equal(list.numberOfItems, EXPECTED_NOTES, '結構化資料 numberOfItems');

    // 4. 路由資料裡沒有 note-09
    assert.ok(!notesHtml.includes('"note-09"'), '路由資料不可有 note-09');

    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: 850}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(BASE + '/notes/', {waitUntil: 'load'});
      const feature = page.locator('[data-feature="notes"]');
      await feature.waitFor({state: 'visible'});

      // 5. 畫面上的篇數 = 實際卡片數 = 9；每個分類按鈕的數字也等於畫面上看得到的卡片數
      const cards = feature.locator('.note-card');
      assert.equal(await cards.count(), EXPECTED_NOTES, '卡片數');
      assert.equal((await page.locator('#notes-count').innerText()).trim(), `共 ${EXPECTED_NOTES} 篇筆記`, '總數文字');
      const filters = await feature.locator('[data-notes-filter]').evaluateAll(els => els.map(e => e.dataset.notesFilter));
      for (const category of filters) {
        await feature.locator(`[data-notes-filter="${category}"]`).click();
        const visible = await feature.locator('.note-card:not([hidden])').count();
        assert.ok(visible >= 1, `分類「${category}」不可是空的`);
        const shown = (await page.locator('#notes-count').innerText()).trim();
        const number = Number((shown.match(/(\d+) 篇/) || [])[1]);
        assert.equal(number, visible, `分類「${category}」顯示的篇數要等於看得到的卡片數`);
      }
      assert.deepEqual(errors, [], '不可有程式錯誤');
      console.log(`通過 ${width}：剩 ${EXPECTED_NOTES} 篇、篇數由畫面卡片算出、下架文章不再出現`);
      await page.close();
    }

    // 6. 每篇文末一段順口的話，連到 1～2 個服務專屬頁；點了在站內打開那個服務頁
    const page = await browser.newPage({viewport: {width: 1280, height: 850}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + '/notes/', {waitUntil: 'load'});
    const hrefs = await page.locator('[data-feature="notes"] .note-card').evaluateAll(els => els.map(e => e.getAttribute('href')));
    assert.equal(hrefs.length, EXPECTED_NOTES);
    for (const href of hrefs) {
      await page.goto(new URL(href, BASE).href, {waitUntil: 'load'});
      const article = page.locator('.note-article:not([hidden])');
      await article.waitFor({state: 'visible'});
      const para = article.locator('.note-service-link p');
      assert.equal(await para.count(), 1, href + ' 文末要有一段連到服務的話');
      const sentence = (await para.innerText()).trim();
      assert.ok(sentence.length >= 20, href + ' 那段話太短：' + sentence);
      for (const word of BANNED) assert.ok(!sentence.includes(word), `${href} 那段話不可有「${word}」：${sentence}`);
      const links = para.locator('a');
      const n = await links.count();
      assert.ok(n >= 1 && n <= 2, `${href} 要連 1～2 個服務（現在 ${n} 個）`);
      const targets = [];
      for (let i = 0; i < n; i++) {
        const link = links.nth(i);
        assert.equal(await link.getAttribute('data-route'), '', href + ' 服務連結要能站內切換（data-route）');
        const m = (await link.getAttribute('href')).match(/\/services\/([a-z-]+)\/$/);
        assert.ok(m && SERVICE_SLUGS.includes(m[1]), href + ' 服務連結要指向服務專屬頁');
        targets.push(m[1]);
      }
      assert.equal(new Set(targets).size, targets.length, href + ' 同一個服務不要連兩次');
      // 舊的大按鈕（連到 /ai/ 舊頁）拿掉，只留這段話
      assert.equal(await article.locator('.note-service-link .btn').count(), 0, href + ' 不要再有舊的服務大按鈕');
      await links.first().click();
      await page.waitForURL(new RegExp(`/services/${targets[0]}/$`));
      await page.locator(`[data-feature="service-${targets[0]}"]`).waitFor({state: 'visible'});
    }
    assert.deepEqual(errors, [], '不可有程式錯誤');
    console.log(`通過：${EXPECTED_NOTES} 篇文末都順口連到服務專屬頁，點了在站內打開`);
    await page.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
