// T2：月維護比較表在電腦（1280）與手機（390）都看得清楚、不撐破畫面。
// 先建置並在分身上一層開本機伺服器，再執行：
//   TEST_BASE=http://127.0.0.1:18802 node tools/test_T2_layout.cjs
// 設 SHOT_DIR 會另外存截圖，方便人工看。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const base = process.env.TEST_BASE || 'http://127.0.0.1:18802';
const shotDir = process.env.SHOT_DIR;
const slugs = ['website', 'ads', 'workflow', 'ad-ops'];

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    for (const width of [1280, 390]) {
      for (const slug of slugs) {
        const label = `${slug}@${width}`;
        const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        await page.goto(`${base}/services/${slug}/`, {waitUntil: 'domcontentloaded'});
        const table = page.locator('.svc-detail:visible .svc-section-pricing .svc-maint-table');
        await table.waitFor();
        await table.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const info = await table.evaluate(el => {
          const box = el.getBoundingClientRect();
          const wrap = el.closest('.svc-maint-scroll').getBoundingClientRect();
          const section = el.closest('.svc-section').getBoundingClientRect();
          const cs = sel => getComputedStyle(el.querySelector(sel));
          const head = el.querySelector('thead th:nth-child(2)').getBoundingClientRect();
          return {
            tableRight: box.right, tableLeft: box.left, wrapRight: wrap.right, wrapLeft: wrap.left,
            sectionLeft: section.left, sectionRight: section.right,
            pageOverflow: document.documentElement.scrollWidth - innerWidth,
            itemSize: parseFloat(cs('tbody th').fontSize), cellSize: parseFloat(cs('tbody td').fontSize),
            itemAlign: cs('tbody th').textAlign, cellAlign: cs('tbody td').textAlign,
            rowLine: parseFloat(cs('tbody tr th').borderBottomWidth),
            headBg: cs('thead th:nth-child(3)').backgroundColor, cellBg: cs('tbody td').backgroundColor,
            headWidth: head.width,
          };
        });
        assert.ok(info.pageOverflow <= 0, label + ' 頁面被撐出橫向捲動：' + info.pageOverflow);
        assert.ok(info.tableLeft >= info.wrapLeft - 1 && info.tableRight <= info.wrapRight + 1,
          label + ` 表格要整張放進外框，不必左右滑：${info.tableLeft}-${info.tableRight} / ${info.wrapLeft}-${info.wrapRight}`);
        assert.ok(info.wrapLeft >= info.sectionLeft && info.wrapRight <= info.sectionRight, label + ' 表格不可超出報價區');
        assert.ok(info.itemSize >= 13 && info.cellSize >= 13, label + ' 字太小');
        assert.equal(info.itemAlign, 'left', label + ' 項目欄靠左');
        assert.equal(info.cellAlign, 'center', label + ' 基本／進階欄置中');
        assert.ok(info.rowLine >= 1, label + ' 每列要有分隔線');
        assert.notEqual(info.headBg, info.cellBg, label + ' 進階欄表頭要有底色區分');
        assert.ok(info.headWidth >= 64, label + ' 方案欄太窄：' + info.headWidth);
        if (shotDir) await page.locator('.svc-detail:visible .svc-maint').screenshot({path: path.join(shotDir, `T2_${slug}_${width}.png`)});
        await page.close();
      }
    }
    console.log('T2 版面檢查通過：4 個服務頁，1280／390');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exit(1); });
