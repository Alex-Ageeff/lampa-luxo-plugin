(function () {
'use strict';
if (window.__luxo_diag_v111) return;
window.__luxo_diag_v111 = true;
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
  heading.textContent='Результаты диагностики · v1.11';
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
    previous=!!localStorage.getItem('luxo_diag_v111_saved');
    localStorage.setItem('luxo_diag_v111_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v111_saved');
  } catch(e) {error=String(e);}
  showReport(['Локальное хранилище: '+(current?'запись OK':'ошибка'), 'Предыдущий запуск v1.11: '+(previous?'есть':'нет'),error]);
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
    showReport(['Luxo Diagnostics v1.11','Сетевые возможности:',apis.join('\n'),'','Анонимные запросы без cookies:',results.join('\n'),'','Ошибка CORS не доказывает недоступность сайта или аккаунта.','Пароли и cookies не передавались.']);
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
    showReport(['Luxo Diagnostics v1.11','Lampa.Reguest().silent'].concat(results).concat(['Тест без логинов и cookies.','Доступность аккаунтов не проверена.']));
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
    showReport(['Luxo Diagnostics v1.11','XMLHttpRequest'].concat(results).concat(['Запросы анонимные; CORS или блокировка могут давать HTTP 0.']));
  });
}

function xsenaProbe(){
  var base='https://pl.xsena.red/sisi';
  showReport(['XSena SISI: проверка началась','GET '+base,'Ожидаем ответ API без учётных данных']);
  var xhr=new XMLHttpRequest(),start=Date.now(),done=false;
  function finish(lines){if(done)return;done=true;showReport(['XSena SISI · v1.11'].concat(lines));}
  try{
    xhr.open('GET',base,true);
    xhr.timeout=12000;
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4)return;
      var lines=['HTTP '+xhr.status+' · '+(Date.now()-start)+' мс'];
      if(xhr.status>=200&&xhr.status<300){
        try{
          var data=JSON.parse(xhr.responseText);
          lines.push('JSON: получен и разобран');
          if(Array.isArray(data.channels)){
            lines.push('channels: '+data.channels.length+' источников');
            data.channels.slice(0,12).forEach(function(ch){lines.push('Источник: '+String(ch.title||ch.name||'без названия').slice(0,65));});
            lines.push('playlist_url: '+data.channels.filter(function(ch){return typeof ch.playlist_url==='string'&&!!ch.playlist_url;}).length+' из '+data.channels.length);
          } else {
            lines.push('channels: отсутствует');
            if(data.msg)lines.push('Сообщение API: '+String(data.msg).slice(0,160));
            if(data.rch)lines.push('RCH: сервер требует дополнительное взаимодействие');
            if(data.accsdb)lines.push('Доступ: сервер сообщает об ограничении');
            lines.push('Поля JSON: '+Object.keys(data).slice(0,12).join(', '));
          }
        }catch(e){lines.push('Не JSON; тип ответа: '+(xhr.getResponseHeader('Content-Type')||'неизвестен'));lines.push('Размер ответа: '+(xhr.responseText||'').length+' символов');}
      }else if(xhr.status===0){lines.push('Нет читаемого HTTP-ответа: возможно CORS, сеть или блокировка');}
      else {lines.push('Сервер ответил ошибкой; тело ответа не выводится');}
      finish(lines);
    };
    xhr.onerror=function(){finish(['Ошибка сети/CORS · HTTP '+xhr.status+' · '+(Date.now()-start)+' мс']);};
    xhr.ontimeout=function(){finish(['Таймаут 12 секунд']);};
    xhr.send();
  }catch(e){finish(['Исключение: '+String(e.name||'Error')]);}
}


function epornerProbe(){
  var url='https://www.eporner.com/api/v2/video/search/?query=all&per_page=5&page=1&thumbsize=medium&order=latest&gay=0&lq=1&format=json';
  showReport(['Eporner API: проверка запущена','Ожидаем JSON каталога без авторизации']);
  var xhr=new XMLHttpRequest(),started=Date.now(),finished=false;
  function done(lines){if(finished)return;finished=true;showReport(['Eporner · v1.11'].concat(lines));}
  try{
    xhr.open('GET',url,true);xhr.timeout=12000;
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4)return;
      var lines=['HTTP '+xhr.status+' · '+(Date.now()-started)+' мс'];
      if(xhr.status>=200&&xhr.status<300){
        try{
          var data=JSON.parse(xhr.responseText);
          lines.push('JSON: успешно разобран');
          var list=Array.isArray(data.videos)?data.videos:Array.isArray(data.results)?data.results:[];
          lines.push('Видео в ответе: '+list.length);
          if(data.total_count!==undefined)lines.push('Всего по данным API: '+data.total_count);
          if(data.total_pages!==undefined)lines.push('Количество страниц: '+data.total_pages);
          if(list.length){
            var sample=list[0];
            lines.push('Поля карточки: '+Object.keys(sample).slice(0,15).join(', '));
            lines.push('Название: '+String(sample.title||sample.name||'без названия').slice(0,85));
            lines.push('Обложка: '+(sample.default_thumb||sample.thumb||sample.image?'есть':'не найдена'));
            lines.push('ID видео: '+(sample.id?'есть':'не найден'));
          }else{
            lines.push('Поля ответа: '+Object.keys(data).slice(0,14).join(', '));
            if(data.error||data.msg)lines.push('Сообщение API: '+String(data.error||data.msg).slice(0,140));
          }
        }catch(e){lines.push('Ответ не JSON ('+(xhr.getResponseHeader('Content-Type')||'тип неизвестен')+')');}
      }else if(xhr.status===0)lines.push('Ответ недоступен: CORS, сеть или блокировка');
      else lines.push('API вернул код ошибки');
      done(lines);
    };
    xhr.onerror=function(){done(['Сетевая ошибка/CORS · HTTP '+xhr.status+' · '+(Date.now()-started)+' мс']);};
    xhr.ontimeout=function(){done(['Таймаут 12 секунд']);};
    xhr.send();
  }catch(e){done(['Исключение '+String(e.name||'Error')]);}
}


var adultApi='https://www.eporner.com/api/v2/video/search/';
function adultRequest(page,ok,fail){
  var xhr=new XMLHttpRequest();
  var url=adultApi+'?query=all&per_page=24&page='+encodeURIComponent(page||1)+'&thumbsize=medium&order=latest&gay=0&lq=1&format=json';
  var ended=false;
  function error(){if(ended)return;ended=true;fail();}
  xhr.open('GET',url,true);xhr.timeout=12000;
  xhr.onreadystatechange=function(){
    if(xhr.readyState!==4||ended)return;
    if(xhr.status!==200)return error();
    try{
      var raw=JSON.parse(xhr.responseText);
      if(!Array.isArray(raw.videos))return error();
      var videos=raw.videos.map(function(v){
        var thumb=v.default_thumb;
        var image=typeof thumb==='string'?thumb:(thumb&&typeof thumb.src==='string'?thumb.src:'');
        return {title:v.title||'Видео',name:v.title||'Видео',id:v.id,
          poster:image,img:image,
          background_image:image,url:v.url||'',eporner_video:v};
      });
      ended=true;
      ok({results:videos,collection:true,total_pages:Math.min(Number(raw.total_pages)||100,100000),page:page||1});
    }catch(e){error();}
  };
  xhr.onerror=error;xhr.ontimeout=error;
  try{xhr.send();}catch(e){error();}
}
function AdultCatalog(object){
  var comp=new Lampa.InteractionCategory(object);
  comp.create=function(){
    var self=this;
    this.activity.loader(true);
    adultRequest(object.page||1,function(data){self.build(data);},this.empty.bind(this));
  };
  comp.nextPageReuest=function(params,resolve,reject){
    adultRequest(params.page||2,resolve.bind(this),reject.bind(this));
  };
  comp.cardRender=function(params,element,card){
    card.onEnter=function(){
      Lampa.Noty.show('Каталог работает. Воспроизведение проверим следующим шагом.');
    };
  };
  return comp;
}
function openAdultCatalog(){
  try{Lampa.Activity.push({title:'18+ · Eporner',component:'luxo_adult_eporner',page:1,url:'eporner'});}
  catch(e){console.error('[Luxo adult catalog]',e);notify('Не удалось открыть каталог');}
}
function ensureAdultMenu(){
  try{
    var lists=document.querySelectorAll('.menu .menu__list');
    if(!lists.length)return false;
    var list=lists[0];
    if(list.querySelector('[data-action="luxo-adult"]'))return true;
    var li=document.createElement('li');
    li.className='menu__item selector';
    li.setAttribute('data-action','luxo-adult');
    li.innerHTML='<div class="menu__ico" style="font-weight:bold;font-size:.85em">18+</div><div class="menu__text">18+ · Eporner</div>';
    li.addEventListener('click',openAdultCatalog);
    if(window.jQuery||window.$)(window.jQuery||window.$)(li).on('hover:enter',openAdultCatalog);
    list.appendChild(li);
    return true;
  }catch(e){console.error('[Luxo menu injection]',e);return false;}
}
function addAdultMenu(){
  if(!window.__luxo_adult_component_ready){
    try{
      Lampa.Component.add('luxo_adult_eporner',AdultCatalog);
      window.__luxo_adult_component_ready=true;
    }catch(e){console.error('[Luxo adult component]',e);return;}
  }
  ensureAdultMenu();
  if(!window.__luxo_adult_menu_watcher){
    window.__luxo_adult_menu_watcher=setInterval(function(){
      if(!window.__luxo_adult_component_ready)return;
      ensureAdultMenu();
    },2500);
  }
}

function init() {
  if(installed||!window.Lampa||!Lampa.SettingsApi)return;
  try {
    Lampa.SettingsApi.addComponent({
      component:id,name:'Luxo Diagnostics',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="1"/></svg>'
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_title',type:'title'},field:{name:'Luxo Diagnostics v1.11'}});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_store',type:'button'},field:{name:'Проверить локальное хранилище'},onChange:storage});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_net',type:'button'},field:{name:'Проверить доступ к сайтам',description:'Анонимный тест сети и CORS без авторизации'},onChange:network});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_lampa',type:'button'},field:{name:'Тест через Lampa.Reguest',description:'Проверка доступа к сайтам через API Lampa'},onChange:lampaNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_report',type:'button'},field:{name:'Показать сохранённый отчёт',description:'Обновить таблицу ниже'},onChange:previousReport});
    Lampa.SettingsApi.addParam({
      component:id,
      param:{name:'luxo_diag_v111_table',type:'static'},
      field:{name:''},
      onRender:function(item){
        try{
          item.css({padding:'0',background:'none',border:'none'});
          reportHost=item[0];
          previousReport();
        }catch(e){console.error('[Luxo Diagnostics] Table render',e);}
      }
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_xhr',type:'button'},field:{name:'Тест через XMLHttpRequest',description:'HTTP-коды и время ответа четырёх адресов'},onChange:xhrNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_xsena',type:'button'},field:{name:'Проверить XSena / SISI',description:'Тест сервера и списка channels без авторизации'},onChange:xsenaProbe});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_eporner',type:'button'},field:{name:'Проверить бесплатный Eporner API',description:'JSON-каталог, карточки и обложки без аккаунта'},onChange:epornerProbe});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v111_open_catalog',type:'button'},field:{name:'Открыть каталог Eporner',description:'Резервный вход, если пункт меню не появился'},onChange:openAdultCatalog});
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'1.11',description:'Диагностика Apple TV, сети и локального хранилища'};
    addAdultMenu();
    installed=true;
    notify('Luxo Diagnostics v1.11 загружен');
  } catch(e){console.error('[Luxo Diagnostics] init failed',e);}
}
if(window.appready)init();
else if(window.Lampa&&Lampa.Listener&&Lampa.Listener.follow)Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
var tries=0,timer=setInterval(function(){init();if(installed||++tries>=60)clearInterval(timer);},500);
})();