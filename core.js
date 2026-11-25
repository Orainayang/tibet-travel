/* core.js — 状态、存储、行程构建与通用工具 */
(function(){
'use strict';

var KEY='tibetGuide.v1.';
var Store={
  get:function(k,def){try{var v=localStorage.getItem(KEY+k);return v==null?def:JSON.parse(v)}catch(e){return def}},
  set:function(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));return true}catch(e){if(window.App)App.toast('本地存储空间不足，请清理照片或导出备份');return false}},
  del:function(k){try{localStorage.removeItem(KEY+k)}catch(e){}}
};

var DEFAULT_SETTINGS={
  departure:'2026-12-15',
  toggles:{chaka:false,glacier:true,midui:false,dingjie:true,namtso:true,songsongExtra:false,flex:false},
  people:2,
  sharePeople:2
};

function clone(o){return JSON.parse(JSON.stringify(o))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(cents){var n=Math.round(cents||0)/100;return '¥'+n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function money0(cents){return '¥'+Math.round((cents||0)/100).toLocaleString('zh-CN')}
function yuan(cents){return (Math.round(cents||0)/100).toFixed(2)}
function pad(n){return n<10?'0'+n:''+n}
function dateAdd(iso,days){var d=new Date(iso+'T00:00:00Z');if(isNaN(d))return iso;d.setUTCDate(d.getUTCDate()+days);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}
function dateCN(iso){if(!iso)return '';var p=iso.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function dateShort(iso){if(!iso)return '';var p=iso.split('-');return (+p[1])+'/'+(+p[2])}
function weekday(iso){var d=new Date(iso+'T00:00:00Z');return ['周日','周一','周二','周三','周四','周五','周六'][d.getUTCDay()]||''}
function daysBetween(a,b){var x=new Date(a+'T00:00:00Z'),y=new Date(b+'T00:00:00Z');return Math.round((y-x)/86400000)}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function num(v){var n=parseInt(v,10);return isNaN(n)?0:n}
function alt(v){var m=String(v||'').match(/\d+/);return m?num(m[0]):0}

var toastTimer=null;
function toast(msg){var el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=function(){return 0}();toastTimer=setTimeout(function(){el.classList.remove('show')},2400)}

function photos(key){
  var imgs=(window.IMAGES||{})[key]||[];
  return imgs.map(function(x){return {file:x.file,title:x.title,author:x.author,license:x.license,page:x.page}});
}
function photoHTML(key,limit){
  var ps=photos(key).slice(0,limit||4);
  if(!ps.length)return '<div class="no-photo">图片待补充 · 未找到可核实来源的真实照片，不使用其他景点照片代替</div>';
  return '<div class="thumbs">'+ps.map(function(p){
    return '<img class="thumb" src="'+esc(p.file)+'" alt="'+esc(p.title)+'" loading="lazy" data-zoom="'+esc(p.file)+'" data-title="'+esc(p.title)+'" data-credit="'+esc((p.author||'')+' · '+(p.license||''))+'">';
  }).join('')+'</div>';
}

/* ---------- 可选模块开关驱动的行程构建 ---------- */
function settings(){
  var s=Store.get('settings',null);if(!s){s={departure:'2026-12-15',people:2,sharePeople:2};Store.set('settings',s)}
  s.toggles=window.Plan?window.Plan.toggles():Object.assign({},DEFAULT_SETTINGS.toggles,s.toggles||{});
  s.departure=window.Plan?window.Plan.getDeparture():(s.departure||'2026-12-15');
  return s;
}
function saveSettings(s){
  if(s.departure&&window.Plan)window.Plan.setDeparture(s.departure);
  delete s.toggles;Store.set('settings',s);
}
function makeDay(base,over){
  var d=clone(base);
  Object.keys(over||{}).forEach(function(k){d[k]=over[k]});
  return d;
}
function emptyDay(o){
  return Object.assign({day:'',index:0,rawModule:'主线',route:'',scheduleRaw:'',scheduleLines:[],
    slots:{morning:[],noon:[],afternoon:[],evening:[]},spotNamesRaw:'',spots:[],detailRaw:'',
    lodging:'',lodgingAlt:'',drivingRaw:'',imagesRaw:'',notesRaw:'',notes:[],synthetic:true},o||{});
}

function buildItinerary(){return window.Plan?window.Plan.current():[]}
/* ---------- 预算 ---------- */
var TOGGLE_DELTA={
  chaka:101000, glacier:-405000, dingjie:-135000, namtso:-270000,
  songsongExtra:135000, flex:135000, midui:20000
};
function budgetTotal(){return window.Plan?window.Plan.budget():0}
function totalKm(days){
  var km=0;days.forEach(function(d){
    var m=String(d.drivingRaw||'').match(/(\d+)\s*[–-]\s*(\d+)\s*km|(\d+)\s*km/);
    if(m)km+=num(m[3]||m[2]);
  });return km;
}
function maxAlt(days){var a=0;days.forEach(function(d){a=Math.max(a,alt(d.lodgingAlt))});return a}
function coreSpotCount(days){var s={};days.forEach(function(d){d.spots.forEach(function(p){if((p.tags||[]).indexOf('核心景点')>=0)s[p.name]=1})});return Object.keys(s).length}

/* ---------- 地图坐标（路线示意图，非实时导航） ---------- */
var GEO={
 '西宁':[101.78,36.62],'青海湖':[100.20,36.90],'茶卡盐湖':[99.10,36.78],
 '格尔木':[94.90,36.40],'昆仑山·玉珠峰':[94.10,35.55],'可可西里·沱沱河':[92.40,34.20],
 '唐古拉山':[91.90,33.00],'错那湖':[91.70,32.20],'那曲':[92.10,31.48],'当雄':[91.10,30.50],
 '拉萨':[91.14,29.65],'林芝':[94.36,29.57],'鲁朗':[94.70,29.76],'波密':[95.77,29.86],
 '然乌湖':[96.77,29.48],'来古冰川':[96.68,29.32],'索松村':[94.95,29.30],
 '羊卓雍措':[90.70,28.90],'卡若拉冰川':[90.20,28.90],'日喀则':[88.88,29.27],
 '定日':[87.10,28.30],'珠峰大本营':[86.85,27.99],'定结':[88.10,28.10],'纳木措':[90.60,30.70]
};
function project(lon,lat){return {x:50+(lon-86)/16*880,y:34+(38-lat)/11*540}}

window.Store=Store;
window.Core={esc:esc,money:money,money0:money0,yuan:yuan,pad:pad,dateAdd:dateAdd,dateCN:dateCN,dateShort:dateShort,
  weekday:weekday,daysBetween:daysBetween,today:today,num:num,alt:alt,clone:clone,toast:toast,
  photos:photos,photoHTML:photoHTML,getStore:function(){return settings()},settings:settings,saveSettings:saveSettings,
  buildItinerary:buildItinerary,budgetTotal:budgetTotal,totalKm:totalKm,maxAlt:maxAlt,coreSpotCount:coreSpotCount,
  GEO:GEO,project:project,DEFAULT_SETTINGS:DEFAULT_SETTINGS};
})();
