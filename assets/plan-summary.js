/* 規劃摘要只呈現試算傳入的結果，不自行計價。 */
(function () {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (duration, paint) => {
    let done = false, timer;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); paint(1); };
    const onVisibility = () => { if (document.hidden) finish(); };
    paint(1);
    if (reduce() || document.hidden) return;
    document.addEventListener('visibilitychange', onVisibility);
    timer = setTimeout(finish, 1000);
    const start = performance.now();
    function frame(now) { if (done) return; if (document.hidden) { finish(); return; } const p = Math.min(1, Math.max(0, (now-start)/duration)); paint(1-Math.pow(1-p,3)); if (p < 1) requestAnimationFrame(frame); else finish(); }
    requestAnimationFrame(frame);
  };
  window.openPlanSummary = function ({service, state, result, completeness, formatMoney, contactUrl, lineUrl, trigger, quoteKind}) {
    const existing = document.querySelector('dialog.plan-summary');
    if (existing) existing.remove();
    const origin = trigger || document.activeElement;
    const selected = state.selected.map(choice => ({ choice, item: service.items.find(item => item.id === choice.id), line: result.lines.find(line => line.id === choice.id) })).filter(entry => entry.item && entry.line);
    const lines = [`${service.name}｜你的規劃`, `基本方案：${formatMoney(result.base)}`, ...service.included.map(text => `  ${text}（內含）`), ...selected.map(({choice,item,line}) => `${item.name} × ${choice.quantity}${item.unit || '項'}：${formatMoney(line.amount)}`), `一次費用：${formatMoney(result.subtotal)}`, `預估範圍：${formatMoney(result.low)} ～ ${formatMoney(result.high)}`, ...(state.maintenance !== 'none' ? [`每月維護：${formatMoney(result.monthly)}`] : []), `規劃完整度：${completeness}%`, '示範數字，正式報價以需求訪談為準'].join('\n');
    const dialog = document.createElement('dialog');
    dialog.className = 'plan-summary';
    dialog.setAttribute('aria-labelledby','ps-title');
    dialog.setAttribute('aria-modal','true');
    dialog.innerHTML = `<div class="ps-aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="ps-scroll"><div class="ps-card"><button type="button" class="ps-close" data-ps-close aria-label="關閉規劃摘要">×</button><div class="ps-heading"><div><p class="ps-eyebrow">YOUR PLAN · 你的規劃</p><h2 id="ps-title">${esc(service.name)}</h2><p>讓我們一起，從這份規劃開始。</p></div><img src="/${esc(service.flower)}" alt="" aria-hidden="true"></div><div class="ps-overview"><div class="ps-progress"><div class="ps-ring" role="img" aria-label="規劃完整度 ${Number(completeness)}%"><strong class="ps-score-number">${Number(completeness)}%</strong></div><small>規劃完整度</small></div><div class="ps-prices"><span>一次費用</span><strong class="ps-total">${esc(formatMoney(result.subtotal))}</strong><p>預估範圍 <b class="ps-low">${esc(formatMoney(result.low))}</b> ～ <b class="ps-high">${esc(formatMoney(result.high))}</b></p><p class="ps-monthly" ${state.maintenance === 'none' ? 'hidden' : ''}>每月維護 <b>${esc(formatMoney(result.monthly))}</b></p></div></div><section class="ps-items" aria-label="已選項目"><h3>這份規劃包含</h3><div class="ps-item ps-base"><span>基本方案</span><b>${esc(formatMoney(result.base))}</b></div>${service.included.map(t => `<div class="ps-item ps-included"><span>${esc(t)}</span><b>內含</b></div>`).join('')}${selected.map(({choice,item,line}) => `<div class="ps-item"><span>${esc(item.name)} <small>× ${esc(choice.quantity)} ${esc(item.unit || '項')}</small></span><b>${esc(formatMoney(line.amount))}</b></div>`).join('')}</section><p class="ps-disclaimer">示範數字，正式報價以需求訪談為準</p><div class="ps-actions"><button type="button" class="ps-primary" data-ps-copy>複製規劃並開 LINE 聊聊</button><a class="ps-secondary" data-ps-form data-route data-quote-kind="${esc(quoteKind || 'custom')}" href="${esc(contactUrl)}">填寫需求詢價</a><button type="button" class="ps-back" data-ps-close>回去再調整</button></div><div class="ps-copy-fallback" hidden><p role="status"></p><textarea hidden readonly aria-label="規劃內容，請手動複製"></textarea><a href="${esc(lineUrl)}" target="_blank" rel="noopener noreferrer">開啟官方 LINE →</a></div></div></div>`;
    document.body.appendChild(dialog);
    const locked = [document.documentElement, document.body, document.querySelector('#feature')].filter(Boolean).map(el => ({el, overflow:el.style.overflow}));
    locked.forEach(({el}) => { el.style.overflow = 'hidden'; });
    let closed = false;
    function close() { if (closed) return; closed = true; if (dialog.open) dialog.close(); dialog.remove(); locked.forEach(({el,overflow}) => {el.style.overflow = overflow;}); if (origin && origin.isConnected && origin.focus) origin.focus({preventScroll:true}); }
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.querySelectorAll('[data-ps-close]').forEach(b => b.addEventListener('click', close));
    dialog.querySelector('[data-ps-form]').addEventListener('click', e => { if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll('button:not([disabled]), a[href], textarea:not([hidden])')].filter(el => el.getClientRects().length);
      if (!nodes.length) { e.preventDefault(); return; }
      const first=nodes[0], last=nodes[nodes.length-1];
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    const fallback = dialog.querySelector('.ps-copy-fallback');
    dialog.querySelector('[data-ps-copy]').addEventListener('click', async () => {
      let copied = false;
      try { await navigator.clipboard.writeText(lines); copied = true; } catch (_) {}
      if (!copied) {
        fallback.hidden = false;
        fallback.querySelector('p').textContent = '無法自動複製，請先複製下方內容，再開啟官方 LINE。';
        const field = fallback.querySelector('textarea'); field.hidden=false; field.value=lines; field.focus(); field.select();
        return;
      }
      fallback.hidden = false;
      fallback.querySelector('p').textContent = '規劃已複製，請貼到官方 LINE。若視窗沒有開啟，可點下方連結。';
      try { window.open(lineUrl, '_blank', 'noopener,noreferrer'); } catch (_) {}
    });
    dialog.querySelectorAll('.ps-item').forEach((el,i) => el.style.setProperty('--ps-delay',`${Math.min(i,16)*.06}s`));
    dialog.showModal();
    dialog.querySelector('.ps-close').focus({preventScroll:true});
    const ring = dialog.querySelector('.ps-ring');
    animate(800, p => {
      if (closed) return;
      const score = Math.round(completeness*p);
      ring.style.setProperty('--ps-progress',score);
      dialog.querySelector('.ps-score-number').textContent = score+'%';
      [['.ps-total',result.subtotal],['.ps-low',result.low],['.ps-high',result.high],['.ps-monthly b',result.monthly]].forEach(([selector,value]) => { dialog.querySelector(selector).textContent = formatMoney(value*p); });
    });
  };
})();
