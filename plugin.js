// Luxo Diagnostics v0.3 — safe Lampa plugin initialization
(function () {
  'use strict';
  window.luxo_diagnostics_version = '0.3';
  var installed = false;
  var STORAGE_KEY = 'luxo_diagnostics_persistence_v03';
  var TARGETS = [
    {name: 'Pornhub', url: 'https://www.pornhub.com/'},
    {name: 'xHamster', url: 'https://xhamster.com/'},
    {name: 'XVideos', url: 'https://www.xvideos.com/'}
  ];
  function notify(s) {
    try { if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(s); }
    catch (_) {}
    console.log('[LuxoDiagnostics]', s);
  }
  function checkURL(target) {
    return new Promise(function (resolve) {
      if (!window.fetch) return resolve(target.name + ': fetch unavailable');
      var settled = false;
      var timer = setTimeout(function () { end('timeout'); }, 7000);
      function end(message) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(target.name + ': ' + message);
      }
      try {
        fetch(target.url, {method: 'GET', mode: 'cors', credentials: 'omit'})
          .then(function (r) { end('HTTP ' + r.status + ', CORS allowed'); })
          .catch(function (e) { end('CORS blocked or network error (' + (e.name || 'error') + ')'); });
      } catch (e) { end('fetch error (' + (e.name || 'error') + ')'); }
    });
  }
  function show(text) {
    console.log('[LuxoDiagnostics REPORT]\n' + text);
    try {
      if (Lampa.Modal && Lampa.Modal.open && window.$) {
        var body = $('<div>').css({'white-space':'pre-wrap','font-size':'1.2em','line-height':'1.5'}).text(text);
        var close = $('<div class="selector">Закрыть</div>').css({'padding':'1em'});
        close.on('hover:enter', function () { Lampa.Modal.close(); });
        var html = $('<div>').append(body, close);
        Lampa.Modal.open({title:'Luxo Diagnostics v0.3',html:html,size:'large',select:close,onBack:function(){ Lampa.Modal.close(); }});
      } else notify('Диагностика завершена. Проверь консоль.');
    } catch (e) { notify('Ошибка вывода: ' + e.message); }
  }
  function run() {
    var stored = false, previous = false, error = '';
    try {
      previous = !!localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      stored = !!localStorage.getItem(STORAGE_KEY);
    } catch (e) { error = e.name || String(e); }
    notify('Luxo: тест сети запущен');
    Promise.all(TARGETS.map(checkURL)).then(function (results) {
      show('Luxo Diagnostics v0.3\n' +
        'LocalStorage: ' + (stored ? 'write OK' : 'not accessible') + '\n' +
        'Previous launch: ' + (previous ? 'YES' : 'NO') + '\n' +
        'Storage error: ' + (error || 'none') + '\n\n' +
        results.join('\n') + '\n\n' +
        'Сетевой тест не проверяет авторизацию, API или воспроизведение.');
    });
  }
  function install() {
    if (installed || !window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent || !Lampa.SettingsApi.addParam) return;
    try {
      Lampa.SettingsApi.addComponent({
        component:'luxo_diagnostics_v03',
        name:'Luxo Diagnostics',
        icon:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
      });
      Lampa.SettingsApi.addParam({
        component:'luxo_diagnostics_v03',
        param:{name:'luxo_diagnostics_run_v03',type:'trigger',default:false},
        field:{name:'Запустить диагностику',description:'Память Apple TV и сетевой доступ'},
        onChange:run
      });
      installed = true;
      notify('Luxo Diagnostics v0.3 загружен');
    } catch (e) { console.error('[LuxoDiagnostics] install failed', e); }
  }
  if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
    Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') install(); });
  }
  var tries = 0;
  var interval = setInterval(function () {
    install();
    if (installed || ++tries >= 60) clearInterval(interval);
  }, 500);
})();