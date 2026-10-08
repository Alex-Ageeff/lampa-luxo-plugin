(function () {
'use strict';
if (window.__luxo_diag_v07) return;
window.__luxo_diag_v07 = true;
var id='luxo_diagnostics_test';
var installed=false;
function notice(message) {
  console.log('[Luxo Diagnostics]', message);
  try { if(Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message); } catch(e){}
}
function report() {
  var previous=false, current=false, err='';
  try {
    previous=!!localStorage.getItem('luxo_diag_v07_saved');
    localStorage.setItem('luxo_diag_v07_saved',String(Date.now()));
    current=!!localStorage.getItem('luxo_diag_v07_saved');
  } catch(e) {err=String(e);}
  notice('Luxo Diagnostics: запись '+(current?'OK':'FAIL')+', предыдущий запуск '+(previous?'есть':'нет'));
  console.log('[Luxo Diagnostics] storage', {previous:previous,current:current,error:err});
}
function init() {
  if(installed || !window.Lampa || !Lampa.SettingsApi) return;
  try {
    Lampa.SettingsApi.addComponent({
      component:id,name:'Luxo Diagnostics',
      icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="1"/></svg>'
    });
    Lampa.SettingsApi.addParam({
      component:id,
      param:{name:'luxo_diag_v07_title',type:'title'},
      field:{name:'Luxo Diagnostics v0.7'}
    });
    Lampa.SettingsApi.addParam({
      component:id,
      param:{name:'luxo_diag_v07_run',type:'button'},
      field:{name:'Проверить локальное хранилище',description:'Диагностика Luxo и Apple TV'},
      onChange:report
    });
    Lampa.Manifest=Lampa.Manifest||{};
    Lampa.Manifest.plugins={type:'other',name:'Luxo Diagnostics',version:'0.7',description:'Проверка запуска плагина и локального хранилища Apple TV'};
    installed=true;
    notice('Luxo Diagnostics v0.7 запущен');
  } catch(e) {console.error('[Luxo Diagnostics] Registration failed:',e);}
}
if (window.appready) init();
else if(window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
  Lampa.Listener.follow('app',function(event) {if(event.type==='ready') init();});
}
var n=0,timer=setInterval(function(){init();if(installed || ++n>=60)clearInterval(timer);},500);
})();