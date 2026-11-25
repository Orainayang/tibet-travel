/* footprint.js — 独立旅行足迹（与计划行程、账本完全分离） */
(function(){
'use strict';
var Store=window.Store,C=window.Core;
var K='foot.v1.records';
var STATUS={pending:'待游玩',visited:'已游玩',deferred:'暂缓游玩',cancelled:'已取消'};
function all(){var r=Store.get(K,null);return r&&typeof r==='object'?r:{}}
function save(r){return Store.set(K,r)}
function sid(name){var n=0;for(var i=0;i<String(name).length;i++)n=(n*131+String(name).charCodeAt(i))%100000007;return 's'+('00000000'+n.toString(16)).slice(-8)}
function blank(spot){
  return {id:spot.id||sid(spot.name),name:spot.name,imageKey:spot.imageKey||'lhasa',
    status:'pending',visitDate:'',visitTime:'',duration:'',weather:'',rating:'',experience:'',note:'',
    photos:[],manual:false,category:spot.category||'',tags:spot.tags||[],
    createdAt:Date.now(),updatedAt:Date.now()};
}
function ensure(spot){
  var r=all(),id=spot.id||sid(spot.name);
  if(!r[id]){r[id]=blank(Object.assign({},spot,{id:id}));save(r)}
  else if(spot.name&&r[id].name!==spot.name){r[id].name=spot.name;save(r)}
  return r[id];
}
function ensurePlan(days){(days||window.Plan.current()).forEach(function(d){(d.spots||[]).forEach(function(s){ensure(s)})});return all()}
function get(id){return all()[id]||null}
function update(id,patch){
  var r=all();if(!r[id])return null;
  Object.keys(patch).forEach(function(k){r[id][k]=patch[k]});r[id].updatedAt=Date.now();save(r);return r[id];
}
function setStatus(id,status,date){
  var r=all();if(!r[id])return null;
  r[id].status=status;
  if(status==='visited'&&!r[id].visitDate)r[id].visitDate=date||C.today();
  if(status!=='visited')r[id].visitDate=r[id].visitDate||'';
  r[id].updatedAt=Date.now();save(r);return r[id];
}
function markDay(code,days){
  var d=(days||window.Plan.current()).find(function(x){return x.day===code});if(!d)return 0;
  var r=all(),n=0;(d.spots||[]).forEach(function(s){var id=s.id||sid(s.name);if(!r[id])r[id]=blank(Object.assign({},s,{id:id}));
    r[id].status='visited';if(!r[id].visitDate)r[id].visitDate=C.today();n++});save(r);return n;
}
function unmarkDay(code,days){
  var d=(days||window.Plan.current()).find(function(x){return x.day===code});if(!d)return 0;
  var r=all(),n=0;(d.spots||[]).forEach(function(s){var id=s.id||sid(s.name);if(r[id]&&r[id].status==='visited'){r[id].status='pending';n++}});save(r);return n;
}
function addPhoto(id,data){var r=all();if(!r[id])return;r[id].photos=r[id].photos||[];r[id].photos.push(data);save(r)}
function removePhoto(id,idx){var r=all();if(!r[id])return;r[id].photos.splice(idx,1);save(r)}
function addManual(o){
  var r=all(),id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  r[id]=Object.assign(blank({id:id,name:o.name||'临时景点',imageKey:o.imageKey||'lhasa'}),{
    manual:true,status:o.status||'visited',visitDate:o.date||C.today(),visitTime:o.time||'',
    duration:o.duration||'',weather:o.weather||'',rating:o.rating||'',experience:o.experience||'',
    note:o.note||'',category:o.category||'临时发现',tags:['临时发现']});
  save(r);return r[id];
}
function remove(id){var r=all();delete r[id];save(r)}
function list(){return Object.keys(all()).map(function(k){return all()[k]})}
function visited(){return list().filter(function(x){return x.status==='visited'}).sort(function(a,b){return String(b.visitDate||'').localeCompare(a.visitDate||'')})}
function stats(days){
  var r=all(),out={visited:0,pending:0,deferred:0,cancelled:0,total:0,progress:0,inPlan:0,inPlanVisited:0};
  list().forEach(function(x){if(out[x.status]!=null)out[x.status]++});out.total=list().length;
  var ids={};(days||window.Plan.current()).forEach(function(d){(d.spots||[]).forEach(function(s){ids[s.id||sid(s.name)]=1})});
  Object.keys(ids).forEach(function(id){var x=r[id];if(!x||x.status==='cancelled')return;out.inPlan++;if(x.status==='visited')out.inPlanVisited++});
  out.progress=out.inPlan?Math.round(out.inPlanVisited/out.inPlan*100):0;
  return out;
}
window.Footprint={STATUS:STATUS,all:all,save:save,ensure:ensure,ensurePlan:ensurePlan,get:get,update:update,
  setStatus:setStatus,markDay:markDay,unmarkDay:unmarkDay,addPhoto:addPhoto,removePhoto:removePhoto,
  addManual:addManual,remove:remove,list:list,visited:visited,stats:stats,sid:sid};
})();
