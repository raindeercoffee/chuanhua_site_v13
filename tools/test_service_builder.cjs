'use strict';
// 獨立驗算：預期金額由測試自行逐項相加，不使用試算函式的計算過程。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../assets/item-estimator.js');
const { CONFIG, COMPLETENESS, calculate, calculateCompleteness, createState, setQuantity, moveItem, formatMoney, renderTotal } = api;
const copy = x => JSON.parse(JSON.stringify(x));
const services = Object.entries(CONFIG);
let checks = 0;
function test(name, fn) { try { fn(); checks++; console.log('通過：' + name); } catch (e) { e.message = name + '：' + e.message; throw e; } }
function independent(service, state) {
  let sum = service.base;
  for (const choice of state.selected) {
    const item = service.items.find(i => i.id === choice.id);
    assert.ok(item, '所選項目必須存在');
    sum += item.price * choice.quantity;
  }
  return { subtotal: sum, low: sum, high: Math.round(sum * 1.2 / 100) * 100, monthly: service.maintenance[state.maintenance] };
}
function verify(service, state) {
  const actual = calculate(service, state), expected = independent(service, state);
  for (const key of Object.keys(expected)) assert.equal(actual[key], expected[key], key);
  if (actual.lines) {
    assert.equal(actual.base, service.base);
    assert.deepEqual(actual.lines, state.selected.map(c => ({ id: c.id, amount: service.items.find(i => i.id === c.id).price * c.quantity })));
  }
  const shown = renderTotal(actual);
  for (const value of [expected.low, expected.high, expected.monthly]) {
    const independentlyFormatted = 'NT$' + String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    assert.ok(shown.includes(independentlyFormatted), shown + ' 缺少 ' + independentlyFormatted);
    assert.equal(formatMoney(value), independentlyFormatted);
  }
}
test('八個服務的預設狀態與設定', () => {
  assert.equal(services.length, 8);
  for (const [slug, service] of services) {
    assert.equal(service.base, 49000, slug);
    assert.ok(service.included.length > 0);
    assert.ok(service.items.some(i => i.selected));
    assert.ok(service.items.some(i => !i.selected));
    assert.ok(service.items.length >= (slug === 'website' ? 14 : 5));
    if (slug !== 'website') assert.ok(service.items.length <= 8);
    for (const item of service.items) { assert.ok(Number.isSafeInteger(item.price) && item.price >= 0); assert.ok(Number.isSafeInteger(item.min) && item.min >= 1); }
    verify(service, createState(service));
  }
  assert.equal(formatMoney(49000), 'NT$49,000');
});
test('拿掉、加回、從可加入區新增與拖放移除', () => {
  for (const [, service] of services) {
    const state = createState(service), start = calculate(service, state).subtotal;
    const chosen = service.items.find(i => i.selected), extra = service.items.find(i => !i.selected);
    moveItem(service, state, chosen.id, 'available');
    assert.equal(calculate(service, state).subtotal, start - chosen.price * chosen.min); verify(service, state);
    moveItem(service, state, chosen.id, 'selected');
    assert.equal(calculate(service, state).subtotal, start); verify(service, state);
    moveItem(service, state, extra.id, 'selected');
    assert.equal(calculate(service, state).subtotal, start + extra.price * extra.min); verify(service, state);
    moveItem(service, state, extra.id, 'available');
    assert.ok(!state.selected.some(c => c.id === extra.id));
    assert.equal(calculate(service, state).subtotal, start); verify(service, state);
    const before = JSON.stringify(state);
    for (const included of service.included) moveItem(service, state, included, 'available');
    assert.equal(JSON.stringify(state), before, '內含項目不可拿掉');
  }
});
test('數量增減與最小數量', () => {
  let count = 0;
  for (const [, service] of services) for (const item of service.items.filter(i => i.unit)) {
    count++; const state = createState(service); moveItem(service, state, item.id, 'selected');
    let previous = calculate(service, state).subtotal;
    for (const diff of [1, 1, -1]) {
      const chosen = state.selected.find(c => c.id === item.id);
      setQuantity(service, state, item.id, chosen.quantity + diff);
      assert.equal(calculate(service, state).subtotal, previous + diff * item.price);
      previous = calculate(service, state).subtotal; verify(service, state);
    }
    setQuantity(service, state, item.id, -100);
    assert.equal(state.selected.find(c => c.id === item.id).quantity, item.min); verify(service, state);
  }
  assert.ok(count >= 4);
});
test('維護方案不影響一次費用', () => {
  for (const [, service] of services) {
    const state = createState(service), initial = calculate(service, state).subtotal;
    for (const plan of Object.keys(service.maintenance)) {
      state.maintenance = plan; const r = calculate(service, state);
      assert.equal(r.subtotal, initial); assert.equal(r.monthly, service.maintenance[plan]); verify(service, state);
    }
  }
});
test('調整價格後立即重新計價', () => {
  const service = copy(CONFIG.website), state = createState(service), item = service.items.find(i => i.selected);
  const start = calculate(service, state).subtotal; item.price += 1300;
  assert.equal(calculate(service, state).subtotal, start + 1300 * item.min); verify(service, state);
  service.base += 700; assert.equal(calculate(service, state).subtotal, start + 1300 * item.min + 700); verify(service, state);
  service.maintenance.basic = 4700; state.maintenance = 'basic'; verify(service, state);
});
test('每個服務隨機操作 200 次，逐步獨立加總', () => {
  let seed = 438153; const rand = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n);
  for (const [, original] of services) {
    const service = copy(original), state = createState(service);
    for (let step = 0; step < 200; step++) {
      const item = service.items[rand(service.items.length)], action = rand(5);
      if (action === 0) moveItem(service, state, item.id, 'available');
      if (action === 1) moveItem(service, state, item.id, 'selected', rand(state.selected.length + 1));
      if (action === 2 && state.selected.length) { const choice = state.selected[rand(state.selected.length)]; setQuantity(service, state, choice.id, choice.quantity + (rand(2) ? 1 : -1)); }
      if (action === 3 && state.selected.length) { const choice = state.selected[rand(state.selected.length)]; moveItem(service, state, choice.id, 'selected', rand(state.selected.length)); }
      if (action === 4) state.maintenance = ['none', 'basic', 'full'][rand(3)];
      assert.equal(new Set(state.selected.map(c => c.id)).size, state.selected.length);
      verify(service, state);
    }
  }
});
test('規劃完整度依已選種類計算，與價格相互獨立', () => {
  for (const [, original] of services) {
    const service = copy(original), state = createState(service);
    state.selected = [];
    assert.equal(calculateCompleteness(service, state), 80);
    const basePrice = calculate(service, state).subtotal;
    assert.equal(basePrice, service.base);
    const first = service.items[0];
    moveItem(service, state, first.id, 'selected');
    const afterOne = calculateCompleteness(service, state);
    assert.ok(afterOne > 80);
    assert.equal(calculate(service, state).subtotal, basePrice + first.price * first.min);
    if (first.unit) { setQuantity(service, state, first.id, 3); assert.equal(calculateCompleteness(service, state), afterOne); }
    moveItem(service, state, first.id, 'available');
    assert.equal(calculateCompleteness(service, state), 80);
    for (const item of service.items) moveItem(service, state, item.id, 'selected');
    assert.equal(calculateCompleteness(service, state), 99);
    moveItem(service, state, first.id, 'available');
    assert.ok(calculateCompleteness(service, state) < 99);
  }
  assert.equal(calculateCompleteness({items:[]}, {selected:[]}), 80);
  assert.equal(calculateCompleteness({items:[{id:'x'}]}, {selected:[{id:'x'}]}, {base:60, span:30}), 90);
  assert.deepEqual(COMPLETENESS, {base:80, span:19, duration:800, badgeDuration:1500});
});
test('頁面實際渲染金額與調價輸入', () => {
  const elements = new Map();
  function element(selector) { if (!elements.has(selector)) elements.set(selector, { textContent:'', innerHTML:'', hidden:false, value:'', style:{setProperty(){}}, setAttribute(){}, classList:{ add(){}, remove(){} } }); return elements.get(selector); }
  const handlers = {};
  const root = { dataset:{service:'website'}, innerHTML:'', querySelector:element, addEventListener(type, fn){ handlers[type] = fn; } };
  const storage = {};
  global.document = { querySelectorAll(){ return [root]; } };
  global.window = { matchMedia(){ return {matches:true}; }, addEventListener(){} };
  global.location = { search:'?price=edit' };
  global.localStorage = { getItem(k){ return storage[k] || null; }, setItem(k,v){ storage[k]=v; } };
  try {
    api.mountAll();
    const service = copy(CONFIG.website), state = createState(service), result = calculate(service, state);
    assert.equal(element('.ie-price').textContent, formatMoney(result.subtotal));
    assert.equal(element('.ie-completion-number').textContent, calculateCompleteness(service, state) + '%');
    assert.ok(element('.ie-range').textContent.includes(formatMoney(result.high)));
    assert.ok(element('.ie-monthly').textContent.includes(formatMoney(result.monthly)));
    assert.equal(element('.ie-editor').hidden, false);
    const chosen = service.items.find(i => i.selected);
    const input = { value: String(chosen.price + 1700), dataset:{price:'item',id:chosen.id}, closest(){ return this; } };
    handlers.input({target:input}); chosen.price += 1700;
    const changed = calculate(service,state);
    assert.equal(element('.ie-price').textContent, formatMoney(changed.subtotal));
    assert.ok(element('.ie-range').textContent.includes(formatMoney(changed.high)));
    assert.equal(JSON.parse(storage['ch-item-prices-v1']).website.items[chosen.id], chosen.price);
    // 按下摘要時傳給畫面的結果，和目前試算同一份資料。
    let summary; window.openPlanSummary = value => { summary = value; };
    const click = (action, id) => {
      const button = {dataset:{action}, closest(selector){ return selector === '[data-id]' ? (id ? {dataset:{id}} : null) : this; }};
      handlers.click({target:button});
    };
    const checkSummary = () => {
      click('contact'); assert.ok(summary);
      const expected = calculate(service,state);
      assert.deepEqual(summary.result, expected);
      assert.equal(summary.completeness, calculateCompleteness(service,state));
      assert.equal(element('.ie-price').textContent, formatMoney(summary.result.subtotal));
      assert.ok(element('.ie-range').textContent.includes(formatMoney(summary.result.low)));
      assert.ok(element('.ie-range').textContent.includes(formatMoney(summary.result.high)));
      assert.ok(element('.ie-monthly').textContent.includes(formatMoney(summary.result.monthly)));
    };
    checkSummary();
    click('remove',chosen.id); moveItem(service,state,chosen.id,'available'); checkSummary();
    click('add',chosen.id); moveItem(service,state,chosen.id,'selected'); checkSummary();
    const withUnit = service.items.find(i => i.selected && i.unit);
    if (withUnit) { click('plus',withUnit.id); setQuantity(service,state,withUnit.id,2); checkSummary(); }
    handlers.change({target:{dataset:{action:'maintenance'},value:'basic'}}); state.maintenance='basic'; checkSummary();
  } finally { delete global.document; delete global.window; delete global.location; delete global.localStorage; }
});
console.log(`共 ${checks} 組檢查通過。`);
