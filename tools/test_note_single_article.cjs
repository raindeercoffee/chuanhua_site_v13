// 開花筆記「文章頁只放那一篇」（任務卡 02）：
// 每篇文章網址的檔案裡，布幕只留這一篇、預先打開；其他布幕頁不在檔案裡，點過去改成整頁跳轉。
// 用法：先跑 python tools/build_routes.py，在專案資料夾開本機伺服器，再
//   TEST_BASE=http://127.0.0.1:18971 node tools/test_note_single_article.cjs
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:18971').replace(/\/$/, '');
const SITE = 'https://riverflower2025.com';

// 文章的正確答案從文章資料本身讀，不從網頁算。
const ARTICLES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'notes.json'), 'utf8')).articles;
const urlOf = a => `/notes/${a.slug}/`;
const bySlug = Object.fromEntries(ARTICLES.map(a => [a.slug, a]));
// 跟網址頁產生器一樣的跳脫方式（Python html.escape）
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
// 正文第一段（有一篇的第一段跟標題同字，標題可以出現在相關文章連結，所以跳過）
const firstParagraph = a => a.blocks.find(b => b.type === 'p' && b.text !== a.title).text;

let fails = 0;
// ONLY=頁尾 這樣可以只跑名字含那幾個字的項目
async function check(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  try { await fn(); console.log('通過', name); }
  catch (e) { fails++; console.log('失敗', name, '－', e.message.replace(/\s+/g, ' ').slice(0, 500)); }
}
const mark = page => page.evaluate(() => { window.__sameDoc = 1; });
const sameDoc = page => page.evaluate(() => window.__sameDoc === 1);
async function waitPath(page, want) {
  await page.waitForURL(u => { const x = new URL(u); return x.pathname + x.search === want; }, {timeout: 8000});
  await page.waitForLoadState('load');
}
// 在同一份網頁裡換到另一個網址（模擬按返回回到那個畫面）
async function goInside(page, to) {
  await page.evaluate(p => { history.pushState({p}, '', p); dispatchEvent(new PopStateEvent('popstate', {state: {p}})); }, to);
  await page.waitForTimeout(1600);
}

(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    const probe = await browser.newPage();
    const source = {};
    for (const a of ARTICLES) source[a.slug] = await (await probe.request.get(BASE + urlOf(a))).text();
    await probe.close();

    // 1. 原始碼（不跑程式）只有這一篇
    for (const a of ARTICLES) {
      const html = source[a.slug];
      await check(`${urlOf(a)} 原始碼只有 1 塊布幕頁，而且是這篇`, async () => {
        const pages = [...html.matchAll(/<section class="feature-page[^"]*"[^>]*data-feature="([^"]+)"/g)].map(m => m[1]);
        assert.deepEqual(pages, ['note-' + a.id]);
      });
      await check(`${urlOf(a)} 其他 8 篇的正文第一段都不在檔案裡`, async () => {
        const leaked = ARTICLES.filter(o => o.id !== a.id && html.includes(esc(firstParagraph(o)))).map(o => o.id);
        assert.deepEqual(leaked, []);
        assert.ok(html.includes(esc(firstParagraph(a))), '這篇自己的正文要在');
      });
      await check(`${urlOf(a)} 這篇在原始碼裡預先打開`, async () => {
        const open = html.match(/<section class="feature-page note-article"[^>]*>/)[0];
        assert.ok(!/\shidden[\s>]/.test(open), '文章區塊不可有 hidden：' + open);
        const layer = html.match(/<div id="feature"[^>]*>/)[0];
        assert.ok(/class="[^"]*\bopen\b/.test(layer), '布幕要預設打開：' + layer);
        assert.ok(!/\sinert[\s>]/.test(layer), '布幕不可是 inert：' + layer);
        assert.ok(layer.includes('aria-hidden="false"'), '布幕 aria-hidden 要是 false：' + layer);
        assert.ok(layer.includes(`aria-labelledby="feature-note-${a.id}-title"`), '布幕名稱要指到這篇標題：' + layer);
      });
      await check(`${urlOf(a)} 標題、描述、正牌網址、文章結構化資料不變`, async () => {
        const title = esc(a.title + '｜開花筆記｜川花');
        assert.ok(html.includes(`<title>${title}</title>`), '標題');
        assert.ok(html.includes(`<meta name="description" content="${esc(a.description)}">`), '描述');
        assert.ok(html.includes(`<link rel="canonical" href="${SITE + urlOf(a)}">`), '正牌網址');
        assert.ok(html.includes('<meta property="og:type" content="article">'), 'og:type');
        const ld = html.match(/<script type="application\/ld\+json" id="note-schema">([\s\S]*?)<\/script>/);
        assert.ok(ld, '要有文章結構化資料');
        const art = JSON.parse(ld[1]).find(x => x['@type'] === 'Article');
        assert.equal(art.headline, a.title);
        assert.equal(art.datePublished, a.datePublished);
        assert.equal(art.dateModified, a.dateModified);
        assert.equal(art.author.name, '川花小編');
        assert.equal(art.url, SITE + urlOf(a));
      });
    }

    // 2. 不跑程式也看得到這篇的大標題（預先打開，不用等網頁程式）
    await check('關掉網頁程式，打開文章也看得到大標題', async () => {
      const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1280, height: 850}});
      const page = await ctx.newPage();
      for (const a of ARTICLES) {
        await page.goto(BASE + urlOf(a), {waitUntil: 'load'});
        assert.ok(await page.locator(`[data-feature="note-${a.id}"] h1`).isVisible(), urlOf(a) + ' 大標題要看得到');
      }
      await ctx.close();
    });

    for (const width of [1280, 390]) {
      const ctx = await browser.newContext({viewport: {width, height: 850}});
      // 攔下 Google 分析和追蹤碼管家：記下有沒有載入，但不真的送出去
      const tags = new Set();
      await ctx.route(/googletagmanager\.com|google-analytics\.com/, route => {
        const u = route.request().url();
        if (u.includes('gtag/js')) tags.add('gtag'); if (u.includes('gtm.js')) tags.add('gtm');
        route.fulfill({status: 200, contentType: 'text/javascript', body: ''});
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('程式錯誤：' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('主控台：' + m.text()); });

      // 3. 每篇打開：看得到大標題、沒錯誤、不左右滑
      for (const a of ARTICLES) {
        await check(`${width} ${urlOf(a)} 看得到大標題、沒錯誤、不左右滑`, async () => {
          errors.length = 0;
          await page.goto(BASE + urlOf(a), {waitUntil: 'load'});
          const h1 = page.locator(`[data-feature="note-${a.id}"] h1`);
          await h1.waitFor({state: 'visible'});
          assert.equal((await h1.innerText()).trim(), a.title);
          await page.waitForTimeout(600);
          const wide = await page.evaluate(() => {
            const f = document.getElementById('feature');
            return {doc: document.documentElement.scrollWidth - innerWidth, layer: f.scrollWidth - f.clientWidth};
          });
          assert.ok(wide.doc <= 0 && wide.layer <= 0, '不可左右滑：' + JSON.stringify(wide));
          assert.deepEqual(errors, []);
        });
      }
      await check(`${width} 文章頁有載入 Google 分析和追蹤碼管家`, async () => {
        assert.ok(tags.has('gtag') && tags.has('gtm'), [...tags].join(','));
      });

      const a = ARTICLES[width === 1280 ? 3 : 4];
      const open = async () => {
        await page.goto(BASE + urlOf(a), {waitUntil: 'load'});
        await page.locator(`[data-feature="note-${a.id}"] h1`).waitFor({state: 'visible'});
        await page.waitForTimeout(500);
      };

      // 4. 回到開花筆記、相關文章、文末服務連結、返回
      await check(`${width} 按「← 回到開花筆記」到 /notes/，看得到 9 張卡片`, async () => {
        await open();
        await page.locator(`[data-feature="note-${a.id}"] .st-back`).click();
        await waitPath(page, '/notes/');
        await page.locator('[data-feature="notes"]').waitFor({state: 'visible'});
        assert.equal(await page.locator('[data-feature="notes"] .note-card:visible').count(), ARTICLES.length);
      });
      await check(`${width} 按相關文章打開正確的文章`, async () => {
        await open();
        const link = page.locator(`[data-feature="note-${a.id}"] .note-related a`).first();
        const target = bySlug[(await link.getAttribute('href')).split('/')[2]];
        await link.click();
        await waitPath(page, urlOf(target));
        const h1 = page.locator(`[data-feature="note-${target.id}"] h1`);
        await h1.waitFor({state: 'visible'});
        assert.equal((await h1.innerText()).trim(), target.title);
      });
      await check(`${width} 按文末服務連結打開服務頁，按返回回到原本的文章`, async () => {
        await open();
        const link = page.locator(`[data-feature="note-${a.id}"] .note-service-link a`).first();
        const href = await link.getAttribute('href');
        const slug = href.match(/^\/services\/([a-z-]+)\/$/)[1];
        await link.click();
        await waitPath(page, href);
        await page.locator(`[data-feature="service-${slug}"] h1`).waitFor({state: 'visible'});
        await page.goBack();
        await waitPath(page, urlOf(a));
        await page.locator(`[data-feature="note-${a.id}"] h1`).waitFor({state: 'visible'});
      });
      await check(`${width} 文章頁按 Esc 回到筆記列表`, async () => {
        await open();
        await page.keyboard.press('Escape');
        await waitPath(page, '/notes/');
        await page.locator('[data-feature="notes"]').waitFor({state: 'visible'});
      });

      // 5. 文章頁檔案裡的選單、LOGO、預約諮詢沒被拿壞（在同一份檔案裡回到首頁畫面再按）
      await check(`${width} 文章頁的選單「找川花說話」能用，而且送出點擊紀錄`, async () => {
        await open();
        await goInside(page, '/home/');
        assert.equal(await page.locator('#feature.open').count(), 0, '布幕要收起');
        if (width < 1000) {
          await page.locator('#burger').click();
          await page.waitForFunction(() => document.querySelector('#navLinks').classList.contains('open'));
        }
        await page.evaluate(() => { window.dataLayer.length = 0; });
        await page.locator('#navLinks a', {hasText: '找川花說話'}).click();
        await page.waitForURL(/\/contact\/$/, {timeout: 4000});
        const logged = await page.evaluate(() => [...window.dataLayer].filter(x => x[0] === 'event' && x[1] === 'ch_cta_click').map(x => x[2]));
        assert.equal(logged.length, 1, JSON.stringify(logged));
        assert.equal(logged[0].cta_name, '找川花說話');
        assert.equal(logged[0].cta_place, '選單');
      });
      await check(`${width} 文章頁的 LOGO 能回到花園`, async () => {
        await open();
        await goInside(page, '/home/');
        await page.locator('#navLogo').click();
        await page.waitForFunction(() => !document.body.classList.contains('site-open'), null, {timeout: 4000});
      });
      await check(`${width} 文章頁的預約諮詢能打開`, async () => {
        await open();
        await goInside(page, '/studio/');
        await page.locator('#csOpen').click();
        await page.waitForFunction(() => document.getElementById('consult').classList.contains('open'), null, {timeout: 4000});
      });

      // 6. 三顆按鈕的點擊紀錄在文章頁照常送出（只看攔下來的紀錄）
      await check(`${width} 文章頁按三顆按鈕會送出點擊紀錄`, async () => {
        await open();
        await page.evaluate(id => {
          window.dataLayer.length = 0;
          const box = document.querySelector(`[data-feature="note-${id}"] .st-top`);
          box.insertAdjacentHTML('beforeend', '<button type="button" data-ps-form id="t-form">填寫需求詢價</button>'
            + '<button type="button" data-ps-copy id="t-copy">複製規劃開LINE</button><button type="button" id="t-talk">找川花說話</button>');
          for (const b of ['t-form', 't-copy', 't-talk']) document.getElementById(b).addEventListener('click', e => e.preventDefault());
        }, a.id);
        for (const id of ['t-form', 't-copy', 't-talk']) await page.locator('#' + id).click();
        const logged = await page.evaluate(() => [...window.dataLayer].filter(x => x[0] === 'event' && x[1] === 'ch_cta_click').map(x => x[2]));
        assert.deepEqual(logged.map(x => x.cta_name), ['填寫需求詢價', '複製規劃開LINE', '找川花說話']);
        assert.ok(logged.every(x => x.page_path === urlOf(a)), JSON.stringify(logged));
      });

      // 7. 頁尾「服務項目」分組：整頁跳到 /services/ 後，要停在那一組
      for (const group of ['brand', 'digital']) {
        await check(`${width} 文章頁的頁尾「服務項目」${group} 整頁跳轉後停在那一組`, async () => {
          await open();
          await goInside(page, '/home/');
          await page.evaluate(g => document.querySelector(`footer [data-svc-group="${g}"]`).click(), group);
          await page.waitForURL(u => new URL(u).pathname === '/services/', {timeout: 8000});
          await page.waitForLoadState('load');
          await page.waitForTimeout(2500);
          const r = await page.evaluate(id => {
            const el = document.getElementById(id), b = el.getBoundingClientRect();
            return {open: document.getElementById('feature').classList.contains('open'), top: Math.round(b.top), h: innerHeight};
          }, 'svc-group-' + group);
          assert.ok(r.open, '服務項目頁要打開');
          assert.ok(r.top >= 0 && r.top < r.h * 0.4, `那一組要在畫面上方（top=${r.top}）`);
        });
      }

      // 8. 從 /home/ 或 /notes/ 點筆記，仍然是同一頁滑開布幕
      await check(`${width} 從 /notes/ 點筆記卡片，同一頁滑開布幕`, async () => {
        await page.goto(BASE + '/notes/', {waitUntil: 'load'});
        await page.locator('[data-feature="notes"]').waitFor({state: 'visible'});
        await page.waitForTimeout(500);
        await mark(page);
        const card = page.locator(`[data-feature="notes"] .note-card[href="${urlOf(a)}"]`);
        await card.click();
        await page.waitForURL(u => new URL(u).pathname === urlOf(a), {timeout: 8000});
        await page.locator(`[data-feature="note-${a.id}"] h1`).waitFor({state: 'visible'});
        assert.ok(await sameDoc(page), '不可整頁重新載入');
      });
      await check(`${width} 從 /home/ 點筆記連結，同一頁滑開布幕`, async () => {
        await page.goto(BASE + '/home/', {waitUntil: 'load'});
        await page.waitForTimeout(1500);
        await mark(page);
        const href = await page.evaluate(() => document.querySelector('#main a[href^="/notes/"][href$="/"]:not([href="/notes/"])').getAttribute('href'));
        const target = bySlug[href.split('/')[2]];
        await page.evaluate(h => document.querySelector(`#main a[href="${h}"]`).click(), href);
        await page.waitForURL(u => new URL(u).pathname === href, {timeout: 8000});
        await page.locator(`[data-feature="note-${target.id}"] h1`).waitFor({state: 'visible'});
        assert.ok(await sameDoc(page), '不可整頁重新載入');
      });

      await check(`${width} 全程沒有程式錯誤`, async () => {
        assert.deepEqual(errors.filter(e => e.startsWith('程式錯誤')), []);
      });
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(fails ? `沒通過 ${fails} 項` : '全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
