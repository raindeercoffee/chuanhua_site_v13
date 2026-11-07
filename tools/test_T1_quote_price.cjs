// T1：詢價頁 /ai/quote/ 的價格要跟服務頁試算器（item-estimator.js 的 website 資料）一致，且任何組合都不低於 NT$49,000。
// 執行：先在分身資料夾上一層開本機伺服器，再 `TEST_BASE=http://127.0.0.1:18801 node tools/test_T1_quote_price.cjs`
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const estimator = require('../assets/item-estimator.js');

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:18801';
const site = estimator.CONFIG.website;
const priceOf = name => { const item = site.items.find(i => i.name === name); assert.ok(item, '試算器找不到項目：' + name); return item.price; };
const money = n => 'NT$' + n.toLocaleString('en-US');
const num = text => Number(String(text).replace(/[^0-9]/g, ''));
const includedPages = Number((site.included.find(t => /\d+\s*頁/.test(t)) || '').match(/(\d+)\s*頁/)[1]);

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.goto(BASE + '/ai/quote/', {waitUntil: 'domcontentloaded'});
      const wizard = page.locator('#quote-wizard');
      await wizard.waitFor();
      const total = async () => (await page.locator('#quote-total').innerText()).trim();

      // 方案：最低的方案剛好等於試算器的起價 49,000，且所有方案都不低於它。
      const plans = await page.$$eval('#quote-plans .quote-option', els => els.map(el => ({
        value: el.querySelector('input').value,
        title: el.querySelector('b').textContent.trim(),
        text: el.textContent,
        price: el.querySelector('.quote-option-price').textContent.trim()
      })));
      assert.ok(plans.length >= 1, '至少一個網站方案');
      const prices = plans.map(p => num(p.price));
      assert.equal(Math.min(...prices), 49000, '最低方案 = NT$49,000');
      assert.equal(site.base, 49000, '試算器起價');
      prices.forEach((p, i) => assert.ok(p >= site.base, plans[i].title + ' 不可低於起價'));

      // 選最低方案：總價 = 49,000，內含頁數 = 試算器內含頁數。
      const cheapest = plans[prices.indexOf(Math.min(...prices))];
      assert.match(cheapest.text, new RegExp('含 ' + includedPages + ' 頁'), '最低方案內含頁數跟試算器一致');
      await page.locator(`#q-plan-${cheapest.value}`).check();
      assert.equal(await total(), money(49000), '選最低方案後總價');

      // 加頁單價 = 試算器「增加頁面」。
      await page.locator('#quote-next').click();
      assert.equal(await page.locator('#q-pages').getAttribute('min'), String(includedPages), '頁數下限 = 內含頁數');
      await page.locator('#q-pages').evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', {bubbles: true})); }, includedPages + 1);
      assert.equal(await total(), money(49000 + priceOf('增加頁面')), '多一頁的總價');
      assert.match(await page.locator('#quote-step-note').innerText(), new RegExp(money(priceOf('增加頁面')).replace('$', '\\$')), '加頁說明的單價');

      // 加購：跟試算器同名的項目價格一致；全部勾選後總價仍正確。
      await page.locator('#quote-next').click();
      const addons = await page.$$eval('#quote-addons .quote-option', els => els.map(el => ({
        value: el.querySelector('input').value,
        title: el.querySelector('b').textContent.trim(),
        price: el.querySelector('.quote-option-price').textContent.trim()
      })));
      let expected = 49000 + priceOf('增加頁面');
      let shared = 0;
      for (const addon of addons) {
        const twin = site.items.find(i => i.name === addon.title);
        if (twin) { shared++; assert.equal(num(addon.price), twin.price, '加購「' + addon.title + '」跟試算器同價'); }
        await page.locator(`#q-addon-${addon.value}`).check();
        expected += num(addon.price);
      }
      assert.ok(shared >= 1, '至少有一項加購跟試算器同名同價');
      assert.equal(await total(), money(expected), '全部加購後的總價');
      assert.doesNotMatch(await page.locator('#quote-step-note').innerText(), /各 NT\$5,000/, '加購說明不可再寫「各 NT$5,000」');

      // 每個方案（不加頁、不加購）都不低於 49,000。
      await page.locator('#quote-reset').click();
      for (const plan of plans) {
        await page.locator(`#q-plan-${plan.value}`).check();
        assert.ok(num(await total()) >= 49000, plan.title + ' 總價不低於 NT$49,000');
      }

      // 軟體專案客製化：NT$49,000 起。
      await page.locator('#quote-kind-custom').click();
      assert.equal(await total(), 'NT$49,000 起', '軟體專案起價');

      console.log('通過 ' + width + '：詢價頁價格跟試算器一致，最低 NT$49,000');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
