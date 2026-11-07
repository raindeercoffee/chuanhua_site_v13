// T4：開花筆記統一、拿掉最新文章區、筆記頁返回開花教室、進場動畫不顯示「點一下跳過」。
// 用法：先跑 python tools/build_routes.py，在上一層開本機伺服器，再 node tools/test_T4_notes.cjs
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:18804';

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: 850}});

      // 1、2：首頁與開花教室網址都沒有「川花筆記」，也沒有最新文章區
      for (const path of ['/', '/courses/']) {
        const res = await page.goto(BASE + path, {waitUntil: 'domcontentloaded'});
        assert.equal(res.status(), 200, path + ' 要能開');
        const html = await page.content();
        assert.ok(!html.includes('川花筆記'), path + ' 不可出現「川花筆記」');
        assert.equal(await page.locator('#latest-notes, .latest-notes').count(), 0, path + ' 不可有最新文章區');
        assert.equal(await page.locator('#courses .course h3', {hasText: '開花筆記'}).count(), 1, path + ' 開花教室要有「開花筆記」卡');
      }

      // 3：從首頁連結進 /notes/ 會播動畫，但不顯示「點一下跳過」
      await page.goto(BASE + '/', {waitUntil: 'load'});
      const link = page.locator('#courses a.btn[href$="/notes/"]');
      assert.equal((await link.innerText()).trim(), '閱讀開花筆記 →');
      await link.evaluate(el => el.click());
      const layer = page.locator('.notes-opening');
      await layer.waitFor({state: 'attached', timeout: 3000});
      assert.equal(await page.locator('.notes-opening-hint').count(), 0, '不可有提示字元素');
      assert.ok(!(await layer.innerText()).includes('點一下跳過'), '動畫層不可有「點一下跳過」');
      await layer.click(); // 點一下仍可跳過
      await layer.waitFor({state: 'detached', timeout: 1500});
      await page.waitForURL(/\/notes\/$/);
      await page.locator('[data-feature="notes"]').waitFor({state: 'visible'});

      // 4：筆記列表按「← 回到河邊」回首頁並停在開花教室
      await page.goto(BASE + '/notes/', {waitUntil: 'load'});
      const back = page.locator('[data-feature="notes"] .st-back');
      await back.waitFor({state: 'visible'});
      assert.equal((await back.innerText()).trim(), '← 回到河邊');
      await back.click();
      await page.waitForURL(/\/courses\/$/);
      await page.waitForTimeout(1500);
      const box = await page.locator('#courses').evaluate(el => {
        const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom};
      });
      assert.ok(box.top < 850 * 0.5 && box.bottom > 0, `開花教室要在畫面中（top=${box.top}）`);
      const card = await page.locator('#courses .course h3', {hasText: '開花筆記'}).evaluate(el => {
        const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom};
      });
      if (width >= 1000) assert.ok(card.top >= 0 && card.bottom <= 850, `電腦版開花筆記卡要看得到（top=${card.top}）`);

      console.log('通過 ' + width + '：開花筆記命名、沒有最新文章區、動畫無提示字、返回開花教室');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
