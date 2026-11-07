// T1：免責提醒要一眼看得到——字至少 14px，並有淡色底框或左側色條。
// 檢查：詢價頁右側小卡與第 4 步摘要、服務頁試算器「示範數字…」、規劃摘要彈窗。
// 執行：`TEST_BASE=http://127.0.0.1:18801 node tools/test_T1_disclaimer.cjs`
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:18801';

async function assertProminent(locator, label, text) {
  await locator.waitFor({state: 'visible'});
  const s = await locator.evaluate(el => {
    const c = getComputedStyle(el);
    const alpha = c.backgroundColor === 'transparent' ? 0 : Number((c.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',')[3] ?? 1));
    return {text: el.textContent, size: parseFloat(c.fontSize), alpha, bar: parseFloat(c.borderLeftWidth), barStyle: c.borderLeftStyle};
  });
  assert.match(s.text, text, label + ' 文字');
  assert.ok(s.size >= 14, `${label} 字級 ${s.size}px 應 ≥ 14px`);
  assert.ok(s.alpha > 0 || (s.bar >= 3 && s.barStyle !== 'none'), `${label} 需要淡色底框或左側色條`);
}

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.goto(BASE + '/ai/quote/', {waitUntil: 'domcontentloaded'});
      await page.locator('#quote-wizard').waitFor();
      const notQuote = /此為建置預估，非正式報價。網域、主機及第三方服務費依實際使用另計。/;
      await assertProminent(page.locator('#quote-disclaimer'), '詢價頁小卡', notQuote);
      await page.locator('#quote-plans input').first().check();
      for (let i = 0; i < 3; i++) await page.locator('#quote-next').click();
      await assertProminent(page.locator('#quote-summary .quote-disclaimer'), '詢價頁第 4 步摘要', notQuote);
      await page.locator('#quote-kind-custom').click();
      await assertProminent(page.locator('#quote-disclaimer'), '軟體專案小卡', /此為專案起價，並非完整報價/);

      await page.goto(BASE + '/services/website/', {waitUntil: 'domcontentloaded'});
      const est = page.locator('.svc-estimator:visible');
      await est.waitFor();
      await assertProminent(est.locator('.ie-footer p', {hasText: '示範數字'}), '試算器', /示範數字，正式報價以需求訪談為準/);
      await est.locator('[data-action=contact]').evaluate(el => el.click());
      await assertProminent(page.locator('dialog.plan-summary[open] .ps-disclaimer'), '規劃摘要彈窗', /示範數字，正式報價以需求訪談為準/);
      console.log('通過 ' + width + '：免責提醒字夠大、有底框或色條');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
