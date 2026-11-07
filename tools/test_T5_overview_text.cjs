// T5：服務總覽頁每組的排法＝大標 → 小標 → 約 100 字說明 → 4 張服務卡（直接呼叫產生器，不用開瀏覽器）。
// 執行：node tools/test_T5_overview_text.cjs
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const py = [
  'import sys, json; sys.path.insert(0, "tools")',
  'import build_services as b',
  's = b.load_services()',
  'print(json.dumps({"overview": b.overview(s), "groups": list(b.GROUPS)}))',
].join('\n');
const out = JSON.parse(execFileSync('python', ['-c', py], {cwd: root, encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}}));

const html = out.overview;
const groups = [...html.matchAll(/<section class="svc-group" aria-labelledby="svc-group-(brand|digital)">([\s\S]*?)<\/section>/g)];
assert.deepEqual(groups.map(m => m[1]), ['brand', 'digital'], '兩組服務都在、順序正確');

const seen = [];
groups.forEach(([, id, body], index) => {
  const label = out.groups[index];
  // 順序：h2 大標 → 小標 → 說明 → 卡片格線，中間不夾別的東西。
  const m = body.match(/^<h2 id="svc-group-\w+">([^<]+)<\/h2><p class="svc-group-subtitle">([^<]+)<\/p><p class="svc-group-intro">([^<]+)<\/p><div class="svc-card-grid">/);
  assert.ok(m, `${label}：要依序是 大標 → 小標 → 說明 → 卡片\n${body.slice(0, 300)}`);
  const [, title, subtitle, intro] = m;
  assert.equal(title, label);
  assert.ok(subtitle.length >= 6 && subtitle.length <= 24, `${label} 小標長度 6～24 字：${subtitle}`);
  assert.notEqual(subtitle, label);
  const chars = intro.replace(/\s/g, '').length;
  assert.ok(chars >= 85 && chars <= 125, `${label} 說明約 100 字（85～125），現在 ${chars}：${intro}`);
  // 不編數字、不寫可辨認的客戶故事。
  assert.ok(!/[0-9０-９]/.test(subtitle + intro), `${label} 小標與說明不可有數字`);
  for (const bad of ['路邊擺攤', '家公司', '客戶名']) assert.ok(!(subtitle + intro).includes(bad), `${label} 不可寫：${bad}`);
  // 川花語氣：先懂品牌、實戰經驗、陪伴。
  assert.ok(/懂|了解|看清/.test(intro), `${label} 說明要講「先懂品牌／工作」`);
  assert.ok(/實戰|第一線|親手/.test(intro), `${label} 說明要講實戰經驗`);
  assert.ok(/陪/.test(intro), `${label} 說明要講陪伴`);
  assert.equal((body.match(/class="svc-card"/g) || []).length, 4, `${label} 有 4 張卡`);
  seen.push(subtitle, intro);
});
assert.equal(new Set(seen).size, seen.length, '兩組的小標與說明不可重複');

// 底部體質區＋「找川花聊聊」仍在最後。
const trust = html.indexOf('<section class="svc-group svc-trust"');
assert.ok(trust > html.lastIndexOf('class="svc-card"'), '體質區在所有服務卡之後');
assert.ok(html.slice(trust).includes('找川花聊聊 →'), '底部仍有找川花聊聊');
console.log('T5 總覽文字檢查通過：兩組 大標 → 小標 → 說明 → 4 張卡');
