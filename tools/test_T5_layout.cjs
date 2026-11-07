// T5：服務總覽頁排版（電腦 4 欄／平板 2 欄／手機 1 欄、小花縮小放卡片右上角不擋字），
// 以及服務頁底部「其他服務」也用同一種卡片（1280 寬 3 張一排）。
// 先建置並在分身上一層開本機伺服器，再執行：
//   TEST_BASE=http://127.0.0.1:18805 node tools/test_T5_layout.cjs
// 設 SHOT_DIR 會另外存截圖，方便人工看。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const base = process.env.TEST_BASE || 'http://127.0.0.1:18805';
const shotDir = process.env.SHOT_DIR;

// 量一組卡片：幾欄幾列、小花大小與位置、小花有沒有壓到字。
const measure = grid => {
  const cards = [...grid.querySelectorAll('.svc-card')];
  const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  return cards.map(card => {
    const c = card.getBoundingClientRect();
    const f = card.querySelector('.svc-flower').getBoundingClientRect();
    const textRects = [];
    for (const el of card.querySelectorAll('h3, .svc-card-subtitle, p, .svc-card-more')) {
      const range = document.createRange();
      range.selectNodeContents(el);
      textRects.push(...range.getClientRects());
    }
    return {top: Math.round(c.top), left: Math.round(c.left), width: c.width,
      flowerW: f.width, flowerH: f.height,
      flowerRightGap: c.right - f.right, flowerTopGap: f.top - c.top,
      flowerLeftHalf: f.left - c.left > c.width / 2,
      hitsText: textRects.some(r => r.width > 0 && overlap(f, r))};
  });
};

const checkCards = (cards, cols, label) => {
  const tops = new Set(cards.map(c => c.top));
  const lefts = new Set(cards.map(c => c.left));
  assert.equal(lefts.size, cols, `${label} 每排 ${cols} 張（欄位 ${[...lefts]}）`);
  assert.equal(tops.size, Math.ceil(cards.length / cols), `${label} 排數（${[...tops]}）`);
  for (const [i, c] of cards.entries()) {
    const at = `${label} 第 ${i + 1} 張`;
    assert.ok(c.flowerW >= 28 && c.flowerW <= 40 && c.flowerH <= 48, `${at} 小花縮小到約 32～40px：${c.flowerW}×${c.flowerH}`);
    assert.ok(c.flowerLeftHalf && c.flowerRightGap >= 0 && c.flowerRightGap <= 30, `${at} 小花靠右：右邊距 ${c.flowerRightGap}`);
    assert.ok(c.flowerTopGap >= 0 && c.flowerTopGap <= 30, `${at} 小花靠上：上邊距 ${c.flowerTopGap}`);
    assert.ok(!c.hitsText, `${at} 小花不可壓到字`);
  }
};

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const [width, cols] of [[1280, 4], [820, 2], [390, 1]]) {
      const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      await page.goto(base + '/services/', {waitUntil: 'domcontentloaded'});
      const view = page.locator('.svc-overview:visible');
      await view.locator('.svc-card').first().waitFor();
      await page.waitForTimeout(400);
      for (const id of ['brand', 'digital']) {
        const group = view.locator(`section[aria-labelledby="svc-group-${id}"]`);
        const order = await group.evaluate(g => ['h2', '.svc-group-subtitle', '.svc-group-intro', '.svc-card-grid']
          .map(sel => { const r = g.querySelector(sel).getBoundingClientRect(); return {top: r.top, bottom: r.bottom, h: r.height}; }));
        order.forEach((box, i) => assert.ok(box.h > 0, `/services/@${width} ${id} 第 ${i + 1} 層要看得到`));
        for (let i = 1; i < order.length; i++) assert.ok(order[i].top >= order[i - 1].bottom - 1, `/services/@${width} ${id} 上下順序：大標 → 小標 → 說明 → 卡片`);
        checkCards(await group.locator('.svc-card-grid').evaluate(measure), cols, `/services/@${width} ${id}`);
      }
      const trustLast = await view.evaluate(v => {
        const t = v.querySelector('.svc-trust').getBoundingClientRect();
        const cards = [...v.querySelectorAll('.svc-card')].map(c => c.getBoundingClientRect().bottom);
        return t.top >= Math.max(...cards) && !!v.querySelector('.svc-trust .svc-button-soft');
      });
      assert.ok(trustLast, `/services/@${width} 體質區＋找川花聊聊在最下面`);
      if (shotDir) {
        // 區塊捲到才淡入，所以一段一段捲過去再拍。
        for (const [name, sel] of [['head', '.svc-head'], ['brand', 'section[aria-labelledby="svc-group-brand"]'],
          ['digital', 'section[aria-labelledby="svc-group-digital"]'], ['trust', '.svc-trust']]) {
          const area = view.locator(sel);
          await area.scrollIntoViewIfNeeded();
          await page.waitForTimeout(900);
          await area.screenshot({path: path.join(shotDir, `T5_services_${width}_${name}.png`)});
        }
      }
      await page.close();
    }

    const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    await page.goto(base + '/services/ads/', {waitUntil: 'domcontentloaded'});
    const related = page.locator('.svc-detail:visible .svc-related');
    await related.locator('.svc-card').first().waitFor();
    await related.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    checkCards(await related.locator('.svc-card-grid').evaluate(measure), 3, '/services/ads/ 其他服務@1280');
    if (shotDir) { await page.waitForTimeout(500); await related.screenshot({path: path.join(shotDir, 'T5_ads_related_1280.png')}); }
    await page.close();
    console.log('T5 排版檢查通過：總覽 1280/820/390 = 4/2/1 欄、小花右上角；其他服務 3 張一排');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exit(1); });
