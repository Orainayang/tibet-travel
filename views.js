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
var priorities=[['S','九寨沟','湖泊、冰瀑','重点游览'],['A','黄龙','彩池、雪景','冬季开放待确认'],['S','十万沙丘','雪山、沙丘','C方案保留'],['S','阿玛直米雪山','雪山','C方案保留'],['A','马卡鲁峰','雪山','C方案保留'],['S','来古冰川','蓝冰、冰川','重点游览'],['S','然乌湖','湖泊、雪山','重点游览'],['S','南迦巴瓦峰','雪山、日照金山','重点游览'],['S','纳木措','湖泊、雪山','固定保留'],['S','羊卓雍措','高山湖泊','固定保留'],['S','珠峰、加乌拉山口','雪山群','重点游览'],['A','巴松措','森林、湖泊','默认保留'],['A','青海湖','高原湖泊','默认保留'],['A','鲁朗林海','森林、雪山','默认保留'],['A','卡若拉冰川','冰川','顺路游览'],['B','古乡湖、雅尼湿地、佛掌沙丘','河谷、湿地','顺路游览'],['B','卡定沟、满拉水库','峡谷、湖泊','时间允许'],['B','普士拉山口、冰淇淋雪山、宗措湖','雪山、荒漠','定结可选']];
var rankColors={S:'#b45309',A:'#087f8c',B:'#64748b'};
function rankOf(name){var aliases={'索松村':'南迦巴瓦峰','鲁朗':'鲁朗林海','羊湖':'羊卓雍措','南迦巴瓦':'南迦巴瓦峰'};name=aliases[name]||name;return ['S','A','B'].find(function(l){return priorityRows().some(function(r){return r[0]===l&&String(r[1]).split(/[、，,]/).some(function(n){n=n.trim();return n&&name&&(name.includes(n)||n.includes(name))})})})||''}
function dayRank(d){var names=(d.spots||[]).map(s=>s.name);var route=d.route||'';return ['S','A','B'].find(l=>names.some(n=>rankOf(n)===l)||priorityRows().some(r=>r[0]===l&&String(r[1]).split(/[、，,]/).some(n=>n.trim()&&route.includes(n.trim()))))||''}
function rankBadge(l){return l?'<span style="display:inline-block;background:'+rankColors[l]+';color:white;border-radius:7px;padding:3px 9px;font-weight:700;font-size:12px;margin:0 6px">'+l+'</span>':''}
function priorityView(){var rows=priorityRows(),days=P.current(),text=days.map(d=>d.route+' '+d.spots.map(x=>x.name).join(' ')).join(' '); return '<section class="view"><h1>景点攻略</h1><p class="muted">优先级与地图、每日行程联动，修改后自动保存。</p>'+['S','A','B'].map(function(l){return '<div class="card" style="margin:16px 0;border-top:4px solid '+rankColors[l]+'"><h2>'+rankBadge(l)+({S:'核心优先游览',A:'默认保留',B:'弹性游览'}[l])+'</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:14px">'+rows.map(function(r,i){if(r[0]!==l)return '';if(P.scheme()!=='original'&&r[1]&&!String(r[1]).split(/[、，,]/).some(n=>text.includes(n.trim())||(n.includes('珠峰')&&text.includes('珠峰'))||(n==='南迦巴瓦峰'&&text.includes('索松村'))))return '';return '<div style="padding:14px;border:1px solid '+rankColors[l]+'55;border-radius:12px;background:'+rankColors[l]+'0b"><label>优先级 <select data-priority="'+i+',0">'+['S','A','B'].map(x=>'<option '+(x===l?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+r.slice(1).map((x,j)=>'<label style="display:block;margin-top:8px;font-size:12px">'+['景点','景观类型','游览原则'][j]+'<input style="width:100%;display:block" data-priority="'+i+','+(j+1)+'" value="'+esc(x)+'"></label>').join('')+'</div>'}).join('')+'</div></div>'}).join('')+'<div class="row"><button class="btn" data-priority-add>新增景点</button><button class="btn" data-priority-reset>恢复默认模板</button><button class="btn primary" data-nav="gallery">景点参考图库</button></div></section>'}
function driveHours(d){var m=String(d.drivingRaw||'').match(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*h/i)||String(d.drivingRaw||'').match(/(\d+(?:\.\d+)?)\s*h/i);return m?Number(m[2]||m[1]):0}
function safetyView(days){var risks=[['拉萨—鲁朗','冰雪山口','无法安全抵达时住林芝'],['然乌湖、来古冰川','往返可能超过9小时','启用机动日，不赶夜路'],['索松村','日落前抵达不确定','湿地、大峡谷可顺延'],['纳木措','高海拔、临时闭园','优先顺延；身体不适不前往'],['珠峰','接驳及游览时间不足','次日上午补游，必要时取消定结'],['定结','连续高海拔住宿','身体不适则取消并下撤'],['定结—拉萨','长途驾驶','必要时临时中转']];return altitudeView(days).replace('</section>','')+panel('住宿海拔汇总',table(['日期','住宿','海拔'],days.filter(function(d){return d.lodging&&d.lodging!=='—'}).map(function(d){return [d.day+' '+d.date,d.lodging,d.lodgingAlt?d.lodgingAlt+'m':'动态 / 待确认']})))+panel('每日驾驶强度',days.filter(d=>driveHours(d)>0).map(function(d){var h=driveHours(d);return '<div style="margin:12px 0"><div class="between"><b>'+esc(d.day+' '+d.route)+'</b><span>'+h+'h 上限</span></div><div style="height:8px;background:#e5e7eb;border-radius:8px"><div style="height:8px;border-radius:8px;width:'+Math.min(100,h*10)+'%;background:'+(h>9?'#c65b43':h>5?'#b68b40':'#438c80')+'"></div></div></div>'}).join('')+'<p class="muted small">仅统计可解析的驾驶时长，不含游览；超过9小时优先调整。</p>')+panel('风险及备用方案',table(['路段','主要问题','备用方案'],risks.filter(r=>{var t=days.map(d=>d.route).join(' ');return r[0]==='拉萨—鲁朗'?t.includes('鲁朗'):r[0].split('、').some(n=>t.includes(n))}).concat(P.scheme()==='original'?[]:[['拉萨初抵','高原适应','休整两晚；不适不翻山'],['D15','是否继续珠峰','身体不适不继续上升']])))+'<div class="row"><button class="btn" data-nav="packing">旅行准备清单</button><button class="btn" data-nav="modules">行程模块与机动日</button></div></section>'}
function priorityRows(){try{var saved=JSON.parse(localStorage.getItem('tibet.priority.v1'));if(!saved)return priorities.map(r=>r.slice());if(!saved.some(r=>r[1]==='阿玛直米雪山')){saved=saved.map(r=>r[1]&&r[1].includes('十万沙丘')?[r[0],r[1].replace('、十万沙丘',''),r[2],r[3]]:r);saved=priorities.slice(0,5).concat(saved);localStorage.setItem('tibet.priority.v1',JSON.stringify(saved))}return saved}catch(e){return priorities.map(r=>r.slice())}}
document.addEventListener('change',function(e){var k=e.target.getAttribute('data-priority');if(k){var a=k.split(','),r=priorityRows();r[a[0]][a[1]]=e.target.value;localStorage.setItem('tibet.priority.v1',JSON.stringify(r));if(a[1]==='0')document.getElementById('main').innerHTML=priorityView()}});
document.addEventListener('click',function(e){if(e.target.closest('[data-priority-add]')){var r=priorityRows();r.push(['B','','','']);localStorage.setItem('tibet.priority.v1',JSON.stringify(r));document.getElementById('main').innerHTML=priorityView()}if(e.target.closest('[data-priority-reset]')&&confirm('恢复默认优先级模板？')){localStorage.removeItem('tibet.priority.v1');document.getElementById('main').innerHTML=priorityView()}});
function schemePanel(){return '<div class="card" style="margin:12px 0;border-top:4px solid #087f8c;padding:18px"><b>旅行方案</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px;margin-top:12px">'+[['original','A - 青藏线版本'],['3a','B · 四川＋西藏17天精华版'],['3b','C · 四川＋西藏20天完整版']].map(function(x){return '<button class="btn '+(P.scheme()===x[0]?'primary':'')+'" style="min-height:58px;white-space:normal;border-radius:12px" data-scheme="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div><p class="muted small">各方案独立保存行程编辑；账本与景点足迹共用。D15（12月24日）可选择是否继续珠峰。</p></div>'}
document.addEventListener('click',function(e){var b=e.target.closest('[data-scheme]');if(b){P.selectScheme(b.dataset.scheme);App.state.query='';App.state.filter='全部';App.state.openDays={};App.state.mapMode='plan';App.render()}});
function realMap(days){var links=days.map(function(d){var names=d.route.split('—').filter(Boolean);if(names.length<2||/飞机|铁路/.test(d.drivingRaw)||/休整/.test(d.route))return '';var url='https://uri.amap.com/navigation?from='+encodeURIComponent(names[0])+'&to='+encodeURIComponent(names[names.length-1])+'&mode=car&callnative=1';return '<div style="margin:8px 0"><b>'+esc(d.day+' '+d.route)+'</b> <a target="_blank" rel="noopener" href="https://www.amap.com/search?query='+encodeURIComponent(names.join(' '))+'">高德地图搜索</a> · <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/search?query='+encodeURIComponent(names[1])+'">地理位置</a></div>'}).join('');return '<div class="card" style="margin:12px 0"><b>真实地理底图（在线）</b><iframe title="西藏真实地图" loading="lazy" style="width:100%;height:340px;border:0" src="https://www.openstreetmap.org/export/embed.html?bbox='+ (P.scheme()==='original'?'84%2C26%2C103%2C38':'85%2C26%2C106%2C35') +'&amp;layer=mapnik"></iframe><p class="muted small">© OpenStreetMap contributors。在线底图不含已核验的逐段道路轨迹；下方可打开地图查询，离线请查看原路线示意及行程表。</p><details><summary>每日地图查询</summary>'+links+'</details></div>'}
/* ---------- 首页 ---------- */
function home(days){
  var st=C.getStore(),fs=F.stats(days),budget=P.budget(),actual=L.totals().actual;
  var left=C.daysBetween(C.today(),P.getDeparture());
  var hero=C.photos('namtso')[0]||C.photos('yamdrok')[0]||C.photos('namcha')[0]||{file:'',title:'',author:'',license:''};
  var altData=days.map(function(d){return {label:d.day,v1:C.alt(d.lodgingAlt),v2:estimateMaxAlt(d)}});
  var stats=[['当前计划总天数',days.length,'天','可自由调整'],['景点完成进度',fs.inPlanVisited+' / '+fs.inPlan,'处',fs.progress+'%'],
    ['实际旅行支出',C.money0(actual),'','独立账本'],
    ['出发日期',C.dateCN(P.getDeparture()),'',C.weekday(P.getDeparture())],['核心景点',P.coreSpotCount(),'处','优先保留'],
    ['预计住宿晚数',P.nights(),'晚',''],['预计总里程',P.km(),'km','估算']];
  return '<section class="view" id="view-home">'+
   '<div class="hero">'+(hero.file?'<img class="hero-img" src="'+esc(hero.file)+'" alt="西藏雪山与高山湖泊">':'')+'<div class="hero-shade"></div>'+
   '<div class="hero-body"><div class="hero-kicker">WINTER TIBET · DECEMBER</div><h1>一路向西 · 我的西藏冬季旅行</h1>'+
   '<p class="subtitle">'+(P.scheme()==='original'?'从青海湖到喜马拉雅':'从黄龙九寨到拉萨，沿藏东南探索雪山湖泊')+'，在雪山、冰川与高原湖泊之间旅行</p>'+
   '<div class="row" style="margin-top:20px"><span class="chip core">'+(P.scheme()==='original'?'A · 青藏线':P.scheme()==='3a'?'B · 精华17天':'C · 完整20天')+'</span><span class="chip">'+(P.scheme()==='original'?'Z165 青藏铁路':'成都飞拉萨')+'</span><span class="chip">雪山 · 冰川 · 湖泊</span><span class="chip">'+days.length+' 天当前计划</span></div></div>'+
   (hero.file?'<div class="hero-photo-credit">'+esc(hero.title+' / '+hero.author+' / '+hero.license)+'</div>':'')+'</div>'+
   schemePanel()+'<div class="card" style="margin-top:16px"><div class="between"><div><b>距离出发</b><div class="muted small">修改日期后，计划行程日期自动顺延；实际消费日期不受影响</div></div>'+
   '<div class="row"><div class="countdown">'+(left>=0?'还有 <b>'+left+'</b> 天':'已出发 <b>'+Math.abs(left)+'</b> 天')+'</div>'+
   '<input type="date" id="departureInput" value="'+esc(P.getDeparture())+'" style="width:150px"><button class="btn primary" data-action="save-departure">更新</button></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>行程概览</h2><span class="eyebrow">Overview</span></div>'+
   '<div class="grid stat-grid">'+stats.map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+esc(s[1])+' <small>'+esc(s[2])+'</small></div><div class="hint">'+esc(s[3])+'</div></div>'}).join('')+'</div></div>'+
   overview(days)+'<div class="section"><div class="section-head"><h2>整体路线地图</h2><button class="btn sm" data-nav="map">打开地图 →</button></div>'+mapSVG(days)+'</div>'+
   '<div class="section"><div class="section-head"><h2>快捷入口</h2></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">'+
   [['itinerary','🗓','每日行程与自由编辑'],['footprint','👣','旅行足迹与已完成景点'],['guide','◇','景点优先级与攻略'],['safety','△','海拔、驾驶与安全'],...(P.scheme()==='original'?[['train','🚄','Z165 青藏铁路观景']]:[]),['packing','✅','旅行准备清单'],['mine','☰','我的设置与数据备份'],['ledger','¥','旅行账本'],['ledger','📒','独立旅行账本']]
   .map(function(x){return '<button class="card" style="text-align:left;cursor:pointer" data-nav="'+x[0]+'"><div style="font-size:24px">'+x[1]+'</div><b>'+x[2]+'</b></button>'}).join('')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>旅行模块</h2><button class="btn sm" data-nav="modules">查看更多 →</button></div>'+
   '<div class="grid module-grid">'+(window.MODULES||[]).slice(0,4).map(function(m){return moduleCard(m,days)}).join('')+'</div></div>'+
   '<div class="section"><div class="section-head"><h2>出发前必须核实</h2></div><div class="card"><ul class="line-list">'+
   [P.scheme()==='original'?'Z165 列车时刻以12306为准。':'核实黄龙九寨高铁、接驳、冬季开放及返程航班。','12月来古冰川开放情况、蓝冰形成情况需提前核实。','纳木措冬季开放、普士拉山口与冰淇淋雪山准确位置待核实。','珠峰小镇实际住宿海拔、然乌湖高海拔住宿条件待核实。',
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
  var t=P.toggles();if(P.scheme()!=='original')extra=extra.filter(x=>x[1]==='dingjie'&&P.scheme()==='3b');
  return '<section class="view"><div class="section-head"><h2>旅行模块</h2><span class="eyebrow">Modules</span></div>'+
   '<p class="muted small">关闭支线后前后路线会重新衔接，并自动重排天数与日期。</p>'+
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
  if(Object.prototype.hasOwnProperty.call(d,'maxAltitude'))return d.maxAltitude;
  var route=String(d.route||''), names=route+' '+(d.spots||[]).map(s=>s.name).join(' '), a=C.alt(d.lodgingAlt)||0;
  if(/返程/.test(route)&&!a)return null;
  var rules=[[/青藏铁路|Z165|唐古拉山区域/,5072],[/青海湖|日月山/,3520],[/色季拉|鲁朗/,4728],[/来古/,4300],[/然乌/,3850],[/纳木措/,5190],[/卡若拉/,5036],[/加乌拉/,5210],[/珠峰大本营/,5200],[/普士拉/,4900],[/巴松措/,3480],[/索松村|雅尼湿地/,3000]];
  if(/波密|索松村/.test(route)&&/鲁朗/.test(route)&&!/拉萨/.test(route)&&!/索松村/.test(route))rules=rules.filter(r=>r[1]!==4728);
  return Math.max(a,...rules.filter(r=>r[0].test(names)).map(r=>r[1]))||null;
}
function altitudeBars(data){
  var w=Math.max(760,72+data.length*76),h=340,base=292,top=30,max=Math.max(6000,...data.map(d=>Math.max(d.v1||0,d.v2||0))),scale=(base-top)/max;
  var svg='<svg role="img" aria-label="每日住宿与最高游览海拔对比" viewBox="0 0 '+w+' '+h+'" style="width:100%;min-width:'+w+'px;display:block">';
  for(var v=0;v<=max;v+=1000){var y=base-v*scale;svg+='<line x1="48" x2="'+(w-12)+'" y1="'+y+'" y2="'+y+'" stroke="#cbd5e1" stroke-dasharray="3 4"/><text x="42" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#64748b">'+v+'</text>'}
  data.forEach(function(d,i){var x=52+i*76;[[d.v1,'#087f8c'],[d.v2,'#b45309']].forEach(function(pair,j){var val=pair[0],bx=x+j*32;if(!val){svg+='<text x="'+(bx+14)+'" y="'+(base-5)+'" text-anchor="middle" font-size="10" fill="#64748b">—</text>';return}var y=base-val*scale;svg+='<rect x="'+bx+'" y="'+y+'" width="28" height="'+(base-y)+'" rx="3" fill="'+pair[1]+'"/><text x="'+(bx+14)+'" y="'+(y-6)+'" text-anchor="middle" font-size="10" font-weight="600" fill="'+pair[1]+'">'+val+'</text>'});svg+='<text x="'+(x+30)+'" y="'+(base+20)+'" text-anchor="middle" font-size="12" fill="#475569">'+esc(d.day)+'</text>'});
  return '<div style="display:flex;gap:18px;flex-wrap:wrap;margin:12px 0"><span style="color:#087f8c">■ 住宿海拔</span><span style="color:#b45309">■ 当日最高海拔（估算）</span><span>单位：m</span></div><div style="overflow-x:auto">'+svg+'</svg></div><p class="muted small">可横向滑动查看全部日期；— 表示无固定住宿或数据待确认。最高海拔含途经山口及铁路，均为规划估算，非实测。</p>';
}
function dayCard(d,days){
  var rec=C.getStore().records||{};
  var mine=rec[d.day]||{};
  return '<article class="day-card" id="day-'+d.day+'" data-day="'+d.day+'" draggable="true" data-drag-day="'+d.day+'">'+
   '<div class="day-head" data-action="toggle-day" data-day="'+d.day+'"><div class="day-badge">'+d.day+'</div><div class="day-head-main">'+
   '<h3>'+esc(d.route||'当日行程')+rankBadge(dayRank(d))+'</h3><div class="day-route">'+esc(d.date)+' · '+esc(d.week||C.weekday(d.date))+' · '+esc(d.lodging||'—')+' · '+esc(C.alt(d.lodgingAlt)?C.alt(d.lodgingAlt)+'m':(d.lodging==='火车'?'动态海拔':'—'))+' · '+esc((String(d.drivingRaw||'').match(/\d+(?:\.\d+)?\s*(?:[–—-]\s*\d+(?:\.\d+)?\s*)?h/i)||[])[0]||'—')+'</div>'+
   '<div class="day-meta"><span class="chip">'+esc(d.moduleKey||'主线')+'</span><span class="chip">'+d.spots.length+' 景点</span>'+
   (mine.done?'<span class="chip onroute">已完成</span>':'')+'</div></div><span class="muted small">'+(window.App&&App.isOpen(d.day)?'收起 ↑':'展开 ↓')+'</span></div>'+
   '<div class="day-body '+((window.App&&App.isOpen(d.day))?'':'hidden')+'" data-body="'+d.day+'">'+
   (P.scheme()!=='original'&&d.day==='D15'?'<div class="note-box"><b>D15 分流决策：羊湖后返回拉萨或继续珠峰</b>'+schemePanel()+'</div>':'')+'<div class="block"><div class="block-title">自由编辑本日</div><div class="field-row">'+
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
    if(filter==='核心景点'&&dayRank(d)!=='S')return false;
    if(filter==='含未完成'&&d.spots.some(function(s){return F.get(s.id)&&F.get(s.id).status==='visited'}))return false;
    if(!q)return true;
    return (d.day+' '+d.route+' '+d.spots.map(function(s){return s.name+' '+(s.description||'')}).join(' ')).toLowerCase().indexOf(q.toLowerCase())>=0;
  });
  return '<section class="view"><div class="between"><div><div class="eyebrow" style="color:var(--lake)">Day by day</div><h2 style="font-size:22px">行程 · 当前 '+days.length+' 天</h2></div>'+
   '<div class="row"><button class="btn sm" data-action="add-day">＋ 新增一天</button><button class="btn sm" data-action="add-rest-day">＋ 休整日</button>'+
   '<button class="btn sm" data-action="export-itinerary">导出 Excel</button><button class="btn sm" onclick="window.print()">打印 / PDF</button></div></div>'+
   schemePanel()+'<div class="card" style="margin-top:14px"><div class="field-row">'+
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
  var G=Object.assign({},C.GEO,{'成都':[104.07,30.67],'黄龙景区':[103.83,32.75],'九寨沟':[103.92,33.26],'巴松措':[93.92,30.02],'南迦巴瓦峰':[95.06,29.63],'加乌拉山口':[86.83,28.52],'古乡湖':[95.48,29.91],'雅尼湿地':[94.52,29.39],'满拉水库':[89.80,28.90]}),keys=Object.keys(G),pts={};keys.forEach(function(k){pts[k]=P.scheme()==='original'?C.project(G[k][0],G[k][1]):{x:50+(G[k][0]-85)/21*880,y:34+(38-G[k][1])/12*540}});
  var land='<path d="M60 120 L200 96 L330 110 L470 86 L610 112 L760 92 L890 130 L900 240 L830 330 L740 420 L610 500 L470 540 L330 520 L200 470 L90 390 L60 260 Z" fill="#e9f0f2" stroke="#d3e0e5"/>';
  var grid='';for(var x=100;x<900;x+=100)grid+='<line x1="'+x+'" y1="34" x2="'+x+'" y2="574" stroke="#e4ebee"/>';
  for(var y=80;y<580;y+=80)grid+='<line x1="50" y1="'+y+'" x2="930" y2="'+y+'" stroke="#e4ebee"/>';
  // 计划地图随当前行程变化：仅绘制当前计划中出现的点位
  var active={},railway=['西宁','格尔木','昆仑山·玉珠峰','可可西里·沱沱河','唐古拉山','错那湖','那曲','当雄','拉萨'];
  if(P.scheme()==='original')railway.forEach(function(k){active[k]=1});
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
    routes=(days||[]).map(function(d){var route=String(d.route||'').replace(/羊湖/g,'羊卓雍措').replace(/大峡谷/g,'雅鲁藏布大峡谷');var seq=route.split('—').map(function(n){return keys.find(k=>n===k)||keys.filter(k=>n.includes(k)).sort((a,b)=>b.length-a.length)[0]}).filter(Boolean);return path(seq,'#347f99',/飞机|铁路|Z165/.test(d.drivingRaw+' '+route))}).join('');if(P.scheme()==='original')routes+=path(railway,'#7b8794',true);
  }
  var marks=keys.filter(function(k){return mode==='actual'||active[k]}).map(function(k){
    var p=pts[k],actual=mode==='actual'&&F.visited().some(function(x){return x.name===k});
    var rank=rankOf(k);var c=rank?rankColors[rank]:actual?'#2f7d5b':(k.indexOf('铁路')>=0||k==='格尔木'?'#7b8794':'#2b6f92');
    return '<g class="map-marker" data-action="map-marker" data-place="'+esc(k)+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(rank==='S'?9:rank?7:actual?7:5.5)+'" fill="'+c+'"/><text class="map-label" x="'+(p.x+8)+'" y="'+(p.y+4)+'">'+esc(k)+(rank?' · '+rank:'')+'</text></g>';
  }).join('');
  return (mode==='actual'?'':realMap(days))+'<div class="map-shell"><svg class="map-svg" viewBox="0 0 980 610"><rect width="980" height="610" fill="#f5f9fa"/>'+grid+land+routes+marks+
   '<text x="62" y="52" font-size="13" fill="#6b7280">'+(mode==='actual'?'实际旅行足迹':'路线示意图 · 非导航地图')+' · 坐标线性投影，仅供理解顺序</text></svg>'+
   '<div class="row" style="padding:10px">'+rankBadge('S')+'核心优先 '+rankBadge('A')+'默认保留 '+rankBadge('B')+'弹性游览</div><div class="map-note">当前未配置地图 API Key，使用明确标注的路线示意图，不提供也不伪造实时导航距离与车程。</div></div>';
}
function mapView(days){var mode=window.App&&App.state.mapMode||'plan';
  return '<section class="view"><div class="section-head"><h2>旅行地图</h2><div class="row"><button class="btn sm '+(mode==='plan'?'primary':'')+'" data-action="map-mode" data-mode="plan">计划路线</button><button class="btn sm '+(mode==='actual'?'primary':'')+'" data-action="map-mode" data-mode="actual">实际足迹</button></div></div>'+mapSVG(days,mode)+'</section>'}

/* ---------- 海拔安全 ---------- */
function altitudeView(days){
  var marks=P.scheme()==='original'?{'D4':'铁路唐古拉山区域'}:{};
  days.forEach(function(d){var n=d.spots.map(function(s){return s.name}).join('');
    if(/然乌/.test(n))marks[d.day]='然乌湖游览';if(/卡若拉/.test(n))marks[d.day]='卡若拉冰川';
    if(/加乌拉|珠峰/.test(n))marks[d.day]='加乌拉 / 珠峰';if(/纳木措/.test(n))marks[d.day]='纳木措 4718m';});
  var data=days.map(function(d){return {label:d.day,day:d.day,v1:C.alt(d.lodgingAlt),v2:estimateMaxAlt(d)}});
  return '<section class="view"><div class="section-head"><h2>海拔与安全</h2></div><div class="limit-note"><b>说明：</b>对比住宿海拔与当日最高海拔，部分为估算，不构成个人安全判断。</div>'+
   '<div class="chart-box">'+altitudeBars(data)+'</div>'+
   '<div class="section"><div class="section-head"><h2>冬季安全提醒</h2></div><div class="card"><ul class="line-list">'+
   [(P.scheme()==='original'?'Z165实际运行时刻':'黄龙九寨高铁班次、索道开放')+'、12月来古冰川开放与蓝冰情况、纳木措冬季开放均待核实。','普士拉山口与冰淇淋雪山准确位置、珠峰小镇住宿海拔、然乌湖住宿条件待核实。',
    '冬季道路结冰与交通管制随时变化，卡定沟等离开主路点位结冰则取消。','3000米以上睡眠海拔增幅尽量不超过500米；明显不适立即下降海拔并就医。',
    '保留临时休整日与取消高海拔景点的灵活性，不为维持固定天数强行赶路。'].map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div></div></section>';
}

/* ---------- 预计预算（规划数据） ---------- */
function budgetView(){return window.LedgerViews.ledgerHome(P.current());}

function packingView(){
 var done=C.getStore().packing||{},sc=P.scheme(),groups=(window.PACKING38||[]).map(g=>({id:g.id,group:g.group,items:g.items.filter(i=>i.scope==='all'||i.scope.includes(sc==='original'?'a':sc==='3a'?'b':'c'))}));
 var all=groups.flatMap(g=>g.items.map(i=>({i:i,k:g.id+'::'+i.name}))),n=all.filter(x=>done[x.k]).length,required=all.filter(x=>x.i.level==='必备'),rn=required.filter(x=>done[x.k]).length;
 return '<section class="view pack38"><div class="packhero"><small>WINTER TRAVEL · PREPARATION</small><h2>出发准备清单</h2><p>按当前方案显示 · 勾选自动保存 · 数量为建议，可按洗衣条件调整</p><div class="packstats"><div><strong id="packTotal">'+n+' / '+all.length+'</strong><small>全部事项</small></div><div><strong id="packRequired">'+rn+' / '+required.length+'</strong><small>必备事项</small></div></div><progress id="packProgress" max="'+all.length+'" value="'+n+'"></progress></div>'+schemePanel()+'<div class="packtools"><label><input type="checkbox" id="packPending"> 只看未完成</label><span>必备优先 · 推荐按需补充</span></div>'+groups.map(g=>'<div class="card check-group packgroup"><div class="between"><b>'+esc(g.group)+'</b><span class="chip packcount">'+g.items.filter(i=>done[g.id+'::'+i.name]).length+' / '+g.items.length+'</span></div>'+g.items.map(i=>{var k=g.id+'::'+i.name;return '<label class="check-item packitem '+(done[k]?'done':'')+'"><input type="checkbox" data-check="'+esc(k)+'" data-level="'+i.level+'" '+(done[k]?'checked':'')+'><span><b>'+esc(i.name)+'</b><small>'+esc(i.note)+'</small></span><em class="packlevel '+(i.level==='必备'?'essential':'')+'">'+i.level+'</em></label>'}).join('')+'</div>').join('')+'</section>';
}
/* ---------- 我的 ---------- */
function mineView(days){
  var t=P.toggles(),fs=F.stats(days);
  var opts=[['chaka','茶卡盐湖','+1 天'],['glacier','然乌湖＋来古冰川','关闭 -2 天'],['midui','米堆冰川','仅在冰川支线开启时可选'],
    ['dingjie','定结雪山＋十万沙丘','关闭后总天数不变'],['namtso','纳木措','固定保留'],['songsongExtra','索松村额外住宿','+1 天'],['everestSafe','珠峰稳妥路线','+1 天']];
  if(P.scheme()!=='original')opts=opts.filter(x=>x[0]==='dingjie'&&P.scheme()==='3b');
  return '<section class="view"><div class="section-head"><h2>我的 · 设置与数据</h2></div>'+
   '<div class="grid stat-grid">'+[['计划天数',days.length+' 天'],['已游玩',fs.visited+' 处'],['实际支出',C.money0(L.totals().actual)]].map(function(s){return '<div class="stat"><div class="label">'+s[0]+'</div><div class="value">'+s[1]+'</div></div>'}).join('')+'</div>'+
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
   '<div class="row" style="margin-top:14px"><button class="btn danger" data-action="reset-plan">恢复当前方案默认行程</button>'+
   '<span class="muted small">仅重置计划行程；旅行足迹与账本数据不会删除，操作前会二次确认。</span></div></div></div>'+
   '<div class="section"><div class="section-head"><h2>功能边界</h2></div><div class="card"><ul class="line-list">'+
   ['账本为单人管理模式：数据保存在本机，不是多人实时同步；真正协作需后端与身份认证。','计划行程、旅行足迹、账本、预算、清单各自独立存储，不会级联删除。',
    '地图为路线示意图；行程强度只表示游览与赶路节奏，不代表健康风险等级。'].map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div></div></section>';
}

var Views={schemePanel:schemePanel,guide:priorityView,safety:safetyView,home:home,modules:modulesView,itinerary:itineraryView,footprint:footprintView,train:trainView,gallery:galleryView,
  map:mapView,altitude:altitudeView,budget:budgetView,packing:packingView,mine:mineView,mapSVG:mapSVG,dayCard:dayCard,moduleCard:moduleCard};
window.Views=Views;
})();
