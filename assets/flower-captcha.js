/* 川花｜「把花種回它的位置」真人確認小拼圖
 * 用法：頁面放一個 <div class="fc-wrap" data-flower-captcha></div>
 * 送出前呼叫 window.FlowerCaptcha.ok() 判斷是否已完成。
 * 這是前端的第一道關卡（擋掉隨手亂填的自動程式），不是伺服器端驗證。
 */
(function () {
  'use strict';
  // 新一批花（來源：01_網站/03_新圖繪製 的 14～16 號，已縮小；-mask 是去掉柔光的影子）
  var BASE = '/assets/captcha/';
  var FLOWERS = ['orange', 'eucalyptus', 'geranium'];
  var TOLERANCE = 7;      // 誤差幾像素內算對準
  var MIN_DRAG_MS = 300;  // 拖太快（瞬間完成）不算
  var MIN_MOVES = 4;      // 移動事件太少不算
  var widgets = [];

  function build(root) {
    root.innerHTML =
      '<div class="fc-head"><span class="fc-title">最後一步：把小花種回它的位置 🌱</span>' +
      '<button type="button" class="fc-refresh" aria-label="換一朵花">↻ 換一朵</button></div>' +
      '<div class="fc-stage" aria-hidden="true"><span class="fc-spot"></span><span class="fc-hole"></span>' +
      '<img class="fc-piece" alt="" draggable="false"></div>' +
      '<div class="fc-track"><span class="fc-fill"></span><span class="fc-hint">按住小花，往右拖到空位</span>' +
      '<button type="button" class="fc-knob" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" ' +
      'aria-label="把小花拖到空位：可用左右鍵移動，Enter 放下">❀</button></div>' +
      '<p class="fc-status" aria-live="polite"></p>';

    var $ = function (s) { return root.querySelector(s); };
    var stage = $('.fc-stage'), hole = $('.fc-hole'), spot = $('.fc-spot'), piece = $('.fc-piece');
    var track = $('.fc-track'), fill = $('.fc-fill'), knob = $('.fc-knob'), status = $('.fc-status');
    var refresh = $('.fc-refresh');

    var st = { p: 0, t: 0.7, solved: false, fails: 0, drag: false, sx: 0, sp: 0, t0: 0, moves: 0, keys: 0 };

    function knobMax() { return Math.max(1, track.clientWidth - knob.offsetWidth - 4); }
    function pieceMax() { return Math.max(1, stage.clientWidth - piece.offsetWidth - 8); }

    // 位置用「比例」寫進 CSS（calc），卡片還沒顯示、或之後換螢幕寬度，位置都會自動正確
    // 花寬 62、左右留白 4+4 → 可移動範圍 100% - 70px；滑鈕寬 36、左右留 2+2 → 100% - 40px
    function render() {
      knob.style.left = 'calc(2px + (100% - 40px) * ' + st.p + ')';
      fill.style.width = 'calc(40px + (100% - 40px) * ' + st.p + ')';
      piece.style.left = 'calc(4px + (100% - 70px) * ' + st.p + ')';
      hole.style.left = 'calc(4px + (100% - 70px) * ' + st.t + ')';
      spot.style.left = 'calc(6px + (100% - 70px) * ' + st.t + ')';
      knob.setAttribute('aria-valuenow', String(Math.round(st.p * 100)));
    }

    function newPuzzle() {
      var name = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
      var mask = 'url("' + BASE + name + '-mask.png")';
      piece.src = BASE + name + '.png';
      hole.style.webkitMaskImage = mask;
      hole.style.maskImage = mask;
      st.t = 0.42 + Math.random() * 0.48;   // 空位隨機出現在右半邊
      st.p = 0; st.fails = 0;
      render();
    }

    function setBack(on) {
      [piece, knob, fill].forEach(function (el) { el.classList.toggle('fc-back', on); });
    }

    function petals() {
      var base = piece.offsetLeft + piece.offsetWidth / 2;
      for (var i = 0; i < 5; i++) {
        var s = document.createElement('span');
        s.className = 'fc-petal';
        s.textContent = i % 2 ? '✿' : '❀';
        s.style.left = (base - 6 + (i - 2) * 9) + 'px';
        s.style.top = '18px';
        s.style.setProperty('--dx', ((i - 2) * 14) + 'px');
        s.style.animationDelay = (i * 60) + 'ms';
        stage.appendChild(s);
        setTimeout(function (el) { el.remove(); }.bind(null, s), 1500);
      }
    }

    function check(byKeyboard) {
      var off = Math.abs(st.p - st.t) * pieceMax();
      var human = byKeyboard ? st.keys >= 3 : (Date.now() - st.t0 >= MIN_DRAG_MS && st.moves >= MIN_MOVES);
      if (off <= TOLERANCE && human) {
        st.solved = true; st.p = st.t;
        setBack(true); render();
        root.classList.remove('fc-shake');
        root.classList.add('fc-ok');
        knob.textContent = '✓';
        knob.setAttribute('aria-disabled', 'true');
        status.textContent = '種好了，謝謝你 🌸 可以送出囉';
        petals();
        root.dispatchEvent(new CustomEvent('flowercaptcha:solved', { bubbles: true }));
        return;
      }
      st.fails++;
      status.textContent = off <= TOLERANCE ? '慢慢來，再放一次就好' : '差一點點，對準花的影子再試一次';
      root.classList.remove('fc-shake'); void root.offsetWidth; root.classList.add('fc-shake');
      setBack(true); st.p = 0; render();
      if (st.fails >= 3) setTimeout(newPuzzle, 520);
    }

    function down(e) {
      if (st.solved || (e.button !== undefined && e.button !== 0)) return;
      e.preventDefault();
      st.drag = true; st.sx = e.clientX; st.sp = st.p; st.t0 = Date.now(); st.moves = 0;
      setBack(false);
      piece.classList.add('fc-drag');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function move(e) {
      if (!st.drag) return;
      var range = e.currentTarget === piece ? pieceMax() : knobMax();
      st.p = Math.min(1, Math.max(0, st.sp + (e.clientX - st.sx) / range));
      st.moves++;
      render();
    }
    function up() {
      if (!st.drag) return;
      st.drag = false;
      piece.classList.remove('fc-drag');
      if (st.p > 0.02) check(false);
    }
    [knob, piece].forEach(function (el) {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });

    knob.addEventListener('keydown', function (e) {
      if (st.solved) return;
      var step = (e.shiftKey ? 16 : 4) / pieceMax();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); setBack(false); st.keys++;
        st.p = Math.min(1, Math.max(0, st.p + (e.key === 'ArrowRight' ? step : -step)));
        render();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); check(true); st.keys = 0;
      }
    });

    refresh.addEventListener('click', function () {
      if (st.solved) return;
      setBack(false); status.textContent = ''; newPuzzle();
    });

    if (window.ResizeObserver) new ResizeObserver(function () { setBack(false); render(); }).observe(stage);
    window.addEventListener('resize', render);
    piece.addEventListener('load', render);
    newPuzzle();

    return { ok: function () { return st.solved; } };
  }

  function boot() {
    document.querySelectorAll('[data-flower-captcha]').forEach(function (el) {
      if (!el.__fc) { el.__fc = build(el); widgets.push(el.__fc); }
    });
  }

  window.FlowerCaptcha = {
    ok: function () { return widgets.length > 0 && widgets.every(function (w) { return w.ok(); }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
