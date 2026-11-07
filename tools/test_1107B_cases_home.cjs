// 1107B：「我們開過的花」回到首頁，成為「我們做的事」與「開花教室」之間的一般區塊。
// 用法：先跑 python tools/build_routes.py，在上一層開本機伺服器，再 node tools/test_1107B_cases_home.cjs
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:18902';
const H = 850;

const box = (page, sel) => page.locator(sel).evaluate(el => {
  const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, height: r.height};
});

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: H}});

      // 1：首頁往下滑，「我們開過的花」就在「我們做的事」之後、「開花教室」之前
      await page.goto(BASE + '/home/', {waitUntil: 'load'});
      await page.waitForTimeout(1500);
      const order = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('#main > section')].map(s => s.id);
        const c = document.querySelector('#cases');
        return {ids, inMain: !!c && !!c.closest('#main'), inFeature: !!c && !!c.closest('#feature'),
          hidden: !!c && (c.hidden || c.classList.contains('feature-page')),
          h2: c && c.querySelector('h2') ? c.querySelector('h2').textContent.trim() : null};
      });
      assert.ok(order.inMain && !order.inFeature, '#cases 要在 #main 裡，不在布幕裡');
      assert.ok(!order.hidden, '#cases 不可是隱藏的布幕頁');
      const i = order.ids.indexOf('cases');
      assert.equal(order.ids[i - 1], 'services', '#cases 前面要是 #services');
      assert.equal(order.ids[i + 1], 'courses', '#cases 後面要是 #courses');
      assert.equal(order.h2, '我們開過的花');
      assert.ok(await page.locator('#cases .case').count() >= 3, '作品卡片要在');

      // 2：往下滑到這一區，看得到，網址跟著變 /cases/
      await page.locator('#cases h2').evaluate(el => el.scrollIntoView({block: 'center'}));
      await page.waitForURL(/\/cases\/$/, {timeout: 3000});
      const seen = await box(page, '#cases h2');
      assert.ok(seen.height > 0 && seen.top >= 0 && seen.bottom <= H, `#cases 標題要看得到（top=${seen.top}）`);
      assert.equal(await page.locator('#feature.open').count(), 0, '不可打開布幕');

      // 3：直接打開 /cases/，是首頁並捲到這一區
      await page.goto(BASE + '/cases/', {waitUntil: 'load'});
      await page.waitForTimeout(2500);
      assert.match(page.url(), /\/cases\/$/, '網址要停在 /cases/');
      assert.equal(await page.locator('#feature.open').count(), 0, '直接打開 /cases/ 不可打開布幕');
      assert.ok(await page.evaluate(() => document.body.classList.contains('site-open')), '要在首頁');
      const direct = await box(page, '#cases');
      assert.ok(direct.top < H * 0.5 && direct.bottom > H * 0.5, `直接打開要捲到 #cases（top=${direct.top}）`);

      console.log('通過 ' + width + '：我們開過的花在首頁、位置正確、/cases/ 直接打開會捲到');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
