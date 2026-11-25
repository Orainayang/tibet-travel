/* ledgerviews.js — 旅行账本界面 */
(function(){
'use strict';
var C=window.Core,L=window.Ledger,Ch=window.Charts,esc=C.esc;
var MODE_NAME={all:'全员均摊',selected:'指定成员均摊',custom:'自定义金额',ratio:'按比例分摊',personal:'个人消费'};
var STATUS={pending:'待结算',paid:'已结算',partial:'部分结算',cancelled:'已取消'};
function J(v,fb){return v?String(v):fb}
function memberMap(){var m={};L.members().forEach(function(x){m[x.id]=x});return m}
function avatar(m){return '<span class="avatar" style="background:'+esc(m.color||'#2b6f92')+'" title="'+esc(m.name)+'">'+esc((m.name||'?').slice(0,1))+'</span>'}
function colorFor(i){return ['#2b6f92','#b8794b','#6d5a86','#3d8c72','#c07a5a','#5b7fa6'][i%6]}

function ledgerHome(days){
  var t=L.totals(),st=t.stats,ms=L.members(),me=ms[0],ps=L.poolStats();
  var mine=me?st[me.id]:{paid:0,consumed:0,balance:0,personalConsumed:0};
  var cat=L.byCategory(),daily=L.byDay(days);
  var cmp=ms.map(function(m){var s=st[m.id];return {label:m.name,paid:s.paid,consumed:s.consumed}});
  var stats=[['预计旅行总预算',C.money0(t.budget),''],['当前实际总支出',C.money0(t.actual),''],
    ['剩余预算',C.money0(t.remaining),''],['我的实际消费',C.money0(mine.consumed),me?me.name:'未设置成员'],
    ['我的累计付款',C.money0(mine.paid),''],['我的累计垫付',C.money0(Math.max(0,mine.paid-mine.consumed)),''],
    ['我的待收款',C.money0(Math.max(0,mine.balance)),''],['我的待付款',C.money0(Math.max(0,-mine.balance)),'']];
  return '<div class="view" id="view-ledger">'+
   (L.addonFlag()?'':'<div class="limit-note"><b>当前为单人管理模式：</b>账本数据保存在本机浏览器，支持离线记账与备份恢复；不提供多人实时同步、账号鉴权或权限隔离。如需真正的多人协作，需接入 Supabase 等后端服务。</div>')+
   '<div class="grid stat-grid">'+stats.map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+' <small>'+s[2]+'</small></div></div>'}).join('')+'</div>'+
   '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">'+
    '<div class="chart-box"><b class="small">每日消费趋势</b>'+Ch.barChart(daily.map(function(d){return {label:d.day,value:d.amount}}),{height:230})+'</div>'+
    '<div class="chart-box"><b class="small">消费类别占比</b>'+Ch.donut(cat.map(function(c){return {label:c.name,value:c.amount}}),{size:230})+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>成员消费与付款对比</h2></div><div class="chart-box">'+Ch.groupedBar(cmp)+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>各旅行成员消费金额</h2><button class="btn sm" data-ledger-tab="members">管理成员 →</button></div>'+
   '<div class="card">'+J(ms.map(function(m){var s=st[m.id];return '<div class="member-row">'+avatar(m)+'<div style="flex:1"><b>'+esc(m.name)+'</b><div class="tiny muted">'+esc(m.note||'')+'</div></div>'+
    '<div class="right small"><div>消费 <b class="money">'+C.money(s.consumed)+'</b></div><div class="muted">付款 <b class="money">'+C.money(s.paid)+'</b></div></div></div>'}).join(''),'<div class="muted small">还没有成员，请在「成员账单」中添加。</div>')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>公共资金池</h2></div><div class="card"><div class="row">'+
    '<span class="chip">预缴合计 '+C.money(ps.totalIn)+'</span><span class="chip">公共支出 '+C.money(ps.totalOut)+'</span><span class="chip core">余额 '+C.money(ps.balance)+'</span>'+
    '<button class="btn sm" data-action="pool-contribute">＋ 预缴</button><button class="btn sm" data-ledger-tab="settlement">查看结算</button></div></div></div></div>';
}

function filtersHTML(state){
  var ms=L.members(),cats=L.categories(),days=C.buildItinerary();
  return '<div class="card"><div class="field-row">'+
   '<div class="field"><label>关键词</label><input type="search" id="expSearch" value="'+esc(state.q||'')+'" placeholder="项目、地点、备注"></div>'+
   '<div class="field"><label>成员</label><select id="fMember"><option value="">全部</option>'+ms.map(function(m){return '<option value="'+esc(m.id)+'" '+(state.member===m.id?'selected':'')+'>'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>消费类别</label><select id="fCat"><option value="">全部</option>'+cats.map(function(c){return '<option '+(state.cat===c?'selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>付款人</label><select id="fPayer"><option value="">全部</option>'+ms.map(function(m){return '<option value="'+esc(m.id)+'" '+(state.payer===m.id?'selected':'')+'>'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>公共/个人</label><select id="fScope"><option value="">全部</option><option value="public" '+(state.scope==='public'?'selected':'')+'>公共消费</option><option value="personal" '+(state.scope==='personal'?'selected':'')+'>个人消费</option></select></div>'+
   '<div class="field"><label>日期</label><input type="date" id="fDate" value="'+esc(state.date||'')+'"></div></div></div>';
}
function expensesView(state){
  var ms=L.members(),mp=memberMap();
  var list=L.expenses().filter(function(e){
    if(state.cat&&e.category!==state.cat)return false;
    if(state.date&&e.date!==state.date)return false;
    if(state.payer&&!(e.payers||[]).some(function(p){return p.memberId===state.payer}))return false;
    if(state.scope==='personal'&&e.mode!=='personal')return false;
    if(state.scope==='public'&&e.mode==='personal')return false;
    if(state.member){var sh=L.computeShares(e,ms);if(!sh[state.member]&&!(e.payers||[]).some(function(p){return p.memberId===state.member}))return false}
    if(state.q&&(e.title+' '+e.location+' '+e.note+' '+e.category).toLowerCase().indexOf(state.q.toLowerCase())<0)return false;
    return true;
  }).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)});
  var sum=list.reduce(function(a,e){return a+Math.round(e.amount||0)},0);
  var rows=list.map(function(e){
    var payers=(e.payers||[]).map(function(p){return (mp[p.memberId]||{}).name||'?'}).join('、');
    var sh=L.computeShares(e,ms);
    var shText=e.mode==='personal'?('个人 · '+(mp[e.personalId]||{}).name):Object.keys(sh).map(function(k){return (mp[k]||{}).name+' '+C.money0(sh[k])}).join('、');
    return '<div class="expense-row">'+(e.receipt?'<img class="receipt-thumb" src="'+esc(e.receipt)+'" data-zoom="'+esc(e.receipt)+'" data-title="'+esc(e.title)+' 凭证" data-credit="本地上传凭证">':'')+
      '<div class="expense-main"><div class="expense-title">'+esc(e.title)+(e.amount<0?' <span class="chip optional">退款冲销</span>':'')+'</div>'+
      '<div class="expense-sub">'+esc(e.date||'')+' '+esc(e.time||'')+' · '+esc(e.category)+' · '+esc(payers)+' 付款'+(e.paidFromPool?' · 公共资金支付':'')+'</div>'+
      '<div class="expense-sub">分摊：'+esc(shText)+'</div>'+(e.note?'<div class="expense-sub">备注：'+esc(e.note)+'</div>':'')+'</div>'+
      '<div class="right"><div class="money" style="font-size:16px">'+C.money(e.amount)+'</div><div class="row" style="gap:4px;justify-content:flex-end;margin-top:4px">'+
      '<button class="btn sm" data-action="edit-expense" data-id="'+esc(e.id)+'">编辑</button>'+
      '<button class="btn sm" data-action="copy-expense" data-id="'+esc(e.id)+'">复制</button>'+
      '<button class="btn sm" data-action="refund-expense" data-id="'+esc(e.id)+'">退款</button>'+
      '<button class="btn sm danger" data-action="delete-expense" data-id="'+esc(e.id)+'">删除</button></div></div></div>';
  }).join('');
  return '<div class="view">'+filtersHTML(state)+
   '<div class="between" style="margin:14px 0 8px"><div><b>消费明细</b> <span class="muted small">'+list.length+' 笔 · 合计 <span class="money">'+C.money(sum)+'</span></span></div>'+
   '<div class="row"><button class="btn sm" data-action="new-expense">＋ 新增消费</button><button class="btn sm" data-action="export-ledger-csv">导出 CSV</button><button class="btn sm" data-action="export-ledger">导出 Excel</button></div></div>'+
   '<div class="card">'+J(rows,'<div class="center muted" style="padding:26px">还没有消费记录。点击「＋ 新增消费」开始记账。</div>')+'</div></div>';
}

function membersView(){
  var ms=L.members(),st=L.stats();
  var rows=ms.map(function(m){var s=st[m.id];
    return '<div class="member-row">'+avatar(m)+'<div style="flex:1;min-width:0"><b>'+esc(m.name)+'</b>'+
    '<div class="tiny muted">加入 '+(m.joinDate||'未填')+' · 离开 '+(m.leaveDate||'未填')+' · 模块 '+((m.modules||[]).join('、')||'全部')+'</div>'+
    (m.note?'<div class="tiny muted">'+esc(m.note)+'</div>':'')+'</div>'+
    '<div class="right small"><div>付款 <b class="money">'+C.money(s.paid)+'</b> · 消费 <b class="money">'+C.money(s.consumed)+'</b></div>'+
    '<div class="'+(s.balance>0?'pos':s.balance<0?'neg':'muted')+'">余额 '+C.money(s.balance)+'</div></div>'+
    '<div class="row" style="gap:4px"><button class="btn sm" data-action="member-detail" data-id="'+esc(m.id)+'">个人账单</button>'+
    '<button class="btn sm" data-action="edit-member" data-id="'+esc(m.id)+'">编辑</button>'+
    '<button class="btn sm danger" data-action="delete-member" data-id="'+esc(m.id)+'">移除</button></div></div>';
  }).join('');
  return '<div class="view"><div class="between"><div><h2 style="font-size:21px">旅行成员与个人账单</h2>'+
   '<div class="muted small">成员加入/退出只影响此后新账单的默认分摊，不会修改历史账单的分摊结果。</div></div>'+
   '<button class="btn primary sm" data-action="new-member">＋ 添加成员</button></div>'+
   '<div class="card" style="margin-top:14px">'+J(rows,'<div class="center muted" style="padding:26px">还没有成员。添加成员后才能设置付款人与分摊对象。</div>')+'</div>'+
   '<div class="section"><div class="section-head"><h2>公共资金预缴</h2></div><div class="card"><div class="row">'+
   '<span class="muted small">公共资金属于资金转移，不计入旅行消费；用公共资金支付的账单不再计为保管人个人垫付。</span>'+
   '<button class="btn sm" data-action="pool-contribute">＋ 预缴</button></div>'+
   '<div class="table-wrap" style="margin-top:10px">'+poolTable()+'</div></div></div></div>';
}
function poolTable(){
  var ps=L.poolStats();
  return '<table><thead><tr><th>成员</th><th class="num">预缴</th><th class="num">应承担</th><th class="num">退款 / 补缴</th></tr></thead><tbody>'+
   L.members().map(function(m){var v=ps.per[m.id]||{contributed:0,share:0,net:0};
    return '<tr><td>'+esc(m.name)+'</td><td class="num">'+C.money(v.contributed)+'</td><td class="num">'+C.money(v.share)+'</td>'+
     '<td class="num '+(v.net>0?'pos':v.net<0?'neg':'')+'">'+(v.net>0?'待退 '+C.money(v.net):v.net<0?'待补 '+C.money(-v.net):'已结平')+'</td></tr>'}).join('')+'</tbody></table>';
}
function memberDetail(id){
  var m=L.members().find(function(x){return x.id===id});if(!m)return '<div class="card">成员不存在</div>';
  var st=L.stats()[id]||{},mp=memberMap();
  var mine=L.expenses().filter(function(e){
    if(e.mode==='personal')return e.personalId===id;
    return !!L.computeShares(e,L.members())[id];
  }).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
  var cats={};mine.forEach(function(e){var sh=L.computeShares(e,L.members())[id]||0;cats[e.category]=(cats[e.category]||0)+Math.round(sh)});
  var settles=L.settlements().filter(function(s){return s.from===id||s.to===id});
  var stats=[['累计实际付款',C.money(st.paid||0)],['累计个人消费',C.money(st.personalConsumed||0)],
    ['公共应摊消费',C.money(st.publicConsumed||0)],['应承担总额',C.money(st.consumed||0)],
    ['已垫付金额',C.money(Math.max(0,(st.paid||0)-(st.consumed||0)))],
    ['已收到结算',C.money(st.received||0)],['已支付结算',C.money(st.paidSettle||0)],
    ['未结算余额',C.money(st.balance||0),(st.balance||0)>0?'应收款':(st.balance||0)<0?'应付款':'已结清']];
  var rows=mine.map(function(e){var sh=L.computeShares(e,L.members())[id]||0;
     return '<div class="expense-row"><div class="expense-main"><div class="expense-title">'+esc(e.title)+'</div><div class="expense-sub">'+esc(e.date)+' · '+esc(e.category)+' · '+MODE_NAME[e.mode]+'</div></div>'+
      '<div class="right"><b class="money">'+C.money(sh)+'</b><div class="tiny muted">账单总额 '+C.money(e.amount)+'</div></div></div>'}).join('');
  var settleRows=settles.map(function(s){return '<div class="between small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>'+
     (s.from===id?'向 '+(mp[s.to]||{}).name+' 付款':'收到 '+(mp[s.from]||{}).name+' 付款')+'</span>'+
     '<b class="money">'+C.money(s.paidAmount||s.amount)+'</b><span class="chip">'+STATUS[s.status]+'</span></div>'}).join('');
  return '<div class="view"><div class="between"><div><div class="row">'+avatar(m)+'<h2 style="font-size:21px">'+esc(m.name)+' · 个人账单</h2></div>'+
   '<div class="muted small">区分「实际付款」与「实际消费」；结算转账不计入旅行消费。</div></div><button class="btn sm" data-ledger-tab="members">返回成员列表</button></div>'+
   '<div class="grid stat-grid" style="margin-top:14px">'+stats.map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+' <small>'+(s[2]||'')+'</small></div></div>'}).join('')+'</div>'+
   '<div class="section"><div class="section-head"><h2>按类别统计（应承担）</h2></div><div class="chart-box">'+Ch.donut(Object.keys(cats).map(function(k){return {label:k,value:cats[k]}}),{size:230})+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>每日 / 全部消费明细</h2></div><div class="card">'+J(rows,'<div class="muted small">暂无参与分摊的账单。</div>')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>结算记录</h2></div><div class="card">'+J(settleRows,'<div class="muted small">暂无结算记录。</div>')+'</div></div></div>';
}
function settlementView(){
  var plan=L.settlementPlan(),st=L.stats(),recs=L.settlements();
  var planRows=plan.map(function(p,i){return '<div class="settle-card"><div><b>'+esc(p.fromName)+'</b> → <b>'+esc(p.toName)+'</b><div class="muted small">转账 '+C.money(p.amount)+'</div></div>'+
      '<button class="btn sm primary" data-action="settle-plan" data-index="'+i+'">记录转账</button></div>'}).join('');
  var recRows=recs.map(function(s){var mp=memberMap();
     return '<div class="expense-row"><div class="expense-main"><div class="expense-title">'+esc((mp[s.from]||{}).name||s.from)+' → '+esc((mp[s.to]||{}).name||s.to)+'</div>'+
      '<div class="expense-sub">'+esc(s.date||'')+' · '+esc(s.scopeLabel||'总账结算')+' · '+STATUS[s.status]+(s.note?' · '+esc(s.note):'')+'</div></div>'+
      '<div class="right"><b class="money">'+C.money(s.paidAmount||s.amount)+'</b><div class="row" style="justify-content:flex-end;margin-top:3px">'+
      (s.status!=='paid'?'<button class="btn sm" data-action="settle-paid" data-id="'+esc(s.id)+'">标记结清</button>':'')+
      '<button class="btn sm" data-action="settle-partial" data-id="'+esc(s.id)+'">部分结算</button>'+
      '<button class="btn sm danger" data-action="delete-settlement" data-id="'+esc(s.id)+'">删除</button></div></div></div>'}).join('');
  return '<div class="view"><div class="between"><div><h2 style="font-size:21px">AA 自动结算</h2>'+
   '<div class="muted small">结算转账不计入旅行消费。余额合计应为 0，当前为 '+C.money(L.totals().balanceSum)+'。</div></div>'+
   '<div class="row"><button class="btn sm" data-action="copy-settlement">复制结算结果</button><button class="btn sm primary" data-action="new-settlement">＋ 手动结算</button></div></div>'+
   '<div class="section"><div class="section-head"><h2>推荐结算方案（尽量减少转账）</h2><span class="eyebrow">'+plan.length+' 笔</span></div>'+
   '<div class="card">'+J(planRows,'<div class="center muted" style="padding:20px">当前无需结算，所有成员余额已平。</div>')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>各成员余额</h2></div><div class="card">'+L.members().map(function(m){var s=st[m.id];
     return '<div class="member-row">'+avatar(m)+'<div style="flex:1">'+esc(m.name)+'</div><b class="money '+(s.balance>0?'pos':s.balance<0?'neg':'')+'">'+C.money(s.balance)+'</b></div>'}).join('')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>历史结算记录</h2></div><div class="card">'+J(recRows,'<div class="muted small">暂无结算记录。</div>')+'</div></div></div>';
}
function statsView(days){
  var t=L.totals(),cat=L.byCategory(),ms=L.members(),st=t.stats;
  return '<div class="view"><div class="section-head"><h2>预算统计</h2><span class="eyebrow">Statistics</span></div>'+
   '<div class="grid stat-grid">'+[['预计预算',C.money0(t.budget)],['实际支出',C.money0(t.actual)],['剩余',C.money0(t.remaining)],['余额校验',C.money(t.balanceSum),'应为 ¥0.00']].map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+' <small>'+(s[2]||'')+'</small></div></div>'}).join('')+'</div>'+
   '<div class="section"><div class="chart-box"><b class="small">预算与实际支出对比</b>'+Ch.barChart((window.BUDGET||[]).map(function(b){
     return {label:b.name,value:Math.round(b.qty*b.price*100),color:'#dceaf1'};
   }),{height:240})+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>类别占比</h2></div><div class="chart-box">'+Ch.donut(cat.map(function(c){return {label:c.name,value:c.amount}}),{size:250})+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>成员付款 / 消费对比</h2></div><div class="chart-box">'+Ch.groupedBar(ms.map(function(m){var s=st[m.id];return {label:m.name,paid:s.paid,consumed:s.consumed}}))+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>每日消费柱状图</h2></div><div class="chart-box">'+Ch.barChart(L.byDay(days).map(function(d){return {label:d.day,value:d.amount}}))+'</div></div></div>';
}

/* ---------- 表单 ---------- */
function expenseForm(exp,days){
  var e=exp||{date:C.today(),time:'',title:'',category:'餐饮',amount:0,payers:[],mode:'all',participants:[],shares:{},ratios:{},personalId:'',method:'微信',location:'',note:'',receipt:'',paidFromPool:false};
  var ms=L.members(),cats=L.categories(),last=L.lastForm();
  if(!exp&&last.payer&&ms.some(function(m){return m.id===last.payer}))e.payers=[{memberId:last.payer,amount:0}];
  function checks(prefix,isOn){
    return J(ms.map(function(m){return '<label class="split-person">'+avatar(m)+'<span>'+esc(m.name)+'</span><input type="checkbox" data-'+prefix+'="'+esc(m.id)+'" '+(isOn(m)?'checked':'')+'></label>'}).join(''),'<div class="muted small">请先添加成员</div>');
  }
  var payerHTML=J(ms.map(function(m){var p=(e.payers||[]).find(function(x){return x.memberId===m.id});
    return '<div class="split-person">'+avatar(m)+'<span>'+esc(m.name)+'</span><input type="checkbox" data-payer="'+esc(m.id)+'" '+(p?'checked':'')+'><input type="number" step="0.01" class="payer-amt" data-payer-amt="'+esc(m.id)+'" value="'+(p?(p.amount/100).toFixed(2):'')+'" placeholder="金额"></div>'}).join(''),'<div class="muted small">请先添加成员</div>');
  var shareHTML=ms.map(function(m){return '<label class="split-person">'+avatar(m)+'<span>'+esc(m.name)+'</span><input type="number" step="0.01" data-share="'+esc(m.id)+'" value="'+((e.shares||{})[m.id]?(e.shares[m.id]/100).toFixed(2):'')+'"></label>'}).join('');
  var ratioHTML=ms.map(function(m){return '<label class="split-person">'+avatar(m)+'<span>'+esc(m.name)+'</span><input type="checkbox" data-ratio-on="'+esc(m.id)+'" '+((e.ratios||{})[m.id]?'checked':'')+'><input type="number" step="1" class="ratio-val" style="width:60px" data-ratio="'+esc(m.id)+'" value="'+((e.ratios||{})[m.id]||1)+'"></label>'}).join('');
  return '<div class="modal-head"><h3>'+(exp?'编辑消费':'快速记账')+'</h3><button class="btn sm" data-action="close-modal">关闭</button></div>'+
   '<div style="padding:18px">'+
   '<div class="quick-cats">'+cats.slice(0,10).map(function(c){return '<button class="'+(e.category===c?'active':'')+'" data-action="pick-cat" data-cat="'+esc(c)+'">'+(L.CATEGORY_ICON[c]||'🧾')+' '+esc(c)+'</button>'}).join('')+'</div>'+
   '<div class="field-row" style="margin-top:10px">'+
    '<div class="field"><label>消费日期</label><input type="date" id="exDate" value="'+esc(e.date)+'"></div>'+
    '<div class="field"><label>消费时间</label><input type="time" id="exTime" value="'+esc(e.time||'')+'"></div>'+
    '<div class="field"><label>消费类别</label><select id="exCat">'+cats.map(function(c){return '<option '+(e.category===c?'selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></div></div>'+
   '<div class="field"><label>消费项目名称</label><input type="text" id="exTitle" value="'+esc(e.title)+'" placeholder="例如：然乌湖住宿 / 晚餐 / 包车费"></div>'+
   '<div class="field-row"><div class="field"><label>消费金额（元，支持两位小数）</label><input type="number" step="0.01" id="exAmount" value="'+esc(e.amount?(e.amount/100).toFixed(2):'')+'" placeholder="0.00"></div>'+
    '<div class="field"><label>支付方式</label><select id="exMethod">'+['微信','支付宝','现金','银行卡','公共资金','其他'].map(function(x){return '<option '+(e.method===x?'selected':'')+'>'+x+'</option>'}).join('')+'</select></div>'+
    '<div class="field"><label>消费地点</label><input type="text" id="exLocation" value="'+esc(e.location||'')+'"></div></div>'+
   '<div class="block"><div class="block-title">付款人（支持多人共同付款，金额合计必须等于账单总额）</div>'+
    '<div class="split-grid">'+payerHTML+'</div>'+
    '<div class="tiny muted" style="margin-top:5px">付款合计：<b id="payerSum">¥0.00</b> / 账单金额：<b id="billSum">¥0.00</b></div></div>'+
   '<div class="block"><div class="block-title">分摊方式</div><select id="exMode">'+
    Object.keys(MODE_NAME).map(function(k){return '<option value="'+k+'" '+(e.mode===k?'selected':'')+'>'+MODE_NAME[k]+'</option>'}).join('')+'</select>'+
    '<div id="split-all" class="muted small" style="margin-top:7px">按消费日期当日同行成员自动均摊；尾差自动分配，保证合计一致。</div>'+
    '<div id="split-selected" class="hidden" style="margin-top:7px"><b class="small">选择参与分摊成员</b>'+checks('part',function(m){return (e.participants||[]).indexOf(m.id)>=0})+'</div>'+
    '<div id="split-custom" class="hidden" style="margin-top:7px"><b class="small">自定义金额（元）</b><div class="split-grid">'+shareHTML+'</div></div>'+
    '<div id="split-ratio" class="hidden" style="margin-top:7px"><b class="small">按比例分摊（填写比例数字，如 2:1）</b><div class="split-grid">'+ratioHTML+'</div></div>'+
    '<div id="split-personal" class="hidden" style="margin-top:7px"><b class="small">个人消费归属</b><select id="exPersonal">'+ms.map(function(m){return '<option value="'+esc(m.id)+'" '+(e.personalId===m.id?'selected':'')+'>'+esc(m.name)+'</option>'}).join('')+'</select></div></div>'+
   '<div class="field-row" style="margin-top:10px"><div class="field"><label>备注</label><input type="text" id="exNote" value="'+esc(e.note||'')+'"></div>'+
    '<div class="field"><label>付款截图 / 发票（本地压缩保存）</label><input type="file" accept="image/*" id="exReceipt"></div></div>'+
   (e.receipt?'<img class="receipt-preview" src="'+esc(e.receipt)+'" style="max-width:120px;border-radius:8px" alt="凭证预览">':'')+
   '<label class="check-item"><input type="checkbox" id="exPool" '+(e.paidFromPool?'checked':'')+'><span>使用公共资金支付（不再计为保管人个人垫付）</span></label>'+
   '<div class="row" style="margin-top:14px"><button class="btn primary" data-action="submit-expense" data-id="'+esc(e.id||'')+'">'+(exp?'保存修改':'保存这笔消费')+'</button>'+
   '<button class="btn" data-action="close-modal">取消</button></div></div>';
}
function memberForm(m){
  var x=m||{name:'',color:'#2b6f92',joinDate:C.today(),leaveDate:'',modules:[],note:''};
  return '<div class="modal-head"><h3>'+(m?'编辑成员':'添加旅行成员')+'</h3><button class="btn sm" data-action="close-modal">关闭</button></div><div style="padding:18px">'+
   '<div class="field-row"><div class="field"><label>姓名 / 昵称</label><input type="text" id="meName" value="'+esc(x.name)+'"></div>'+
   '<div class="field"><label>头像颜色</label><input type="color" id="meColor" value="'+esc(x.color||'#2b6f92')+'" style="height:40px;padding:3px"></div>'+
   '<div class="field"><label>加入旅行日期</label><input type="date" id="meJoin" value="'+esc(x.joinDate||'')+'"></div>'+
   '<div class="field"><label>离开旅行日期（可空）</label><input type="date" id="meLeave" value="'+esc(x.leaveDate||'')+'"></div></div>'+
   '<div class="field"><label>参与的旅行模块（不选表示全程）</label><div class="split-grid">'+(window.MODULES||[]).map(function(mm){return '<label class="split-person"><input type="checkbox" data-mod="'+esc(mm.id)+'" '+((x.modules||[]).indexOf(mm.id)>=0?'checked':'')+'><span>'+esc(mm.name)+'</span></label>'}).join('')+'</div></div>'+
   '<div class="field"><label>备注</label><textarea id="meNote">'+esc(x.note||'')+'</textarea></div>'+
   '<div class="row"><button class="btn primary" data-action="submit-member" data-id="'+esc(x.id||'')+'">保存成员</button><button class="btn" data-action="close-modal">取消</button></div></div>';
}
function settlementForm(){
  var ms=L.members();
  return '<div class="modal-head"><h3>新增结算记录</h3><button class="btn sm" data-action="close-modal">关闭</button></div><div style="padding:18px">'+
   '<div class="field-row"><div class="field"><label>付款人</label><select id="seFrom">'+ms.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>收款人</label><select id="seTo">'+ms.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>金额（元）</label><input type="number" step="0.01" id="seAmount"></div>'+
   '<div class="field"><label>结算日期</label><input type="date" id="seDate" value="'+C.today()+'"></div></div>'+
   '<div class="field"><label>结算范围</label><select id="seScope">'+['总账结算','指定日期范围','按旅行模块','旅行中途结算'].map(function(v){return '<option>'+v+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>备注</label><textarea id="seNote"></textarea></div>'+
   '<div class="row"><button class="btn primary" data-action="submit-settlement">保存结算记录</button><button class="btn" data-action="close-modal">取消</button></div></div>';
}
function contributionForm(){
  return '<div class="modal-head"><h3>公共资金预缴</h3><button class="btn sm" data-action="close-modal">关闭</button></div><div style="padding:18px">'+
   '<div class="field-row"><div class="field"><label>成员</label><select id="coMember">'+L.members().map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>预缴金额（元）</label><input type="number" step="0.01" id="coAmount"></div>'+
   '<div class="field"><label>日期</label><input type="date" id="coDate" value="'+C.today()+'"></div></div>'+
   '<div class="field"><label>资金保管人</label><select id="coCustodian">'+L.members().map(function(m){return '<option value="'+esc(m.id)+'" '+(L.pool().custodian===m.id?'selected':'')+'>'+esc(m.name)+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>备注</label><input type="text" id="coNote" value="公共旅行基金预缴"></div>'+
   '<div class="row"><button class="btn primary" data-action="submit-contribution">保存预缴</button><button class="btn" data-action="close-modal">取消</button></div></div>';
}
function poolContribList(){
  var mp=memberMap();
  return '<div class="card"><div class="between"><b>预缴流水</b><button class="btn sm" data-action="pool-contribute">＋ 预缴</button></div>'+
   L.pool().contributions.map(function(c){return '<div class="between small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>'+esc(c.date||'')+' '+esc((mp[c.memberId]||{}).name||'')+' '+esc(c.note||'')+'</span>'+
    '<span><b class="money">'+C.money(c.amount)+'</b> <button class="btn sm danger" data-action="delete-contribution" data-id="'+esc(c.id)+'">删除</button></span></div>'}).join('')+'</div>';
}
window.LedgerViews={ledgerHome:ledgerHome,expensesView:expensesView,membersView:membersView,memberDetail:memberDetail,
  settlementView:settlementView,statsView:statsView,expenseForm:expenseForm,memberForm:memberForm,
  settlementForm:settlementForm,contributionForm:contributionForm,poolTable:poolTable,poolContribList:poolContribList,
  MODE_NAME:MODE_NAME,STATUS:STATUS,colorFor:colorFor,avatar:avatar};
})();
