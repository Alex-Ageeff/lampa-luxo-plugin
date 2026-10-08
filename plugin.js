(function () {
  'use strict';
  var PREFIX = 'luxo_diag_v1_';
  var SITES = [
    {name:'Pornhub', url:'https://www.pornhub.com/'},
    {name:'xHamster', url:'https://xhamster.com/'},
    {name:'XVideos', url:'https://www.xvideos.com/'}
  ];
  var started = false;
  var lastReport = null;
  function note(message) { try { Lampa.Noty.show(message); } catch (e) { console.log('[LuxoDiag] ' + message); } }
  function safeError(e) { return String((e && (e.name || e.message)) || 'unknown').slice(0,100); }
  function testStorage() {
    var key = PREFIX + 'persistence';
    var previous = null, writable = false, method = 'none', error = '';
    try {
      previous = window.localStorage.getItem(key);
      window.localStorage.setItem(key, JSON.stringify({savedAt: new Date().toISOString(), marker:'ok'}));
      writable = !!window.localStorage.getItem(key);
      method = 'localStorage';
    } catch (e) { error = safeError(e); }
    return {available:writable, previousValueFound: !!previous, method:method, error:error};
  }
  function fetchCheck(site) {
    return new Promise(function(resolve) {
      var done = false;
      var timer = setTimeout(function () { finish('timeout', 'No response in 7 seconds'); }, 7000);
      function finish(result, detail) {
        if (done) return;
        done = true; clearTimeout(timer);
        resolve({site: site.name, result:result, detail:detail});
      }
      if (typeof window.fetch !== 'function') return finish('unavailable','fetch API absent');
      try {
        // Anonymous, non-credentialed requests only. No logins, cookies, tokens, or page bodies collected.
        fetch(site.url, {method:'GET', mode:'cors', credentials:'omit', redirect:'follow'})
          .then(function(r) { finish('response','HTTP ' + r.status + ' (CORS permitted)'); })
          .catch(function(e) { finish('blocked_or_failed',safeError(e)); });
      } catch (e) { finish('exception',safeError(e)); }
    });
  }
  function asText(report) {
    return 'Luxo/Lampa diagnostic v0.1\n' +
      'Date: ' + report.date + '\n' +
      'User agent: ' + report.userAgent + '\n' +
      'Lampa Component: ' + report.capabilities.component + '\n' +
      'SettingsApi: ' + report.capabilities.settingsApi + '\n' +
      'Lampa Storage: ' + report.capabilities.lampaStorage + '\n' +
      'localStorage writable: ' + report.storage.available + '\n' +
      'Previous-run marker found: ' + report.storage.previousValueFound + '\n' +
      'Storage error: ' + report.storage.error + '\n' +
      report.network.map(function(x){return x.site + ': ' + x.result + ' (' + x.detail + ')';}).join('\n') + '\n' +
      'NOTE: This does not test authenticated sessions, streaming, or site APIs.';
  }
  function showReport(report) {
    var txt = asText(report);
    console.log('[LuxoDiag] ' + txt);
    if (Lampa.Modal && typeof Lampa.Modal.open === 'function' && typeof window.$ === 'function') {
      var div = $('<div>').css({'white-space':'pre-wrap','overflow-wrap':'anywhere','font-size':'1.15em','line-height':'1.45'}).text(txt);
      var wrapper = $('<div>').append(div);
      var close = $('<div class="selector">Закрыть</div>').css({'padding':'1em','margin-top':'1em'});
      close.on('hover:enter', function(){Lampa.Modal.close();});
      wrapper.append(close);
      try {
        Lampa.Modal.open({title:'Luxo: результаты диагностики',html:wrapper,size:'large',select:close,onBack:function(){Lampa.Modal.close();}});
      } catch(e) { note('Отчёт в консоли: ' + safeError(e)); }
    } else note('Диагностика завершена; отчёт в консоли JS');
  }
  function run() {
    note('Luxo: проверяем локальное хранилище и сеть');
    var report = {
      date: new Date().toISOString(),
      userAgent: String(navigator.userAgent || '').slice(0,240),
      capabilities: {
        component:!!(Lampa.Component && Lampa.Component.add),
        settingsApi:!!(Lampa.SettingsApi && Lampa.SettingsApi.addParam),
        lampaStorage:!!(Lampa.Storage && Lampa.Storage.set)
      },
      storage:testStorage(), network:[]
    };
    Promise.all(SITES.map(fetchCheck)).then(function(network){
      report.network=network; lastReport=report; showReport(report);
    }).catch(function(e){ note('Ошибка диагностики: ' + safeError(e)); });
  }
  function init() {
    if (started || !window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;
    started = true;
    try {
      if (typeof Lampa.SettingsApi.addComponent === 'function') {
        Lampa.SettingsApi.addComponent({component:'luxo_diag',name:'Luxo Diagnostics',icon:'settings'});
      }
      Lampa.SettingsApi.addParam({
        component:'luxo_diag',
        param:{name:'luxo_diag_run',type:'button'},
        field:{name:'Проверить Apple TV',description:'Хранилище и доступность трёх сайтов без входа в аккаунты'},
        onChange:run
      });
      Lampa.SettingsApi.addParam({
        component:'luxo_diag',
        param:{name:'luxo_diag_show',type:'button'},
        field:{name:'Показать последний отчёт',description:'Отчёт не содержит паролей, cookies и токенов'},
        onChange:function(){ if(lastReport) showReport(lastReport); else note('Сначала запустите проверку'); }
      });
      console.log('[LuxoDiag] initialized');
    } catch(e) { started=false; console.log('[LuxoDiag] initialization error',e); }
  }
  var attempts=0;
  function bootstrap() {init(); if(!started && attempts++ < 50) setTimeout(bootstrap,400);}
  bootstrap();
})();