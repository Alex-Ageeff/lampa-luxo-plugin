(function () {
'use strict';
if (window.__luxo_diag_v115) return;
window.__luxo_diag_v115 = true;
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
  heading.textContent='Результаты диагностики · v1.15';
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
    previous=!!localStorage.getItem('luxo_diag_v115_saved');
    localStorage.setItem('luxo_diag_v115_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v115_saved');
  } catch(e) {error=String(e);}
  showReport(['Локальное хранилище: '+(current?'запись OK':'ошибка'), 'Предыдущий запуск v1.15: '+(previous?'есть':'нет'),error]);
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
    showReport(['Luxo Diagnostics v1.15','Сетевые возможности:',apis.join('\n'),'','Анонимные запросы без cookies:',results.join('\n'),'','Ошибка CORS не доказывает недоступность сайта или аккаунта.','Пароли и cookies не передавались.']);
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
    showReport(['Luxo Diagnostics v1.15','Lampa.Reguest().silent'].concat(results).concat(['Тест без логинов и cookies.','Доступность аккаунтов не проверена.']));
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
    showReport(['Luxo Diagnostics v1.15','XMLHttpRequest'].concat(results).concat(['Запросы анонимные; CORS или блокировка могут давать HTTP 0.']));
  });
}

function xsenaProbe(){
  var base='https://pl.xsena.red/sisi';
  showReport(['XSena SISI: проверка началась','GET '+base,'Ожидаем ответ API без учётных данных']);
  var xhr=new XMLHttpRequest(),start=Date.now(),done=false;
  function finish(lines){if(done)return;done=true;showReport(['XSena SISI · v1.15'].concat(lines));}
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
  function done(lines){if(finished)return;finished=true;showReport(['Eporner · v1.15'].concat(lines));}
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

var adultOptions={
  query:'all',order:'latest',gay:0,lq:1
};
var adultCategories=[
  {title:'Все видео',query:'all'},
  {title:'Любительское',query:'amateur'},
  {title:'POV',query:'pov'},
  {title:'Милф',query:'milf'},
  {title:'Зрелые',query:'mature'},
  {title:'Лесби',query:'lesbian'},
  {title:'Азиатские',query:'asian'},
  {title:'Японские',query:'japanese'},
  {title:'Групповые',query:'group'},
  {title:'Соло',query:'solo'},
  {title:'VR',query:'vr'}
];
var adultOrders=[
  {title:'Новые',value:'latest'},
  {title:'Популярные за неделю',value:'top-weekly'},
  {title:'Популярные за месяц',value:'top-monthly'},
  {title:'Самые популярные',value:'most-popular'},
  {title:'Высокий рейтинг',value:'top-rated'},
  {title:'Длинные',value:'longest'},
  {title:'Короткие',value:'shortest'}
];
function adultRequest(page,ok,fail){
  var xhr=new XMLHttpRequest();
  var url=adultApi+'?query='+encodeURIComponent(adultOptions.query||'all')+
    '&per_page=24&page='+encodeURIComponent(page||1)+
    '&thumbsize=medium&order='+encodeURIComponent(adultOptions.order)+
    '&gay='+adultOptions.gay+'&lq='+adultOptions.lq+'&format=json';
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
          poster:image,img:image,background_image:image,
          quality:v.length_min||'',url:v.url||'',eporner_video:v};
      });
      ended=true;
      ok({results:videos,collection:true,total_pages:Math.min(Number(raw.total_pages)||1,100000),page:page||1});
    }catch(e){error();}
  };
  xhr.onerror=error;xhr.ontimeout=error;
  try{xhr.send();}catch(e){error();}
}
function openAdultFiltered(){
  Lampa.Activity.push({title:'18+ · Eporner',component:'luxo_adult_eporner',page:1,url:'eporner',query:adultOptions.query,order:adultOptions.order});
}
function adultChooser(title,options,callback){
  var previous='content';
  try{previous=(Lampa.Controller.enabled()||{}).name||'content';}catch(e){}
  Lampa.Select.show({title:title,items:options,
    onSelect:function(option){
      callback(option);
    },onBack:function(){Lampa.Controller.toggle(previous);}
  });
}
function adultFilters(){
  var entries=[
    {title:'Поиск по названию или теме',kind:'search'},
    {title:'Раздел / тематика: '+(adultCategories.filter(function(c){return c.query===adultOptions.query;})[0]||{title:'Поиск'}).title,kind:'category'},
    {title:'Сортировка: '+(adultOrders.filter(function(o){return o.value===adultOptions.order;})[0]||adultOrders[0]).title,kind:'order'},
    {title:'Качество: '+(adultOptions.lq===0?'без низкого качества':'все'),kind:'quality'},
    {title:'Тип каталога: '+(adultOptions.gay===0?'без gay':adultOptions.gay===2?'только gay':'все'),kind:'content'}
  ];
  adultChooser('Фильтры Eporner',entries,function(item){
    if(item.kind==='search'){
      try{
        Lampa.Input.edit({title:'Поиск Eporner',value:adultOptions.query==='all'?'':adultOptions.query,free:true,nosave:true},function(v){
          if(v&&v.trim()){adultOptions.query=v.trim();openAdultFiltered();}
          else Lampa.Controller.toggle('content');
        });
      }catch(e){Lampa.Noty.show('Поиск недоступен в этой версии Lampa');}
      return;
    }
    if(item.kind==='category')return adultChooser('Разделы',adultCategories,function(choice){adultOptions.query=choice.query;openAdultFiltered();});
    if(item.kind==='order')return adultChooser('Сортировка',adultOrders,function(choice){adultOptions.order=choice.value;openAdultFiltered();});
    if(item.kind==='quality')return adultChooser('Качество',[{title:'Все',value:1},{title:'Без низкого качества',value:0}],function(choice){adultOptions.lq=choice.value;openAdultFiltered();});
    if(item.kind==='content')return adultChooser('Тип каталога',[{title:'Без gay',value:0},{title:'Все',value:1},{title:'Только gay',value:2}],function(choice){adultOptions.gay=choice.value;openAdultFiltered();});
  });
}
function adultPlayableCandidate(data){
  var urls=[];
  function add(v){
    if(typeof v==='string')urls.push(v);
    else if(v&&typeof v.url==='string')urls.push(v.url);
  }
  add(data.default_quality);
  if(data.all_qualities&&typeof data.all_qualities==='object'){
    Object.keys(data.all_qualities).sort(function(a,b){return Number(b)-Number(a);}).forEach(function(q){add(data.all_qualities[q]);});
  }
  if(Array.isArray(data.sources))data.sources.forEach(add);
  ['mp4','stream_url','video_url','file'].forEach(function(k){add(data[k]);});
  return urls.filter(function(u){return /^https:\/\//i.test(u)&&/\.(mp4|m3u8)(\?|#|$)/i.test(u);})[0]||'';
}
function epornerBase36(hex) {
  var chunks=[];
  for(var i=0;i<32;i+=8)chunks.push(parseInt(hex.substr(i,8),16).toString(36));
  return chunks.join('');
}
function epornerSource(json) {
  var sources=json&&json.sources, candidates=[];
  if(!sources||typeof sources!=='object')return '';
  Object.keys(sources).forEach(function(kind){
    var group=sources[kind];
    if(!group||typeof group!=='object')return;
    Object.keys(group).forEach(function(quality){
      var entry=group[quality],src=entry&&entry.src;
      if(typeof src==='string'&&src.indexOf('https://')===0){
        candidates.push({src:src,priority:(kind==='mp4'?100:kind==='hls'?50:0)+(parseInt(quality,10)||0)});
      }
    });
  });
  candidates.sort(function(a,b){return b.priority-a.priority;});
  return candidates.length?candidates[0].src:'';
}
function adultPlay(element){
  var id=String(element.id||'');
  if(!id){Lampa.Noty.show('Нет ID видео');return;}
  var started=Date.now(),lines=['Eporner: проверка потока · v1.15','ID: '+id];
  var page=element.url||'https://www.eporner.com/hd-porn/'+encodeURIComponent(id)+'/';
  if(page.indexOf('https://www.eporner.com/')!==0){
    lines.push('Некорректная ссылка страницы');
    showReport(lines);return;
  }
  var done=false;
  function finish(message){
    if(done)return;done=true;
    lines.push('Итог: '+message,'Время: '+(Date.now()-started)+' мс');
    showReport(lines);
    Lampa.Noty.show(message);
  }
  function get(url,cb){
    var xhr=new XMLHttpRequest(),settled=false;
    function complete(err,body,status){
      if(settled)return;settled=true;cb(err,body,status);
    }
    try{
      xhr.open('GET',url,true);xhr.timeout=11000;
      xhr.onreadystatechange=function(){if(xhr.readyState===4)complete(xhr.status===200?null:'HTTP '+xhr.status,xhr.responseText||'',xhr.status);};
      xhr.onerror=function(){complete('CORS или ошибка сети','',xhr.status);};
      xhr.ontimeout=function(){complete('таймаут','',xhr.status);};
      xhr.send();
    }catch(e){complete('исключение '+e.name,'',0);}
  }
  Lampa.Noty.show('Проверка страницы видео...');
  get(page,function(err,html,status){
    lines.push('Страница: HTTP '+status);
    if(err){finish('Страница недоступна: '+err);return;}
    var match=html.match(/hash\s*[:=]\s*['"]([0-9a-fA-F]{32})['"]/);
    if(!match){finish('Hash видеоплеера не найден в HTML');return;}
    lines.push('Hash: обнаружен (значение не выводится)');
    var url='https://www.eporner.com/xhr/video/'+encodeURIComponent(id)+
      '?hash='+encodeURIComponent(epornerBase36(match[1]))+
      '&device=generic&domain=www.eporner.com&fallback=false';
    get(url,function(e,body,code){
      lines.push('XHR video: HTTP '+code);
      if(e){finish('Видео API: '+e);return;}
      var data;
      try{data=JSON.parse(body);}catch(ex){finish('Видео API: ответ не JSON');return;}
      if(data.available===false){finish('Видео недоступно по ответу сервера');return;}
      var stream=epornerSource(data);
      if(!stream){lines.push('Поля ответа: '+Object.keys(data).slice(0,15).join(', '));finish('В ответе нет прямых источников');return;}
      lines.push('Получен адрес потока: '+(stream.indexOf('.m3u8')!==-1?'HLS':'видеофайл'));
      finish('Пробуем воспроизведение');
      try{
        var item={title:element.title,url:stream};
        Lampa.Player.play(item);
        Lampa.Player.playlist([item]);
      }catch(ex){lines.push('Ошибка Lampa.Player: '+ex.name);showReport(lines);Lampa.Noty.show('Плеер не открылся');}
    });
  });
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
      adultPlay(element);
    };
  };
  comp.filter=adultFilters;
  comp.onRight=comp.filter.bind(comp);
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
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_title',type:'title'},field:{name:'Luxo Diagnostics v1.15'}});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_store',type:'button'},field:{name:'Проверить локальное хранилище'},onChange:storage});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_net',type:'button'},field:{name:'Проверить доступ к сайтам',description:'Анонимный тест сети и CORS без авторизации'},onChange:network});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_lampa',type:'button'},field:{name:'Тест через Lampa.Reguest',description:'Проверка доступа к сайтам через API Lampa'},onChange:lampaNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_report',type:'button'},field:{name:'Показать сохранённый отчёт',description:'Обновить таблицу ниже'},onChange:previousReport});
    Lampa.SettingsApi.addParam({
      component:id,
      param:{name:'luxo_diag_v115_table',type:'static'},
      field:{name:''},
      onRender:function(item){
        try{
          item.css({padding:'0',background:'none',border:'none'});
          reportHost=item[0];
          previousReport();
        }catch(e){console.error('[Luxo Diagnostics] Table render',e);}
      }
    });
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_xhr',type:'button'},field:{name:'Тест через XMLHttpRequest',description:'HTTP-коды и время ответа четырёх адресов'},onChange:xhrNetwork});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_xsena',type:'button'},field:{name:'Проверить XSena / SISI',description:'Тест сервера и списка channels без авторизации'},onChange:xsenaProbe});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_eporner',type:'button'},field:{name:'Проверить бесплатный Eporner API',description:'JSON-каталог, карточки и обложки без аккаунта'},onChange:epornerProbe});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_open_catalog',type:'button'},field:{name:'Открыть каталог Eporner',description:'Резервный вход, если пункт меню не появился'},onChange:openAdultCatalog});
    Lampa.SettingsApi.addParam({component:id,param:{name:'luxo_diag_v115_filters',type:'button'},field:{name:'Фильтры каталога Eporner',description:'Поиск, тематика, сортировка, качество'},onChange:adultFilters});
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'1.15',description:'Диагностика Apple TV, сети и локального хранилища'};
    addAdultMenu();
    installed=true;
    notify('Luxo Diagnostics v1.15 загружен');
  } catch(e){console.error('[Luxo Diagnostics] init failed',e);}
}
if(window.appready)init();
else if(window.Lampa&&Lampa.Listener&&Lampa.Listener.follow)Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
var tries=0,timer=setInterval(function(){init();if(installed||++tries>=60)clearInterval(timer);},500);
})();