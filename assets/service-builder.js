/* 川花「服務規劃試算」示範價格表。
 * 改價只改這一個物件；金額單位都是新臺幣，非正式報價。
 * tiers 是三種方案總價；quantityPrice 是超過內含數量後，每一單位的加價。
 * discount.enabled 設 false 即關閉多項服務優惠；0.95 是九五折、0.9 是九折。
 * 網址加 ?price=edit 可開調價工具；個人修改只存在目前瀏覽器。
 */
const CH_PRICING = {
  services: {
    ads: { tiers: { basic: 49000, advanced: 69000, complete: 99000 }, addons: { creative: 12000, pixel: 6000, report: 5000, landing: 18000 }, quantityPrice: 18000 },
    brand: { tiers: { basic: 49000, advanced: 89000, complete: 139000 }, addons: { positioning: 18000, identity: 22000, guide: 12000, launch: 20000 }, quantityPrice: 0 },
    workflow: { tiers: { basic: 49000, advanced: 79000, complete: 119000 }, addons: { line: 12000, sheets: 8000, training: 10000, monitor: 12000 }, quantityPrice: 18000 },
    content: { tiers: { basic: 49000, advanced: 69000, complete: 99000 }, addons: { voice: 10000, product: 8000, social: 12000, library: 15000 }, quantityPrice: 6000 },
    tools: { tiers: { basic: 49000, advanced: 89000, complete: 149000 }, addons: { dashboard: 18000, api: 20000, access: 12000, training: 10000 }, quantityPrice: 25000 },
    website: { tiers: { basic: 49000, advanced: 89000, complete: 139000 }, addons: { cart: 25000, member: 18000, booking: 15000, language: 20000, seo: 12000 }, quantityPrice: 6000 },
    'ads-audit': { tiers: { basic: null, advanced: null, complete: null }, addons: {}, quantityPrice: null },
    'ad-ops': { tiers: { basic: null, advanced: null, complete: null }, addons: {}, quantityPrice: null }
  },
  maintenance: { none: 0, basic: 3000, complete: 8000 },
  discount: { enabled: true, twoServices: 0.95, threeOrMore: 0.9 },
  rangeMultiplier: 1.2
};

(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const DEFAULT_PRICING = clone(CH_PRICING);
  const SERVICES = [
    { id: 'ads', name: '數位廣告投放', description: '從預算配置、素材測試到 ROAS 與廣告占比管理，Meta、Google、LINE 廣告一起看。不是花錢買流量，是找到最對的那群人。', addons: [{ id: 'creative', name: '廣告素材製作' }, { id: 'pixel', name: '追蹤碼設定' }, { id: 'report', name: '成效月報' }, { id: 'landing', name: '活動落地頁' }], quantity: { label: '廣告代操月數', unit: '個月', included: 1, min: 1, max: 24 } },
    { id: 'brand', name: '品牌整合行銷', description: '從企業轉型、內容企劃到廣告轉換，串起每一個消費者的完美購物體驗。讓商品不只是被販售，而是品牌能被記住的完美記憶點。', addons: [{ id: 'positioning', name: '品牌定位' }, { id: 'identity', name: '視覺識別整合' }, { id: 'guide', name: '品牌溝通指南' }, { id: 'launch', name: '品牌上市企劃' }], quantity: null },
    { id: "ads-audit", name: "廣告帳戶健檢", description: "把帳戶、素材與再行銷一起看，用白話說清楚問題，列出先處理哪一件。", addons: [], quantity: null },
    { id: 'website', name: '品牌官網製作', description: '從品牌風格、內容架構到手機版排版，協助規劃與製作官網，並依需求串接表單、預約與 AI 工具。', addons: [{ id: 'cart', name: '購物車' }, { id: 'member', name: '會員功能' }, { id: 'booking', name: '預約系統' }, { id: 'language', name: '多語系' }, { id: 'seo', name: 'SEO 架構' }], quantity: { label: '官網頁數', unit: '頁', included: 5, min: 5, max: 50 } },
    { id: 'workflow', name: 'AI 工作流程自動化', description: '把資料整理、表單彙整與重複上稿串成清楚的工作流程，依你的做事方式規劃，讓每天重複的操作少一點。', addons: [{ id: 'line', name: 'LINE 串接' }, { id: 'sheets', name: 'Google Sheet 串接' }, { id: 'training', name: '員工教學' }, { id: 'monitor', name: '流程異常提醒' }], quantity: { label: '自動化流程條數', unit: '條', included: 1, min: 1, max: 20 } },
    { id: 'content', name: 'AI 文案與內容生成', description: '從品牌語氣、商品文案到社群貼文，建立適合你的內容生成流程。讓 AI 協助打底，保留品牌自己的聲音。', addons: [{ id: 'voice', name: '品牌語氣訓練' }, { id: 'product', name: '商品文案範本' }, { id: 'social', name: '社群貼文範本' }, { id: 'library', name: '品牌素材知識庫' }], quantity: { label: '內容範本組數', unit: '組', included: 1, min: 1, max: 30 } },
    { id: 'tools', name: 'AI 客製工具開發', description: '依實際需求規劃報表、記帳或資料查詢工具，串接既有表單與系統。從最卡手的小事開始，做出真正用得上的幫手。', addons: [{ id: 'dashboard', name: '報表儀表板' }, { id: 'api', name: '既有系統串接' }, { id: 'access', name: '使用者權限' }, { id: 'training', name: '操作教學' }], quantity: { label: '客製工具數量', unit: '個', included: 1, min: 1, max: 10 } },
    { id: "ad-ops", name: "加速下廣告", description: "將上稿表轉成可匯入檔案，批次處理影片與檢查欄位，讓團隊把時間留給判斷。", addons: [], quantity: null }
  ];
  const byId = id => SERVICES.find(service => service.id === id);
  const TIERS = { basic: '基本', advanced: '進階', complete: '完整' };
  const MAINTENANCE = { none: '不需要', basic: '基本維護', complete: '完整維護' };
  const SCENARIOS = [
    { id: 'ads', label: '廣告花了錢，卻不知道有沒有效', priority: ['ads', 'content'] },
    { id: 'brand', label: '品牌看起來和別人一樣', priority: ['brand'] },
    { id: 'repeat', label: '每天花很多時間做重複的事', priority: ['workflow', 'tools', 'content'] },
    { id: 'website', label: '需要一個能代表品牌的官網', priority: ['website', 'brand', 'content'] },
    { id: 'ai', label: '想用 AI，但不知道從哪開始', priority: ['workflow', 'content', 'tools'] }
  ];

  function createState() {
    const choices = {};
    SERVICES.forEach(service => { choices[service.id] = { tier: 'basic', addons: [], quantity: service.quantity ? service.quantity.included : 1 }; });
    return { active: SERVICES.map(service => service.id), removed: [], choices, maintenance: 'none', expanded: 'ads', scenario: null };
  }
  function moveService(state, id, toIndex) {
    const from = state.active.indexOf(id);
    if (from < 0 || !Number.isFinite(Number(toIndex))) return false;
    const to = Math.max(0, Math.min(state.active.length - 1, Math.trunc(Number(toIndex))));
    state.active.splice(from, 1); state.active.splice(to, 0, id);
    return true;
  }
  function removeService(state, id) {
    const index = state.active.indexOf(id);
    if (index < 0) return false;
    state.active.splice(index, 1);
    if (!state.removed.includes(id)) state.removed.push(id);
    if (state.expanded === id) state.expanded = state.active[0] || null;
    return true;
  }
  function restoreService(state, id, index = state.active.length) {
    if (!byId(id) || state.active.includes(id) || !state.removed.includes(id)) return false;
    state.removed.splice(state.removed.indexOf(id), 1);
    state.active.splice(Math.max(0, Math.min(state.active.length, Math.trunc(Number(index)) || 0)), 0, id);
    if (!state.expanded) state.expanded = id;
    return true;
  }
  function selectScenario(state, id) {
    const scenario = SCENARIOS.find(item => item.id === id);
    if (!scenario) return false;
    const priority = item => { const n = scenario.priority.indexOf(item); return n < 0 ? 100 : n; };
    state.active.sort((a, b) => priority(a) - priority(b));
    state.scenario = id;
    state.expanded = state.active[0] || null;
    return true;
  }
  function setTier(state, id, tier) {
    if (!byId(id) || !Object.hasOwn(TIERS, tier)) return false;
    state.choices[id].tier = tier; return true;
  }
  function toggleAddon(state, id, addonId, force) {
    const service = byId(id);
    if (!service || !service.addons.some(addon => addon.id === addonId)) return false;
    const selected = state.choices[id].addons;
    const index = selected.indexOf(addonId);
    const add = typeof force === 'boolean' ? force : index < 0;
    if (add && index < 0) selected.push(addonId);
    if (!add && index >= 0) selected.splice(index, 1);
    return true;
  }
  function setQuantity(state, id, count) {
    const service = byId(id);
    if (!service || !service.quantity || !Number.isFinite(Number(count))) return false;
    state.choices[id].quantity = Math.max(service.quantity.min, Math.min(service.quantity.max, Math.trunc(Number(count))));
    return true;
  }
  function setMaintenance(state, key) {
    if (!Object.hasOwn(MAINTENANCE, key)) return false;
    state.maintenance = key; return true;
  }
  function calculate(state, pricing = CH_PRICING) {
    const breakdown = state.active.map((id, index) => {
      const service = byId(id), choice = state.choices[id], price = pricing.services[id];
      const tierPrice = price.tiers[choice.tier];
      const quantityCost = service.quantity ? Math.max(0, choice.quantity - service.quantity.included) * price.quantityPrice : 0;
      const addons = choice.addons.map(key => ({ id: key, name: service.addons.find(addon => addon.id === key).name, price: price.addons[key] }));
      return { id, name: service.name, rank: index + 1, tier: choice.tier, tierPrice, quantity: choice.quantity, quantityCost, addons, subtotal: Number.isFinite(tierPrice) ? tierPrice + quantityCost + addons.reduce((sum, addon) => sum + addon.price, 0) : null };
    });
    const quoted = breakdown.filter(item => Number.isFinite(item.subtotal));
    const unquoted = breakdown.filter(item => !Number.isFinite(item.subtotal));
    const rawSubtotal = quoted.reduce((sum, item) => sum + item.subtotal, 0);
    const discountRate = !pricing.discount.enabled ? 1 : quoted.length >= 3 ? pricing.discount.threeOrMore : quoted.length === 2 ? pricing.discount.twoServices : 1;
    const knownLow = Math.round(rawSubtotal * discountRate);
    const onceLow = unquoted.length ? null : knownLow;
    return { breakdown, unquoted, rawSubtotal, discountRate, discountAmount: rawSubtotal - knownLow, onceLow, onceHigh: unquoted.length ? null : Math.round(onceLow * pricing.rangeMultiplier), monthly: state.active.length ? pricing.maintenance[state.maintenance] : 0 };
  }
  function updatePrice(pricing, path, value) {
    const keys = Array.isArray(path) ? path.slice() : String(path).split('.');
    if (!keys.length || keys.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) return false;
    let target = pricing, reference = DEFAULT_PRICING;
    for (const key of keys.slice(0, -1)) {
      if (!target || !Object.hasOwn(target, key) || !reference || !Object.hasOwn(reference, key)) return false;
      target = target[key]; reference = reference[key];
    }
    const key = keys[keys.length - 1];
    if (!reference || !Object.hasOwn(reference, key) || !Object.hasOwn(target, key)) return false;
    if (typeof reference[key] === 'boolean') {
      if (typeof value !== 'boolean') return false;
      target[key] = value; return true;
    }
    if (typeof reference[key] !== 'number' || !['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return false;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100000000) return false;
    if (keys[0] === 'discount' && number > 1) return false;
    if (keys[0] === 'rangeMultiplier' && (number < 1 || number > 5)) return false;
    target[key] = number; return true;
  }
  const resetPricing = () => clone(DEFAULT_PRICING);
  const money = amount => Number.isFinite(amount) ? 'NT$' + Math.round(amount).toLocaleString('en-US') : '洽詢';
  function buildSummary(state, pricing = CH_PRICING) {
    const total = calculate(state, pricing);
    const lines = ['川花｜我的服務規劃', '示範數字，正式報價以需求訪談為準', ''];
    total.breakdown.forEach(item => {
      const service = byId(item.id);
      lines.push(`第 ${item.rank} 名｜${item.name}｜${TIERS[item.tier]}方案`);
      if (service.quantity) lines.push(`${service.quantity.label}：${item.quantity} ${service.quantity.unit}（內含 ${service.quantity.included} ${service.quantity.unit}，額外 ${money(item.quantityCost)}）`);
      lines.push('加值項目：' + (item.addons.length ? item.addons.map(addon => `${addon.name} ${money(addon.price)}`).join('、') : '無'));
      lines.push(`服務小計：${money(item.subtotal)}`, '');
    });
    lines.push(`第一階段先做：${total.breakdown.length ? total.breakdown[0].name : '尚未選擇服務'}`);
    lines.push(`原始小計：${money(total.rawSubtotal)}；多項服務優惠省下 ${money(total.discountAmount)}`);
    if (total.unquoted.length) lines.push('待洽詢服務：' + total.unquoted.map(item => item.name).join('、') + '；上述已定價小計不含洽詢項目。');
    lines.push(total.unquoted.length ? '一次費用預估：洽詢（含未定價服務）' : `一次費用預估：${money(total.onceLow)} ～ ${money(total.onceHigh)}`);
    lines.push(`每月維護：${MAINTENANCE[state.maintenance]}，${money(total.monthly)}／月`);
    return lines.join('\n');
  }

  const api = { SERVICES, SCENARIOS, DEFAULT_PRICING, createState, moveService, removeService, restoreService, selectScenario, toggleAddon, setTier, setQuantity, setMaintenance, calculate, buildSummary, updatePrice, resetPricing, init };
  globalThis.CHBuild = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }

  function init() {
    const root = document.getElementById('ch-builder');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const activeList = root.querySelector('#ch-active-list');
    const removedList = root.querySelector('#ch-removed-list');
    const details = root.querySelector('#ch-details');
    const summary = root.querySelector('#ch-summary');
    const scenarios = root.querySelector('#ch-scenarios');
    const announcer = root.querySelector('#ch-announcement');
    const gear = root.querySelector('#ch-price-gear');
    const editor = root.querySelector('#ch-price-editor');
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
    const storeKey = 'chuanhua-service-builder-pricing-v1';
    const state = createState();
    let pricing = resetPricing(), drawerOpen = false, drag = null, pending = null, ignoreClickUntil = 0;
    let animatedLow = 0, animatedHigh = 0, priceFrame = 0, priceTimer = 0, priceRun = 0, finishPrice = null, dragFrame = 0, editorReturnFocus = null;
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const flower = id => '/assets/quiz-plants/' + ['lavender', 'rose', 'rosemary', 'chamomile'][SERVICES.findIndex(item => item.id === id) % 4] + '.png';
    function announce(text) { if (announcer) announcer.textContent = text; }
    function mergeSaved(target, saved, path = []) {
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
      Object.keys(target).forEach(key => {
        if (!Object.hasOwn(saved, key)) return;
        if (target[key] && typeof target[key] === 'object') mergeSaved(target[key], saved[key], path.concat(key));
        else updatePrice(pricing, path.concat(key), saved[key]);
      });
    }
    try { mergeSaved(pricing, JSON.parse(localStorage.getItem(storeKey))); } catch (_) { /* 瀏覽器禁止儲存或舊資料損壞時，沿用預設。 */ }
    function savePrices() {
      try { localStorage.setItem(storeKey, JSON.stringify(pricing)); return true; }
      catch (_) { announce('價格已在本頁更新；目前瀏覽器無法儲存，關閉後會回到預設。'); return false; }
    }
    api.getState = () => clone(state);
    api.getPricing = () => clone(pricing);
    function snapshotRows() {
      return new Map([...activeList.querySelectorAll('.ch-row')].map(row => [row.dataset.service, row.getBoundingClientRect()]));
    }
    function animateRows(before) {
      if (reduced || typeof Element === 'undefined' || !Element.prototype.animate) return;
      activeList.querySelectorAll('.ch-row:not([hidden])').forEach(row => {
        const old = before.get(row.dataset.service);
        if (!old) return;
        const now = row.getBoundingClientRect();
        if (Math.abs(old.top - now.top) > 1) row.animate([{ transform: `translateY(${old.top - now.top}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }
    function restoreFocus(key) {
      if (!key) return;
      requestAnimationFrame(() => {
        const node = [...root.querySelectorAll('[data-focus]')].find(item => item.dataset.focus === key);
        if (node && !node.disabled) node.focus({ preventScroll: true });
        else if (node && node.disabled && key.startsWith('quantity-')) {
          const alternative = details.querySelector('.ch-counter button:not(:disabled)');
          if (alternative) alternative.focus({ preventScroll: true });
        }
        else if (node && node.disabled && node.closest('.ch-row')) node.closest('.ch-row').querySelector('.ch-drag-handle').focus({ preventScroll: true });
      });
    }
    function renderScenarios() {
      scenarios.innerHTML = SCENARIOS.map((item, index) => `<button type="button" class="ch-scenario${state.scenario === item.id ? ' is-selected' : ''}" data-action="scenario" data-scenario="${item.id}" data-focus="scenario-${item.id}" aria-pressed="${state.scenario === item.id}"><span class="ch-scenario-number">0${index + 1}</span><span>${item.label}</span></button>`).join('');
    }
    function renderRows(highlight = false) {
      const before = snapshotRows();
      activeList.innerHTML = state.active.map((id, index) => {
        const service = byId(id), expanded = state.expanded === id;
        return `<li class="ch-row${expanded ? ' is-selected' : ''}${index < 3 ? ' ch-top-three' : ''}${highlight && index < 3 ? ' ch-highlight' : ''}" data-service="${id}" aria-posinset="${index + 1}" aria-setsize="${state.active.length}"><div class="ch-row-head"><span class="ch-rank" aria-label="第 ${index + 1} 名">${String(index + 1).padStart(2, '0')}</span><button type="button" class="ch-drag-handle" data-action="handle" data-service="${id}" data-focus="handle-${id}" aria-label="拖拉排序${service.name}，目前第 ${index + 1} 名；鍵盤上下鍵移動" title="按住拖拉，也可用鍵盤上下鍵">≡</button><img class="ch-flower" src="${flower(id)}" alt="" aria-hidden="true" width="32" height="40"><button type="button" class="ch-row-copy" data-action="expand" data-service="${id}" data-focus="expand-${id}" aria-expanded="${expanded}" aria-controls="ch-details"><span class="ch-row-title">${service.name}</span><span class="ch-row-desc">${service.description.split('。')[0]}。</span><span class="ch-expand">${expanded ? '正在搭配 ↓' : '展開細項 ↗'}</span></button><div class="ch-row-tools"><button type="button" data-action="up" data-service="${id}" data-focus="up-${id}" aria-label="${service.name}往上移" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="down" data-service="${id}" data-focus="down-${id}" aria-label="${service.name}往下移" ${index === state.active.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-action="remove" data-service="${id}" data-focus="remove-${id}" aria-label="暫時拿掉${service.name}">×</button></div></div></li>`;
      }).join('') || '<li class="ch-empty">先從下方加回一項服務，再慢慢搭配。</li>';
      removedList.innerHTML = state.removed.map(id => `<div class="ch-removed-item" data-service="${id}"><button type="button" class="ch-drag-handle" data-action="removed-handle" data-service="${id}" data-focus="removed-${id}" aria-label="將${byId(id).name}拖回清單，或按 Enter 加回">≡</button><span>${byId(id).name}</span><button type="button" data-action="restore" data-service="${id}" data-focus="restore-${id}" aria-label="加回${byId(id).name}">＋ 加回</button></div>`).join('') || '<p class="ch-empty">想先放一放的服務，按 × 或拖到這裡。之後隨時加回。</p>';
      animateRows(before);
    }
    function renderDetails(bounceId) {
      const id = state.expanded;
      if (!id || !state.active.includes(id)) {
        details.innerHTML = '<p class="ch-empty">加回一項服務，就可以開始規劃。</p>'; return;
      }
      const service = byId(id), choice = state.choices[id], price = pricing.services[id];
      const subtotal = calculate(state, pricing).breakdown.find(item => item.id === id).subtotal;
      const tierNotes = { basic: '核心規劃・一次交付', advanced: '加深規劃・兩輪優化', complete: '整體整合・交付陪跑' };
      details.innerHTML = `<div class="ch-detail-heading"><img class="ch-flower" src="${flower(id)}" width="36" height="44" alt=""><div><p class="ch-price-caption">第 ${state.active.indexOf(id) + 1} 名・往下一層搭配</p><h3>${service.name}</h3></div></div><fieldset class="ch-tier-field"><legend>先選方案級距</legend><div class="ch-tier-grid">${Object.entries(TIERS).map(([tier, label]) => `<button type="button" class="ch-tier${choice.tier === tier ? ' is-selected' : ''}" data-action="tier" data-service="${id}" data-tier="${tier}" data-focus="tier-${tier}" aria-pressed="${choice.tier === tier}"><strong>${label}</strong><span>${tierNotes[tier]}</span><b>${money(price.tiers[tier])}</b></button>`).join('')}</div></fieldset><div class="ch-tray" data-service="${id}" aria-label="${service.name}已選項目區"><p class="ch-tray-label">已選項目 <span>把項目拖進來，或直接點選下方項目</span></p><span class="ch-tray-base">${TIERS[choice.tier]}方案</span>${choice.addons.map(key => { const addon = service.addons.find(item => item.id === key); return `<button type="button" class="ch-tray-block${bounceId === key ? ' ch-pop' : ''}" data-action="tray-addon" data-service="${id}" data-addon="${key}" data-focus="tray-${key}" aria-label="拿掉${addon.name}，也可以拖出已選項目區">${addon.name}<span>${money(price.addons[key])} ×</span></button>`; }).join('')}${choice.addons.length ? '' : '<p class="ch-tray-empty">加入你需要的加值項目。</p>'}</div><h4 class="ch-addon-title">加值項目</h4><div class="ch-addon-grid">${service.addons.map(addon => `<button type="button" class="ch-addon${choice.addons.includes(addon.id) ? ' is-selected' : ''}" data-action="addon" data-service="${id}" data-addon="${addon.id}" data-focus="addon-${addon.id}" aria-pressed="${choice.addons.includes(addon.id)}"><span>${choice.addons.includes(addon.id) ? '✓' : '＋'} ${addon.name}</span><b>＋${money(price.addons[addon.id])}</b></button>`).join('')}</div>${service.quantity ? `<div class="ch-quantity"><div><h4>${service.quantity.label}</h4><p>方案內含 ${service.quantity.included} ${service.quantity.unit}；增加每${service.quantity.unit} ${money(price.quantityPrice)}</p></div><div class="ch-counter"><button type="button" data-action="minus" data-service="${id}" data-focus="quantity-minus" aria-label="減少${service.quantity.label}" ${choice.quantity <= service.quantity.min ? 'disabled' : ''}>−</button><output aria-label="${service.quantity.label}">${choice.quantity} ${service.quantity.unit}</output><button type="button" data-action="plus" data-service="${id}" data-focus="quantity-plus" aria-label="增加${service.quantity.label}" ${choice.quantity >= service.quantity.max ? 'disabled' : ''}>＋</button></div></div>` : ''}<p class="ch-subtotal"><span>這項服務小計</span><strong>${money(subtotal)}</strong><small>尚未套用多項服務優惠</small></p>`;
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden && finishPrice) finishPrice(); });
    function animatePrice(low, high) {
      cancelAnimationFrame(priceFrame);
      clearTimeout(priceTimer);
      const run = ++priceRun;
      const lowNode = summary.querySelector('[data-price-low]'), highNode = summary.querySelector('[data-price-high]');
      const topLowNode = root.querySelector('[data-price-top-low]'), topHighNode = root.querySelector('[data-price-top-high]');
      if (!lowNode || !highNode) return;
      const startLow = animatedLow, startHigh = animatedHigh;
      function paint(a, b) {
        animatedLow = a; animatedHigh = b;
        lowNode.textContent = money(a); highNode.textContent = money(b);
        if (topLowNode) topLowNode.textContent = money(a);
        if (topHighNode) topHighNode.textContent = money(b);
      }
      let finished = false;
      function finish() {
        if (finished || run !== priceRun) return;
        finished = true; clearTimeout(priceTimer); cancelAnimationFrame(priceFrame);
        paint(low, high); finishPrice = null;
      }
      // Always paint the final value first; animation is only an enhancement.
      paint(low, high);
      finishPrice = finish;
      if (reduced || document.hidden || !Number.isFinite(low) || !Number.isFinite(high)) { finish(); return; }
      priceTimer = setTimeout(finish, 1000);
      const start = performance.now();
      const draw = now => {
        if (finished || run !== priceRun) return;
        const progress = Math.min(1, Math.max(0, (now - start) / 260));
        const eased = 1 - Math.pow(1 - progress, 3);
        paint(startLow + (low - startLow) * eased, startHigh + (high - startHigh) * eased);
        if (progress < 1) priceFrame = requestAnimationFrame(draw);
        else finish();
      };
      priceFrame = requestAnimationFrame(draw);
    }
    function renderSummary() {
      const total = calculate(state, pricing);
      summary.classList.toggle('is-open', drawerOpen);
      summary.innerHTML = `<button type="button" class="ch-summary-toggle" data-action="drawer" aria-expanded="${drawerOpen}" aria-controls="ch-summary-body" data-focus="drawer"><span>目前預估・一次費用</span><strong class="ch-total-number" aria-label="${money(total.onceLow)} 至 ${money(total.onceHigh)}"><span data-price-low>${money(animatedLow)}</span><span class="ch-price-range">～ <span data-price-high>${money(animatedHigh)}</span></span></strong><span class="ch-drawer-label">${drawerOpen ? '收起明細 ↓' : '展開明細 ↑'}</span></button><div class="ch-summary-body" id="ch-summary-body"><h3>你的服務配置</h3>${total.unquoted.length ? '<p>洽詢項目：' + total.unquoted.map(item => escape(item.name)).join('、') + '；已定價小計不含這些項目。</p>' : ''}<p class="ch-first-phase">第一階段先做：<strong>${total.breakdown.length ? total.breakdown[0].name : '還沒選擇'}</strong></p><div class="ch-summary-items">${total.breakdown.map(item => `<div class="ch-summary-item"><span>${item.rank}. ${item.name}<small>${TIERS[item.tier]}${byId(item.id).quantity ? '・' + item.quantity + byId(item.id).quantity.unit : ''}${item.addons.length ? '・加購 ' + item.addons.length + ' 項' : ''}</small></span><b>${money(item.subtotal)}</b></div>`).join('') || '<p class="ch-empty">還沒有服務，從左邊加回一項吧。</p>'}</div><div class="ch-discount"><p><span>已定價服務小計</span><b>${money(total.rawSubtotal)}</b></p><p><span>${total.discountRate < 1 ? `多項服務優惠・${total.breakdown.length - total.unquoted.length === 2 ? '兩項' : '三項以上'} ${Number((total.discountRate * 10).toFixed(2))} 折示範` : '多項服務優惠'}</span><b>−${money(total.discountAmount)}</b></p></div><label class="ch-maintenance-label" for="ch-maintenance">每月維護（選填，不計入一次費用）</label><select class="ch-maintenance" id="ch-maintenance" data-action="maintenance" data-focus="maintenance">${Object.entries(MAINTENANCE).map(([key, label]) => `<option value="${key}" ${state.maintenance === key ? 'selected' : ''}>${label}${key === 'none' ? '' : '・' + money(pricing.maintenance[key]) + '／月'}</option>`).join('')}</select><p class="ch-monthly">每月維護 <strong>${money(total.monthly)}／月</strong></p><p class="ch-demo-note">示範數字，正式報價以需求訪談為準。<br>方案內容、加購與多項服務優惠皆為展示用途。</p><button type="button" class="ch-contact btn" data-action="contact" data-focus="contact" ${state.active.length ? '' : 'disabled'}>帶著這份規劃找川花聊聊 ↗</button><p class="ch-copy-status" role="status" aria-live="polite"></p><div class="ch-copy-help" hidden><label for="ch-copy-text">若無法自動複製，請選取下方文字後複製：</label><textarea id="ch-copy-text" class="ch-copy-fallback" readonly rows="7"></textarea><a href="https://line.me/R/ti/p/@riverflower2025" target="_blank" rel="noopener">開啟川花官方 LINE →</a></div></div>`;
      const toggle = summary.querySelector('.ch-summary-toggle');
      toggle.setAttribute('aria-expanded', String(!isMobile() || drawerOpen));
      toggle.querySelector('.ch-drawer-label').classList.add('ch-summary-toggle-icon');
      animatePrice(total.onceLow, total.onceHigh);
    }
    function renderAll(options = {}) {
      renderScenarios(); renderRows(options.highlight); renderDetails(options.bounce); renderSummary();
      restoreFocus(options.focus);
    }
    function getFocus() { return document.activeElement && document.activeElement.dataset.focus; }
    function rowMove(id, index, key) {
      moveService(state, id, index); renderRows(); renderDetails(); renderSummary();
      restoreFocus(key || 'handle-' + id);
      announce(`${byId(id).name}已排到第 ${state.active.indexOf(id) + 1} 名。`);
    }
    async function contact() {
      const text = buildSummary(state, pricing);
      const status = summary.querySelector('.ch-copy-status');
      // 在使用者點擊當下開啟，避免複製完成後被瀏覽器當成彈出視窗攔下。
      let opened = null;
      try { opened = window.open('https://line.me/R/ti/p/@riverflower2025', '_blank'); if (opened) opened.opener = null; } catch (_) { /* 下方仍保留可按的官方連結。 */ }
      let copied = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); copied = true; } } catch (_) { /* 改用可見文字讓訪客自行複製。 */ }
      if (!copied) {
        const help = summary.querySelector('.ch-copy-help'), field = summary.querySelector('.ch-copy-fallback');
        help.hidden = false; field.value = text;
        drawerOpen = true; summary.classList.add('is-open');
        summary.querySelector('.ch-summary-toggle').setAttribute('aria-expanded', 'true');
        field.focus(); field.select();
        try { copied = document.execCommand('copy'); } catch (_) { /* 手動複製的文字仍保留。 */ }
      }
      status.textContent = copied ? (opened ? '規劃已複製，請貼到官方 LINE 對話裡。' : '規劃已複製，請按下方連結開啟官方 LINE。') : '請複製下方規劃文字，再貼到官方 LINE。';
      if (!opened) {
        const help = summary.querySelector('.ch-copy-help'), field = summary.querySelector('.ch-copy-fallback');
        help.hidden = false; field.value = text;
      }
    }
    function priceInput(path, label, value, options = {}) {
      const id = 'ch-edit-' + path.join('-');
      return `<label for="${id}"><span>${label}</span><input id="${id}" data-price-path="${path.join('.')}" type="number" value="${value}" min="${options.min === undefined ? 0 : options.min}" max="${options.max || 100000000}" step="${options.step || 1000}" inputmode="decimal"></label>`;
    }
    function renderEditor() {
      editor.innerHTML = `<div class="ch-editor-panel"><div class="ch-editor-head"><div><h2 id="ch-editor-title">示範調價工具</h2><p>修改立即生效，只存在這台裝置的瀏覽器。</p></div><button type="button" data-action="editor-close" aria-label="關閉調價工具">×</button></div><div class="ch-editor-fields">${SERVICES.map(service => {
        const price = pricing.services[service.id];
        if (!Number.isFinite(price.tiers.basic)) return `<fieldset><legend>${service.name}</legend><p>洽詢</p></fieldset>`;
        return `<fieldset><legend>${service.name}</legend>${Object.entries(TIERS).map(([key, label]) => priceInput(['services', service.id, 'tiers', key], label + '方案總價', price.tiers[key])).join('')}${service.quantity ? priceInput(['services', service.id, 'quantityPrice'], '每增加一' + service.quantity.unit, price.quantityPrice) : ''}${service.addons.map(addon => priceInput(['services', service.id, 'addons', addon.id], addon.name, price.addons[addon.id])).join('')}</fieldset>`;
      }).join('')}<fieldset><legend>維護與優惠</legend>${Object.entries(MAINTENANCE).map(([key, label]) => priceInput(['maintenance', key], label + '／月', pricing.maintenance[key])).join('')}<label class="ch-editor-check"><span>啟用多項服務優惠</span><input type="checkbox" data-price-path="discount.enabled" ${pricing.discount.enabled ? 'checked' : ''}></label>${priceInput(['discount', 'twoServices'], '兩項服務折扣倍率（0.95＝九五折）', pricing.discount.twoServices, { max: 1, step: 0.01 })}${priceInput(['discount', 'threeOrMore'], '三項以上折扣倍率（0.9＝九折）', pricing.discount.threeOrMore, { max: 1, step: 0.01 })}${priceInput(['rangeMultiplier'], '預估上限倍率', pricing.rangeMultiplier, { min: 1, max: 5, step: 0.1 })}</fieldset></div><p class="ch-editor-status" role="status" aria-live="polite"></p><div class="ch-editor-actions"><button type="button" class="btn" data-action="editor-reset">恢復預設價格</button><button type="button" class="btn" data-action="editor-close">完成調價</button></div></div>`;
    }
    function closeEditor() {
      editor.hidden = true;
      if (gear) gear.setAttribute('aria-expanded', 'false');
      root.querySelectorAll('[data-editor-inert]').forEach(node => { node.inert = false; node.removeAttribute('data-editor-inert'); });
      if (editorReturnFocus) editorReturnFocus.focus({ preventScroll: true });
    }
    function openEditor() {
      editorReturnFocus = document.activeElement;
      renderEditor(); editor.hidden = false;
      editor.setAttribute('role', 'dialog'); editor.setAttribute('aria-modal', 'true'); editor.setAttribute('aria-labelledby', 'ch-editor-title');
      if (gear) gear.setAttribute('aria-expanded', 'true');
      [...root.children].filter(node => node !== editor).forEach(node => { if (!node.inert) { node.inert = true; node.setAttribute('data-editor-inert', ''); } });
      editor.querySelector('button').focus();
    }
    if (gear) gear.hidden = new URLSearchParams(location.search).get('price') !== 'edit';
    root.addEventListener('click', event => {
      if (performance.now() < ignoreClickUntil) { event.preventDefault(); return; }
      const button = event.target.closest('[data-action]');
      if (!button || !root.contains(button) || button.disabled) return;
      const action = button.dataset.action, id = button.dataset.service, focus = button.dataset.focus;
      if (action === 'up' || action === 'down') rowMove(id, state.active.indexOf(id) + (action === 'up' ? -1 : 1), focus);
      else if (action === 'remove') { removeService(state, id); renderAll({ focus: state.active.length ? 'handle-' + state.active[0] : 'restore-' + id }); announce(byId(id).name + '已放到暫時不需要區。'); }
      else if (action === 'restore' || action === 'removed-handle') { restoreService(state, id); renderAll({ focus: 'handle-' + id }); announce(byId(id).name + '已加回清單。'); }
      else if (action === 'expand') { state.expanded = id; renderRows(); renderDetails(); restoreFocus(focus); if (!reduced) details.scrollIntoView({ behavior: 'smooth', block: 'start' }); else details.scrollIntoView({ block: 'start' }); }
      else if (action === 'scenario') { selectScenario(state, button.dataset.scenario); renderAll({ highlight: true, focus }); announce('已把適合的服務排到前面，你也可以繼續調整。'); }
      else if (action === 'tier') { setTier(state, id, button.dataset.tier); renderDetails(); renderSummary(); restoreFocus(focus); announce('已改為' + TIERS[button.dataset.tier] + '方案，預估已更新。'); }
      else if (action === 'addon' || action === 'tray-addon') { const added = action === 'addon' && !state.choices[id].addons.includes(button.dataset.addon); toggleAddon(state, id, button.dataset.addon, action === 'tray-addon' ? false : undefined); renderDetails(added ? button.dataset.addon : undefined); renderSummary(); restoreFocus(action === 'tray-addon' ? 'addon-' + button.dataset.addon : focus); announce((added ? '已加入' : '已拿掉') + '項目，預估已更新。'); }
      else if (action === 'plus' || action === 'minus') { setQuantity(state, id, state.choices[id].quantity + (action === 'plus' ? 1 : -1)); renderDetails(); renderSummary(); restoreFocus('quantity-' + action); announce('數量已更新為' + state.choices[id].quantity + byId(id).quantity.unit + '。'); }
      else if (action === 'drawer' && isMobile()) { drawerOpen = !drawerOpen; summary.classList.toggle('is-open', drawerOpen); button.setAttribute('aria-expanded', String(drawerOpen)); button.querySelector('.ch-drawer-label').textContent = drawerOpen ? '收起明細 ↓' : '展開明細 ↑'; }
      else if (action === 'contact') contact();
      else if (action === 'editor-open') openEditor();
      else if (action === 'editor-close') closeEditor();
      else if (action === 'editor-reset') { pricing = resetPricing(); savePrices(); renderDetails(); renderSummary(); renderEditor(); editor.querySelector('[data-action="editor-reset"]').focus(); announce('已恢復全部預設價格。'); }
    });
    if (gear && !gear.dataset.action) gear.dataset.action = 'editor-open';
    root.addEventListener('change', event => {
      if (event.target.dataset.action === 'maintenance') { setMaintenance(state, event.target.value); renderSummary(); restoreFocus('maintenance'); announce('每月維護費已更新。'); }
    });
    editor.addEventListener('input', event => {
      const input = event.target.closest('[data-price-path]');
      if (!input) return;
      const value = input.type === 'checkbox' ? input.checked : input.value;
      const valid = updatePrice(pricing, input.dataset.pricePath, value);
      input.setAttribute('aria-invalid', String(!valid));
      const status = editor.querySelector('.ch-editor-status');
      if (!valid) { status.textContent = '請填入有效數字；價格不可為負數，折扣倍率須介於 0 與 1。'; return; }
      const saved = savePrices();
      status.textContent = saved ? '已儲存，試算已即時更新。' : '本頁已更新；瀏覽器無法儲存，重開後會恢復預設。';
      renderDetails(); renderSummary();
    });
    root.addEventListener('keydown', event => {
      const handle = event.target.closest('.ch-drag-handle');
      if (handle && ['ArrowUp', 'ArrowDown'].includes(event.key) && handle.dataset.action === 'handle') {
        event.preventDefault(); rowMove(handle.dataset.service, state.active.indexOf(handle.dataset.service) + (event.key === 'ArrowUp' ? -1 : 1));
      }
      if (!editor.hidden) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEditor(); return; }
        if (event.key === 'Tab') {
          const items = [...editor.querySelectorAll('button,input')].filter(item => !item.disabled);
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); finishDrag(true); }
    }, true);

    function inside(rect, x, y, margin = 0) { return x >= rect.left - margin && x <= rect.right + margin && y >= rect.top - margin && y <= rect.bottom + margin; }
    function ghostFor(source, x, y) {
      const rect = source.getBoundingClientRect(), ghost = source.cloneNode(true);
      ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(item => item.removeAttribute('id'));
      ghost.classList.add('ch-drag-ghost'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
      Object.assign(ghost.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', margin: '0', zIndex: '14000', pointerEvents: 'none', opacity: '.88', transform: 'rotate(-1deg)' });
      document.body.appendChild(ghost);
      return { ghost, offsetX: x - rect.left, offsetY: y - rect.top, height: rect.height };
    }
    function startDrag(event) {
      const node = pending.node;
      const row = node.closest('.ch-row,.ch-removed-item');
      const source = row || node;
      const visual = ghostFor(source, pending.x, pending.y);
      drag = { ...pending, ...visual, source, x: event.clientX, y: event.clientY, drop: null, placeholder: null };
      source.classList.add('ch-dragging');
      if (row) {
        const placeholder = document.createElement('li'); placeholder.className = 'ch-placeholder';
        placeholder.setAttribute('aria-hidden', 'true'); placeholder.textContent = '放在這裡'; placeholder.style.minHeight = visual.height + 'px';
        if (drag.kind === 'service') { row.before(placeholder); row.hidden = true; }
        drag.placeholder = placeholder;
      }
      try { node.setPointerCapture(event.pointerId); } catch (_) { /* 文件層級仍接得住拖曳事件。 */ }
      document.documentElement.classList.add('ch-drag-active');
      announce('正在拖拉，放開即可放下；按 Escape 取消。');
      function tick() {
        if (!drag) return;
        const scroller = root.closest('#feature');
        if (scroller) {
          const view = scroller.getBoundingClientRect();
          const edge = drag.y < view.top + 95 ? -13 : drag.y > view.bottom - 120 ? 13 : 0;
          if (edge) { scroller.scrollTop += edge; positionDrag(); }
        }
        dragFrame = requestAnimationFrame(tick);
      }
      dragFrame = requestAnimationFrame(tick);
    }
    function positionDrag() {
      if (!drag) return;
      drag.ghost.style.left = drag.x - drag.offsetX + 'px'; drag.ghost.style.top = drag.y - drag.offsetY + 'px';
      root.querySelectorAll('.ch-drop-target').forEach(item => item.classList.remove('ch-drop-target'));
      drag.drop = null;
      if (drag.kind === 'service' || drag.kind === 'removed') {
        const activeRect = activeList.getBoundingClientRect(), removedRect = removedList.getBoundingClientRect();
        if (inside(removedRect, drag.x, drag.y, 12) && drag.kind === 'service') { removedList.classList.add('ch-drop-target'); drag.drop = 'removed'; return; }
        if (inside(activeRect, drag.x, drag.y, 45)) {
          activeList.classList.add('ch-drop-target'); drag.drop = 'active';
          const before = snapshotRows();
          const target = [...activeList.querySelectorAll('.ch-row:not([hidden])')].find(item => { const rect = item.getBoundingClientRect(); return drag.y < rect.top + rect.height / 2; });
          if (target) activeList.insertBefore(drag.placeholder, target); else activeList.appendChild(drag.placeholder);
          animateRows(before);
        }
      } else {
        const tray = details.querySelector('.ch-tray');
        if (tray && inside(tray.getBoundingClientRect(), drag.x, drag.y)) { tray.classList.add('ch-drop-target'); drag.drop = 'tray'; }
        else if (drag.kind === 'tray-addon') drag.drop = 'outside';
      }
    }
    function finishDrag(cancelled) {
      if (!drag) { pending = null; return; }
      const current = drag;
      cancelAnimationFrame(dragFrame); drag = null; pending = null;
      let changed = false;
      if (!cancelled) {
        if (current.drop === 'removed') changed = removeService(state, current.id);
        else if (current.drop === 'active') {
          const children = [...activeList.children];
          const index = children.slice(0, children.indexOf(current.placeholder)).filter(item => item.matches('.ch-row:not([hidden])')).length;
          changed = current.kind === 'removed' ? restoreService(state, current.id, index) : moveService(state, current.id, index);
        } else if (current.kind === 'addon' && current.drop === 'tray') changed = toggleAddon(state, current.id, current.addon, true);
        else if (current.kind === 'tray-addon' && current.drop === 'outside') changed = toggleAddon(state, current.id, current.addon, false);
      }
      current.source.hidden = false; current.source.classList.remove('ch-dragging');
      current.ghost.remove(); if (current.placeholder) current.placeholder.remove();
      document.documentElement.classList.remove('ch-drag-active'); root.querySelectorAll('.ch-drop-target').forEach(item => item.classList.remove('ch-drop-target'));
      try { current.node.releasePointerCapture(current.pointerId); } catch (_) { /* 放開或取消時瀏覽器可能已自動釋放。 */ }
      ignoreClickUntil = performance.now() + 250;
      if (changed) {
        renderAll({ bounce: current.kind === 'addon' ? current.addon : undefined, focus: current.kind === 'addon' || current.kind === 'tray-addon' ? 'addon-' + current.addon : state.active.includes(current.id) ? 'handle-' + current.id : 'restore-' + current.id });
        announce('已放下，服務順序和預估已更新。');
      } else announce(cancelled ? '已取消拖拉。' : '這次沒有改動；也可以直接按按鈕調整。');
    }
    root.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary || !editor.hidden) return;
      const node = event.target.closest('.ch-drag-handle,.ch-addon,.ch-tray-block');
      if (!node || node.disabled) return;
      const kind = node.classList.contains('ch-addon') ? 'addon' : node.classList.contains('ch-tray-block') ? 'tray-addon' : node.closest('.ch-removed-item') ? 'removed' : 'service';
      pending = { node, kind, id: node.dataset.service, addon: node.dataset.addon, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    });
    document.addEventListener('pointermove', event => {
      if (!pending || event.pointerId !== pending.pointerId) return;
      if (!drag && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 7) startDrag(event);
      if (drag) { event.preventDefault(); drag.x = event.clientX; drag.y = event.clientY; positionDrag(); }
    }, { passive: false });
    document.addEventListener('pointerup', event => { if (pending && event.pointerId === pending.pointerId) { if (drag) finishDrag(false); else pending = null; } });
    document.addEventListener('pointercancel', event => { if (pending && event.pointerId === pending.pointerId) finishDrag(true); });
    window.addEventListener('blur', () => finishDrag(true));
    // 切到別頁時，清理拖曳浮層，避免留下抓住中的列。
    if (typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (root.hidden) { finishDrag(true); if (!editor.hidden) closeEditor(); } }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
    renderAll();
  }
})();
