// T3：體質區、聯絡句、「陪你一起解開」的文字檢查（直接呼叫產生器，不用開瀏覽器）。
// 執行：node tools/test_T3_text.cjs
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const py = [
  'import sys, json; sys.path.insert(0, "tools")',
  'import build_services as b',
  's = b.load_services()',
  'print(json.dumps({"overview": b.overview(s), "details": [b.detail(x, s) for x in s]}))',
].join('\n');
const out = JSON.parse(execFileSync('python', ['-c', py], {cwd: root, encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}}));

const pages = [['overview', out.overview], ...out.details.map((html, i) => ['detail' + i, html])];
assert.equal(out.details.length, 8);

const must = [
  '<h3 class="nature-title">跟川花合作，這是我們想讓您感受到的</h3>',
  '<h4>細心<small>像替幼苗澆水</small></h4><p>在我們開始合作之前，我們會先仔細地將您的品牌競品作全面調查，再加上多年的實戰行銷經驗，給予您最需要的「照顧」。</p>',
  '<h4>溫柔<small>沒有任何急迫，只是陪著你梳理</small></h4><p>當行銷策略卡住、市場緊縮時，我們與您在同一條船上，陪你一起找出卡在哪裡，再一步一步往前走。</p>',
  '<h4>靈活<small>跟著季節換盆</small></h4><p>隨著品牌成長，市場換季、平台改規則…川花團隊獨一無二的細膩與靈敏總能在第一時間抓緊市場動脈，提供最適合您的新策略。</p>',
  '<h4>穩定<small>根扎得夠深</small></h4><p>我們的客戶，大多一起走了十年以上。從品牌剛起步的那一天，一路陪到現在。花會換季，根一直都在。</p>',
];
const mustNot = [
  '不用急著決定。先認識我們是什麼樣的人，再看看要不要一起走。',
  'nature-lead',
  '你會感覺到的',
  '你可以先告訴我們現在的狀況，再一起整理需要的協助。',
  '一起解開的事',
];
for (const [name, html] of pages) {
  for (const text of must) assert.ok(html.includes(text), `${name} 缺少：${text}`);
  for (const text of mustNot) assert.ok(!html.includes(text), `${name} 不該出現：${text}`);
  assert.ok(html.includes('找川花聊聊 →'), `${name} 缺少找川花聊聊按鈕`);
}
for (const [name, html] of pages.slice(1)) {
  assert.ok(html.includes('<h3>陪你一起解開</h3>'), `${name} 缺少「陪你一起解開」`);
  assert.ok(html.includes('填寫需求詢價 →'), `${name} 缺少填寫需求詢價`);
}
console.log('T3 文字檢查通過：總覽 1 頁＋服務 8 頁');
