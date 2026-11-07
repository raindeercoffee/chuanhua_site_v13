// T3：「找川花聊聊 →」柔和按鈕：淡色外框、淺底深字、字級 14px、不滿版、置中（電腦 1280／手機 390）。
// 先建置並在 01_網站（或分身上一層）開本機伺服器，再執行：
//   TEST_BASE=http://127.0.0.1:18803 node tools/test_T3_button.cjs
// 設 SHOT_DIR 會另外存截圖，方便人工看。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const base = process.env.TEST_BASE || 'http://127.0.0.1:18803';
const shotDir = process.env.SHOT_DIR;
const pages = [
  {name: 'ads', url: '/services/ads/', area: '.svc-detail:visible .svc-section-contact', buttons: 2},
  {name: 'overview', url: '/services/', area: '.svc-overview:visible .svc-trust', buttons: 1},
];

const rgb = text => (text.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      for (const spec of pages) {
        const label = `${spec.name}@${width}`;
        const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        await page.goto(base + spec.url, {waitUntil: 'domcontentloaded'});
        const soft = page.locator(`${spec.area} .svc-actions a`, {hasText: '找川花聊聊 →'});
        await soft.waitFor();
        await soft.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        const info = await soft.evaluate(el => {
          const cs = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          const same = r => r.left === box.left && r.top === box.top;
          const area = el.closest('.svc-actions').parentElement.getBoundingClientRect();
          const all = [...el.closest('.svc-actions').querySelectorAll('a')].map(a => a.getBoundingClientRect());
          const left = Math.min(...all.map(b => b.left)), right = Math.max(...all.map(b => b.right));
          return {bg: cs.backgroundColor, image: cs.backgroundImage, color: cs.color, fontSize: cs.fontSize,
            borderWidth: cs.borderTopWidth, borderStyle: cs.borderTopStyle, borderColor: cs.borderTopColor,
            width: box.width, center: box.left + box.width / 2, areaCenter: area.left + area.width / 2,
            areaWidth: area.width, groupCenter: (left + right) / 2, count: all.length,
            ownLine: all.every(b => same(b) || b.bottom <= box.top + 1 || b.top >= box.bottom - 1)};
        });
        assert.equal(info.count, spec.buttons, label + ' 按鈕數');
        assert.equal(info.image, 'none', label + ' 不要漸層底');
        const bg = rgb(info.bg);
        assert.ok(luminance(bg) > 0.9 && (bg[3] === undefined || bg[3] > 0.8), label + ' 白或米色底：' + info.bg);
        assert.ok(luminance(rgb(info.color)) < 0.4, label + ' 深色字：' + info.color);
        assert.equal(info.fontSize, '14px', label + ' 字級維持 14px');
        assert.ok(parseFloat(info.borderWidth) >= 1 && info.borderStyle === 'solid', label + ' 要有外框');
        const border = rgb(info.borderColor);
        assert.ok(luminance(border) > 0.55 && luminance(border) < 0.97, label + ' 淡色外框：' + info.borderColor);
        assert.ok(info.width < info.areaWidth * 0.75 && info.width < 320, label + ` 不滿版：${info.width} / ${info.areaWidth}`);
        // 自己一行（總覽只有一顆、或手機上下排）時，按鈕本身要置中；兩顆並排時看整組置中。
        if (info.ownLine) assert.ok(Math.abs(info.center - info.areaCenter) <= 2, label + ` 按鈕置中：${info.center} vs ${info.areaCenter}`);
        if (width === 390 || spec.buttons === 1) assert.ok(info.ownLine, label + ' 手機／單顆時按鈕要自己一行');
        assert.ok(Math.abs(info.groupCenter - info.areaCenter) <= 2, label + ` 按鈕群置中：${info.groupCenter} vs ${info.areaCenter}`);
        if (shotDir) {
          const area = page.locator(spec.area);
          await area.screenshot({path: path.join(shotDir, `T3_${spec.name}_${width}.png`)});
          await area.locator('.svc-actions').screenshot({path: path.join(shotDir, `T3_${spec.name}_${width}_buttons.png`)});
        }
        await page.close();
      }
    }
    console.log('T3 按鈕檢查通過：服務頁聯絡區＋總覽底部，1280／390');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exit(1); });
