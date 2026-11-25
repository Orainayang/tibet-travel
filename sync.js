/* sync.js — 实时数据同步
   mode=local  ：局域网同步服务（server/sync_server.py），多台手机经同一 WiFi 实时同步
   mode=supabase：用户自备 Supabase REST，跨网络同步
   mode=off    ：仅本机，同一设备多标签页仍通过 BroadcastChannel 即时刷新
*/
(function(){
'use strict';
var S=window.Store,C=window.Core;
var CONFIG_KEY='sync.config';
var state={channel:null,timer:null,pushTimer:null,applying:false,lastRemote:'',status:'idle',
  lastError:'',pending:false,mode:null};
function defaults(){return {mode:'off',room:'tibet-trip-2026',localUrl:'',url:'',key:''}}
function cfg(){
  var raw=S.get(CONFIG_KEY,null)||{};
  var c=Object.assign(defaults(),raw);
  if(!c.mode)c.mode=raw.enabled?(raw.url?'supabase':'local'):'off';
  return c;
}
function setCfg(c){
  var n=Object.assign(defaults(),c||{});
  if(n.room!==cfg().room)state.lastRemote='';
  S.set(CONFIG_KEY,n);restart();return n;
}
function localEndpoint(c){
  if(c.localUrl&&c.localUrl.trim())return c.localUrl.trim().replace(/\/$/,'');
  if(typeof location!=='undefined'&&/^https?:$/.test(location.protocol))
    return location.protocol+'//'+location.hostname+':8766/api/sync';
  return '';
}
function snapshot(){return window.Exporter&&window.Exporter.fullBackup?window.Exporter.fullBackup():null}
function applySnapshot(data){
  if(!data||typeof data!=='object')return false;
  state.applying=true;
  try{
    if(data.plan)['days','toggles','flex','departure'].forEach(function(k){if(data.plan[k]!=null)S.set('plan.v2.'+k,data.plan[k])});
    if(data.footprint)S.set('foot.v1.records',data.footprint);
    if(data.ledger&&window.Ledger)window.Ledger.restore(data.ledger);
    if(data.settings)S.set('settings',data.settings);
    return true;
  }catch(e){state.lastError=e.message;return false}
  finally{state.applying=false}
}
function localNotify(reason){
  if(state.channel){try{state.channel.postMessage({type:'changed',reason:reason,at:Date.now()})}catch(e){}}
}
function refresh(){if(window.App)window.App.render()}
function headers(c){return c.mode==='supabase'?{'apikey':c.key,'Authorization':'Bearer '+c.key,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
function getURL(c){
  if(c.mode==='supabase')return c.url.replace(/\/$/,'')+'/rest/v1/trip_sync?id=eq.'+encodeURIComponent(c.room)+'&select=data,updated_at';
  return localEndpoint(c)+'?room='+encodeURIComponent(c.room);
}
function parseRows(mode,json){
  return mode==='supabase'?(Array.isArray(json)?json:[]):(json&&json.row?[json.row]:[]);
}
function getRemote(c){
  return fetch(getURL(c),{headers:headers(c)}).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
  }).then(function(j){return parseRows(c.mode,j)});
}
function postRemote(c,payload){
  if(c.mode==='supabase'){
    return fetch(c.url.replace(/\/$/,'')+'/rest/v1/trip_sync',{
      method:'POST',headers:Object.assign({},headers(c),{'Prefer':'resolution=merge-duplicates'}),
      body:JSON.stringify({id:c.room,data:payload,updated_at:payload.syncStamp})
    }).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return null});
  }
  return fetch(localEndpoint(c),{method:'POST',headers:headers(c),
    body:JSON.stringify({id:c.room,data:payload,updated_at:payload.syncStamp})
  }).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
    .then(function(j){return j&&j.latest?j.latest:null});
}
function pushSoon(){
  if(state.applying)return;
  localNotify('local');
  var c=cfg();if(c.mode==='off')return;
  if(c.mode==='supabase'&&(!c.url||!c.key))return;
  if(c.mode==='local'&&!localEndpoint(c))return;
  clearTimeout(state.pushTimer);state.pushTimer=setTimeout(push,250);
}
function push(){
  var c=cfg();if(c.mode==='off')return;
  var data=snapshot();if(!data)return;
  data.syncStamp=new Date().toISOString();
  state.status='pushing';broadcastStatus();
  postRemote(c,data).then(function(latest){
    if(latest&&latest.updated_at&&latest.updated_at!==data.syncStamp){
      state.lastRemote=latest.updated_at;
      if(applySnapshot(latest.data)){localNotify('remote');refresh()}
    }
    state.pending=false;state.lastError='';state.status='synced';broadcastStatus();
  }).catch(function(e){
    state.pending=true;state.lastError=e.message;state.status='offline';broadcastStatus();
  });
}
function pull(manual){
  var c=cfg();if(c.mode==='off')return;
  if(c.mode==='supabase'&&(!c.url||!c.key))return;
  if(c.mode==='local'&&!localEndpoint(c))return;
  state.status='pulling';
  getRemote(c).then(function(rows){
    var row=rows&&rows[0];
    if(row&&row.updated_at&&row.updated_at!==state.lastRemote){
      state.lastRemote=row.updated_at;
      if(applySnapshot(row.data)){localNotify('remote');refresh();if(manual)C.toast('已从云端拉取最新数据')}
    }else if(manual){C.toast('云端已是最新')}
    if(state.pending)push();
    state.status='synced';broadcastStatus();
  }).catch(function(e){state.status='offline';state.lastError=e.message;if(manual)C.toast('同步失败：'+e.message);broadcastStatus()});
}
function broadcastStatus(){localNotify('status')}
function restart(){
  stop();var c=cfg();
  if(typeof BroadcastChannel!=='undefined'){
    state.channel=new BroadcastChannel('tibet-guide-live');
    state.channel.onmessage=function(e){
      if(!e.data)return;
      if(e.data.type==='changed'&&e.data.reason!=='remote')refresh();
      if(e.data.type==='status')updateStatusUI();
    };
  }
  if(window.addEventListener)window.addEventListener('storage',onStorage);
  if(c.mode!=='off'){pull();state.timer=setInterval(function(){pull(false)},2000)}
  updateStatusUI();
}
function onStorage(e){
  if(!e.key)return;
  if(/^(tibetGuide\.v1\.|plan\.v2\.|foot\.|sync\.)/.test(e.key))refresh();
}
function stop(){
  if(state.channel){try{state.channel.close()}catch(e){}state.channel=null}
  if(state.timer){clearInterval(state.timer);state.timer=null}
  if(window.removeEventListener)window.removeEventListener('storage',onStorage);
}
function statusText(){
  var c=cfg();
  if(c.mode==='off')return '本地模式 · 同一设备多标签页即时刷新；未启用跨设备同步';
  if(c.mode==='local')return '局域网同步 · '+state.status+(state.pending?' · 有离线改动待同步':'')+(state.lastError?'（'+state.lastError+'）':'');
  return 'Supabase 同步 · '+state.status+(state.pending?' · 有离线改动待同步':'')+(state.lastError?'（'+state.lastError+'）':'');
}
function updateStatusUI(){var el=document.getElementById('syncStatus');if(el)el.textContent=statusText()}
function inviteLink(){
  if(typeof location==='undefined'||!/^https?:$/.test(location.protocol))return '';
  return location.origin+location.pathname+'?room='+encodeURIComponent(cfg().room);
}
function init(){
  // 邀请链接：?room=xxx 自动切到局域网同步并加入该房间
  if(typeof location!=='undefined'&&location.search){
    var m=location.search.match(/[?&]room=([^&]+)/);
    if(m){
      var room=decodeURIComponent(m[1]),c=cfg();
      if(room&&room!==c.room){c.room=room;if(c.mode==='off'&&/^https?:$/.test(location.protocol))c.mode='local';S.set(CONFIG_KEY,c);C.toast('已加入共享房间 '+room)}
    }
  }
  restart();
}
// 统一拦截本地写入：任何数据变化都即时通知其他标签页 / 推送云端
var originalSet=S.set;
S.set=function(k,v){var r=originalSet(k,v);if(k!==CONFIG_KEY)pushSoon();return r};

window.Sync={cfg:cfg,setCfg:setCfg,snapshot:snapshot,applySnapshot:applySnapshot,push:push,pull:pull,
  pushSoon:pushSoon,restart:restart,stop:stop,status:statusText,inviteLink:inviteLink,init:init};
})();
