// T2：每項服務的月維護方案比較表（基本 vs 進階）。直接呼叫產生器，不用開瀏覽器。
// 執行：node tools/test_T2_maintenance.cjs
'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runPy = (code, cwd = root) => execFileSync('python', ['-c', code], {cwd, encoding: 'utf8', stdio: 'pipe', env: {...process.env, PYTHONIOENCODING: 'utf-8'}});
const out = JSON.parse(runPy([
  'import sys, json; sys.path.insert(0, "tools")',
  'import build_services as b',
  's = b.load_services()',
  'print(json.dumps({"slugs": [x["slug"] for x in s], "details": [b.detail(x, s) for x in s]}))',
].join('\n')));
const json = JSON.parse(fs.readFileSync(path.join(root, 'content', 'services.json'), 'utf8')).services;
let checks = 0;
const test = (name, fn) => { try { fn(); checks++; console.log('通過：' + name); } catch (e) { e.message = name + '：' + e.message; throw e; } };
const text = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const pricingOf = html => {
  const m = html.match(/<section class="svc-section svc-section-pricing"[\s\S]*?<\/section>/);
  assert.ok(m, '找不到報價與試算區');
  return m[0];
};
const tableOf = html => {
  const m = pricingOf(html).match(/<table class="svc-maint-table"[\s\S]*?<\/table>/);
  assert.ok(m, '報價與試算區裡沒有維護比較表');
  return m[0];
};

test('八個服務頁的報價與試算區都有月維護比較表，表頭是基本 NT$3,000／進階 NT$8,000', () => {
  assert.equal(out.details.length, 8);
  out.details.forEach((html, i) => {
    const table = tableOf(html);
    const head = text(table.match(/<thead>[\s\S]*?<\/thead>/)[0]);
    assert.ok(head.includes('基本') && head.includes('NT$3,000'), out.slugs[i] + ' 表頭缺基本價：' + head);
    assert.ok(head.includes('進階') && head.includes('NT$8,000'), out.slugs[i] + ' 表頭缺進階價：' + head);
    assert.ok(!head.includes('完整'), out.slugs[i] + ' 不該再叫「完整」');
    assert.ok(pricingOf(html).includes('月維護方案'), out.slugs[i] + ' 要有「月維護方案」標題');
  });
});

test('每列都是「項目 × 基本／進階」，內容照 services.json，✓／—／文字三種寫法', () => {
  out.details.forEach((html, i) => {
    const rows = [...tableOf(html).match(/<tbody>[\s\S]*?<\/tbody>/)[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
    const data = json.find(s => s.slug === out.slugs[i]).maintenance.rows;
    assert.equal(rows.length, data.length, out.slugs[i] + ' 列數');
    assert.ok(rows.length >= 4, out.slugs[i] + ' 至少 4 列');
    const show = v => v === true ? '✓' : v === false ? '—' : v;
    rows.forEach((row, r) => {
      const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(m => text(m[1]).trim());
      assert.deepEqual(cells, [data[r].item, show(data[r].basic), show(data[r].advanced)], out.slugs[i] + ' 第 ' + (r + 1) + ' 列');
    });
    // 進階一定包含基本有的項目（基本有、進階沒有就不合理）。
    data.forEach(row => assert.ok(!(row.basic !== false && row.advanced === false), out.slugs[i] + ' 進階缺基本有的：' + row.item));
    assert.ok(data.some(row => row.basic === false && row.advanced !== false), out.slugs[i] + ' 進階要比基本多東西');
  });
});

test('八張表內容各不相同（項目清單兩兩不同，且每張至少一半項目是自己獨有）', () => {
  const lists = json.map(s => s.maintenance.rows.map(r => r.item));
  const all = lists.flat();
  lists.forEach((items, i) => {
    lists.forEach((other, j) => { if (i !== j) assert.notDeepEqual(items, other, json[i].slug + ' 與 ' + json[j].slug + ' 一樣'); });
    const own = items.filter(item => all.filter(x => x === item).length === 1).length;
    assert.ok(own * 2 >= items.length, json[i].slug + ' 獨有項目太少：' + own + '/' + items.length);
  });
});

test('services.json 的維護價格跟試算器的每月維護一致（basic／full）', () => {
  const {CONFIG} = require('../assets/item-estimator.js');
  json.forEach(s => {
    assert.equal(s.maintenance.basic.price, CONFIG[s.slug].maintenance.basic, s.slug + ' 基本');
    assert.equal(s.maintenance.advanced.price, CONFIG[s.slug].maintenance.full, s.slug + ' 進階');
  });
});

test('試算器維護選項顯示「進階」，鍵名仍是 full', () => {
  const src = fs.readFileSync(path.join(root, 'assets', 'item-estimator.js'), 'utf8');
  assert.ok(src.includes('<option value="full">進階</option>'), '下拉選單要顯示進階');
  assert.ok(!/<option value="full">完整<\/option>/.test(src), '下拉選單不該再顯示完整');
  assert.ok(src.includes("full:'進階'"), '調價面板標籤要是進階');
});

test('產生器會擋下缺少或格式錯誤的 maintenance', () => {
  const bad = [
    s => { delete s.maintenance; },
    s => { s.maintenance.rows = []; },
    s => { s.maintenance.basic.price = '3000'; },
    s => { s.maintenance.rows[0].basic = ''; },
    s => { s.maintenance.rows[0].item = ' '; },
  ];
  bad.forEach((mutate, k) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2-'));
    fs.mkdirSync(path.join(dir, 'content'));
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.copyFileSync(path.join(root, 'tools', 'build_services.py'), path.join(dir, 'tools', 'build_services.py'));
    const data = JSON.parse(fs.readFileSync(path.join(root, 'content', 'services.json'), 'utf8'));
    data.services.forEach(s => {  // 產生器會檢查小花圖檔存在，只複製用到的那幾張。
      fs.mkdirSync(path.dirname(path.join(dir, s.flower)), {recursive: true});
      fs.copyFileSync(path.join(root, s.flower), path.join(dir, s.flower));
    });
    mutate(data.services[0]);
    fs.writeFileSync(path.join(dir, 'content', 'services.json'), JSON.stringify(data));
    assert.throws(() => runPy('import sys; sys.path.insert(0, "tools")\nimport build_services as b\nb.load_services()', dir),
      /maintenance/, '第 ' + (k + 1) + ' 種壞資料沒有被擋下');
    fs.rmSync(dir, {recursive: true, force: true});
  });
});

console.log(`T2 共 ${checks} 組檢查通過。`);
