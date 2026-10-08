(function () {
'use strict';
if (window.__luxo_diag_v14) return;
window.__luxo_diag_v14 = true;
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
var reportHost=null;
var reportData=['Диагностика пока не запускалась'];
function reportStatus(line){
  if(/ответ получен|доступ CORS|запись OK|HTTP 2\\d\\d.*доступ/i.test(line)) return {mark:'✓',color:'#91dc9b'};
  if(/ошибка|таймаут|нет читаемого|исключение|недоступен|нет ответа/i.test(line)) return {mark:'✕',color:'#ff9292'};
  return {mark:'•',color:'#c4cad2'};
}
function drawReport(){
  if(!reportHost||!document.body.contains(reportHost))return;
  reportHost.textContent='';
  var panel=document.createElement('div');
  panel.style.cssText='margin:.35em 0 .6em 1.2em;padding:.65em .8em;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.04);max-width:85%;font-size:.83em;';
  var heading=document.createElement('div');
  heading.textContent='Результаты диагностики · v1.4';
  heading.style.cssText='font-weight:bold;margin-bottom:.5em;color:#ddd;';
  panel.appendChild(heading);
  reportData.forEach(function(line){
    var row=document.createElement('div');
    row.style.cssText='display:flex;gap:.55em;align-items:flex-start;padding:.27em 0;border-bottom:1px solid rgba(255,255,255,.045);';
    var state=reportStatus(line);
    var icon=document.createElement('span');
    icon.textContent=state.mark;icon.style.cssText='color:'+state.color+';min-width:1em;';
    var value=document.createElement('span');
    value.textContent=line;value.style.cssText='color:#ddd;white-space:normal;overflow-wrap:anywhere;line-height:1.4;';
    row.appendChild(icon);row.appendChild(value);panel.appendChild(row);
  });
  reportHost.appendChild(panel);
}
function showReport(lines){
  var clean=[];
  lines.forEach(function(line){String(line).split('\\n').forEach(function(part){if(part.trim())clean.push(part.trim());});});
  reportData=clean.length?clean:['Пустой отчёт'];
  console.log('[Luxo Diagnostics report]',reportData);
  try{localStorage.setItem('luxo_diag_last_report',JSON.stringify(reportData));}catch(e){}
  drawReport();
}
function previousReport(){
  try{
    var saved=JSON.parse(localStorage.getItem('luxo_diag_last_report')||'null');
    if(Array.isArray(saved))reportData=saved;
  }catch(e){}
  drawReport();
}

function storage() {
  var previous=false,current=false,error='';
  try {
    previous=!!localStorage.getItem('luxo_diag_v14_saved');
    localStorage.setItem('luxo_diag_v14_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v14_saved');
  } catch(e) {error=String(e);}
  showReport(['Локальное хранилище: '+(current?'запись OK':'ошибка'), 'Предыдущий запуск v1.4: '+(previous?'есть':'нет'),error]);
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
    showReport(['Luxo Diagnostics v1.4','Сетевые возможности:',apis.join('\n'),'','Анонимные запросы без cookies:',results.join('\n'),'','Ошибка CORS не доказывает недоступность сайта или аккаунта.','Пароли и cookies не передавались.']);
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
    showReport(['Luxo Diagnostics v1.4','Lampa.Reguest().silent'].concat(results).concat(['Тест без логинов и cookies.','Доступность аккаунтов не проверена.']));
  });
}
function xhrRequest(site) {
  return new Promise(function(resolve){
    if(typeof XMLHttpRequest!=='function')return resolve(site.name+': XMLHttpRequest недоступен');
    var done=false, xhr=new XMLHttpRequest(), started=Date.now();
    function finish(detail) {
      if(done)return;
      done=true;resolve(site.name+': '+detail+' ('+(Date.now()-started)+' мс)');
    }
    try {
      xhr.open('GET',site.url,true);
      xhr.timeout=9000;
      xhr.onreadystatechange=function(){
        if(xhr.readyState===4)finish('HTTP '+xhr.status+(xhr.status>=200&&xhr.status<300?' — ответ получен':' — ответ недоступен/ошибка'));
      };
      xhr.onerror=function(){finish('сетевая ошибка, статус '+xhr.status);};
      xhr.ontimeout=function(){finish('таймаут');};
      xhr.send();
    } catch(e){finish('исключение '+(e.name||'Error'));}
  });
}
function xhrNetwork(){
  notify('Luxo Diagnostics: тест XMLHttpRequest...');
  var sites=targetSites.concat([{name:'GitHub Pages (контроль)',url:'https://alex-ageeff.github.io/lampa-luxo-plugin/plugin.js'}]);
  Promise.all(sites.map(xhrRequest)).then(function(results){
    showReport(['Luxo Diagnostics v1.4','XMLHttpRequest'].concat(results).concat(['Запросы анонимные; CORS или блокировка могут давать HTTP 0.']));
  });
}
function init() {
  if(installed||!window.Lampa||!Lampa.SettingsApi)return;
  try {
    Lampa.SettingsApi.addComponent({
      component:id,name:'Luxo Diagnostics',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="1"/></svg>'
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_title',type:'title'},field:{name:'Luxo Diagnostics v1.4'}});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_store',type:'button'},field:{name:'Проверить локальное хранилище'},onChange:storage});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_net',type:'button'},field:{name:'Проверить доступ к сайтам',description:'Анонимный тест сети и CORS без авторизации'},onChange:network});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_lampa',type:'button'},field:{name:'Тест через Lampa.Reguest',description:'Проверка доступа к сайтам через API Lampa'},onChange:lampaNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_report',type:'button'},field:{name:'Показать сохранённый отчёт',description:'Обновить таблицу ниже'},onChange:previousReport});
    Lampa.SettingsApi.addParam({
      component:id,
      param:{name:'luxo_diag_v14_table',type:'static'},
      field:{name:''},
      onRender:function(item){
        try{
          item.css({padding:'0',background:'none',border:'none'});
          reportHost=item[0];
          previousReport();
        }catch(e){console.error('[Luxo Diagnostics] Table render',e);}
      }
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v14_xhr',type:'button'},field:{name:'Тест через XMLHttpRequest',description:'HTTP-коды и время ответа четырёх адресов'},onChange:xhrNetwork});
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'1.4',description:'Диагностика Apple TV, сети и локального хранилища'};
    installed=true;
    notify('Luxo Diagnostics v1.4 загружен');
  } catch(e){console.error('[Luxo Diagnostics] init failed',e);}
}
if(window.appready)init();
else if(window.Lampa&&Lampa.Listener&&Lampa.Listener.follow)Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
var tries=0,timer=setInterval(function(){init();if(installed||++tries>=60)clearInterval(timer);},500);
})();