const {chromium} = require('C:/Users/Riva/AppData/Roaming/npm/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {for(const width of [1280,390]) {const page=await browser.newPage({viewport:{width,height:850}});await page.addInitScript(()=>{ window.requestAnimationFrame=()=>123; window.cancelAnimationFrame=()=>{}; });
await page.goto((process.env.TEST_BASE||'http://127.0.0.1:18779')+'/services/website/',{waitUntil:'domcontentloaded'});
const est=page.locator('.svc-estimator:visible');await est.waitFor();
async function values(label){let price=(await est.locator('.ie-price').innerText()).trim();assert.equal(price,'NT$76,000',label+' price');let score=(await est.locator('.ie-completion-number').innerText()).trim();assert.equal(score,'86%',label+' score');let steps=await page.locator('.svc-detail:visible .svc-step-number').allTextContents();assert.deepEqual(steps.map(x=>x.trim()),['01','02','03','04'],label+' steps');}
await values('即時'); await page.waitForTimeout(1100);await values('一秒後');
await est.locator('[data-action=contact]').evaluate(el=>el.click());let d=page.locator('dialog.plan-summary[open]');await d.waitFor();
async function summary(label){for(const [s,v] of [['.ps-total','NT$76,000'],['.ps-low','NT$76,000'],['.ps-high','NT$91,200'],['.ps-score-number','86%']]) assert.equal((await d.locator(s).innerText()).trim(),v,label+' '+s)}
await summary('即時');await page.waitForTimeout(1100);await summary('一秒後');
await d.locator('[data-ps-close]').first().evaluate(el=>el.click());
await page.evaluate(()=>{window.framesForTest=[];window.requestAnimationFrame=cb=>{window.framesForTest.push(cb);return window.framesForTest.length}});
await est.getByRole('button',{name:'拿掉最新消息與部落格'}).evaluate(el=>el.click());
assert.equal((await est.locator('.ie-price').innerText()).trim(),'NT$64,000','更改後立即正確');
await page.evaluate(()=>{const queued=window.framesForTest.splice(0);queued.forEach(cb=>cb(performance.now()+25));});
await page.waitForTimeout(1100);
assert.equal((await est.locator('.ie-price').innerText()).trim(),'NT$64,000','動畫中斷後一秒保險');
assert.equal((await est.locator('.ie-completion-number').innerText()).trim(),'85%','完整度中斷後一秒保險');
await est.locator('[data-action=contact]').evaluate(el=>el.click());
d=page.locator('dialog.plan-summary[open]');await d.waitFor();
assert.equal((await d.locator('.ps-total').innerText()).trim(),'NT$64,000','摘要立即正確');
await page.evaluate(()=>{const queued=window.framesForTest.splice(0);queued.forEach(cb=>cb(performance.now()+25));});
await page.waitForTimeout(1100);
assert.equal((await d.locator('.ps-total').innerText()).trim(),'NT$64,000','摘要中斷後一秒保險');console.log('通過 '+width+'：動畫不執行，價格、範圍、完整度和步驟仍正確');await page.close();}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
