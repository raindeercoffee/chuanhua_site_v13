// 1107-A：上方選單、頁尾「開花教室」、花朵「我們開過的花」都捲到首頁同名區塊（電腦 1280／手機 390 漢堡）。
// 用法：先跑 python tools/build_routes.py，在上一層開本機伺服器，再
//   TEST_BASE=http://127.0.0.1:18901 node tools/test_1107A_nav.cjs
// 「我們開過的花」要等 #cases 搬進 #main（B 卡）後才實測捲動；還沒搬時只檢查連結目標。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:18901';
const H = 850;

const NAV = [
  {label: '關於我們', section: '#about', url: /\/about\/$/},
  {label: '我們做的事', section: '#services', url: /\/home\/$/},
  {label: '我們開過的花', section: '#cases', url: /\/cases\/$/},
  {label: '開花教室', section: '#courses', url: /\/courses\/$/},
  {label: '找川花說話', section: '#contact', url: /\/contact\/$/},
];

async function inView(page, section, label) {
  await page.waitForTimeout(1300);
  const box = await page.locator(section).evaluate(el => {
    const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom};
  });
  assert.ok(box.top < H * 0.5 && box.bottom > 0, `${label}：${section} 要捲到畫面中（top=${box.top}）`);
  assert.equal(await page.locator('#feature.open').count(), 0, `${label}：不可打開內容布幕`);
  assert.equal(await page.locator('#studio.open').count(), 0, `${label}：不可打開開花教室布幕`);
}

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  let casesLive = false;
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: H}});
      const mobile = width < 1000;
      await page.goto(BASE + '/home/', {waitUntil: 'load'});
      await page.waitForTimeout(1500);
      casesLive = await page.locator('#main #cases').count() === 1;

      // 選單順序與名字
      const labels = (await page.locator('#navLinks a').allTextContents()).map(s => s.trim());
      assert.deepEqual(labels, NAV.map(n => n.label), `${width} 選單順序`);

      for (const item of NAV) {
        const tag = `${width} 選單「${item.label}」`;
        const link = page.locator('#navLinks a', {hasText: item.label});
        assert.equal(await link.getAttribute('href'), item.section, `${tag} 目標`);
        if (item.section === '#cases' && !casesLive) continue;
        // 先回到最上面，確定是點了才捲過去
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(300);
        if (mobile) {
          await page.locator('#burger').click();
          await page.waitForFunction(() => document.querySelector('#navLinks').classList.contains('open'));
        }
        await link.click();
        if (mobile) {
          assert.equal(await page.locator('#navLinks.open').count(), 0, `${tag} 點完選單要收起`);
          assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'false', `${tag} 漢堡狀態`);
        }
        await page.waitForURL(item.url, {timeout: 3000});
        await inView(page, item.section, tag);
      }

      // 頁尾「關於川花」欄的「開花教室」
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(300);
      const foot = page.locator('.ft-col[aria-label="關於川花"] a', {hasText: '開花教室'});
      assert.equal(await foot.getAttribute('href'), '#courses', `${width} 頁尾開花教室目標`);
      await foot.click();
      await page.waitForURL(/\/courses\/$/, {timeout: 3000});
      await inView(page, '#courses', `${width} 頁尾開花教室`);

      // 重新整理 /courses/ 回到開花教室
      await page.goto(BASE + '/courses/', {waitUntil: 'load'});
      await inView(page, '#courses', `${width} 直接開 /courses/`);

      // 花朵「我們開過的花」：走一般進首頁，不開布幕
      await page.goto(BASE + '/', {waitUntil: 'load'});
      const flower = page.locator('.g-flower.bloomed[data-target="#cases"]');
      await flower.waitFor({timeout: 6000});
      await page.waitForTimeout(1500);
      await flower.click();
      await page.waitForFunction(() => document.body.classList.contains('site-open'), null, {timeout: 4000});
      if (casesLive) {
        await page.waitForURL(/\/cases\/$/, {timeout: 4000});
        await inView(page, '#cases', `${width} 花朵我們開過的花`);
      } else {
        await page.waitForTimeout(1500);
        assert.equal(await page.locator('#feature.open').count(), 0, `${width} 花朵我們開過的花：不可打開內容布幕`);
      }

      // 服務專屬頁「← 回到服務項目」仍可進 /services/ 總頁
      await page.goto(BASE + '/services/ads/', {waitUntil: 'load'});
      const back = page.locator('[data-feature="service-ads"] .st-back');
      await back.waitFor({state: 'visible'});
      assert.equal((await back.innerText()).trim(), '← 回到服務項目');
      await back.click();
      await page.waitForURL(/\/services\/$/, {timeout: 3000});
      await page.locator('[data-feature="services"]').waitFor({state: 'visible'});

      console.log(`通過 ${width}：選單 5 項捲到首頁區塊${mobile ? '、漢堡點完收起' : ''}、頁尾開花教室、花朵入口、服務總頁可回`);
      await page.close();
    }
    console.log(casesLive ? '「我們開過的花」已實測捲動' : '注意：#cases 還不在 #main（B 卡未合併），「我們開過的花」只檢查了連結目標');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
