/* plan.js — 可自由编辑的计划行程（与足迹、账本完全分离） */
(function(){
'use strict';
var C=window.Core,Store=window.Store,esc=C.esc;
var BASE=(window.PLAN20||[]);
var DEFAULT_TOGGLES={chaka:false,glacier:true,midui:false,dingjie:true,namtso:true,songsongExtra:false,everestSafe:false};
var PK='plan.v2.';
function clone(o){return JSON.parse(JSON.stringify(o))}
function scheme(){return Store.get(PK+'scheme','original')}
function get(k,def){return Store.get(PK+(scheme()==='original'||k==='departure'?'':scheme()+'.')+k,def)}
function set(k,v){return Store.set(PK+(scheme()==='original'||k==='departure'?'':scheme()+'.')+k,v)}
function selectScheme(v){if(!['original','3a','3b'].includes(v))return current();Store.set(PK+'scheme',v);return current()}
function newDay(route,lodging,alt,slots,notes){return {moduleKey:'flight3',route:route,lodging:lodging,lodgingAlt:alt,drivingRaw:'飞机',intensity:'低',spots:[],slots:{morning:[slots],noon:[],afternoon:[],evening:['休息']},notes:notes,alternatives:['身体不适时减少活动']}}
function route3(){var a=[newDay('杭州—成都','成都','500','按航班时间出发',['航班待确认']),newDay('成都—林芝','林芝','2900','抵达后入住休息',['初次进藏，避免剧烈活动']),newDay('林芝休整—尼洋河周边','林芝','2900','自然醒，视身体状态轻度散步',['持续不适不继续上升'])];a[2].drivingRaw='市区交通';a=a.concat(clone(BASE.slice(7,16)));a[3].route='林芝—色季拉山口—鲁朗';a[3].drivingRaw='70–90km / 2–3h';a[3].slots={morning:['身体适应良好再出发'],noon:['色季拉山口短暂停留'],afternoon:['鲁朗林海、鲁朗小镇'],evening:['入住鲁朗']};a[3].notes=['色季拉山口约4728m；不适则留林芝'];a[3].alternatives=['必要时增加林芝休整日'];a[9].route='拉萨休整—布达拉宫—大昭寺—八廓街';a[9].spots=clone(BASE[4].spots.concat(BASE[6].spots.slice(0,1)));a[9].slots={morning:['休息，视体力看布达拉宫'],noon:['休息'],afternoon:['八廓街、大昭寺外观'],evening:['早点休息']};a[11].route='拉萨—羊卓雍措—卡若拉冰川—满拉水库—日喀则';if(scheme()==='3a'){a[11].route='拉萨—羊卓雍措—卡若拉冰川—拉萨';a[11].lodging='拉萨';a[11].lodgingAlt='3650';a[11].drivingRaw='300–350km / 6–8h';a[11].spots=a[11].spots.slice(0,2);a[11].slots={morning:['羊卓雍措'],noon:['途中休息'],afternoon:['卡若拉冰川，返回拉萨'],evening:['拉萨休息']};a[11].alternatives=['身体不适则取消高海拔活动'];}else a=a.concat(clone(BASE.slice(16,19)));a[11].notes=(a[11].notes||[]).concat(['D12分流：根据身体、天气、道路和疲劳情况决定是否继续珠峰；不适不继续上升。']);var end=clone(BASE[19]);end.route='拉萨—杭州返程';end.drivingRaw='飞机';end.slots={morning:['按航班时间返程'],noon:[],afternoon:[],evening:[]};a.push(end);return a}

function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function sid(name){var n=0;for(var i=0;i<name.length;i++)n=(n*131+name.charCodeAt(i))%100000007;return 's'+('00000000'+n.toString(16)).slice(-8)}

function defaultDays(){
  var arr=scheme()==='original'?clone(BASE):route3();
  var tg=get('toggles',clone(DEFAULT_TOGGLES));
  // 默认模块修正：按开关重新应用一次（开关状态与默认行程一致时无副作用）
  arr=scheme()==='original'?applyToggles(arr,tg):applySingle(arr,'dingjie',tg.dingjie);
  return renumber(arr);
}
function toggles(){var t=get('toggles',null);if(!t){t=clone(DEFAULT_TOGGLES);set('toggles',t)}return Object.assign(clone(DEFAULT_TOGGLES),t,{flex:get('flex',0)})}
function setToggle(key,val){
  if(scheme()!=='original'&&key!=='dingjie'&&key!=='flex')return current();var t=toggles();if(key==='flex')set('flex',Math.max(0,C.num(val)));else t[key]=key==='namtso'?true:!!val;
  set('toggles',t);
  var arr=current();arr=applySingle(arr,key,t[key]);set('days',renumber(arr));
  return current();
}
function current(){
  var arr=get('days',null);
  if(get('revision',0)!==20261125){if(Array.isArray(arr))set('backupBeforeFinal20',arr);set('revision',20261125);set('toggles',clone(DEFAULT_TOGGLES));arr=null;}
  if(!Array.isArray(arr)||!arr.length){arr=defaultDays();set('days',arr)}
  return renumber(clone(arr));
}
function save(arr){set('days',renumber(clone(arr)));return current()}
function renumber(arr){
  var dep=get('departure','2026-12-15');
  arr.forEach(function(d,i){d.index=i+1;d.day='D'+(i+1);d.date=C.dateAdd(dep,i);
    if(!d.slots)d.slots={morning:[],noon:[],afternoon:[],evening:[]};
    d.spots=(d.spots||[]).map(function(s){if(!s.id)s.id=sid(s.name);return s});
    if(!d.notes)d.notes=[];if(!d.alternatives)d.alternatives=[];
  });
  return arr;
}
function reset(){
  set('days',null);set('toggles',clone(DEFAULT_TOGGLES));set('flex',0);
  return current();
}
function byDayCode(code){return current().find(function(d){return d.day===code})}

/* ---------- 模块变换（顺序敏感，逐项应用） ---------- */
function applyToggles(arr,t){
  var order=['glacier','chaka','dingjie','namtso','songsongExtra','everestSafe','midui'];
  order.forEach(function(k){arr=applySingle(arr,k,!!t[k])});
  return arr;
}
function findIdx(arr,pred){for(var i=0;i<arr.length;i++)if(pred(arr[i]))return i;return -1}
function insertDefault(arr,defaultIdx,beforePred){
  var src=BASE[defaultIdx-1];if(!src)return arr;
  var i=findIdx(arr,beforePred);if(i<0)i=arr.length;
  arr.splice(i,0,clone(src));return arr;
}
function applySingle(arr,key,on){
  if(key==='glacier'){
    if(!on){
      arr=arr.filter(function(d){return d.moduleKey!=='glacier'});
      var i=findIdx(arr,function(d){return d.moduleKey==='southeast'&&/索松村/.test(d.route)});
      if(i>=0){arr[i].route='鲁朗—雅尼湿地—雅鲁藏布大峡谷—索松村';
        arr[i].alternatives=(arr[i].alternatives||[]).concat(['已关闭然乌湖与来古冰川支线，鲁朗直达索松村。']);}
    }else if(!arr.some(function(d){return d.moduleKey==='glacier'})){
      var j=findIdx(arr,function(d){return d.moduleKey==='southeast'});
      if(j<0)j=arr.length;
      [9,10].forEach(function(n,k){arr.splice(j+k,0,clone(BASE[n-1]))});
      // 恢复因关闭支线而被改写的索松村日路线
      arr.forEach(function(d){if(d.moduleKey==='southeast'&&/索松村/.test(d.route)){
        d.route=BASE[10].route;
        d.alternatives=(d.alternatives||[]).filter(function(a){return !/关闭然乌湖与来古冰川支线/.test(a)});
      }});
    }
  }
  if(key==='chaka'){
    if(on&&!arr.some(function(d){return d.moduleKey==='chaka'})){
      var q=findIdx(arr,function(d){return /青海湖/.test(d.route)});
      if(q>=0){arr[q].lodging='茶卡';arr[q].lodgingAlt='3100（估算）';
        arr[q].notes=(arr[q].notes||[]).concat(['茶卡住宿约3100m，注意睡眠海拔变化']);
        var extra={moduleKey:'chaka',route:'茶卡—西宁',intensity:'中',
          lodging:'西宁',lodgingAlt:'2260',drivingRaw:'约300km / 5–6h估算',
          spots:[{id:sid('茶卡盐湖'),name:'茶卡盐湖',category:'高山湖泊',tags:['可选景点','冬季待确认'],imageKey:'chaka',visitTime:'2–3小时',onRoute:false,worth:false,description:'柴达木盆地边缘的盐湖，冬季开放与镜面效果均需提前确认。',highlights:['盐湖雪景','镜面不保证'],detail:'冬季开放、镜面不保证；住宿约3100m'}],
          slots:{morning:['09:00–12:00 茶卡盐湖'],noon:['12:00–15:00 返回西宁'],afternoon:['下午整理行李、休息'],evening:['早点休息，准备夜间火车']},
          notes:['冬季开放需核实','镜面效果不保证'],alternatives:['冬季封闭则直接返回西宁']};
        arr.splice(q+1,0,extra);}
    }
    if(!on){
      arr=arr.filter(function(d){return d.moduleKey!=='chaka'});
      var b=BASE[1];arr.forEach(function(d){if(/青海湖/.test(d.route)){d.lodging=b.lodging;d.lodgingAlt=b.lodgingAlt;d.notes=(d.notes||[]).filter(function(n){return !/茶卡/.test(n)})}});
    }
  }
  if(key==='midui'){
    var day=arr.find(function(d){return /波密—然乌/.test(d.route)});
    if(day){
      if(on&&!day.spots.some(function(s){return /米堆/.test(s.name)})){
        var sp=clone((window.SPOTBASE||{})[sid('米堆冰川（可选）')]||{id:sid('米堆冰川（可选）'),name:'米堆冰川（可选）',imageKey:'midui',tags:['可选景点']});
        sp.tags=['核心景点','冬季待确认'];day.spots.unshift(sp);
      }
      if(!on)day.spots=day.spots.filter(function(s){return !/米堆/.test(s.name)});
    }
  }
  if(key==='dingjie'){
    var i=arr.findIndex(function(d){return d.moduleKey==='dingjie'||d.moduleKey==='dingjieSkip'});
    if(i>=0){if(on&&arr[i].moduleKey==='dingjieSkip'){arr[i]=clone(BASE[17]);arr[i+1]=clone(BASE[18]);}else if(!on&&arr[i].moduleKey==='dingjie'){arr[i]=Object.assign(clone(BASE[17]),{moduleKey:'dingjieSkip',route:'珠峰小镇—日喀则',lodging:'日喀则',lodgingAlt:'3840',drivingRaw:'约300–350km / 6–8h',spots:[],slots:{morning:['珠峰小镇出发'],noon:['途中休息'],afternoon:['返回日喀则'],evening:['休息']},notes:['取消定结，降低住宿海拔'],alternatives:['必要时补游珠峰']});arr[i+1]=Object.assign(clone(BASE[18]),{route:'日喀则—拉萨',drivingRaw:'270km / 4–5h',notes:['返回拉萨'],alternatives:[],slots:{morning:['日喀则出发'],noon:['途中休息'],afternoon:['抵达拉萨'],evening:['休息']}});}}
  }
  if(key==='namtso'){
    on=true;
    if(!on)arr=arr.filter(function(d){return d.moduleKey!=='namtso'});
    else if(!arr.some(function(d){return d.moduleKey==='namtso'}))
      insertDefault(arr,15,function(d){return /拉萨—日喀则/.test(d.route)});
  }
  if(key==='songsongExtra'){
    if(on&&!arr.some(function(d){return d.moduleKey==='songsongExtra'})){
      var s=findIdx(arr,function(d){return d.moduleKey==='southeast'&&/索松村/.test(d.route)});
      if(s>=0)arr.splice(s+1,0,{moduleKey:'songsongExtra',route:'索松村（加住一晚）',intensity:'低',
        lodging:'索松村',lodgingAlt:'2900',drivingRaw:'无长途驾驶',
        spots:[{id:sid('南迦巴瓦峰'),name:'南迦巴瓦峰',category:'雪山',tags:['核心景点'],imageKey:'namcha',visitTime:'清晨/傍晚',onRoute:true,worth:true,description:'多留一晚提高见到主峰与日照金山的概率。',highlights:['日照金山','看天气'],detail:'增加一晚观山'}],
        slots:{morning:['清晨等待南迦巴瓦峰'],noon:['村内慢走、休息'],afternoon:['视天气再次观山'],evening:['守候日照金山']},
        notes:['景观房优先'],alternatives:['天气不好则次日尽早返程']});
    }
    if(!on)arr=arr.filter(function(d){return d.moduleKey!=='songsongExtra'});
  }
  if(key==='everestSafe'){
    if(on&&!arr.some(function(d){return d.moduleKey==='everest2'})){
      var e2=findIdx(arr,function(d){return d.moduleKey==='everest'});
      if(e2>=0){
        var first=arr[e2];first.route='日喀则—定日';first.lodging='定日';first.lodgingAlt='4300';
        first.drivingRaw='约240km / 4–5h估算';first.spots=first.spots.filter(function(s){return /沿途|雪山/.test(s.name)});
        first.slots={morning:['上午从日喀则出发'],noon:['沿途高原雪山车览'],afternoon:['抵达定日县城休息'],evening:['早休息，适应海拔']};
        first.alternatives=(first.alternatives||[]).concat(['珠峰稳妥路线：今日只到定日，不直上珠峰。']);
        arr.splice(e2+1,0,{moduleKey:'everest2',route:'定日—加乌拉山口—珠峰大本营—适宜住宿点',intensity:'高',
          lodging:'珠峰小镇或定日',lodgingAlt:'约4300（定日）；珠峰小镇住宿海拔待核实',drivingRaw:'车程待领队核实',
          spots:[BASE[16].spots[1],BASE[16].spots[2],BASE[16].spots[3]].filter(Boolean).map(clone),
          slots:{morning:['早出发，经加乌拉山口'],noon:['珠峰大本营观景'],afternoon:['8848.86标识，安全返程'],evening:['入住适宜住宿点']},
          notes:['5000米以上','核实观光车和边防证','不强求日落'],alternatives:['身体不适则在定日休整，不上珠峰']});
      }
    }
    if(!on&&arr.some(function(d){return d.moduleKey==='everest2'})){
      arr=arr.filter(function(d){return d.moduleKey!=='everest2'});
      var orig=BASE[16];arr.forEach(function(d){if(d.moduleKey==='everest'){
        d.route=orig.route;d.lodging=orig.lodging;d.lodgingAlt=orig.lodgingAlt;d.spots=clone(orig.spots);
        d.slots=clone(orig.slots);d.drivingRaw=orig.drivingRaw;
        d.alternatives=(d.alternatives||[]).filter(function(a){return !/稳妥路线/.test(a)}).concat([orig.alternatives[0]]);
      }});
    }
  }
  return arr;
}

/* ---------- 行程编辑 ---------- */
function addDay(pos,type){
  var arr=current(),i=(pos==null?arr.length:Math.max(0,Math.min(arr.length,C.num(pos))));
  var rest=type==='rest';
  var d={moduleKey:'custom',custom:true,route:rest?'自由休整日':'新增行程',intensity:'低',
    lodging:arr[i-1]?arr[i-1].lodging:'拉萨',lodgingAlt:arr[i-1]?arr[i-1].lodgingAlt:'3650',
    drivingRaw:'无',spots:[],slots:{morning:['自由安排'],noon:['自由安排'],afternoon:['自由安排'],evening:['休息']},
    notes:rest?['不增加高海拔活动']:['根据天气与身体状态安排'],alternatives:['可根据实际情况随时调整']};
  arr.splice(i,0,d);return save(arr);
}
function removeDay(code){return save(current().filter(function(d){return d.day!==code}))}
function moveDay(from,to){
  var arr=current(),f=findIdx(arr,function(d){return d.day===from});if(f<0)return arr;
  var t=Math.max(0,Math.min(arr.length-1,C.num(to)));var d=arr.splice(f,1)[0];arr.splice(t,0,d);return save(arr);
}
function updateDay(code,patch){var arr=current(),d=arr.find(function(x){return x.day===code});if(!d)return arr;
  Object.keys(patch).forEach(function(k){d[k]=patch[k]});return save(arr)}
function addSpot(code,spot){
  var arr=current(),d=arr.find(function(x){return x.day===code});if(!d)return arr;
  spot=spot||{};spot.id=spot.id||sid(spot.name||('新景点'+Date.now()));
  spot.tags=spot.tags||['临时景点'];spot.imageKey=spot.imageKey||'lhasa';spot.visitTime=spot.visitTime||'视情况';
  d.spots=d.spots||[];d.spots.push(spot);return save(arr);
}
function removeSpot(code,spotId){var arr=current(),d=arr.find(function(x){return x.day===code});if(!d)return arr;
  d.spots=(d.spots||[]).filter(function(s){return s.id!==spotId});return save(arr)}
function updateSpot(code,spotId,patch){var arr=current(),d=arr.find(function(x){return x.day===code});if(!d)return arr;
  var s=d.spots.find(function(x){return x.id===spotId});if(!s)return arr;Object.keys(patch).forEach(function(k){s[k]=patch[k]});return save(arr)}
function moveSpot(fromCode,spotId,toCode,index){
  var arr=current(),f=arr.find(function(x){return x.day===fromCode}),t=arr.find(function(x){return x.day===toCode});
  if(!f||!t||f===t)return arr;var i=f.spots.findIndex(function(s){return s.id===spotId});if(i<0)return arr;
  var s=f.spots.splice(i,1)[0];t.spots=t.spots||[];t.spots.splice(Math.max(0,Math.min(t.spots.length,C.num(index)||0)),0,s);return save(arr);
}
function reorderSpot(code,from,to){var arr=current(),d=arr.find(function(x){return x.day===code});if(!d)return arr;
  var f=C.num(from),t=C.num(to);if(f===t||!d.spots[f])return arr;
  var s=d.spots.splice(f,1)[0];d.spots.splice(t,0,s);return save(arr)}
function flexDay(){return {moduleKey:'flex',custom:true,route:'机动休整日',intensity:'低',
  lodging:'拉萨',lodgingAlt:'3650',drivingRaw:'无',spots:[],
  slots:{morning:['根据前段延误情况决定'],noon:['机动休息'],afternoon:['视情况补拍或休息'],evening:['早休息']},
  notes:['用于天气、封路或身体状态缓冲','不建议用机动日增加高海拔景点'],
  alternatives:['可随时取消或插入其他日期']};}
function insertFlex(pos){
  var arr=current(),i=(pos==null?arr.length:Math.max(0,Math.min(arr.length,C.num(pos))));
  arr.splice(i,0,flexDay());set('flex',(get('flex',0)||0)+1);return save(arr);
}
function removeFlex(count){
  var arr=current(),n=count==null?1:C.num(count);
  for(var i=arr.length-1;i>=0&&n>0;i--){if(arr[i].moduleKey==='flex'){arr.splice(i,1);n--}}
  set('flex',Math.max(0,(get('flex',0)||0)-(count==null?1:count)));return save(arr);
}

/* ---------- 派生统计 ---------- */
function baseBudget(){var b=0;(window.BUDGET||[]).forEach(function(x){b+=C.num(x.qty)*C.num(x.price)*100});return b}
function budget(){return 0;}
function km(){var k=0;current().forEach(function(d){var m=String(d.drivingRaw||'').match(/(\d+)\s*[–-]\s*(\d+)\s*km|(\d+)\s*km/);if(m)k+=C.num(m[3]||m[2])});return k}
function nights(){var n=0;current().forEach(function(d){if(d.lodging&&d.lodging!=='—'&&!/火车/.test(d.lodging))n++});return n}
function maxAlt(){var a=0;current().forEach(function(d){var v=C.alt(d.lodgingAlt);if(v>a)a=v});return a}
function spotCount(){var s={};current().forEach(function(d){(d.spots||[]).forEach(function(x){s[x.id]=1})});return Object.keys(s).length}
function coreSpotCount(){var s={};current().forEach(function(d){(d.spots||[]).forEach(function(x){if((x.tags||[]).indexOf('核心景点')>=0)s[x.id]=1})});return Object.keys(s).length}

window.Plan={scheme:scheme,selectScheme:selectScheme,PK:PK,DEFAULT_TOGGLES:DEFAULT_TOGGLES,current:current,save:save,renumber:renumber,reset:reset,
  toggles:toggles,setToggle:setToggle,applyToggles:applyToggles,byDayCode:byDayCode,
  addDay:addDay,removeDay:removeDay,moveDay:moveDay,updateDay:updateDay,
  addSpot:addSpot,removeSpot:removeSpot,updateSpot:updateSpot,moveSpot:moveSpot,reorderSpot:reorderSpot,insertFlex:insertFlex,removeFlex:removeFlex,
  getDeparture:function(){return get('departure','2026-12-15')},
  setDeparture:function(v){set('departure',v);var a=current();a.forEach(function(d,i){d.date=C.dateAdd(v,i)});set('days',a)},
  budget:budget,km:km,nights:nights,maxAlt:maxAlt,spotCount:spotCount,coreSpotCount:coreSpotCount};
})();
