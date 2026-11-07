// 頁尾「服務項目」欄：只有 3 行（標題＋品牌行銷＋AI 與數位工具），點了打開服務項目頁並停在那一組。
const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:18930');
(async()=>{
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    for (const width of [1280,390]) {
      for (const [group,label] of [['brand','品牌行銷'],['digital','AI 與數位工具']]) {
        const page = await browser.newPage({viewport:{width,height:850}});
        const errors=[]; page.on('pageerror',e=>errors.push(e.message));
        await page.goto(BASE+'/contact/',{waitUntil:'load'});
        await page.waitForTimeout(2500);
        const col = await page.evaluate(()=>{
          const c=document.querySelector('footer .ft-col[aria-label="服務項目"]');
          return c?{title:c.querySelector('h4').childNodes[0].textContent.trim(),links:[...c.querySelectorAll('a[data-svc-group]')].map(a=>a.textContent.trim())}:null;
        });
        assert.ok(col,'頁尾要有「服務項目」欄');
        assert.equal(col.title,'服務項目');
        assert.deepEqual(col.links,['品牌行銷','AI 與數位工具'],'只有兩行連結');
        await page.evaluate(g=>document.querySelector(`footer [data-svc-group="${g}"]`).click(),group);
        await page.waitForTimeout(2500);
        const r = await page.evaluate(id=>{
          const el=document.getElementById(id), b=el.getBoundingClientRect();
          return {path:location.pathname,open:document.getElementById('feature').classList.contains('open'),top:Math.round(b.top),h:innerHeight};
        },'svc-group-'+group);
        assert.equal(r.path,'/services/',label+' 要打開服務項目頁');
        assert.ok(r.open,label+' 服務項目頁要打開');
        assert.ok(r.top>=0&&r.top<r.h*0.4,`${label} 那一組要在畫面上方（top=${r.top}）`);
        assert.deepEqual(errors,[],'不能有程式錯誤');
        await page.close();
      }
      console.log(`通過 ${width}：頁尾服務項目 3 行，點了停在對應那一組`);
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
