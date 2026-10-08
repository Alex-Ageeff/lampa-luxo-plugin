/* Luxo / Lampa minimal loader probe v0.5 */
(function () {
  'use strict';
  window.luxo_probe_loaded = '0.5';
  console.log('[LuxoProbe] JavaScript executed v0.5');
  function signal() {
    if (window.luxo_probe_signaled) return;
    if (!window.Lampa) return;
    window.luxo_probe_signaled = true;
    try { if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Luxo Probe v0.5: JavaScript работает'); } catch (e) { console.log('[LuxoProbe] Noty failed', e); }
    try {
      if (Lampa.Menu && typeof Lampa.Menu.addButton === 'function') {
        Lampa.Menu.addButton(
          '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5m0 4h.01"/></svg>',
          'Luxo Probe v0.5',
          function () { if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Luxo Probe v0.5: OK'); }
        );
      }
    } catch (e) { console.log('[LuxoProbe] Menu registration failed', e); }
  }
  var attempts = 0, timer = setInterval(function () {
    if (window.Lampa && (window.appready || attempts > 20)) {
      signal(); clearInterval(timer);
    } else if (++attempts >= 60) clearInterval(timer);
  }, 500);
  if (window.Lampa && window.appready) signal();
})();