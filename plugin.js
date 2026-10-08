(function () {
'use strict';
if (window.__luxo_diag_v10) return;
window.__luxo_diag_v10 = true;
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
  var details=lines.join('\n');
  console.log('[Luxo Diagnostics report]\n'+details);
  try { localStorage.setItem('luxo_diag_last_report',details); } catch(e) {}
  // No Modal/Select: notifications do not capture remote focus.
  var siteLines=lines.filter(function(x){
    return /Pornhub:|xHamster:|XVideos:|GitHub Pages|Локальное хранилище:|Предыдущий запуск/.test(x);
  });
  var concise=siteLines.join(' | ');
  if(!concise) concise=lines.slice(0,3).join(' | ');
  notify(concise.slice(0,260));
}
function previousReport() {
  var saved='';
  try { saved=localStorage.getItem('luxo_diag_last_report')||''; } catch(e) {}
  if(!saved) { notify('Отчёт пока отсутствует'); return; }
  showReport(saved.split('\n'));
}
function storage() {
  var previous=false,current=false,error='';
  try {
    previous=!!localStorage.getItem('luxo_diag_v10_saved');
    localStorage.setItem('luxo_diag_v10_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v10_saved');
  } catch(e) {error=String(e);}
  showReport(['Локальное хранилище: '+(current?'запись OK':'ошибка'), 'Предыдущий запуск v1.0: '+(previous?'есть':'нет'),error]);
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
    showReport(['Luxo Diagnostics v1.0','Сетевые возможности:',apis.join('\n'),'','Анонимные запросы без cookies:',results.join('\n'),'','Ошибка CORS не доказывает недоступность сайта или аккаунта.','Пароли и cookies не передавались.']);
  });
}
function requestViaLampa(site) {
  return new Promise(function(resolve) {
    if (!window.Lampa || typeof Lampa.Reguest !== 'function') {
      return resolve(site.name+': Lampa.Reguest не поддерживается');
    }
    var finished=false;
    var timer=setTimeout(function(){done('таймаут 10 с');},10000);
    function done(value) {
      if(finished)return;
      finished=true;clearTimeout(timer);
      resolve(site.name+': '+value);
    }
    try {
      var req=new Lampa.Reguest();
      req.silent(site.url,function(data){
        done('ответ получен, тип: '+typeof data);
      },function(error){
        var msg=error && (error.status||error.statusText||error.name);
        done('ошибка запроса'+(msg?' ('+String(msg).slice(0,35)+')':''));
      },false,{timeout:8500});
    } catch(e){done('исключение '+(e.name||'Error'));}
  });
}
function lampaNetwork() {
  notify('Luxo Diagnostics: тест Lampa.Reguest...');
  var sites=targetSites.concat([{name:'GitHub Pages (контроль)',url:'https://alex-ageeff.github.io/lampa-luxo-plugin/plugin.js'}]);
  Promise.all(sites.map(requestViaLampa)).then(function(results){
    showReport(['Luxo Diagnostics v1.0','Lampa.Reguest().silent','',results.join('\\n'),'','Тест выполняется без передачи логинов и cookies.','Результат не доказывает доступность аккаунтов.']);
  });
}
function init() {
  if(installed||!window.Lampa||!Lampa.SettingsApi)return;
  try {
    Lampa.SettingsApi.addComponent({
      component:id,name:'Luxo Diagnostics',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="1"/></svg>'
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v10_title',type:'title'},field:{name:'Luxo Diagnostics v1.0'}});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v10_store',type:'button'},field:{name:'Проверить локальное хранилище'},onChange:storage});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v10_net',type:'button'},field:{name:'Проверить доступ к сайтам',description:'Анонимный тест сети и CORS без авторизации'},onChange:network});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v10_lampa',type:'button'},field:{name:'Тест через Lampa.Reguest',description:'Проверка доступа к сайтам через API Lampa'},onChange:lampaNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v10_report',type:'button'},field:{name:'Последний отчёт',description:'Краткие результаты диагностики'},onChange:previousReport});
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'1.0',description:'Диагностика Apple TV, сети и локального хранилища'};
    installed=true;
    notify('Luxo Diagnostics v1.0 загружен');
  } catch(e){console.error('[Luxo Diagnostics] init failed',e);}
}
if(window.appready)init();
else if(window.Lampa&&Lampa.Listener&&Lampa.Listener.follow)Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
var tries=0,timer=setInterval(function(){init();if(installed||++tries>=60)clearInterval(timer);},500);
})();