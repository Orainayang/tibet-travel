/* views.js — 攻略页面渲染（计划 / 足迹 / 图库 / 地图 / 安全 / 预算） */
(function(){
'use strict';
var C=window.Core,P=window.Plan,F=window.Footprint,L=window.Ledger,Ch=window.Charts,esc=C.esc;
var TAGCLASS={'核心景点':'core','顺路景点':'onroute','可选景点':'optional','绕行景点':'detour','冬季待确认':'winter','临时景点':'optional'};
var STATUSCLASS={visited:'onroute',pending:'',deferred:'optional',cancelled:'detour'};
function tagsHTML(tags){return (tags||[]).map(function(t){return '<span class="chip '+(TAGCLASS[t]||'')+'">'+esc(t)+'</span>'}).join('')}
function linesHTML(lines){return '<ul class="line-list">'+(lines||[]).map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>'}
function slotHTML(slots){
  var names={morning:'上午',noon:'中午 / 午后',afternoon:'下午',evening:'晚上'};
  return '<div class="slot-grid">'+Object.keys(names).map(function(k){
    var v=(slots||{})[k]||[];
    return '<div class="slot"><b>'+names[k]+'</b>'+(v.length?linesHTML(v):'<div class="muted small">—</div>')+'</div>';
  }).join('')+'</div>';
}
function photoCredit(key){var ps=C.photos(key);if(!ps.length)return '';
  return '<div class="tiny muted" style="margin-top:5px">参考图片：'+esc(ps[0].title)+' · '+esc(ps[0].author)+' · '+esc(ps[0].license)+'</div>'}

/* Final planning dashboard: derived from the current editable itinerary. */
function table(headers,rows){return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>'+headers.map(function(x){return '<th style="text-align:left;padding:10px;border-bottom:1px solid var(--line);white-space:nowrap">'+esc(x)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(x){return '<td style="padding:10px;border-bottom:1px solid var(--line)">'+esc(x==null?'—':x)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'}
function panel(title,body){return '<div class="section"><div class="section-head"><h2>'+title+'</h2></div><div class="card">'+body+'</div></div>'}
function overview(days){return panel('每日行程总览',table(['日期','路线','距离 / 驾驶时间','住宿','住宿海拔'],days.map(function(d){return [d.day+' '+d.date,d.route,d.drivingRaw,d.lodging,d.lodgingAlt?d.lodgingAlt+'m':'—']}))+'<p class="muted small">随行程编辑自动更新；驾驶时间不含游览及接驳。</p>')}
var priorities=[['S','来古冰川','蓝冰、冰川','重点游览'],['S','然乌湖','湖泊、雪山','重点游览'],['S','南迦巴瓦峰','雪山、日照金山','重点游览'],['S','纳木措','湖泊、雪山','固定保留'],['S','羊卓雍措','高山湖泊','固定保留'],['S','珠峰、加乌拉山口','雪山群','重点游览'],['A','巴松措','森林、湖泊','默认保留'],['A','青海湖','高原湖泊','默认保留'],['A','鲁朗林海','森林、雪山','默认保留'],['A','卡若拉冰川','冰川','顺路游览'],['B','古乡湖、雅尼湿地、佛掌沙丘','河谷、湿地','顺路游览'],['B','卡定沟、满拉水库','峡谷、湖泊','时间允许'],['B','普士拉山口、冰淇淋雪山、十万沙丘','雪山、荒漠','定结可选']];
function priorityView(){var rows;try{rows=JSON.parse(localStorage.getItem('tibet.priority.v1'))||priorities}catch(e){rows=priorities}return '<section class="view"><h1>景点攻略</h1><p class="muted">S：核心优先；A：默认保留；B：弹性游览。可编辑个人优先级模板，独立于每日行程。</p>'+panel('核心景点优先级', '<div style="overflow:auto"><table style="width:100%"><thead><tr><th>级别</th><th>景点</th><th>景观类型</th><th>游览原则</th></tr></thead><tbody>'+rows.map(function(r,i){return '<tr>'+r.map(function(v,j){return '<td><input aria-label="'+['级别','景点','景观类型','游览原则'][j]+'" data-priority="'+i+','+j+'" value="'+esc(v)+'" style="min-width:'+(j===0?'45':'120')+'px;width:100%"></td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div><div class="row"><button class="btn" data-priority-add>新增景点</button><button class="btn" data-priority-reset>恢复默认模板</button></div>')+'<div class="row"><button class="btn primary" data-nav="gallery">景点参考图库</button><button class="btn" data-nav="train">青藏铁路攻略</button></div></section>'}
function driveHours(d){var m=String(d.drivingRaw||'').match(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*h/i)||String(d.drivingRaw||'').match(/(\d+(?:\.\d+)?)\s*h/i);return m?Number(m[2]||m[1]):0}
function safetyView(days){var risks=[['拉萨—鲁朗','冰雪山口','无法安全抵达时住林芝'],['然乌湖、来古冰川','往返可能超过9小时','启用机动日，不赶夜路'],['索松村','日落前抵达不确定','湿地、大峡谷可顺延'],['纳木措','高海拔、临时闭园','优先顺延；身体不适不前往'],['珠峰','接驳及游览时间不足','次日上午补游，必要时取消定结'],['定结','连续高海拔住宿','身体不适则取消并下撤'],['定结—拉萨','长途驾驶','必要时临时中转']];return altitudeView(days).replace('</section>','')+panel('住宿海拔汇总',table(['日期','住宿','海拔'],days.filter(function(d){return d.lodging&&d.lodging!=='—'}).map(function(d){return [d.day+' '+d.date,d.lodging,d.lodgingAlt?d.lodgingAlt+'m':'动态 / 待确认']})))+panel('每日驾驶强度',days.filter(d=>driveHours(d)>0).map(function(d){var h=driveHours(d);return '<div style="margin:12px 0"><div class="between"><b>'+esc(d.day+' '+d.route)+'</b><span>'+h+'h 上限</span></div><div style="height:8px;background:#e5e7eb;border-radius:8px"><div style="height:8px;border-radius:8px;width:'+Math.min(100,h*10)+'%;background:'+(h>9?'#c65b43':h>5?'#b68b40':'#438c80')+'"></div></div></div>'}).join('')+'<p class="muted small">仅统计可解析的驾驶时长，不含游览；超过9小时优先调整。</p>')+panel('风险及备用方案',table(['路段','主要问题','备用方案'],risks))+'<div class="row"><button class="btn" data-nav="packing">旅行准备清单</button><button class="btn" data-nav="modules">行程模块与机动日</button></div></section>'}
function priorityRows(){try{return JSON.parse(localStorage.getItem('tibet.priority.v1'))||priorities.map(r=>r.slice())}catch(e){return priorities.map(r=>r.slice())}}
document.addEventListener('change',function(e){var k=e.target.getAttribute('data-priority');if(k){var a=k.split(','),r=priorityRows();r[a[0]][a[1]]=e.target.value;localStorage.setItem('tibet.priority.v1',JSON.stringify(r))}});
document.addEventListener('click',function(e){if(e.target.closest('[data-priority-add]')){var r=priorityRows();r.push(['B','','','']);localStorage.setItem('tibet.priority.v1',JSON.stringify(r));document.getElementById('main').innerHTML=priorityView()}if(e.target.closest('[data-priority-reset]')&&confirm('恢复默认优先级模板？')){localStorage.removeItem('tibet.priority.v1');document.getElementById('main').innerHTML=priorityView()}});
/* ---------- 首页 ---------- */
function home(days){
  var st=C.getStore(),fs=F.stats(days),budget=P.budget(),actual=L.totals().actual;
  var left=C.daysBetween(C.today(),P.getDeparture());
  var hero=C.photos('namtso')[0]||C.photos('yamdrok')[0]||C.photos('namcha')[0]||{file:'',title:'',author:'',license:''};
  var altData=days.map(function(d){return {label:d.day,v1:C.alt(d.lodgingAlt),v2:Math.max(C.alt(d.lodgingAlt),estimateMaxAlt(d))}});
  var stats=[['当前计划总天数',days.length,'天','可自由调整'],['景点完成进度',fs.inPlanVisited+' / '+fs.inPlan,'处',fs.progress+'%'],
    ['预计旅行预算',C.money0(budget),'','规划数据'],['实际旅行支出',C.money0(actual),'','独立账本'],
    ['出发日期',C.dateCN(P.getDeparture()),'',C.weekday(P.getDeparture())],['核心景点',P.coreSpotCount(),'处','优先保留'],
    ['预计住宿晚数',P.nights(),'晚',''],['预计总里程',P.km(),'km','估算']];
  return '<section class="view" id="view-home">'+
   '<div class="hero">'+(hero.file?'<img class="hero-img" src="'+esc(hero.file)+'" alt="西藏雪山与高山湖泊">':'')+'<div class="hero-shade"></div>'+
   '<div class="hero-body"><div class="hero-kicker">WINTER TIBET · DECEMBER</div><h1>一路向西 · 我的西藏冬季旅行</h1>'+
   '<p class="subtitle">从青海湖到喜马拉雅，在雪山、冰川与高原湖泊之间旅行</p>'+
   '<div class="row" style="margin-top:20px"><span class="chip core">默认 20 天</span><span class="chip">Z165 青藏铁路</span><span class="chip">雪山 · 冰川 · 湖泊</span><span class="chip">'+days.length+' 天当前计划</span></div></div>'+
   (hero.file?'<div class="hero-photo-credit">'+esc(hero.title+' / '+hero.author+' / '+hero.license)+'</div>':'')+'</div>'+
   '<div class="card" style="margin-top:16px"><div class="between"><div><b>距离出发</b><div class="muted small">修改日期后，计划行程日期自动顺延；实际消费日期不受影响</div></div>'+
   '<div class="row"><div class="countdown">'+(left>=0?'还有 <b>'+left+'</b> 天':'已出发 <b>'+Math.abs(left)+'</b> 天')+'</div>'+
   '<input type="date" id="departureInput" value="'+esc(P.getDeparture())+'" style="width:150px"><button class="btn primary" data-action="save-departure">更新</button></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>行程概览</h2><span class="eyebrow">Overview</span></div>'+
   '<div class="grid stat-grid">'+stats.map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+esc(s[1])+' <small>'+esc(s[2])+'</small></div><div class="hint">'+esc(s[3])+'</div></div>'}).join('')+'</div></div>'+
   overview(days)+'<div class="section"><div class="section-head"><h2>整体路线地图</h2><button class="btn sm" data-nav="map">打开地图 →</button></div>'+mapSVG(days)+'</div>'+
   '<div class="section"><div class="section-head"><h2>快捷入口</h2></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">'+
   [['itinerary','🗓','每日行程与自由编辑'],['footprint','👣','旅行足迹与已完成景点'],['guide','◇','景点优先级与攻略'],['safety','△','海拔、驾驶与安全'],['train','🚄','Z165 青藏铁路观景'],['packing','✅','旅行准备清单'],['mine','☰','我的设置与数据备份'],['budget','¥','预计预算管理'],['ledger','📒','独立旅行账本']]
   .map(function(x){return '<button class="card" style="text-align:left;cursor:pointer" data-nav="'+x[0]+'"><div style="font-size:24px">'+x[1]+'</div><b>'+x[2]+'</b></button>'}).join('')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>旅行模块</h2><button class="btn sm" data-nav="modules">查看更多 →</button></div>'+
   '<div class="grid module-grid">'+(window.MODULES||[]).slice(0,4).map(function(m){return moduleCard(m,days)}).join('')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>出发前必须核实</h2></div><div class="card"><ul class="line-list">'+
   ['Z165 列车时刻以实际出发日期 12306 公布信息为准。','12月来古冰川开放情况、蓝冰形成情况需提前核实。','纳木措冬季开放、普士拉山口与冰淇淋雪山准确位置待核实。','珠峰小镇实际住宿海拔、然乌湖高海拔住宿条件待核实。',
    '冬季道路结冰与交通管制随时变化；高海拔应根据身体状态决定是否继续，不为维持天数强行赶路。'].map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div></div></section>';
}

/* ---------- 模块 ---------- */
function moduleCard(m,days){
  var ps=C.photos(m.imageKey);
  var list=days.filter(function(d){return d.moduleKey===m.moduleKey});
  var key=m.toggleKey||m.moduleKey;
  var on=m.optional?!!(P.toggles()[key]):true;
  return '<article class="module-card"><div class="module-cover">'+(ps[0]?'<img src="'+esc(ps[0].file)+'" alt="'+esc(m.name)+'" loading="lazy">':'')+'<span class="module-num">'+esc(m.num)+'</span></div>'+
   '<div class="module-body"><h3>'+esc(m.name)+'</h3>'+(m.optional?'<span class="chip '+(on?'onroute':'')+'">'+(on?'已开启':'未开启')+'</span>':'')+
   '<p class="summary">'+esc(m.summary)+'</p><ul>'+m.highlights.map(function(h){return '<li>'+esc(h)+'</li>'}).join('')+'</ul></div>'+
   '<div class="module-foot"><span>'+(list.length?list.map(function(d){return d.day}).join(' · '):'当前不在计划中')+'</span>'+
   (m.optional?'<button class="btn sm" data-action="module-toggle" data-key="'+esc(key)+'">'+(on?'关闭模块':'开启模块')+'</button>':'<button class="btn sm" data-action="module-days" data-module="'+esc(m.moduleKey)+'">行程 →</button>')+'</div></article>';
}
function modulesView(days){
  var extra=[['茶卡盐湖','chaka'],['然乌湖＋来古冰川','glacier'],['米堆冰川','midui'],['定结雪山＋十万沙丘','dingjie'],
    ['纳木措','namtso'],['索松村额外住宿','songsongExtra'],['珠峰稳妥路线','everestSafe']];
  var t=P.toggles();
  return '<section class="view"><div class="section-head"><h2>旅行模块</h2><span class="eyebrow">Modules</span></div>'+
   '<p class="muted small">关闭支线后前后路线会重新衔接，并自动重排天数、日期与预算。</p>'+
   '<div class="grid module-grid" style="margin-top:16px">'+(window.MODULES||[]).map(function(m){return moduleCard(m,days)}).join('')+'</div>'+
   '<div class="section"><div class="section-head"><h2>可选模块开关</h2></div><div class="card">'+
   extra.map(function(x){return '<div class="between" style="padding:9px 0;border-bottom:1px solid var(--line)"><b>'+esc(x[0])+'</b>'+
    '<label class="switch"><input type="checkbox" data-module-toggle="'+x[1]+'" '+(t[x[1]]?'checked':'')+' '+((x[1]==='midui'&&!t.glacier)?'disabled':'')+'><span class="track"></span></label></div>'}).join('')+
   '<div class="between" style="padding-top:12px"><div><b>机动休整日</b><div class="muted small">当前 '+(t.flex||0)+' 天，可自由插入位置</div></div>'+
   '<div class="row"><input type="number" min="0" max="10" id="flexCount" value="'+(t.flex||0)+'" style="width:70px"><select id="flexPos" style="width:auto"><option value="0">最前面</option>'+days.map(function(d,i){return '<option value="'+(i+1)+'" '+(i===2?'selected':'')+'>'+d.day+' 之后</option>'}).join('')+'</select><button class="btn sm" data-action="apply-flex">应用</button></div></div>'+
   '</div></div></section>';
}

/* ---------- 行程编辑与每日行程 ---------- */
function spotStatusHTML(s){
  var rec=F.ensure(s),st=rec.status;
  return '<div class="row" style="margin-top:9px"><span class="tiny muted">完成状态：</span>'+
   Object.keys(F.STATUS).map(function(k){return '<button class="btn sm '+(st===k?'primary':'')+'" data-action="spot-status" data-spot="'+esc(rec.id)+'" data-status="'+k+'">'+F.STATUS[k]+'</button>'}).join('')+
   (st==='visited'?'<span class="chip onroute">✓ 已游玩 · '+(rec.visitDate||'日期未填')+'</span>':'')+'</div>'+
   '<details style="margin-top:8px"><summary class="tiny" style="cursor:pointer;color:var(--lake)">实际到访记录（选填）</summary>'+
   '<div class="field-row" style="margin-top:8px">'+
   '<div class="field"><label>实际到访日期</label><input type="date" data-foot="visitDate" data-spot="'+esc(rec.id)+'" value="'+esc(rec.visitDate||'')+'"></div>'+
   '<div class="field"><label>实际到访时间</label><input type="time" data-foot="visitTime" data-spot="'+esc(rec.id)+'" value="'+esc(rec.visitTime||'')+'"></div>'+
   '<div class="field"><label>实际停留时间</label><input type="text" data-foot="duration" data-spot="'+esc(rec.id)+'" value="'+esc(rec.duration||'')+'" placeholder="例如 2 小时"></div>'+
   '<div class="field"><label>实际天气</label><input type="text" data-foot="weather" data-spot="'+esc(rec.id)+'" value="'+esc(rec.weather||'')+'" placeholder="晴 / 雪 / 大风"></div>'+
   '<div class="field"><label>个人评分</label><select data-foot="rating" data-spot="'+esc(rec.id)+'"><option value="">未评分</option>'+[1,2,3,4,5].map(function(n){return '<option '+(C.num(rec.rating)===n?'selected':'')+'>'+n+'</option>'}).join('')+'</select></div></div>'+
   '<div class="field"><label>游玩体验</label><input type="text" data-foot="experience" data-spot="'+esc(rec.id)+'" value="'+esc(rec.experience||'')+'"></div>'+
   '<div class="field"><label>个人旅行笔记</label><textarea data-foot="note" data-spot="'+esc(rec.id)+'">'+esc(rec.note||'')+'</textarea></div>'+
   '<div class="field"><label>我的旅行照片（独立保存）</label><input type="file" accept="image/*" data-foot-photo="'+esc(rec.id)+'"></div>'+
   ((rec.photos||[]).length?'<div class="thumbs">'+rec.photos.map(function(p,i){return '<div style="position:relative"><img class="thumb" src="'+esc(p)+'" data-zoom="'+esc(p)+'" data-title="'+esc(rec.name)+' 实拍" data-credit="个人旅行照片"><button class="btn sm danger" style="position:absolute;top:-6px;right:-6px;padding:0 5px" data-action="delete-foot-photo" data-spot="'+esc(rec.id)+'" data-index="'+i+'">×</button></div>'}).join('')+'</div>':'')+
   '</details>';
}
function spotCard(s,days){
  var rec=F.ensure(s);
  return '<div class="spot-item'+(rec.status==='visited'?' visited':'')+'" draggable="true" data-drag-spot="'+esc(rec.id)+'" data-day="'+esc(s._day||'')+'">'+
   '<div class="spot-top"><div><span class="spot-name">'+esc(s.name)+'</span><div class="spot-tags" style="margin-top:5px">'+tagsHTML(s.tags)+'</div></div>'+
   '<div class="small muted">建议 '+esc(s.visitTime||'视情况')+'</div></div>'+
   '<div class="spot-detail"><b>原表玩法：</b>'+esc(s.detail||'—')+'</div>'+
   '<div class="spot-desc">'+esc(s.description||'')+'</div>'+
   (s.highlights&&s.highlights.length?'<div class="spot-hi">'+s.highlights.map(function(h){return '<span>'+esc(h)+'</span>'}).join('')+'</div>':'')+
   '<div class="row tiny muted" style="margin-top:8px"><span>顺路：'+(s.onRoute?'是':'需绕行')+'</span><span>·</span><span>值得专程：'+(s.worth?'是':'否 / 视情况')+'</span></div>'+
   C.photoHTML(s.imageKey,4)+photoCredit(s.imageKey)+spotStatusHTML(s)+
   '<div class="row" style="margin-top:8px"><button class="btn sm" data-action="edit-spot" data-day="'+esc(s._day||'')+'" data-spot="'+esc(rec.id)+'">编辑</button>'+
   '<button class="btn sm danger" data-action="remove-spot" data-day="'+esc(s._day||'')+'" data-spot="'+esc(rec.id)+'">移出当天</button>'+
   '<select class="small" style="width:auto" data-move-spot="'+esc(rec.id)+'" data-from="'+esc(s._day||'')+'"><option value="">移动到…</option>'+
   days.map(function(d){return '<option value="'+d.day+'">'+d.day+' '+esc(d.route)+'</option>'}).join('')+'</select></div></div>';
}
function estimateMaxAlt(d){
  if(d.day==='D4'||/青藏铁路|Z165/.test(d.route))return 5072;
  var names=(d.spots||[]).map(function(s){return s.name}).join('');
  if(/珠峰|大本营/.test(names))return 5200;
  if(/纳木措/.test(names))return 4718;
  if(/卡若拉|加乌拉|普士拉/.test(names))return 5000;
  if(/来古|米堆|冰川/.test(names))return 4300;
  if(/然乌/.test(names))return 4000;
  var a=C.alt(d.lodgingAlt);return a?a:0;
}
function dayCard(d,days){
  var rec=C.getStore().records||{};
  var mine=rec[d.day]||{};
  return '<article class="day-card" id="day-'+d.day+'" data-day="'+d.day+'" draggable="true" data-drag-day="'+d.day+'">'+
   '<div class="day-head" data-action="toggle-day" data-day="'+d.day+'"><div class="day-badge">'+d.day+'</div><div class="day-head-main">'+
   '<h3>'+esc(d.route||'当日行程')+'</h3><div class="day-route">'+esc(d.date)+' · '+esc(d.week||C.weekday(d.date))+' · 住宿 '+esc(d.lodging||'—')+' · 强度 '+esc(d.intensity||'中')+'</div>'+
   '<div class="day-meta"><span class="chip">'+esc(d.moduleKey||'主线')+'</span><span class="chip">'+d.spots.length+' 景点</span>'+
   (mine.done?'<span class="chip onroute">已完成</span>':'')+'</div></div><span class="muted small">'+(window.App&&App.isOpen(d.day)?'收起 ↑':'展开 ↓')+'</span></div>'+
   '<div class="day-body '+((window.App&&App.isOpen(d.day))?'':'hidden')+'" data-body="'+d.day+'">'+
   '<div class="block"><div class="block-title">自由编辑本日</div><div class="field-row">'+
   '<div class="field"><label>路线</label><input type="text" data-dayfield="route" data-day="'+d.day+'" value="'+esc(d.route||'')+'"></div>'+
   '<div class="field"><label>住宿</label><input type="text" data-dayfield="lodging" data-day="'+d.day+'" value="'+esc(d.lodging||'')+'"></div>'+
   '<div class="field"><label>住宿海拔</label><input type="text" data-dayfield="lodgingAlt" data-day="'+d.day+'" value="'+esc(d.lodgingAlt||'')+'"></div>'+
   '<div class="field"><label>计划日期</label><input type="date" data-dayfield="date" data-day="'+d.day+'" value="'+esc(d.date||'')+'"></div></div>'+
   '<div class="row"><button class="btn sm" data-action="move-day" data-day="'+d.day+'" data-dir="-1">上移</button>'+
   '<button class="btn sm" data-action="move-day" data-day="'+d.day+'" data-dir="1">下移</button>'+
   '<button class="btn sm" data-action="add-spot" data-day="'+d.day+'">＋ 景点</button>'+
   '<button class="btn sm" data-action="mark-day" data-day="'+d.day+'">全部标记已游玩</button>'+
   '<button class="btn sm" data-action="unmark-day" data-day="'+d.day+'">撤销本日标记</button>'+
   '<button class="btn sm danger" data-action="remove-day" data-day="'+d.day+'">删除本日</button></div></div>'+
   '<div class="block"><div class="block-title">当日路线与时间安排</div><div>'+esc(d.route)+'</div><div style="margin-top:8px">'+slotHTML(d.slots)+'</div>'+
   (d.alternatives&&d.alternatives.length?'<div class="note-box" style="margin-top:10px"><b>备选方案：</b>'+d.alternatives.map(function(a){return '<div>'+esc(a)+'</div>'}).join('')+'</div>':'')+'</div>'+
   '<div class="block"><div class="block-title">当日景点与真实照片</div>'+
   (d.spots.length?d.spots.map(function(s){var x=Object.assign({},s,{_day:d.day});return spotCard(x,days)}).join(''):'<div class="muted small">当日暂无景点，可点击「＋ 景点」添加，或作为休整日。</div>')+'</div>'+
   '<div class="block"><div class="block-title">交通、住宿与海拔</div><div class="kv-grid">'+
   '<div class="kv"><b>预计里程 / 驾驶</b><span>'+esc(d.drivingRaw||'—')+'</span></div>'+
   '<div class="kv"><b>住宿地点</b><span>'+esc(d.lodging||'—')+'</span></div>'+
   '<div class="kv"><b>住宿海拔</b><span>'+esc(d.lodgingAlt||'—')+' m</span></div>'+
   '<div class="kv"><b>当日最高游览海拔</b><span>'+estimateMaxAlt(d)+' m（估算）</span></div>'+
   '<div class="kv"><b>行程强度</b><span>'+esc(d.intensity||'中')+'（节奏参考，非健康风险）</span></div></div></div>'+
   '<div class="block"><div class="block-title">高反与冬季注意事项</div><div class="note-box">'+linesHTML(d.notes)+'</div></div>'+
   '<div class="block"><div class="block-title">个人旅行记录（仅本机）</div>'+
   '<label class="check-item"><input type="checkbox" data-record="done" data-day="'+d.day+'" '+(mine.done?'checked':'')+'><span>本日行程已完成</span></label>'+
   '<div class="field-row"><div class="field"><label>身体状态</label><input type="text" data-record="body" data-day="'+d.day+'" value="'+esc(mine.body||'')+'"></div>'+
   '<div class="field"><label>旅行笔记</label><input type="text" data-record="note" data-day="'+d.day+'" value="'+esc(mine.note||'')+'"></div></div></div>'+
   '</div></article>';
}
function itineraryView(days){
  var q=(window.App&&App.state.query||'').trim(),filter=window.App&&App.state.filter||'全部';
  var list=days.filter(function(d){
    if(filter==='核心景点'&&!d.spots.some(function(s){return (s.tags||[]).indexOf('核心景点')>=0}))return false;
    if(filter==='含未完成'&&d.spots.some(function(s){return F.get(s.id)&&F.get(s.id).status==='visited'}))return false;
    if(!q)return true;
    return (d.day+' '+d.route+' '+d.spots.map(function(s){return s.name+' '+(s.description||'')}).join(' ')).toLowerCase().indexOf(q.toLowerCase())>=0;
  });
  return '<section class="view"><div class="between"><div><div class="eyebrow" style="color:var(--lake)">Day by day</div><h2 style="font-size:22px">行程 · 当前 '+days.length+' 天</h2></div>'+
   '<div class="row"><button class="btn sm" data-action="add-day">＋ 新增一天</button><button class="btn sm" data-action="add-rest-day">＋ 休整日</button>'+
   '<button class="btn sm" data-action="export-itinerary">导出 Excel</button><button class="btn sm" onclick="window.print()">打印 / PDF</button></div></div>'+
   '<div class="card" style="margin-top:14px"><div class="field-row">'+
   '<div class="field"><label>搜索景点 / 路线 / 天数</label><input type="search" id="daySearch" value="'+esc(q)+'" placeholder="例如：冰川、南迦巴瓦、羊湖"></div>'+
   '<div class="field"><label>筛选</label><select id="dayFilter">'+['全部','核心景点','含未完成'].map(function(x){return '<option '+(filter===x?'selected':'')+'>'+x+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>快速跳转</label><select id="dayJump"><option value="">选择天数…</option>'+days.map(function(d){return '<option value="'+d.day+'">'+d.day+' · '+esc(d.route)+'</option>'}).join('')+'</select></div></div>'+
   '<div class="tiny muted" style="margin-top:8px">拖拽天数卡片或景点卡片可调整顺序；景点右侧下拉可移动到其他日期。</div></div>'+
   '<div class="day-list" style="margin-top:14px">'+(list.length?list.map(function(d){return dayCard(d,days)}).join(''):'<div class="card center muted">没有匹配的行程。</div>')+'</div></section>';
}

/* ---------- 旅行足迹 ---------- */
function footprintView(days){
  var fs=F.stats(days),vis=F.visited(),mode=window.App&&App.state.mapMode||'plan';
  return '<section class="view"><div class="section-head"><h2>旅行足迹</h2><span class="eyebrow">Footprint</span></div>'+
   '<div class="grid stat-grid">'+[['已游玩',fs.visited],['待游玩',fs.pending],['暂缓',fs.deferred],['已取消',fs.cancelled],
    ['当前计划完成进度',fs.progress+'%'],['临时新增足迹',F.list().filter(function(x){return x.manual}).length]]
   .map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+'</div></div>'}).join('')+'</div>'+
   '<div class="section"><div class="section-head"><h2>地图切换</h2><div class="row">'+
   '<button class="btn sm '+(mode==='plan'?'primary':'')+'" data-action="map-mode" data-mode="plan">计划路线</button>'+
   '<button class="btn sm '+(mode==='actual'?'primary':'')+'" data-action="map-mode" data-mode="actual">实际足迹</button></div></div>'+
   mapSVG(days,mode)+'</div>'+
   '<div class="section"><div class="section-head"><h2>实际到访时间轴</h2><button class="btn sm" data-action="add-manual-foot">＋ 新增临时足迹</button></div>'+
   '<div class="card">'+(vis.length?vis.map(function(x){return '<div class="expense-row"><div class="expense-main">'+
    '<div class="expense-title">'+esc(x.name)+(x.manual?' <span class="chip optional">临时新增</span>':'')+'</div>'+
    '<div class="expense-sub">'+esc(x.visitDate||'日期未填')+' '+esc(x.visitTime||'')+' · '+esc(x.weather||'天气未填')+' · 停留 '+esc(x.duration||'未填')+'</div>'+
    (x.experience?'<div class="expense-sub">体验：'+esc(x.experience)+'</div>':'')+(x.note?'<div class="expense-sub">笔记：'+esc(x.note)+'</div>':'')+'</div>'+
    '<div class="right"><div>'+(x.rating?'评分 '+esc(x.rating)+'/5':'未评分')+'</div>'+
    '<button class="btn sm danger" data-action="delete-foot" data-spot="'+esc(x.id)+'">删除足迹</button></div></div>'}).join(''):'<div class="center muted" style="padding:22px">还没有已游玩景点。在行程卡片上点击「已游玩」即可记录。</div>')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>我的旅行照片合集</h2></div><div class="gallery-grid">'+
   F.list().reduce(function(a,x){return a.concat((x.photos||[]).map(function(p){return {p:p,name:x.name}}))},[]).map(function(o){
     return '<div class="gallery-item"><img src="'+esc(o.p)+'" alt="'+esc(o.name)+'" data-zoom="'+esc(o.p)+'" data-title="'+esc(o.name)+' 实拍" data-credit="个人旅行照片"><div class="cap"><b>'+esc(o.name)+'</b></div></div>'}).join('')+
   '</div></div></section>';
}

/* ---------- Z165 ---------- */
var TRAIN_META=[
 {key:'xining',level:'出发',night:'夜间行车',early:'不需要',dir:'—'},
 {key:'railway',level:'停站参考',night:'可能',early:'不需要',dir:'—'},
 {key:'kunlun',level:'★★★',night:'大概率天黑',early:'值得（03:00 前后）',dir:'南下通常位于列车右侧，仅作参考'},
 {key:'kekexili',level:'★★☆',night:'前半段天黑，后半段可能天亮',early:'值得（05:30 前后）',dir:'两侧均可见荒原，无法保证方向'},
 {key:'tanggula',level:'★★★★★',night:'否，通常白天',early:'不必特意早起，但不要错过',dir:'雪山与荒原两侧均可见'},
 {key:'cuona_lake',level:'★★★★★',night:'否',early:'值得，10:50 前到窗边',dir:'南下通常右侧（原表记录）'},
 {key:'nyainqentanglha',level:'★★★★',night:'否',early:'不需要',dir:'那曲—当雄段两侧雪山连绵'},
 {key:'lhasa',level:'抵达',night:'否',early:'不需要',dir:'—'}];
function trainView(){
  return '<section class="view"><div class="section-head"><h2>Z165 青藏铁路观景专页</h2><span class="eyebrow">Qinghai–Tibet Railway</span></div>'+
   '<div class="limit-note"><b>时刻免责声明：</b>以下时间来自原 Excel 参考时刻与推算，<b>必须以实际出发日期 12306 公布信息为准</b>。停站时刻与推算景观经过时段分开标识。</div>'+
   (window.TRAIN||[]).map(function(r,i){var m=TRAIN_META[i]||{},isStop=/格尔木|西宁|拉萨/.test(r.area),ps=C.photos(m.key);
     return '<div class="card" style="margin-bottom:12px"><div class="between"><div><b style="font-size:16px">'+esc(r.time)+'</b><span class="chip '+(isStop?'onroute':'core')+'" style="margin-left:6px">'+(isStop?'公布停站参考':'推算经过时段')+'</span></div><span class="chip winter">'+esc(m.level||'')+'</span></div>'+
      '<h3 style="margin:8px 0;font-size:18px">'+esc(r.area)+'</h3><div class="row" style="align-items:flex-start;gap:14px"><div style="flex:1;min-width:200px">'+linesHTML(r.descLines)+
      '<div class="kv-grid" style="margin-top:10px"><div class="kv"><b>是否可能处于夜间</b><span>'+esc(m.night)+'</span></div><div class="kv"><b>是否值得提前起床</b><span>'+esc(m.early)+'</span></div><div class="kv"><b>推荐观景方向</b><span>'+esc(m.dir)+'</span></div></div></div>'+
      (ps[0]?'<img src="'+esc(ps[0].file)+'" style="width:180px;border-radius:8px;cursor:zoom-in" data-zoom="'+esc(ps[0].file)+'" data-title="'+esc(ps[0].title)+'" data-credit="'+esc(ps[0].author+' · '+ps[0].license)+'">':'<div class="no-photo" style="width:180px">图片待补充</div>')+'</div>'+
      (ps[0]?'<div class="tiny muted" style="margin-top:6px">'+esc(ps[0].title+' · '+ps[0].author+' · '+ps[0].license)+'</div>':'')+'</div>'}).join('')+'</section>';
}

/* ---------- 图库 ---------- */
function galleryView(){
  var cat=window.App&&App.state.galleryCat||'全部',cats=['全部','雪山','冰川','高山湖泊','青藏铁路','高原峡谷','城市人文'];
  var imgs=window.IMAGES||{},items=[];Object.keys(imgs).forEach(function(k){imgs[k].forEach(function(p){items.push(Object.assign({key:k},p))})});
  var filtered=cat==='全部'?items:items.filter(function(p){var sp=(window.SPOTS||[]).find(function(s){return s.imageKey===p.key});return sp&&sp.category===cat});
  return '<section class="view"><div class="section-head"><h2>景点图片图库</h2><span class="eyebrow">Photo archive</span></div>'+
   '<p class="muted small">照片来自 Wikimedia Commons 等公开授权摄影作品，已保存至本地。无合适来源时显示「图片待补充」，不使用其他景点照片冒充或生成虚假实景。</p>'+
   '<div class="quick-cats" style="margin-top:12px">'+cats.map(function(x){return '<button class="'+(cat===x?'active':'')+'" data-action="gallery-cat" data-cat="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>'+
   '<div class="gallery-grid" style="margin-top:12px">'+filtered.map(function(p){
     var sp=(window.SPOTS||[]).find(function(s){return s.imageKey===p.key&&s.name.indexOf('（')<0});
     return '<div class="gallery-item"><img src="'+esc(p.file)+'" alt="'+esc(p.title)+'" loading="lazy" data-zoom="'+esc(p.file)+'" data-title="'+esc(p.title)+'" data-credit="'+esc(p.author+' · '+p.license)+'">'+
      '<div class="cap"><b>'+esc(sp?sp.name:p.key)+'</b><div class="tiny muted">'+esc(p.author)+' · '+esc(p.license)+'</div><a class="tiny" href="'+esc(p.page)+'" target="_blank" rel="noopener">来源页 ↗</a></div></div>'}).join('')+'</div></section>';
}

/* ---------- 地图 ---------- */
function mapSVG(days,mode){
  var G=C.GEO,keys=Object.keys(G),pts={};keys.forEach(function(k){pts[k]=C.project(G[k][0],G[k][1])});
  var land='<path d="M60 120 L200 96 L330 110 L470 86 L610 112 L760 92 L890 130 L900 240 L830 330 L740 420 L610 500 L470 540 L330 520 L200 470 L90 390 L60 260 Z" fill="#e9f0f2" stroke="#d3e0e5"/>';
  var grid='';for(var x=100;x<900;x+=100)grid+='<line x1="'+x+'" y1="34" x2="'+x+'" y2="574" stroke="#e4ebee"/>';
  for(var y=80;y<580;y+=80)grid+='<line x1="50" y1="'+y+'" x2="930" y2="'+y+'" stroke="#e4ebee"/>';
  // 计划地图随当前行程变化：仅绘制当前计划中出现的点位
  var active={},railway=['西宁','格尔木','昆仑山·玉珠峰','可可西里·沱沱河','唐古拉山','错那湖','那曲','当雄','拉萨'];
  railway.forEach(function(k){active[k]=1});
  (days||[]).forEach(function(d){
    var txt=[d.route||'',d.lodging||''].concat((d.spots||[]).map(function(x){return x.name||''})).join(' ');
    keys.forEach(function(k){if(txt.indexOf(k)>=0)active[k]=1});
  });
  function path(list,color,dash){
    var pts2=list.filter(function(k){return active[k]&&pts[k]}).map(function(k){return pts[k].x+','+pts[k].y});
    if(pts2.length<2)return '';
    return '<polyline points="'+pts2.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.6" '+(dash?'stroke-dasharray="7 5"':'')+'/>';
  }
  var routes='';
  if(mode==='actual'){
    var visited=F.visited().filter(function(x){return G[x.name]});
    routes='<polyline points="'+visited.map(function(x){return pts[x.name].x+','+pts[x.name].y}).join(' ')+'" fill="none" stroke="#2f7d5b" stroke-width="3" stroke-dasharray="2 4"/>';
  }else{
    routes=path(railway,'#7b8794')+
      path(['西宁','青海湖','茶卡盐湖','格尔木'],'#2f7d9e',true)+path(['拉萨','林芝','鲁朗','波密','然乌湖','来古冰川'],'#4a8fa3',true)+
      path(['林芝','索松村','拉萨'],'#3d6b8e')+path(['拉萨','羊卓雍措','卡若拉冰川','日喀则','定日','珠峰大本营'],'#6d5a86')+
      path(['定日','定结','日喀则'],'#6d5a86',true)+path(['拉萨','纳木措','那曲'],'#2b6f92',true);
  }
  var marks=keys.filter(function(k){return mode==='actual'||active[k]}).map(function(k){
    var p=pts[k],actual=mode==='actual'&&F.visited().some(function(x){return x.name===k});
    var c=actual?'#2f7d5b':(k.indexOf('铁路')>=0||k==='格尔木'?'#7b8794':'#2b6f92');
    return '<g class="map-marker" data-action="map-marker" data-place="'+esc(k)+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(actual?7:5.5)+'" fill="'+c+'"/><text class="map-label" x="'+(p.x+8)+'" y="'+(p.y+4)+'">'+esc(k)+'</text></g>';
  }).join('');
  return '<div class="map-shell"><svg class="map-svg" viewBox="0 0 980 610"><rect width="980" height="610" fill="#f5f9fa"/>'+grid+land+routes+marks+
   '<text x="62" y="52" font-size="13" fill="#6b7280">'+(mode==='actual'?'实际旅行足迹':'路线示意图 · 非导航地图')+' · 坐标线性投影，仅供理解顺序</text></svg>'+
   '<div class="map-note">当前未配置地图 API Key，使用明确标注的路线示意图，不提供也不伪造实时导航距离与车程。</div></div>';
}
function mapView(days){var mode=window.App&&App.state.mapMode||'plan';
  return '<section class="view"><div class="section-head"><h2>旅行地图</h2><div class="row"><button class="btn sm '+(mode==='plan'?'primary':'')+'" data-action="map-mode" data-mode="plan">计划路线</button><button class="btn sm '+(mode==='actual'?'primary':'')+'" data-action="map-mode" data-mode="actual">实际足迹</button></div></div>'+mapSVG(days,mode)+'</section>'}

/* ---------- 海拔安全 ---------- */
function altitudeView(days){
  var marks={'D4':'铁路唐古拉山区域'};
  days.forEach(function(d){var n=d.spots.map(function(s){return s.name}).join('');
    if(/然乌/.test(n))marks[d.day]='然乌湖游览';if(/卡若拉/.test(n))marks[d.day]='卡若拉冰川';
    if(/加乌拉|珠峰/.test(n))marks[d.day]='加乌拉 / 珠峰';if(/纳木措/.test(n))marks[d.day]='纳木措 4718m';});
  var data=days.map(function(d){return {label:d.day,day:d.day,v1:C.alt(d.lodgingAlt),v2:estimateMaxAlt(d)}});
  return '<section class="view"><div class="section-head"><h2>海拔与安全</h2></div><div class="limit-note"><b>说明：</b>海拔用于观察睡眠海拔趋势，部分为估算，不构成个人安全判断。</div>'+
   '<div class="chart-box">'+Ch.lineChart(data,{marks:marks,series:[{key:'v1',name:'睡眠海拔（住宿）',color:'#2b6f92'},{key:'v2',name:'最高游览海拔（估算）',color:'#b8794b'}]})+'</div>'+
   '<div class="section"><div class="section-head"><h2>冬季安全提醒</h2></div><div class="card"><ul class="line-list">'+
   ['Z165实际运行时刻、12月来古冰川开放与蓝冰情况、纳木措冬季开放均待核实。','普士拉山口与冰淇淋雪山准确位置、珠峰小镇住宿海拔、然乌湖住宿条件待核实。',
    '冬季道路结冰与交通管制随时变化，卡定沟等离开主路点位结冰则取消。','3000米以上睡眠海拔增幅尽量不超过500米；明显不适立即下降海拔并就医。',
    '保留临时休整日与取消高海拔景点的灵活性，不为维持20天行程强行赶路。'].map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div></div></section>';
}

/* ---------- 预计预算（规划数据） ---------- */
function budgetView(){
  var st=C.getStore(),paid=L.paidBudget(),total=P.budget();
  var rows=(window.BUDGET||[]).map(function(b){
    var q=st.budgetQty&&st.budgetQty[b.id]!=null?st.budgetQty[b.id]:b.qty;
    var p=st.budgetPrice&&st.budgetPrice[b.id]!=null?st.budgetPrice[b.id]:b.price;
    return {b:b,q:q,p:p,sub:Math.round(q)*Math.round(p*100)};
  });
  return '<section class="view"><div class="section-head"><h2>预计预算管理</h2><span class="eyebrow">Planning only</span></div>'+
   '<div class="limit-note">预计预算属于旅行规划，可随计划调整；实际消费来自独立旅行账本，两者独立存储、互不覆盖。</div>'+
   '<div class="grid stat-grid">'+[['预计总预算',C.money0(total)],['当前实际总支出',C.money0(L.totals().actual)],['预算剩余',C.money0(total-L.totals().actual)],
    ['已支付（手动登记）',C.money0(paid)],['人均参考',C.money0(total/Math.max(1,st.people))]].map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+'</div></div>'}).join('')+'</div>'+
   '<div class="card" style="margin-top:16px"><div class="field-row"><div class="field"><label>出行人数</label><input type="number" id="peopleInput" min="1" value="'+st.people+'"></div>'+
   '<div class="field"><label>已支付金额（元）</label><input type="number" id="paidBudgetInput" step="0.01" value="'+(paid/100).toFixed(2)+'"></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>预算明细</h2><button class="btn sm" data-action="save-budget">保存修改</button></div><div class="card"><div class="table-wrap"><table><thead><tr><th>费用类别</th><th>单位</th><th>数量</th><th>单价（元）</th><th class="num">小计</th></tr></thead><tbody>'+
   rows.map(function(r){return '<tr><td>'+esc(r.b.name)+'</td><td>'+esc(r.b.unit)+'</td><td><input type="number" min="0" style="width:76px" data-bq="'+esc(r.b.id)+'" value="'+r.q+'"></td>'+
    '<td><input type="number" min="0" step="0.01" style="width:96px" data-bp="'+esc(r.b.id)+'" value="'+r.p+'"></td><td class="num money">'+C.money(r.sub)+'</td></tr>'}).join('')+'</tbody></table></div></div></div></section>';
}

/* ---------- 清单 ---------- */
function packingView(){
  var done=C.getStore().packing||{};
  return '<section class="view"><div class="section-head"><h2>旅行准备清单</h2></div><p class="muted small">勾选状态自动保存在本机。</p>'+
   (window.PACKING||[]).map(function(g){var n=g.items.filter(function(it){return done[g.id+'::'+it]}).length;
     return '<div class="card check-group"><div class="between"><b>'+esc(g.group)+'</b><span class="chip '+(n===g.items.length?'onroute':'')+'">'+n+' / '+g.items.length+'</span></div>'+
      g.items.map(function(it){var k=g.id+'::'+it;return '<label class="check-item '+(done[k]?'done':'')+'"><input type="checkbox" data-check="'+esc(k)+'" '+(done[k]?'checked':'')+'><span>'+esc(it)+'</span></label>'}).join('')+'</div>'}).join('')+'</section>';
}

/* ---------- 我的 ---------- */
function mineView(days){
  var t=P.toggles(),fs=F.stats(days);
  var opts=[['chaka','茶卡盐湖','+1 天'],['glacier','然乌湖＋来古冰川','关闭 -2 天'],['midui','米堆冰川','仅在冰川支线开启时可选'],
    ['dingjie','定结雪山＋十万沙丘','关闭后仍为20天'],['namtso','纳木措','固定保留'],['songsongExtra','索松村额外住宿','+1 天'],['everestSafe','珠峰稳妥路线','+1 天']];
  return '<section class="view"><div class="section-head"><h2>我的 · 设置与数据</h2></div>'+
   '<div class="grid stat-grid">'+[['计划天数',days.length+' 天'],['已游玩',fs.visited+' 处'],['预计预算',C.money0(P.budget())],['实际支出',C.money0(L.totals().actual)]].map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+'</div></div>'}).join('')+'</div>'+
   '<div class="section"><div class="section-head"><h2>模块开关</h2></div><div class="card">'+opts.map(function(o){
     var dis=o[0]==='namtso'||(o[0]==='midui'&&!t.glacier);
     return '<div class="between" style="padding:9px 0;border-bottom:1px solid var(--line)"><div><b>'+esc(o[1])+'</b> <span class="tiny muted">'+esc(o[2])+'</span></div>'+
      '<label class="switch"><input type="checkbox" data-module-toggle="'+o[0]+'" '+(t[o[0]]?'checked':'')+' '+((dis)?'disabled':'')+'><span class="track"></span></label></div>'}).join('')+
     '<div class="between" style="padding-top:12px"><div><b>机动休整日</b><div class="muted small">当前 '+(t.flex||0)+' 天</div></div>'+
     '<div class="row"><input type="number" min="0" max="10" id="flexCount" value="'+(t.flex||0)+'" style="width:70px"><select id="flexPos" style="width:auto"><option value="0">最前面</option>'+days.map(function(d,i){return '<option value="'+(i+1)+'" '+(i===2?'selected':'')+'>'+d.day+' 之后</option>'}).join('')+'</select><button class="btn sm" data-action="apply-flex">应用</button></div></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>手机访问与实时同步</h2></div><div class="card">'+
   '<div class="kv-grid"><div class="kv"><b>当前访问地址</b><span style="font-size:12px;word-break:break-all">'+(typeof location!=='undefined'?esc(location.href):'—')+'</span></div>'+
   '<div class="kv"><b>同步状态</b><span id="syncStatus">'+(window.Sync?esc(window.Sync.status()):'本地模式')+'</span></div></div>'+
   '<p class="muted small" style="margin-top:10px">手机上打开同一地址即可使用。选择「局域网同步」后，多台手机在同一 WiFi 下会自动实时共享行程、足迹与账本；选择「Supabase」可跨网络同步；关闭则仅本机使用（多标签页仍即时刷新）。</p>'+
   '<div class="field-row"><div class="field"><label>同步方式</label><select id="syncMode">'+
   [['off','仅本机（多标签页即时刷新）'],['local','局域网同步服务（推荐，无需注册）'],['supabase','Supabase（跨网络）']]
    .map(function(x){return '<option value="'+x[0]+'" '+((window.Sync&&window.Sync.cfg().mode||'off')===x[0]?'selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></div>'+
   '<div class="field"><label>共享房间 ID（同一房间才互相同步）</label><input type="text" id="syncRoom" value="'+esc(window.Sync?window.Sync.cfg().room:'tibet-trip-2026')+'"></div></div>'+
   '<div class="field"><label>局域网同步地址（一般不用改；用 8766 端口打开本页时自动识别）</label><input type="text" id="syncLocalUrl" value="'+esc(window.Sync?window.Sync.cfg().localUrl:'')+'" placeholder="http://192.168.1.82:8766/api/sync"></div>'+
   '<div class="field-row"><div class="field"><label>Supabase Project URL（仅 supabase 模式）</label><input type="text" id="syncUrl" value="'+esc(window.Sync?window.Sync.cfg().url:'')+'" placeholder="https://xxxx.supabase.co"></div>'+
   '<div class="field"><label>anon public key（仅 supabase 模式）</label><input type="text" id="syncKey" value="'+esc(window.Sync?window.Sync.cfg().key:'')+'" placeholder="eyJ..."></div></div>'+
   '<div class="row"><button class="btn primary sm" data-action="save-sync">保存同步设置</button><button class="btn sm" data-action="sync-now">立即同步</button>'+
   '<button class="btn sm" data-action="copy-invite">复制邀请链接</button></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>数据管理</h2></div><div class="card"><div class="row">'+
   '<button class="btn" data-action="backup-json">备份全部数据 JSON</button><button class="btn" data-action="restore-json">恢复备份</button>'+
   '<button class="btn" data-action="export-itinerary">导出行程 Excel</button><button class="btn" data-action="export-ledger">导出账本 Excel</button>'+
   '<input type="file" id="restoreFile" accept="application/json" style="display:none"></div>'+
   '<div class="row" style="margin-top:14px"><button class="btn danger" data-action="reset-plan">恢复默认20天行程</button>'+
   '<span class="muted small">仅重置计划行程；旅行足迹与账本数据不会删除，操作前会二次确认。</span></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>功能边界</h2></div><div class="card"><ul class="line-list">'+
   ['账本为单人管理模式：数据保存在本机，不是多人实时同步；真正协作需后端与身份认证。','计划行程、旅行足迹、账本、预算、清单各自独立存储，不会级联删除。',
    '地图为路线示意图；行程强度只表示游览与赶路节奏，不代表健康风险等级。'].map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div></div></section>';
}

var Views={guide:priorityView,safety:safetyView,home:home,modules:modulesView,itinerary:itineraryView,footprint:footprintView,train:trainView,gallery:galleryView,
  map:mapView,altitude:altitudeView,budget:budgetView,packing:packingView,mine:mineView,mapSVG:mapSVG,dayCard:dayCard,moduleCard:moduleCard};
window.Views=Views;
})();
