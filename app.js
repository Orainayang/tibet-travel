/* app.js — 路由、交互、拖拽与本地状态 */
(function(){
'use strict';
var C=window.Core,L=window.Ledger,P=window.Plan,F=window.Footprint,V=window.Views,LV=window.LedgerViews,Ex=window.Exporter;
var esc=C.esc;
var state={view:'home',ledgerTab:'expenses',memberDetail:null,query:'',filter:'全部',galleryCat:'全部',mapMode:'plan',
  openDays:{},filters:{},drag:null};
var DAYS=[];
function days(){return DAYS}
function recordKey(day){return P.scheme()==='original'?day:P.scheme()+':'+day}
function record(day){day=recordKey(day);var r=C.getStore().records||{};return r[day]||{}}
function isOpen(day){return !!state.openDays[day]}
function rebuild(){F.ensurePlan();DAYS=P.current();DAYS.forEach(function(d){d.week=C.weekday(d.date)})}

function render(){
  rebuild();
  var main=document.getElementById('main'),html='';
  switch(state.view){
    case 'home':html=V.home(DAYS);break;
    case 'guide':html=V.guide();break;
    case 'safety':html=V.safety(DAYS);break;
    case 'modules':html=V.modules(DAYS);break;
    case 'itinerary':html=V.itinerary(DAYS);break;
    case 'footprint':html=V.footprint(DAYS);break;
    case 'train':html=V.train();break;
    case 'gallery':html=V.gallery();break;
    case 'map':html=V.map(DAYS);break;
    case 'altitude':html=V.altitude(DAYS);break;
    case 'budget':html=V.budget();break;
    case 'packing':html=V.packing();break;
    case 'mine':html=V.mine(DAYS);break;
    case 'ledger':
      var tabs=[['shared','小队管理'],['home','账本首页'],['expenses','消费明细'],['my','我的费用'],['members','成员账单'],['settlement','AA结算'],['stats','消费统计']];
      html='<div class="tabs">'+tabs.map(function(t){return '<button class="'+(state.ledgerTab===t[0]?'active':'')+'" data-ledger-tab="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>';
      html+=window.AA.html(state.ledgerTab);
      break;
  }
  main.innerHTML=(['home','itinerary','ledger'].includes(state.view)?'':(['guide','safety','map','altitude','modules'].includes(state.view)?V.schemePanel():''))+html;
  document.querySelectorAll('[data-nav]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-nav')===state.view)});
  document.querySelectorAll('.mobile-nav [data-nav]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-nav')===mobileKey())});
  var cd=document.getElementById('headerCountdown');var left=C.daysBetween(C.today(),P.getDeparture());
  if(cd)cd.innerHTML=(left>=0?'距出发 <b>'+left+'</b> 天':'已出发 <b>'+Math.abs(left)+'</b> 天');
  window.scrollTo({top:0,behavior:'auto'});
}
function mobileKey(){return ['modules','train','gallery','altitude','budget','packing'].indexOf(state.view)>=0?'home':state.view}
function go(v,opts){state.view=v;if(opts&&opts.tab)state.ledgerTab=opts.tab;if(opts&&opts.member)state.memberDetail=opts.member;render()}

function modal(html){document.getElementById('modalRoot').innerHTML='<div class="modal-back" data-action="close-modal"><div class="modal" data-stop="1">'+html+'</div></div>';bindModal()}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
function bindModal(){
  var root=document.getElementById('modalRoot'),sel=root.querySelector('#exMode');
  if(sel){
    var sync=function(){['all','selected','custom','ratio','personal'].forEach(function(k){var el=root.querySelector('#split-'+k);if(el)el.classList.toggle('hidden',sel.value!==k)})};
    sel.addEventListener('change',sync);sync();
    var sums=function(){
      var amt=Math.round(C.num(root.querySelector('#exAmount').value)*100),pay=0;
      root.querySelectorAll('[data-payer]').forEach(function(cb){if(!cb.checked)return;var id=cb.getAttribute('data-payer'),i=root.querySelector('[data-payer-amt="'+id+'"]');pay+=Math.round(C.num(i&&i.value)*100)});
      var ps=root.querySelector('#payerSum'),bs=root.querySelector('#billSum');
      if(ps){ps.textContent=C.money(pay);ps.className=pay===amt?'pos':'neg'}if(bs)bs.textContent=C.money(amt);
    };
    root.addEventListener('input',sums);root.addEventListener('change',sums);
  }
  var file=root.querySelector('#exReceipt');
  if(file)file.addEventListener('change',function(){if(file.files[0])resizeImage(file.files[0],function(data){
    var old=root.querySelector('.receipt-preview');if(old)old.remove();
    var img=document.createElement('img');img.src=data;img.className='receipt-preview';img.style.cssText='max-width:120px;border-radius:8px;margin-top:8px';
    file.parentNode.parentNode.appendChild(img)})});
}
function resizeImage(file,cb){var r=new FileReader();r.onload=function(){var img=new Image();img.onload=function(){
  var scale=Math.min(1,1000/Math.max(img.width,img.height)),cv=document.createElement('canvas');
  cv.width=Math.round(img.width*scale);cv.height=Math.round(img.height*scale);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
  cb(cv.toDataURL('image/jpeg',0.72))};img.src=r.result};r.readAsDataURL(file)}

/* ---------- 业务动作 ---------- */
function saveBudget(){
  var st=C.getStore(),q={},p={};
  document.querySelectorAll('[data-bq]').forEach(function(i){q[i.getAttribute('data-bq')]=C.num(i.value)});
  document.querySelectorAll('[data-bp]').forEach(function(i){p[i.getAttribute('data-bp')]=parseFloat(i.value)||0});
  st.budgetQty=q;st.budgetPrice=p;
  var paid=document.getElementById('paidBudgetInput');if(paid)L.setPaidBudget(Math.round(parseFloat(paid.value||0)*100));
  var people=document.getElementById('peopleInput');if(people)st.people=Math.max(1,C.num(people.value));
  C.saveSettings(st);C.toast('预计预算已保存（独立于账本）');render();
}
function submitExpense(id){
  var root=document.getElementById('modalRoot');
  var e={id:id||L.uid(),date:root.querySelector('#exDate').value||C.today(),time:root.querySelector('#exTime').value,
    title:root.querySelector('#exTitle').value.trim(),category:root.querySelector('#exCat').value,
    amount:Math.round(parseFloat(root.querySelector('#exAmount').value||0)*100),payers:[],mode:root.querySelector('#exMode').value,
    participants:[],shares:{},ratios:{},personalId:root.querySelector('#exPersonal')?root.querySelector('#exPersonal').value:'',
    method:root.querySelector('#exMethod').value,location:root.querySelector('#exLocation').value,
    note:root.querySelector('#exNote').value,receipt:'',paidFromPool:root.querySelector('#exPool').checked,sync:false};
  root.querySelectorAll('[data-payer]').forEach(function(cb){if(!cb.checked)return;var mid=cb.getAttribute('data-payer'),inp=root.querySelector('[data-payer-amt="'+mid+'"]');e.payers.push({memberId:mid,amount:Math.round(parseFloat(inp&&inp.value||0)*100)})});
  root.querySelectorAll('[data-part]').forEach(function(cb){if(cb.checked)e.participants.push(cb.getAttribute('data-part'))});
  root.querySelectorAll('[data-share]').forEach(function(i){var v=Math.round(parseFloat(i.value||0)*100);if(v)e.shares[i.getAttribute('data-share')]=v});
  root.querySelectorAll('[data-ratio-on]').forEach(function(cb){if(cb.checked){var id2=cb.getAttribute('data-ratio-on'),i=root.querySelector('[data-ratio="'+id2+'"]');e.ratios[id2]=Math.max(0,C.num(i&&i.value||1));e.participants.push(id2)}});
  if(id){var old=L.expenses().find(function(x){return x.id===id});if(old)e.receipt=old.receipt}
  var pr=root.querySelector('.receipt-preview');if(pr)e.receipt=pr.src;
  var res=L.saveExpense(e);if(!res.ok){C.toast(res.errors[0]);return}
  closeModal();C.toast(id?'消费记录已更新':'已记一笔 '+C.money(e.amount));render();
}
function submitMember(id){
  var root=document.getElementById('modalRoot'),m={id:id||L.uid(),name:root.querySelector('#meName').value.trim(),
    color:root.querySelector('#meColor').value,joinDate:root.querySelector('#meJoin').value,leaveDate:root.querySelector('#meLeave').value,
    modules:[],note:root.querySelector('#meNote').value};
  if(!m.name){C.toast('请填写成员姓名');return}
  root.querySelectorAll('[data-mod]').forEach(function(cb){if(cb.checked)m.modules.push(cb.getAttribute('data-mod'))});
  var arr=L.members(),i=arr.findIndex(function(x){return x.id===id});if(i>=0)arr[i]=m;else arr.push(m);
  L.setMembers(arr);closeModal();C.toast('成员已保存');render();
}
function submitSettlement(){
  var r=document.getElementById('modalRoot'),s={id:L.uid(),from:r.querySelector('#seFrom').value,to:r.querySelector('#seTo').value,
    amount:Math.round(parseFloat(r.querySelector('#seAmount').value||0)*100),date:r.querySelector('#seDate').value,
    scopeLabel:r.querySelector('#seScope').value,note:r.querySelector('#seNote').value,status:'pending',paidAmount:0,createdAt:Date.now()};
  if(!s.amount||s.from===s.to){C.toast('请检查结算金额与成员');return}
  var x=L.addSettlement(s);if(!x.ok){C.toast(x.error);return}closeModal();C.toast('结算记录已保存');render();
}
function submitContribution(){
  var r=document.getElementById('modalRoot'),c={id:L.uid(),memberId:r.querySelector('#coMember').value,
    amount:Math.round(parseFloat(r.querySelector('#coAmount').value||0)*100),date:r.querySelector('#coDate').value,note:r.querySelector('#coNote').value};
  if(!c.amount){C.toast('请填写预缴金额');return}L.addContribution(c);
  var p=L.pool();p.custodian=r.querySelector('#coCustodian').value;L.setPool(p);closeModal();C.toast('预缴已记录');render();
}
function showPlace(name){
  var keyMap={'西宁':'xining','青海湖':'qinghai_lake','茶卡盐湖':'chaka','唐古拉山':'tanggula','错那湖':'cuona_lake','拉萨':'lhasa',
   '林芝':'yarlung','鲁朗':'lurang','波密':'yarlung','然乌湖':'ranwu','来古冰川':'laigu','索松村':'namcha','羊卓雍措':'yamdrok',
   '卡若拉冰川':'karola','日喀则':'shigatse','定日':'tingri','珠峰大本营':'everest','定结':'dingjie','纳木措':'namtso',
   '格尔木':'railway','昆仑山·玉珠峰':'kunlun','可可西里·沱沱河':'kekexili','那曲':'nyainqentanglha','当雄':'nyainqentanglha'};
  var key=keyMap[name]||'lhasa',sp=(window.SPOTS||[]).find(function(s){return s.imageKey===key})||{},ps=C.photos(key);
  var related=DAYS.filter(function(d){return d.spots.some(function(s){return s.imageKey===key})});
  modal('<div class="modal-head"><h3>'+esc(name)+'</h3><button class="btn sm" data-action="close-modal">关闭</button></div><div style="padding:18px">'+
   (ps[0]?'<img class="big" src="'+esc(ps[0].file)+'" alt="'+esc(name)+'" style="border-radius:8px">':'<div class="no-photo">图片待补充</div>')+
   '<div class="spot-tags" style="margin-top:12px">'+(sp.tags||[]).map(function(t){return '<span class="chip">'+esc(t)+'</span>'}).join('')+'</div>'+
   '<p style="margin-top:10px">'+esc(sp.description||name+' 位于本次路线中。')+'</p>'+
   '<div class="kv-grid"><div class="kv"><b>推荐程度</b><span>'+(sp.worth?'值得专程':'顺路 / 视情况')+'</span></div><div class="kv"><b>所属计划</b><span>'+(related.length?related.map(function(d){return d.day}).join('、'):'途经')+'</span></div></div></div>');
}
function cfgFromForm(){
  var g=function(id){var e=document.getElementById(id);return e?(e.value||'').trim():''};
  var m=document.getElementById('syncMode');
  return {mode:m?m.value:'off',room:g('syncRoom')||'tibet-trip-2026',localUrl:g('syncLocalUrl'),url:g('syncUrl'),key:g('syncKey')};
}
function doAction(el){
  var a=el.getAttribute('data-action');
  switch(a){
   case 'save-departure':{var i=document.getElementById('departureInput');if(i&&i.value){var st=C.getStore();st.departure=i.value;C.saveSettings(st);C.toast('计划日期已更新；实际消费日期不受影响');render()}break}
   case 'save-budget':saveBudget();break;
   case 'toggle-day':{var d=el.getAttribute('data-day');state.openDays[d]=!state.openDays[d];var b=document.querySelector('[data-body="'+d+'"]');if(b)b.classList.toggle('hidden');
     var h=el.querySelector('.muted.small');if(h)h.textContent=state.openDays[d]?'收起 ↑':'展开 ↓';break}
   case 'module-days':{var key=el.getAttribute('data-module');state.filter='全部';state.query='';go('itinerary');setTimeout(function(){var t=DAYS.find(function(x){return x.moduleKey===key});if(t){var n=document.getElementById('day-'+t.day);if(n)n.scrollIntoView({behavior:'smooth'})}},100);break}
   case 'module-toggle':{var k=el.getAttribute('data-key');P.setToggle(k,!P.toggles()[k]);C.toast('行程已重新衔接与编号');render();break}
   case 'apply-flex':{var inp=document.getElementById('flexCount'),posIn=document.getElementById('flexPos');if(!inp)break;
     var want=Math.max(0,Math.min(10,C.num(inp.value))),cur=P.toggles().flex||0,pos=posIn?C.num(posIn.value):3;
     if(want>cur){for(var n=0;n<want-cur;n++)P.insertFlex(pos+n)}
     else if(want<cur){P.removeFlex(cur-want)}
     P.setToggle('flex',want);C.toast('机动休整日已调整');render();break}
   case 'add-day':P.addDay(null,'normal');C.toast('已新增一天');render();break;
   case 'add-rest-day':P.addDay(null,'rest');C.toast('已新增休整日');render();break;
   case 'remove-day':if(confirm('确认删除这一天的计划行程？已记录的旅行足迹与账本不会受影响。')){P.removeDay(el.getAttribute('data-day'));C.toast('已删除该天');render()}break;
   case 'move-day':{var dd=el.getAttribute('data-day'),dir=C.num(el.getAttribute('data-dir')),idx=DAYS.findIndex(function(x){return x.day===dd});P.moveDay(dd,idx+dir);render();break}
   case 'add-spot':{var code=el.getAttribute('data-day'),name=prompt('新景点名称（临时发现也可）');if(!name)break;
     P.addSpot(code,{name:name,detail:'临时添加',description:'临时发现的景点，可点击编辑补充信息。',highlights:[],visitTime:'视情况',tags:['临时景点'],imageKey:'lhasa',onRoute:true,worth:false});C.toast('已添加景点');render();break}
   case 'edit-spot':{var code2=el.getAttribute('data-day'),id=el.getAttribute('data-spot'),d=P.byDayCode(code2);if(!d)break;
     var s=d.spots.find(function(x){return x.id===id});if(!s)break;
     var nn=prompt('景点名称',s.name);if(nn==null)break;var vt=prompt('建议停留时间',s.visitTime||'视情况');if(vt==null)break;
     P.updateSpot(code2,id,{name:nn,visitTime:vt});render();break}
   case 'remove-spot':P.removeSpot(el.getAttribute('data-day'),el.getAttribute('data-spot'));C.toast('已从当天移出（足迹记录保留）');render();break;
   case 'spot-status':{var sid=el.getAttribute('data-spot'),stt=el.getAttribute('data-status');F.setStatus(sid,stt,C.today());C.toast('已标记为'+F.STATUS[stt]);render();break}
   case 'mark-day':{var n=F.markDay(el.getAttribute('data-day'),DAYS);C.toast('已将本日 '+n+' 个景点标记为已游玩');render();break}
   case 'unmark-day':{var n2=F.unmarkDay(el.getAttribute('data-day'),DAYS);C.toast('已撤销 '+n2+' 个景点的完成标记');render();break}
   case 'delete-foot-photo':F.removePhoto(el.getAttribute('data-spot'),C.num(el.getAttribute('data-index')));render();break;
   case 'delete-foot':if(confirm('二次确认：删除这条旅行足迹及照片？此操作不可恢复。')&&confirm('再次确认确实要永久删除吗？')){F.remove(el.getAttribute('data-spot'));C.toast('足迹已删除');render()}break;
   case 'add-manual-foot':{var nm=prompt('临时景点名称');if(!nm)break;var dt=prompt('实际到访日期（YYYY-MM-DD）',C.today())||C.today();F.addManual({name:nm,date:dt});C.toast('已新增足迹');render();break}
   case 'map-mode':state.mapMode=el.getAttribute('data-mode');render();break;
   case 'reset-plan':if(confirm('确认恢复默认20天行程？')&&confirm('二次确认：计划行程将被重置，但旅行足迹与账本不会删除。继续吗？')){P.reset();C.toast('已恢复默认20天行程');render()}break;
   case 'gallery-cat':state.galleryCat=el.getAttribute('data-cat');render();break;
   case 'export-itinerary':Ex.exportItineraryExcel();break;
   case 'export-ledger':Ex.exportLedgerExcel();break;
   case 'export-ledger-csv':Ex.exportLedgerCSV();break;
   case 'backup-json':Ex.exportFullBackup();break;
   case 'save-sync':{var c=cfgFromForm();window.Sync.setCfg(c);C.toast(c.enabled?'云端同步已启用':'已切回本地模式');render();break}
   case 'sync-now':window.Sync.pull(true);window.Sync.push();break;
   case 'copy-invite':{var link=window.Sync.inviteLink();if(!link){C.toast('请通过网页地址打开后再复制');break}
     if(navigator.clipboard)navigator.clipboard.writeText(link).then(function(){C.toast('邀请链接已复制：'+link)});
     else{prompt('复制邀请链接发送给同行伙伴：',link)}break}
   case 'restore-json':document.getElementById('restoreFile').click();break;
   case 'fab-expense':state.ledgerTab='expenses';render();break;
   case 'new-expense':modal(LV.expenseForm(null,DAYS));break;
   case 'edit-expense':{var e=L.expenses().find(function(x){return x.id===el.getAttribute('data-id')});if(e)modal(LV.expenseForm(e,DAYS));break}
   case 'copy-expense':{var e2=L.expenses().find(function(x){return x.id===el.getAttribute('data-id')});if(e2){L.saveExpense(Object.assign({},C.clone(e2),{id:L.uid(),date:C.today(),createdAt:Date.now(),sync:false}));C.toast('已复制为新账单');render()}break}
   case 'refund-expense':{var e3=L.expenses().find(function(x){return x.id===el.getAttribute('data-id')});if(e3){L.saveExpense(Object.assign({},C.clone(e3),{id:L.uid(),title:'退款 · '+e3.title,amount:-Math.abs(e3.amount),date:C.today(),createdAt:Date.now(),sync:false,note:'冲销原账单 '+e3.id}));C.toast('已生成退款冲销');render()}break}
   case 'delete-expense':if(confirm('确认删除这笔消费？')){L.deleteExpense(el.getAttribute('data-id'));render()}break;
   case 'new-member':modal(LV.memberForm(null));break;
   case 'edit-member':{var m=L.members().find(function(x){return x.id===el.getAttribute('data-id')});if(m)modal(LV.memberForm(m));break}
   case 'delete-member':if(confirm('移除成员不会修改历史账单分摊，确认继续？')){L.setMembers(L.members().filter(function(x){return x.id!==el.getAttribute('data-id')}));render()}break;
   case 'member-detail':state.memberDetail=el.getAttribute('data-id');render();break;
   case 'submit-expense':submitExpense(el.getAttribute('data-id')||null);break;
   case 'submit-member':submitMember(el.getAttribute('data-id')||null);break;
   case 'submit-settlement':submitSettlement();break;
   case 'submit-contribution':submitContribution();break;
   case 'pick-cat':{var cat=el.getAttribute('data-cat'),s2=document.getElementById('exCat');if(s2)s2.value=cat;
     document.querySelectorAll('[data-action="pick-cat"]').forEach(function(b){b.classList.toggle('active',b===el)});break}
   case 'close-modal':closeModal();break;
   case 'new-settlement':modal(LV.settlementForm(null));break;
   case 'settle-plan':{var i2=C.num(el.getAttribute('data-index')),p=L.settlementPlan()[i2];if(!p)break;
     var r2=L.addSettlement({id:L.uid(),from:p.from,to:p.to,amount:p.amount,status:'pending',date:C.today(),scopeLabel:'自动结算方案',paidAmount:0,note:'系统生成',createdAt:Date.now()});C.toast(r2.ok?'已加入结算记录':r2.error);render();break}
   case 'settle-paid':{var r3=L.updateSettlement(el.getAttribute('data-id'),{status:'paid',date:C.today()});C.toast(r3.ok?'已标记为结清':r3.error);render();break}
   case 'settle-partial':{var s3=L.settlements().find(function(x){return x.id===el.getAttribute('data-id')});if(!s3)break;
     var v=prompt('本次实际结算金额（元），总额 '+C.yuan(s3.amount),C.yuan(s3.amount-s3.paidAmount));if(v==null)break;
     var r4=L.updateSettlement(s3.id,{status:'partial',paidAmount:Math.round(parseFloat(v||0)*100),date:C.today()});C.toast(r4.ok?'部分结算已记录':r4.error);render();break}
   case 'delete-settlement':if(confirm('删除这条结算记录？')){L.setSettlements(L.settlements().filter(function(x){return x.id!==el.getAttribute('data-id')}));render()}break;
   case 'copy-settlement':{var txt=L.settlementPlan().map(function(p,i){return (i+1)+'. '+p.fromName+' 向 '+p.toName+' 转账 '+C.money(p.amount)}).join('\n')||'当前无需结算';
     if(navigator.clipboard)navigator.clipboard.writeText(txt).then(function(){C.toast('结算结果已复制')});else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();C.toast('结算结果已复制')}break}
   case 'pool-contribute':modal(LV.contributionForm());break;
   case 'delete-contribution':L.removeContribution(el.getAttribute('data-id'));render();break;
   case 'map-marker':showPlace(el.getAttribute('data-place'));break;
  }
}

/* ---------- 事件 ---------- */
document.addEventListener('click',function(e){
  var zoom=e.target.closest('[data-zoom]');
  if(zoom){modal('<img class="big" src="'+esc(zoom.getAttribute('data-zoom'))+'" alt="图片放大"><div class="modal-cap">'+esc(zoom.getAttribute('data-title')||'')+' · '+esc(zoom.getAttribute('data-credit')||'')+'</div>');return}
  var act=e.target.closest('[data-action]');
  if(act){if(act.getAttribute('data-action')==='close-modal'&&e.target.closest('[data-stop]')&&e.target!==act)return;
    e.preventDefault();doAction(act);return}
  var nav=e.target.closest('[data-nav]');if(nav){go(nav.getAttribute('data-nav'));return}
  var tab=e.target.closest('[data-ledger-tab]');if(tab){state.ledgerTab=tab.getAttribute('data-ledger-tab');state.memberDetail=null;render();return}
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.id==='ledgerMe'){Store.set('ledger.me',t.value);render();return}
  if(t.id==='restoreFile'&&t.files[0]){var r=new FileReader();r.onload=function(){try{var data=JSON.parse(r.result),res=data.version===2?Ex.fullRestore(data):L.restore(data);C.toast(res.ok?'数据已恢复':res.error);render()}catch(err){C.toast('备份文件解析失败')}};r.readAsText(t.files[0]);return}
  if(t.getAttribute&&t.getAttribute('data-module-toggle')){P.setToggle(t.getAttribute('data-module-toggle'),t.checked);C.toast('行程已更新');render();return}
  if(t.getAttribute&&t.getAttribute('data-check')){var st=C.getStore(),pk=st.packing||{};pk[t.getAttribute('data-check')]=t.checked;st.packing=pk;C.saveSettings(st);t.closest('.check-item').classList.toggle('done',t.checked);return}
  if(t.getAttribute&&t.getAttribute('data-foot-photo')){resizeImage(t.files[0],function(data){F.addPhoto(t.getAttribute('data-foot-photo'),data);C.toast('照片已保存到本机');render()});return}
  if(t.getAttribute&&t.getAttribute('data-foot')){F.update(t.getAttribute('data-spot'),Object.fromEntries([[t.getAttribute('data-foot'),t.value]]));return}
  if(t.getAttribute&&t.getAttribute('data-dayfield')){
    var code=t.getAttribute('data-day'),field=t.getAttribute('data-dayfield'),arr=P.current(),d=arr.find(function(x){return x.day===code});
    if(d){if(field==='date'&&t.value){var diff=C.daysBetween(d.date,t.value);for(var i=arr.indexOf(d);i<arr.length;i++)arr[i].date=C.dateAdd(arr[i].date,diff)}
      else d[field]=t.value;P.save(arr);render()}return}
  if(t.getAttribute&&t.getAttribute('data-move-spot')&&t.value){P.moveSpot(t.getAttribute('data-from'),t.getAttribute('data-move-spot'),t.value,0);C.toast('景点已移动到 '+t.value);render();return}
  if(t.getAttribute&&t.getAttribute('data-record-photo')){var day=recordKey(t.getAttribute('data-record-photo'));resizeImage(t.files[0],function(data){var all=C.getStore().records||{},one=all[day]||{};one.photo=data;all[day]=one;var s=C.getStore();s.records=all;C.saveSettings(s);render()});return}
  if(t.getAttribute&&t.getAttribute('data-record')){var day2=recordKey(t.getAttribute('data-day')),all2=C.getStore().records||{},one2=all2[day2]||{};one2[t.getAttribute('data-record')]=t.type==='checkbox'?t.checked:t.value;all2[day2]=one2;var s2=C.getStore();s2.records=all2;C.saveSettings(s2);return}
  if(t.id==='dayFilter'){state.filter=t.value;render();return}
  if(t.id==='dayJump'&&t.value){var target=t.value;state.query='';state.filter='全部';state.openDays[target]=true;render();var jump=document.getElementById('dayJump');if(jump)jump.value=target;var node=document.getElementById('day-'+target);if(node){node.style.scrollMarginTop='90px';node.scrollIntoView({behavior:'smooth',block:'start'})}return}
  ['fMember','fCat','fPayer','fScope','fDate'].forEach(function(id){if(t.id===id){var map={fMember:'member',fCat:'cat',fPayer:'payer',fScope:'scope',fDate:'date'};state.filters[map[id]]=t.value;render()}});
});
document.addEventListener('input',function(e){
  var rec=e.target.getAttribute&&e.target.getAttribute('data-foot');
  if(rec&&e.target.type!=='select-one'){clearTimeout(window.__footTimer);var sid=e.target.getAttribute('data-spot'),f=rec,v=e.target.value;
    window.__footTimer=setTimeout(function(){F.update(sid,Object.fromEntries([[f,v]]))},400)}
  var rf=e.target.getAttribute&&e.target.getAttribute('data-record');
  if(rf&&e.target.type==='text'){clearTimeout(window.__recTimer);var day=e.target.getAttribute('data-day'),field=rf,val=e.target.value;
    window.__recTimer=setTimeout(function(){var a=C.getStore().records||{},o=a[recordKey(day)]||{};o[field]=val;a[recordKey(day)]=o;var s=C.getStore();s.records=a;C.saveSettings(s)},400)}
  if(e.target.id==='daySearch'){state.query=e.target.value;clearTimeout(window.__s);window.__s=setTimeout(function(){render();var i=document.getElementById('daySearch');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},260)}
  if(e.target.id==='expSearch'){state.filters.q=e.target.value;clearTimeout(window.__e);window.__e=setTimeout(function(){render();var i=document.getElementById('expSearch');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)}
});
/* 拖拽排序 */
document.addEventListener('dragstart',function(e){
  var day=e.target.closest&&e.target.closest('[data-drag-day]'),spot=e.target.closest&&e.target.closest('[data-drag-spot]');
  if(day)state.drag={type:'day',id:day.getAttribute('data-drag-day')};
  else if(spot)state.drag={type:'spot',id:spot.getAttribute('data-drag-spot'),day:spot.getAttribute('data-day')};
});
document.addEventListener('dragover',function(e){if(state.drag)e.preventDefault()});
document.addEventListener('drop',function(e){
  if(!state.drag)return;e.preventDefault();var d=state.drag;state.drag=null;
  var day=e.target.closest&&e.target.closest('[data-drag-day]'),spot=e.target.closest&&e.target.closest('[data-drag-spot]');
  if(d.type==='day'&&day&&day.getAttribute('data-drag-day')!==d.id){var idx=DAYS.findIndex(function(x){return x.day===day.getAttribute('data-drag-day')});P.moveDay(d.id,idx);render();return}
  if(d.type==='spot'){
    if(spot&&spot.getAttribute('data-drag-spot')!==d.id){var arr=P.current(),target=arr.find(function(x){return x.day===spot.getAttribute('data-day')});
      var from=arr.find(function(x){return x.day===d.day});if(target&&from){var fi=from.spots.findIndex(function(s){return s.id===d.id}),ti=target.spots.findIndex(function(s){return s.id===spot.getAttribute('data-drag-spot')});
        if(from===target)P.reorderSpot(d.day,fi,ti);else P.moveSpot(d.day,d.id,target.day,ti)}render();return}
    if(day&&!spot){P.moveSpot(d.day,d.id,day.getAttribute('data-drag-day'),0);render()}
  }
});

function initNav(){
  document.getElementById('mobileNav').innerHTML=[['home','首页','⌂'],['itinerary','行程','🗓'],['guide','攻略','◇'],['safety','保障','△'],['ledger','账本','¥'],['footprint','足迹','👣']]
   .map(function(x){return '<button data-nav="'+x[0]+'"><span class="ico">'+x[2]+'</span>'+x[1]+'</button>'}).join('');
  document.getElementById('desktopNav').innerHTML=[['home','首页'],['itinerary','每日行程'],['guide','景点攻略'],['safety','旅行保障'],['ledger','旅行账本'],['footprint','我的足迹']]
   .map(function(x){return '<button data-nav="'+x[0]+'">'+x[1]+'</button>'}).join('');
}
window.App={state:state,days:days,record:record,isOpen:isOpen,go:go,render:render,
  init:function(){var st=Store.get('settings',{});delete st.budgetQty;delete st.budgetPrice;Store.set('settings',st);L.setPaidBudget(0);initNav();rebuild();render();if(window.Sync)window.Sync.init()}};
document.addEventListener('DOMContentLoaded',function(){window.App.init()});
})();
