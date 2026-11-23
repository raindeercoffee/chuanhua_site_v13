// 服務專屬頁的「延伸閱讀：開花筆記」：文章連到服務頁，服務頁也連回文章。
// 正確答案只從 content/notes.json 的 serviceNote 讀（{服務代稱} 連到哪個服務，那個服務頁就列那篇）。
// 用法：先跑 python tools/build_routes.py，在專案資料夾開本機伺服器，再
//   TEST_BASE=http://127.0.0.1:18991 node tools/test_service_note_backlinks.cjs
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:18991').replace(/\/$/, '');
const HEADING = '延伸閱讀：開花筆記';

const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', f), 'utf8'));
const ARTICLES = read('notes.json').articles;
const SERVICES = read('services.json').services.map(s => s.slug);
const urlOf = a => `/notes/${a.slug}/`;
const linked = a => [...a.serviceNote.matchAll(/\{([a-z-]+)\}/g)].map(m => m[1]);
// 每個服務頁該列的文章（照 notes.json 的順序）
const EXPECTED = Object.fromEntries(SERVICES.map(s => [s, ARTICLES.filter(a => linked(a).includes(s))]));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

let fails = 0;
async function check(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  try { await fn(); console.log('通過', name); }
  catch (e) { fails++; console.log('失敗', name, '－', e.message.replace(/\s+/g, ' ').slice(0, 500)); }
}
async function waitPath(page, want) {
  await page.waitForURL(u => new URL(u).pathname === want, {timeout: 8000});
  await page.waitForLoadState('load');
}
const panelOf = (page, slug) => page.locator(`[data-feature="service-${slug}"]`);
const blockOf = (page, slug) => panelOf(page, slug).locator('section', {has: page.locator('h2', {hasText: HEADING})});

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    await check('資料本身：至少有一個服務有文章、也至少有一個服務沒有', async () => {
      assert.ok(SERVICES.some(s => EXPECTED[s].length), '沒有任何文章連到服務');
      assert.ok(SERVICES.some(s => !EXPECTED[s].length), '每個服務都有文章，測不到「沒有就不出現」');
    });

    // 1. 原始碼（不跑程式的工具、Google）就讀得到連回文章的連結
    const probe = await browser.newPage();
    for (const s of SERVICES) {
      const html = await (await probe.request.get(`${BASE}/services/${s}/`)).text();
      await check(`/services/${s}/ 原始碼裡${EXPECTED[s].length ? '有' : '沒有'}延伸閱讀`, async () => {
        const start = html.indexOf(`data-feature="service-${s}"`);
        assert.ok(start > 0, '找不到這個服務的布幕頁');
        const end = html.indexOf('<section class="feature-page', start + 10);
        const panel = html.slice(start, end > 0 ? end : undefined);
        assert.equal(panel.includes(HEADING), EXPECTED[s].length > 0);
        for (const a of EXPECTED[s]) assert.ok(panel.includes(`href="${urlOf(a)}" data-route>${esc(a.title)}</a>`), '少了 ' + a.title);
      });
    }
    await probe.close();

    for (const width of [1280, 390]) {
      const ctx = await browser.newContext({viewport: {width, height: 850}});
      await ctx.route(/googletagmanager\.com|google-analytics\.com/, r => r.fulfill({status: 200, contentType: 'text/javascript', body: ''}));
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('程式錯誤：' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('主控台：' + m.text()); });
      const open = async s => {
        await page.goto(`${BASE}/services/${s}/`, {waitUntil: 'load'});
        await panelOf(page, s).locator('h1').waitFor({state: 'visible'});
        await page.waitForTimeout(400);
      };

      // 2. 每個服務頁：該有的文章都在、順序與連結正確、位置在常見問題之後；沒文章就整塊不出現
      for (const s of SERVICES) {
        const want = EXPECTED[s];
        await check(`${width} /services/${s}/ 延伸閱讀列出 ${want.length} 篇、位置對、沒錯誤、不左右滑`, async () => {
          errors.length = 0;
          await open(s);
          const block = blockOf(page, s);
          assert.equal(await block.count(), want.length ? 1 : 0, '延伸閱讀區塊數量');
          if (want.length) {
            await block.scrollIntoViewIfNeeded();
            assert.ok(await block.isVisible(), '延伸閱讀要看得到');
            const links = await block.locator('a').evaluateAll(as => as.map(a => ({
              href: a.getAttribute('href'), text: a.textContent.trim(), route: a.hasAttribute('data-route')})));
            assert.deepEqual(links, want.map(a => ({href: urlOf(a), text: a.title, route: true})));
            const order = await panelOf(page, s).evaluate((panel, heading) => {
              const sec = [...panel.querySelectorAll('section')];
              const notes = sec.find(x => x.querySelector('h2')?.textContent.trim() === heading);
              const faq = sec.find(x => x.querySelector('h2')?.textContent.trim() === '常見問題');
              const related = panel.querySelector('.svc-related');
              const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
              return {afterFaq: after(faq, notes), beforeRelated: after(notes, related)};
            }, HEADING);
            assert.deepEqual(order, {afterFaq: true, beforeRelated: true}, '要在常見問題之後、其他服務之前');
          }
          const wide = await page.evaluate(() => {
            const f = document.getElementById('feature');
            return {doc: document.documentElement.scrollWidth - innerWidth, layer: f.scrollWidth - f.clientWidth};
          });
          assert.ok(wide.doc <= 0 && wide.layer <= 0, '不可左右滑：' + JSON.stringify(wide));
          assert.deepEqual(errors, []);
        });
      }

      // 3. 每篇文章：從它連到的每個服務頁點回來，同一頁滑開那篇
      for (const a of ARTICLES) {
        for (const s of linked(a)) {
          await check(`${width} /services/${s}/ 點「${a.title}」同一頁打開那篇`, async () => {
            errors.length = 0;
            await open(s);
            await page.evaluate(() => { window.__sameDoc = 1; });
            const link = blockOf(page, s).locator(`a[href="${urlOf(a)}"]`);
            await link.scrollIntoViewIfNeeded();
            await link.click();
            await waitPath(page, urlOf(a));
            const h1 = page.locator(`[data-feature="note-${a.id}"] h1`);
            await h1.waitFor({state: 'visible'});
            assert.equal((await h1.innerText()).trim(), a.title);
            assert.equal(await page.evaluate(() => window.__sameDoc), 1, '要在同一頁滑開，不整頁重新載入');
            assert.deepEqual(errors, []);
          });
        }
      }

      // 4. 反方向（文章頁只放那一篇）：從文章頁點服務連結仍會整頁跳轉到服務頁
      const a = ARTICLES[0];
      await check(`${width} 從文章頁點服務連結整頁跳轉，服務頁也列回這篇`, async () => {
        await page.goto(BASE + urlOf(a), {waitUntil: 'load'});
        await page.locator(`[data-feature="note-${a.id}"] h1`).waitFor({state: 'visible'});
        await page.evaluate(() => { window.__sameDoc = 1; });
        const s = linked(a)[0];
        await page.locator(`[data-feature="note-${a.id}"] .note-service-link a[href="/services/${s}/"]`).click();
        await waitPath(page, `/services/${s}/`);
        await panelOf(page, s).locator('h1').waitFor({state: 'visible'});
        assert.notEqual(await page.evaluate(() => window.__sameDoc), 1, '文章頁檔案沒有服務頁，應整頁跳轉');
        assert.equal(await blockOf(page, s).locator(`a[href="${urlOf(a)}"]`).count(), 1);
      });
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(fails ? `沒通過 ${fails} 項` : '全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
