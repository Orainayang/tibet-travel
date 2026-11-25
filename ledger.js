/* ledger.js — 旅行账本：整数分计算、灵活AA分摊、结算、公共资金池 */
(function(){
'use strict';
var K='tibetGuide.v1.ledger.';
var Store=window.Store, C=window.Core;

function load(k,def){return Store.get('ledger.'+k,def)}
function save(k,v){return Store.set('ledger.'+k,v)}
function uid(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function cents(v){var n=parseFloat(v);return isNaN(n)?0:Math.round(n*100)}
function toYuan(c){return (Math.round(c||0)/100).toFixed(2)}

var DEFAULT_CATEGORIES=['大交通','包车及拼车','油费','高速过路费','停车费','酒店住宿','餐饮','景区门票','景区观光车','摄影及藏服写真','购物','保险','医疗及供氧','其他费用'];
var CATEGORY_ICON={'大交通':'🚄','包车及拼车':'🚙','油费':'⛽','高速过路费':'🛣️','停车费':'🅿️','酒店住宿':'🏨','餐饮':'🍜','景区门票':'🎫','景区观光车':'🚌','摄影及藏服写真':'📷','购物':'🛍️','保险':'🛡️','医疗及供氧':'💨','其他费用':'🧾'};

function members(){return load('members',[])}
function setMembers(v){save('members',v)}
function expenses(){return load('expenses',[])}
function setExpenses(v){save('expenses',v)}
function settlements(){return load('settlements',[])}
function setSettlements(v){save('settlements',v)}
function categories(){return load('categories',DEFAULT_CATEGORIES.slice())}
function setCategories(v){save('categories',v)}
function pool(){return load('pool',{contributions:[],custodian:''})}
function setPool(v){save('pool',v)}
function paidBudget(){return load('paidBudget',0)}
function setPaidBudget(v){save('paidBudget',v)}
function lastForm(){return load('lastForm',{payer:'',participants:[],category:'餐饮'})}
function setLastForm(v){save('lastForm',v)}
function addonFlag(){return load('addonEnabled',false)}
function setAddonFlag(v){save('addonEnabled',v)}

/* ---------- 分摊算法：最大余额法，保证总额完全一致 ---------- */
function splitEven(total,ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length)return {};
  var neg=total<0, t=Math.abs(Math.round(total));
  var q=Math.floor(t/ids.length), rem=t-q*ids.length;
  var out={};
  ids.forEach(function(id,i){out[id]=q+(i<rem?1:0)});
  if(neg)Object.keys(out).forEach(function(k){out[k]=-out[k]});
  return out;
}
function normalizeShares(given,total,ids){
  // 自定义金额：以录入为准，仅修正尾差使合计严格等于总额
  var out={},sum=0;
  ids.forEach(function(id){var v=Math.round(given[id]||0);out[id]=v;sum+=v});
  var diff=Math.round(total)-sum;
  if(diff!==0&&ids.length){out[ids[ids.length-1]]=Math.round(out[ids[ids.length-1]]||0)+diff}
  return out;
}
function splitRatio(total,ratios,ids){
  ids=ids.filter(function(id){return (ratios[id]||0)>0});
  if(!ids.length)return splitEven(total,Object.keys(ratios));
  var t=Math.abs(Math.round(total)),sum=ids.reduce(function(a,id){return a+(ratios[id]||0)},0);
  if(sum<=0)return splitEven(total,ids);
  var raw=ids.map(function(id){return {id:id,v:t*(ratios[id]||0)/sum}});
  var out={},allocated=0;
  raw.forEach(function(r){var f=Math.floor(r.v);out[r.id]=f;allocated+=f});
  var left=t-allocated;
  raw.sort(function(a,b){return (b.v-Math.floor(b.v))-(a.v-Math.floor(a.v))});
  for(var i=0;i<left;i++)out[raw[i%raw.length].id]++;
  if(total<0)Object.keys(out).forEach(function(k){out[k]=-out[k]});
  return out;
}
function activeMembers(date,arr){
  arr=arr||members();
  if(!date)return arr;
  return arr.filter(function(m){return (!m.joinDate||m.joinDate<=date)&&(!m.leaveDate||date<=m.leaveDate)});
}
function computeShares(e,arr){
  var all=arr||members(), ids=[];
  var amt=Math.round(e.amount||0);
  if(e.mode==='personal'){var o={};o[e.personalId]=amt;return o}
  if(e.mode==='custom'){
    ids=Object.keys(e.shares||{}).filter(function(k){return (e.shares[k]||0)!==0});
    return normalizeShares(e.shares||{},amt,ids);
  }
  if(e.mode==='ratio')return splitRatio(amt,e.ratios||{},e.participants||[]);
  if(e.mode==='selected')ids=(e.participants||[]).slice();
  else ids=activeMembers(e.date,all).map(function(m){return m.id});
  if(!ids.length)ids=all.map(function(m){return m.id});
  return splitEven(amt,ids);
}
function validate(e){
  var errs=[],amt=Math.round(e.amount||0),all=members();
  if(!e.title||!e.title.trim())errs.push('请填写消费项目名称');
  if(!amt)errs.push('金额不能为 0');
  var pay=(e.payers||[]).reduce(function(a,p){return a+Math.round(p.amount||0)},0);
  if(pay!==amt)errs.push('付款金额合计 '+C.money(pay)+' 与账单总额 '+C.money(amt)+' 不一致');
  if(e.mode==='custom'){
    var s=Object.keys(e.shares||{}).reduce(function(a,k){return a+Math.round(e.shares[k]||0)},0);
    if(s!==amt)errs.push('自定义分摊合计 '+C.money(s)+' 与账单总额 '+C.money(amt)+' 不一致');
  }
  if(e.mode==='personal'&&!e.personalId)errs.push('请选择个人消费归属成员');
  if(e.mode==='selected'&&(!e.participants||!e.participants.length))errs.push('请选择参与分摊的成员');
  return errs;
}
function saveExpense(e){
  var errs=validate(e);if(errs.length)return {ok:false,errors:errs};
  var arr=expenses(),idx=arr.findIndex(function(x){return x.id===e.id});
  e.updatedAt=Date.now();e.sync=false;
  if(idx>=0)arr[idx]=e;else {e.createdAt=Date.now();arr.push(e)}
  setExpenses(arr);setLastForm({payer:(e.payers||[{}])[0].memberId,participants:e.participants||[],category:e.category});
  return {ok:true,expense:e};
}
function deleteExpense(id){setExpenses(expenses().filter(function(e){return e.id!==id}))}

/* ---------- 统计 ---------- */
function stats(){
  var ms=members(), exps=expenses(), sts=settlements(), out={};
  ms.forEach(function(m){out[m.id]={id:m.id,name:m.name,paid:0,consumed:0,publicConsumed:0,
    personalConsumed:0,received:0,paidSettle:0,balance:0,count:0}});
  exps.forEach(function(e){
    var sh=computeShares(e,ms);
    (e.payers||[]).forEach(function(p){if(out[p.memberId])out[p.memberId].paid+=Math.round(p.amount||0)});
    Object.keys(sh).forEach(function(id){
      if(!out[id])return;
      out[id].consumed+=Math.round(sh[id]||0);out[id].count++;
      if(e.mode==='personal')out[id].personalConsumed+=Math.round(sh[id]||0);
      else out[id].publicConsumed+=Math.round(sh[id]||0);
    });
  });
  sts.forEach(function(s){
    if(s.status==='paid'&&out[s.to]){out[s.to].received+=Math.round(s.amount||0)}
    if((s.status==='paid'||s.status==='partial')&&out[s.from]){out[s.from].paidSettle+=Math.round(s.paidAmount||0)}
  });
  ms.forEach(function(m){var o=out[m.id];o.balance=o.paid-o.consumed-o.received+o.paidSettle});
  return out;
}
function totals(){
  var exps=expenses(),st=stats();
  var actual=exps.reduce(function(a,e){return a+Math.round(e.amount||0)},0);
  var paidAll=Object.keys(st).reduce(function(a,k){return a+st[k].paid},0);
  var balSum=Object.keys(st).reduce(function(a,k){return a+st[k].balance},0);
  return {actual:actual,paidAll:paidAll,budget:C.budgetTotal(),remaining:C.budgetTotal()-actual,balanceSum:balSum,stats:st};
}
function byCategory(){
  var m={};expenses().forEach(function(e){var k=e.category||'其他费用';m[k]=(m[k]||0)+Math.round(e.amount||0)});
  return Object.keys(m).map(function(k){return {name:k,amount:m[k]}}).sort(function(a,b){return b.amount-a.amount});
}
/* 账本独立于行程：按实际消费日期统计，不读取任何D编号 */
function byDay(){
  var m={};
  expenses().forEach(function(e){
    var k=e.date||'未填日期';if(!m[k])m[k]={day:k,date:k,amount:0,count:0};
    m[k].amount+=Math.round(e.amount||0);m[k].count++;
  });
  return Object.keys(m).sort().map(function(k){return m[k]});
}
function dayExpenses(dayCode){return expenses().filter(function(e){return e.dayCode===dayCode})}

/* ---------- AA 自动结算：贪心最小转账 ---------- */
function settlementPlan(){
  var st=stats(),debt=[],credit=[];
  Object.keys(st).forEach(function(id){
    var b=st[id].balance;
    if(b<0)debt.push({id:id,amt:-b,name:st[id].name});
    else if(b>0)credit.push({id:id,amt:b,name:st[id].name});
  });
  debt.sort(function(a,b){return b.amt-a.amt});credit.sort(function(a,b){return b.amt-a.amt});
  var plan=[],i=0,j=0,guard=0;
  while(i<debt.length&&j<credit.length&&guard++<1000){
    var d=debt[i],c=credit[j],v=Math.min(d.amt,c.amt);
    if(v>0)plan.push({from:d.id,to:c.id,fromName:d.name,toName:c.name,amount:v});
    d.amt-=v;c.amt-=v;
    if(d.amt===0)i++;if(c.amt===0)j++;
  }
  return plan;
}
function addSettlement(s){
  var dup=settlements().some(function(x){return x.from===s.from&&x.to===s.to&&Math.round(x.amount)===Math.round(s.amount)&&x.status!=='cancelled'&&Date.now()-x.createdAt<60000});
  if(dup)return {ok:false,error:'检测到 1 分钟内存在相同金额的重复结算记录，已阻止重复提交'};
  var arr=settlements();
  s.id=s.id||uid();s.createdAt=s.createdAt||Date.now();s.status=s.status||'pending';s.paidAmount=s.paidAmount||0;
  var idx=arr.findIndex(function(x){return x.id===s.id});
  if(idx>=0)arr[idx]=s;else arr.push(s);
  setSettlements(arr);return {ok:true,settlement:s};
}
function updateSettlement(id,patch){
  var arr=settlements(),i=arr.findIndex(function(s){return s.id===id});
  if(i<0)return {ok:false,error:'记录不存在'};
  var s=arr[i];
  if(patch.status==='paid')patch.paidAmount=Math.round(s.amount);
  if(patch.status==='partial'&&patch.paidAmount>Math.round(s.amount))return {ok:false,error:'部分结算金额不能超过应结算金额'};
  if(patch.status==='paid'||patch.status==='partial'){
    var already=settlements().filter(function(x){return x.id!==id&&x.from===s.from&&x.to===s.to&&x.scopeKey===s.scopeKey&&(x.status==='paid'||x.status==='partial')})
      .reduce(function(a,x){return a+Math.round(x.paidAmount||0)},0);
    if(already+Math.round(patch.paidAmount)>Math.round(s.amount))return {ok:false,error:'该结算对象的累计已结算金额超过应付金额，已阻止重复结算'};
  }
  arr[i]=Object.assign({},s,patch);arr[i].updatedAt=Date.now();setSettlements(arr);return {ok:true};
}

/* ---------- 公共资金池 ---------- */
function poolStats(){
  var p=pool(),exps=expenses(),ms=members(),contrib={},share={};
  p.contributions.forEach(function(c){contrib[c.memberId]=(contrib[c.memberId]||0)+Math.round(c.amount||0)});
  exps.forEach(function(e){
    if(!e.paidFromPool)return;
    var sh=computeShares(e,ms);
    Object.keys(sh).forEach(function(id){share[id]=(share[id]||0)+Math.round(sh[id]||0)});
  });
  var totalIn=Object.keys(contrib).reduce(function(a,k){return a+contrib[k]},0);
  var totalOut=exps.filter(function(e){return e.paidFromPool}).reduce(function(a,e){return a+Math.round(e.amount||0)},0);
  var per={};ms.forEach(function(m){var c=contrib[m.id]||0,s=share[m.id]||0;per[m.id]={contributed:c,share:s,net:c-s}});
  return {contributions:contrib,shares:share,totalIn:totalIn,totalOut:totalOut,balance:totalIn-totalOut,per:per,custodian:p.custodian};
}
function addContribution(c){
  var p=pool();c.id=c.id||uid();p.contributions.push(c);setPool(p);
}
function removeContribution(id){var p=pool();p.contributions=p.contributions.filter(function(c){return c.id!==id});setPool(p)}

/* ---------- 备份与恢复 ---------- */
function backup(){
  return {version:1,exportedAt:new Date().toISOString(),members:members(),expenses:expenses(),
    settlements:settlements(),categories:categories(),pool:pool(),paidBudget:paidBudget()};
}
function restore(data){
  if(!data||!Array.isArray(data.expenses))return {ok:false,error:'备份文件格式不正确'};
  if(data.members)setMembers(data.members);
  setExpenses(data.expenses);
  if(data.settlements)setSettlements(data.settlements);
  if(data.categories)setCategories(data.categories);
  if(data.pool)setPool(data.pool);
  if(typeof data.paidBudget==='number')setPaidBudget(data.paidBudget);
  return {ok:true};
}

window.Ledger={
  DEFAULT_CATEGORIES:DEFAULT_CATEGORIES,CATEGORY_ICON:CATEGORY_ICON,
  members:members,setMembers:setMembers,expenses:expenses,setExpenses:setExpenses,
  settlements:settlements,setSettlements:setSettlements,categories:categories,setCategories:setCategories,
  pool:pool,setPool:pool,paidBudget:paidBudget,setPaidBudget:setPaidBudget,
  lastForm:lastForm,setLastForm:setLastForm,addonFlag:addonFlag,setAddonFlag:setAddonFlag,
  uid:uid,cents:cents,toYuan:toYuan,splitEven:splitEven,splitRatio:splitRatio,normalizeShares:normalizeShares,computeShares:computeShares,
  validate:validate,saveExpense:saveExpense,deleteExpense:deleteExpense,
  activeMembers:activeMembers,stats:stats,totals:totals,byCategory:byCategory,byDay:byDay,dayExpenses:dayExpenses,
  settlementPlan:settlementPlan,addSettlement:addSettlement,updateSettlement:updateSettlement,
  poolStats:poolStats,addContribution:addContribution,removeContribution:removeContribution,
  backup:backup,restore:restore
};
})();
