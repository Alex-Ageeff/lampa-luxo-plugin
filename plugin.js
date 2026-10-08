(function () {
'use strict';
if (window.__luxo_diag_v08) return;
window.__luxo_diag_v08 = true;
var id='luxo_diagnostics_test';
var installed=false;
var targetSites=[
  {name:'Pornhub',url:'https://www.pornhub.com/'},
  {name:'xHamster',url:'https://xhamster.com/'},
  {name:'XVideos',url:'https://www.xvideos.com/'}
];
function notify(msg) {
  console.log('[Luxo Diagnostics]',msg);
  try { if(Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(msg); } catch(e){}
}
function showReport(lines) {
  var text=lines.join('\n');
  console.log('[Luxo Diagnostics report]\n'+text);
  try {
    if(window.Lampa && Lampa.Modal && Lampa.Modal.open && window.jQuery) {
      var $=window.jQuery;
      var body=$('<div>').css({'white-space':'pre-wrap','font-size':'1.15em','line-height':'1.5'}).text(text);
      var close=$('<div class="selector">Закрыть</div>').css({'padding':'1em'});
      close.on('hover:enter',function(){Lampa.Modal.close();});
      Lampa.Modal.open({title:'Luxo Diagnostics 0.8',html:$('<div>').append(body,close),size:'large',select:close,onBack:function(){Lampa.Modal.close();}});
    } else {
      notify(text.slice(0,170));
    }
  } catch(e) { notify('Отчёт в JS console: '+(e.message||e)); }
}
function storage() {
  var previous=false,current=false,error='';
  try {
    previous=!!localStorage.getItem('luxo_diag_v08_saved');
    localStorage.setItem('luxo_diag_v08_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v08_saved');
  } catch(e) {error=String(e);}
  showReport(['Локальное хранилище: '+(current?'запись OK':'ошибка'), 'Предыдущий запуск v0.8: '+(previous?'есть':'нет'),error]);
}
function request(site) {
  return new Promise(function(resolve) {
    if(typeof fetch!=='function') return resolve(site.name+': fetch недоступен');
    var complete=false, controller=typeof AbortController==='function'?new AbortController():null;
    var timer=setTimeout(function(){ if(controller)controller.abort();finish('таймаут (8 с)'); },8000);
    function finish(value){if(complete)return;complete=true;clearTimeout(timer);resolve(site.name+': '+value);}
    try {
      var options={method:'GET',mode:'cors',credentials:'omit',cache:'no-store'};
      if(controller)options.signal=controller.signal;
      fetch(site.url,options).then(function(resp){finish('ответ HTTP '+resp.status+', доступ CORS');}).catch(function(e){finish('нет читаемого ответа ('+(e.name||'ошибка')+'), возможно CORS/сеть');});
    } catch(e){finish('ошибка: '+(e.name||'unknown'));}
  });
}
function network() {
  notify('Luxo Diagnostics: проверяю сеть...');
  var apis=[
    'fetch: '+(typeof fetch==='function'?'да':'нет'),
    'Lampa.Reguest: '+(!!(Lampa.Reguest)?'да':'нет'),
    'Lampa.Network: '+(!!(Lampa.Network)?'да':'нет'),
    'Lampa.Storage: '+(!!(Lampa.Storage)?'да':'нет')
  ];
  Promise.all(targetSites.map(request)).then(function(results){
    showReport(['Luxo Diagnostics v0.8','Сетевые возможности:',apis.join('\n'),'','Анонимные запросы без cookies:',results.join('\n'),'','Ошибка CORS не доказывает недоступность сайта или аккаунта.','Пароли и cookies не передавались.']);
  });
}
function init() {
  if(installed||!window.Lampa||!Lampa.SettingsApi)return;
  try {
    Lampa.SettingsApi.addComponent({
      component:id,name:'Luxo Diagnostics',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="1"/></svg>'
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v08_title',type:'title'},field:{name:'Luxo Diagnostics v0.8'}});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v08_store',type:'button'},field:{name:'Проверить локальное хранилище'},onChange:storage});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v08_net',type:'button'},field:{name:'Проверить доступ к сайтам',description:'Анонимный тест сети и CORS без авторизации'},onChange:network});
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'0.8',description:'Диагностика Apple TV, сети и локального хранилища'};
    installed=true;
    notify('Luxo Diagnostics v0.8 загружен');
  } catch(e){console.error('[Luxo Diagnostics] init failed',e);}
}
if(window.appready)init();
else if(window.Lampa&&Lampa.Listener&&Lampa.Listener.follow)Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
var tries=0,timer=setInterval(function(){init();if(installed||++tries>=60)clearInterval(timer);},500);
})();