/* 段落目錄只捲動服務布幕，不新增網址足跡。 */
(() => {
  'use strict';
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[data-svc-anchor]');
    if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const page = anchor.closest('.svc-detail');
    const target = document.getElementById(anchor.getAttribute('href').slice(1));
    if (!page || page.hidden || !target || !page.contains(target)) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  });
})();
