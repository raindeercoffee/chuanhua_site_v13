/* 各服務示範價格都在這裡修改。金額為整數元；區間上限是小計的 1.2 倍，四捨五入到百元。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') api.mountAll();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // 每項格式：名稱、說明、單價、是否預設加入、數量單位（有填才顯示計數）。
  const item = (name, description, price, selected = false, unit = '', group = '') => ({ id: name, name, description, price, selected, unit, min: 1, group });
  // 規劃完整度只計算已選加值項目比例，不參與價格運算。
  const COMPLETENESS = Object.freeze({ base: 80, span: 19, duration: 800, badgeDuration: 1500 });
  const commonMaintenance = { none: 0, basic: 3000, full: 8000 };
  const make = (name, flower, included, items) => ({ name, flower, base: 49000, included, items, maintenance: { ...commonMaintenance } });
  const RAW_CONFIG = {
    website: make('品牌官網製作', 'assets/entry-5-xinyi.png', ['網站架構與 5 頁製作', '聯絡表單', '基礎搜尋設定'], [
      item('增加頁面','依內容增加網站頁面',3000,true,'頁','頁面與架構'), item('多頁架構規劃','安排清楚的頁面與導覽層次',6000,false,'','頁面與架構'),
      item('地圖與社群嵌入','讓訪客快速找到品牌',2000,true,'','基礎元件'), item('常見問題展開區','整理訪客常問的問題',3000,true,'','基礎元件'), item('首頁輪播','輪播呈現重點資訊',4000,false,'','基礎元件'),
      item('最新消息與部落格','建立持續更新的內容區',12000,true,'','內容系統'),
      item('輕動畫','為重要畫面加入細緻動態',5000,true,'','互動與動效'), item('捲動動畫','隨瀏覽節奏呈現內容',6000,false,'','互動與動效'), item('互動試算或測驗','讓訪客依需求互動',15000,false,'','互動與動效'),
      item('串接官方 LINE','引導訪客加入官方帳號',2000,true,'','串接'), item('表單寫入 Google 試算表','將表單資料整理到試算表',5000,false,'','串接'), item('LINE 通知','有新訊息時傳送通知',6000,false,'','串接'),
      item('購物車','加入商品選購與結帳流程',25000,false,'','電商與會員'), item('會員系統','建立會員登入與資料管理',30000,false,'','電商與會員'), item('預約系統','讓訪客選擇時間並送出預約',18000,false,'','電商與會員'),
      item('SEO 架構規劃','規劃搜尋友善的內容架構',8000,false,'','搜尋與追蹤'), item('GA4 與 Meta 像素追蹤','設定網站流量與互動追蹤',5000,false,'','搜尋與追蹤'), item('多語系','增加其他語言版本',15000,false,'','語言版本')
    ]),
    ads: make('數位廣告投放','assets/quiz-plants/sweetorange.png',['需求訪談與投放規劃','基本帳戶設定'],[item('廣告代操','依月管理投放與調整',12000,true,'月'),item('素材方向規劃','整理廣告視覺方向',6000,true),item('受眾分組','依需求建立受眾',5000,true),item('成效追蹤設定','整理廣告追蹤方式',5000),item('再行銷規劃','規劃後續接觸流程',6000),item('文案測試','測試不同溝通方式',4000)]),
    'brand-marketing': make('品牌整合行銷','assets/quiz-plants/rose.png',['品牌需求訪談','行銷方向整理'],[item('品牌定位整理','梳理品牌特色與溝通方向',10000,true),item('行銷活動企劃','規劃主題與執行節奏',12000,true),item('內容主題規劃','安排適合品牌的內容',6000,true),item('跨平台溝通規劃','串連不同平台的訊息',8000),item('活動素材方向','整理視覺與文字需求',6000),item('行銷檢討會議','整理執行狀況與後續建議',4000)]),
    'ads-audit': make('廣告帳戶健檢','assets/quiz-plants/rosemary.png',['帳戶資料盤點','需求訪談'],[item('帳戶結構檢查','檢視廣告活動與組合',6000,true),item('受眾與素材診斷','檢視受眾與素材搭配',6000,true),item('A/B 文案建議','提供不同版本的文案方向',4000,true),item('再行銷漏斗建議','整理後續接觸機會',5000),item('最強與最差素材分析','比較素材表現並提出觀察',5000),item('白話報告簡報','將診斷結果整理成簡報',6000)]),
    workflow: make('AI 工作流程自動化','assets/quiz-plants/eucalyptus.png',['流程訪談','基本流程規劃'],[item('自動化流程','設計並建立指定工作流程',12000,true,'條'),item('資料整理串接','銜接資料來源與整理方式',8000,true),item('通知與提醒','在指定時機提供提醒',5000),item('人工確認節點','保留需要人工判斷的步驟',5000),item('團隊操作教學','說明日常使用方式',6000),item('流程文件','整理設定與操作說明',4000)]),
    content: make('AI 文案與內容生成','assets/quiz-plants/jasmine.png',['需求訪談','內容流程規劃'],[item('品牌口吻規則整理','整理品牌常用語氣與禁忌',8000,true),item('文案範本組','建立可重複使用的文案範本',4000,true,'組'),item('商品文案','規劃商品介紹生成方式',6000,true),item('社群貼文','規劃社群內容生成方式',6000),item('團隊 AI 文案技能訓練','練習產出與調整文案',8000),item('季度更新','定期調整規則與範本',6000)]),
    tools: make('AI 客製工具開發','assets/quiz-plants/cedar.png',['需求訪談','工具功能規劃'],[item('操作介面設計','規劃易於使用的畫面',10000,true),item('資料匯入與整理','整理輸入資料的方式',8000,true),item('AI 生成與分析','依需求處理內容或資料',12000,true),item('結果匯出','將結果匯出供後續使用',5000),item('帳號與權限','規劃使用者權限',10000),item('操作教學','陪團隊熟悉工具',6000)]),
    'ad-ops': make('加速下廣告','assets/quiz-plants/mint.png',['上稿流程訪談','基本需求規劃'],[item('上稿表規格設計','整理上稿欄位與規則',8000,true),item('匯入檔自動轉換','將資料整理成所需格式',10000,true),item('影片批次上傳與編號回填','減少重複搬運與填寫',12000,true),item('上稿前逐項檢查','檢查必要欄位與資料',8000,true),item('團隊操作教學','說明上稿流程與操作',6000),item('錯誤提示與紀錄','保留可追查的處理紀錄',6000)])
  };
  const CONFIG = Object.fromEntries(['ads', 'brand-marketing', 'ads-audit', 'website', 'workflow', 'content', 'tools', 'ad-ops'].map(id => [id, RAW_CONFIG[id]]));
  const clone = x => JSON.parse(JSON.stringify(x));
  function createState(service) { return { selected: service.items.filter(i => i.selected).map(i => ({ id: i.id, quantity: i.min })), maintenance: 'none' }; }
  function calculate(service, state) {
    const lines = state.selected.map(chosen => { const i = service.items.find(x => x.id === chosen.id); return { id: chosen.id, amount: i ? i.price * Math.max(i.min, Math.floor(Number(chosen.quantity) || i.min)) : 0 }; });
    const subtotal = service.base + lines.reduce((sum, line) => sum + line.amount, 0);
    return { base: service.base, unitPrices: Object.fromEntries(service.items.map(i => [i.id, i.price])), lines, subtotal, low: subtotal, high: Math.round(subtotal * 12 / 1000) * 100, monthly: service.maintenance[state.maintenance] || 0 };
  }
  function calculateCompleteness(service, state, config = COMPLETENESS) {
    const total = service.items.length;
    if (!total) return config.base;
    const selected = new Set(state.selected.map(choice => choice.id));
    const count = service.items.filter(item => selected.has(item.id)).length;
    return Math.round(config.base + config.span * count / total);
  }
  function formatMoney(value) { return 'NT$' + Math.round(value).toLocaleString('en-US'); }
  function renderTotal(result) { return `${formatMoney(result.low)} ～ ${formatMoney(result.high)}｜每月維護 ${formatMoney(result.monthly)}`; }
  function setQuantity(service, state, id, value) { const item = service.items.find(i => i.id === id), chosen = state.selected.find(i => i.id === id); if (item && chosen) chosen.quantity = Math.max(item.min, Math.floor(Number(value) || item.min)); }
  function moveItem(service, state, id, destination, index) {
    const item = service.items.find(i => i.id === id); if (!item) return;
    const old = state.selected.findIndex(i => i.id === id);
    const chosen = old < 0 ? { id, quantity: item.min } : state.selected.splice(old, 1)[0];
    if (destination === 'selected') state.selected.splice(Math.max(0, Math.min(index == null ? state.selected.length : index, state.selected.length)), 0, chosen);
  }
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mountAll() { document.querySelectorAll('.svc-estimator[data-service]').forEach(mount); }
  function mount(root) {
    const slug = root.dataset.service; if (!CONFIG[slug]) return;
    let service = clone(CONFIG[slug]), state = createState(service), drag = null, pending = null, ignoreClick = false, shown = null;
    const storageKey = 'ch-item-prices-v1';
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')[slug]; if (saved) { if (Number.isSafeInteger(saved.base) && saved.base >= 0) service.base = saved.base; service.items.forEach(i => { if (Number.isSafeInteger(saved.items?.[i.id]) && saved.items[i.id] >= 0) i.price = saved.items[i.id]; }); Object.keys(service.maintenance).forEach(k => { if (Number.isSafeInteger(saved.maintenance?.[k]) && saved.maintenance[k] >= 0) service.maintenance[k] = saved.maintenance[k]; }); } } catch (_) {}
    root.innerHTML = `<div class="ie-top"><div><p class="ie-kicker">為你的需求慢慢配置</p><h3>項目配置試算</h3><p>拖拉項目調整順序，也可以隨時加入或拿掉。</p></div><div class="ie-overview"><div class="ie-completeness"><div class="ie-completion-ring" role="img" aria-label="規劃完整度"><strong class="ie-completion-number"></strong><span class="ie-completion-delta" hidden></span></div><small>規劃完整度</small></div><div class="ie-total" aria-live="polite"><span>目前預估</span><strong class="ie-price"></strong><small class="ie-range"></small><small class="ie-monthly"></small></div></div></div><div class="ie-base"><h4>基本方案 <span class="ie-base-price"></span> 起</h4><ul>${service.included.map(t => `<li>${escape(t)} <b>內含</b></li>`).join('')}</ul></div><div class="ie-columns"><section class="ie-area ie-selected"><h4>已選項目</h4><p>拖動把手，調整順序或移到右側。</p><div class="ie-list" data-zone="selected"></div></section><section class="ie-area ie-available"><h4>可加入的項目</h4><p>拖進已選區，或按加入。</p><div class="ie-list" data-zone="available"></div></section></div><div class="ie-footer"><label>每月維護 <select data-action="maintenance"><option value="none">不需要</option><option value="basic">基本</option><option value="full">進階</option></select></label><p>示範數字，正式報價以需求訪談為準。</p><button type="button" class="ie-contact" data-action="contact">帶著這份規劃找川花聊聊</button><p class="ie-status" role="status"></p><textarea class="ie-copy" aria-label="規劃內容，請手動複製" hidden readonly></textarea><a class="ie-link" href="https://line.me/R/ti/p/@riverflower2025" target="_blank" rel="noopener" hidden>開啟官方 LINE</a></div><div class="ie-editor" hidden><h4>示範價格調整</h4><p>只儲存在這個瀏覽器。</p><div class="ie-fields"></div><button type="button" data-action="reset">恢復預設</button></div>`;
    const $ = selector => root.querySelector(selector), selected = $('[data-zone="selected"]'), available = $('[data-zone="available"]');
    // 依服務的原始項目位置分配植物，移動或重新加入時不會換花。
    const flowers = ['lavender', 'rose', 'chamomile', 'rosemary', 'jasmine', 'sweetorange', 'geranium', 'mint', 'lemon', 'eucalyptus', 'olive', 'cedar', 'cinnamon', 'frankincense', 'immortelle', 'rockrose'];
    function row(i, chosen, result) { const flower = flowers[service.items.findIndex(item => item.id === i.id) % flowers.length]; return `<div class="ie-row" data-id="${escape(i.id)}"><img src="/assets/quiz-plants/${flower}.png" alt="" aria-hidden="true"><div class="ie-info">${i.group ? `<small>${escape(i.group)}</small>` : ''}<strong>${escape(i.name)}</strong><p>${escape(i.description)}</p><span>＋${formatMoney(result.unitPrices[i.id])}${i.unit ? '／' + escape(i.unit) : ''}</span></div>${chosen && i.unit ? `<div class="ie-quantity" aria-label="數量"><button type="button" data-action="minus" aria-label="減少${escape(i.name)}">−</button><span>${chosen.quantity} ${escape(i.unit)}</span><button type="button" data-action="plus" aria-label="增加${escape(i.name)}">＋</button></div>` : ''}<button type="button" class="ie-handle" aria-label="拖動${escape(i.name)}" title="拖動調整">≡</button><button type="button" class="ie-row-action" data-action="${chosen ? 'remove' : 'add'}" aria-label="${chosen ? '拿掉' : '加入'}${escape(i.name)}">${chosen ? '×' : '＋ 加入'}</button></div>`; }
    function renderRows() { const result = calculate(service, state); selected.innerHTML = state.selected.map(c => row(service.items.find(i => i.id === c.id), c, result)).join('') || '<p class="ie-empty">把想加入的項目拖到這裡</p>'; available.innerHTML = service.items.filter(i => !state.selected.some(c => c.id === i.id)).map(i => row(i, null, result)).join('') || '<p class="ie-empty">目前沒有其他項目</p>'; }
    let priceRun = 0, priceTimer;
    function renderPrice() {
      const result = calculate(service, state); $('.ie-base-price').textContent = formatMoney(result.base); $('.ie-range').textContent = `預估範圍 ${formatMoney(result.low)} ～ ${formatMoney(result.high)}`; $('.ie-monthly').textContent = `每月維護 ${formatMoney(result.monthly)}`;
      const start = shown == null ? result.subtotal : shown, end = result.subtotal; shown = end; const price = $('.ie-price'), run = ++priceRun;
      clearTimeout(priceTimer); price.textContent = formatMoney(end);
      if (start === end || document.hidden || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      const finish = () => { if (run !== priceRun) return; ++priceRun; price.textContent = formatMoney(end); };
      priceTimer = setTimeout(finish, 1000);
      const time = performance.now(); const tick = now => { if (run !== priceRun) return; if (document.hidden) { finish(); return; } const p = Math.min(1, Math.max(0, (now-time)/350)); price.textContent = formatMoney(start+(end-start)*(1-Math.pow(1-p,3))); if (p < 1) requestAnimationFrame(tick); else { clearTimeout(priceTimer); finish(); } }; requestAnimationFrame(tick);
    }
    if (document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden) { ++priceRun; clearTimeout(priceTimer); $('.ie-price').textContent = formatMoney(shown); ++completionRun; clearTimeout(completionTimer); if (completionTarget !== null) { completionShown = completionTarget; $('.ie-completion-number').textContent = completionTarget + '%'; $('.ie-completion-ring').style.setProperty('--ie-progress', completionTarget); } } });
    let completionTarget = null, completionShown = null, completionRun = 0, badgeTimer = null, completionTimer = null;
    function renderCompleteness() {
      const target = calculateCompleteness(service, state), oldTarget = completionTarget;
      if (target === oldTarget) return;
      completionTarget = target;
      const ring = $('.ie-completion-ring'), number = $('.ie-completion-number'), badge = $('.ie-completion-delta');
      ring.setAttribute('aria-label', `規劃完整度 ${target}%`);
      const paint = value => { completionShown = value; number.textContent = Math.round(value) + '%'; ring.style.setProperty('--ie-progress', value); };
      const run = ++completionRun;
      const start = completionShown; clearTimeout(completionTimer); paint(target);
      if (oldTarget === null) { paint(target); return; }
      const diff = target - oldTarget;
      badge.textContent = (diff > 0 ? '↑' : '↓') + Math.abs(diff) + '%';
      badge.hidden = false;
      // 若快速連按，重新開始淡出，而不是沿用上一次的動畫進度。
      badge.style.setProperty('--ie-badge-duration', COMPLETENESS.badgeDuration + 'ms');
      badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = '';
      clearTimeout(badgeTimer);
      badgeTimer = setTimeout(() => { badge.hidden = true; }, COMPLETENESS.badgeDuration);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(target); return; }
      if (document.hidden) return;
      const started = performance.now();
      completionTimer = setTimeout(() => { if (run === completionRun) { ++completionRun; paint(target); } }, 1000);
      const tick = now => {
        if (run !== completionRun) return;
        const fraction = Math.min(1, Math.max(0, (now - started) / COMPLETENESS.duration));
        paint(start + (target - start) * (1 - Math.pow(1 - fraction, 3)));
        if (fraction < 1) requestAnimationFrame(tick); else clearTimeout(completionTimer);
      };
      requestAnimationFrame(tick);
    }
    function render() { renderRows(); renderPrice(); renderCompleteness(); }
    function save() { try { const all = JSON.parse(localStorage.getItem(storageKey) || '{}'); all[slug] = { base: service.base, items: Object.fromEntries(service.items.map(i => [i.id,i.price])), maintenance: service.maintenance }; localStorage.setItem(storageKey, JSON.stringify(all)); } catch (_) { $('.ie-status').textContent = '無法儲存價格，重新整理後會恢復預設。'; } }
    function editor() { const panel = $('.ie-editor'); panel.hidden = new URLSearchParams(location.search).get('price') !== 'edit'; if (panel.hidden) return; $('.ie-fields').innerHTML = `<label>基本方案 <input type="number" min="0" step="100" data-price="base" value="${service.base}"></label>${service.items.map(i => `<label>${escape(i.name)}${i.unit ? '（每' + escape(i.unit) + '）' : ''}<input type="number" min="0" step="100" data-price="item" data-id="${escape(i.id)}" value="${i.price}"></label>`).join('')}${Object.entries({none:'不需要',basic:'基本',full:'進階'}).map(([key, label]) => `<label>${label}維護費<input type="number" min="0" step="100" data-price="maintenance" data-id="${key}" value="${service.maintenance[key]}"></label>`).join('')}`; }
    root.addEventListener('input', e => { const input = e.target.closest('[data-price]'); if (!input || input.value === '') return; const n = Number(input.value); if (!Number.isSafeInteger(n) || n < 0) return; if (input.dataset.price === 'base') service.base = n; else if (input.dataset.price === 'item') service.items.find(i => i.id === input.dataset.id).price = n; else service.maintenance[input.dataset.id] = n; save(); render(); });
    root.addEventListener('change', e => { if (e.target.dataset.action === 'maintenance') { state.maintenance = e.target.value; renderPrice(); } });
    root.addEventListener('click', e => {
      if (ignoreClick) return;
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      const action = btn.dataset.action, id = btn.closest('[data-id]')?.dataset.id;
      if (action === 'remove' || action === 'add') { moveItem(service,state,id,action === 'add' ? 'selected' : 'available'); render(); }
      else if (action === 'minus' || action === 'plus') { const chosen = state.selected.find(x => x.id === id); setQuantity(service,state,id,chosen.quantity + (action === 'plus' ? 1 : -1)); render(); }
      else if (action === 'reset') { service = clone(CONFIG[slug]); save(); editor(); render(); }
      else if (action === 'contact') {
        if (typeof window.openPlanSummary !== 'function') { $('.ie-status').textContent = '規劃畫面暫時無法開啟，請重新整理後再試。'; return; }
        window.openPlanSummary({ service: clone(service), state: clone(state), result: calculate(service,state), completeness: calculateCompleteness(service,state), formatMoney, contactUrl: '/ai/quote/', quoteKind: slug === 'website' ? 'website' : 'custom', lineUrl: 'https://line.me/R/ti/p/@riverflower2025', trigger: btn });
      }
    });
    function pointIn(el,x,y) { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
    root.addEventListener('pointerdown', e => { const handle = e.target.closest('.ie-handle'); if (!handle || e.button !== 0 || !e.isPrimary) return; const row = handle.closest('.ie-row'); pending = { id: row.dataset.id, row, handle, pointerId: e.pointerId, x: e.clientX, y: e.clientY, from: row.parentElement.dataset.zone }; try { root.setPointerCapture(e.pointerId); } catch (_) {} });
    root.addEventListener('pointermove', e => { if (!pending || pending.pointerId !== e.pointerId) return; if (!drag && Math.hypot(e.clientX-pending.x,e.clientY-pending.y) > 6) { const rect = pending.row.getBoundingClientRect(), ghost = pending.row.cloneNode(true), place = document.createElement('div'); ghost.classList.add('ie-ghost'); Object.assign(ghost.style,{width:rect.width+'px',left:rect.left+'px',top:rect.top+'px'}); document.body.appendChild(ghost); place.className='ie-placeholder'; place.style.height=rect.height+'px'; if (pending.from === 'selected') pending.row.before(place); pending.row.style.display='none'; drag = {...pending, ghost, place, ox:pending.x-rect.left, oy:pending.y-rect.top, zone:null}; } if (!drag) return; e.preventDefault(); drag.ghost.style.left=(e.clientX-drag.ox)+'px'; drag.ghost.style.top=(e.clientY-drag.oy)+'px'; selected.classList.remove('ie-highlight'); available.classList.remove('ie-highlight'); drag.zone = pointIn(selected,e.clientX,e.clientY) ? 'selected' : pointIn(available,e.clientX,e.clientY) ? 'available' : null; if (drag.zone) { const target = drag.zone === 'selected' ? selected : available; target.classList.add('ie-highlight'); if (drag.zone === 'selected') { const rows = [...selected.querySelectorAll('.ie-row:not([style*="display: none"])')]; const before = rows.map(r => [r,r.getBoundingClientRect().top]); const next = rows.find(r => e.clientY < r.getBoundingClientRect().top + r.offsetHeight/2); selected.insertBefore(drag.place,next || null); before.forEach(([r,y]) => { const delta = y-r.getBoundingClientRect().top; if (delta && r.animate) r.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'}); }); } else drag.place.remove(); } });
    // 手指拖到畫面邊緣時，讓內頁跟著捲動，方便跨區移動。
    root.addEventListener('pointermove', e => {
      if (!drag) return;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      if (drag.scrolling) return;
      drag.scrolling = true;
      const activeDrag = drag;
      const scroll = () => {
        if (drag !== activeDrag) return;
        const scroller = root.closest('#feature');
        if (scroller) {
          const box = scroller.getBoundingClientRect();
          const speed = drag.lastY < box.top + 80 ? -12 : drag.lastY > box.bottom - 80 ? 12 : 0;
          if (speed) {
            const previous = scroller.scrollTop;
            scroller.scrollTop += speed;
            if (scroller.scrollTop !== previous) root.dispatchEvent(new PointerEvent('pointermove', { pointerId: drag.pointerId, clientX: drag.lastX, clientY: drag.lastY, bubbles: true, cancelable: true }));
          }
        }
        requestAnimationFrame(scroll);
      };
      requestAnimationFrame(scroll);
    });
    function finish(e, cancel) { if (!pending || (e && pending.pointerId !== e.pointerId)) return; if (drag) { if (!cancel && drag.zone) { const index = [...selected.children].indexOf(drag.place); moveItem(service,state,drag.id,drag.zone,index < 0 ? undefined : [...selected.children].slice(0,index).filter(el => el.classList.contains('ie-row') && el !== drag.row).length); } drag.ghost.remove(); drag.place.remove(); drag.row.style.display=''; selected.classList.remove('ie-highlight'); available.classList.remove('ie-highlight'); drag=null; ignoreClick=true; setTimeout(() => { ignoreClick=false; },250); render(); } pending=null; }
    root.addEventListener('pointerup',e => finish(e,false)); root.addEventListener('pointercancel',e => finish(e,true)); window.addEventListener('blur',() => finish(null,true));
    editor(); render();
  }
  return { CONFIG, COMPLETENESS, calculate, calculateCompleteness, formatMoney, createState, setQuantity, moveItem, renderTotal, mountAll };
});
