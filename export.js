/* export.js — 纯前端 XLSX / CSV 导出（内置 ZIP 与 OOXML 写入器，无需外部库） */
(function(){
'use strict';
var C=window.Core;

/* ---------- CRC32 ---------- */
var CRCT=(function(){var t=new Uint32Array(256);for(var i=0;i<256;i++){var c=i;for(var j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c>>>0}return t})();
function crc32(buf){var c=0xFFFFFFFF;for(var i=0;i<buf.length;i++)c=CRCT[(c^buf[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function utf8(s){return new TextEncoder().encode(s)}

/* ---------- ZIP (store) ---------- */
function zip(files){
  var parts=[],central=[],offset=0;
  files.forEach(function(f){
    var name=utf8(f.name),data=typeof f.data==='string'?utf8(f.data):f.data,crc=crc32(data);
    var h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);
    v.setUint16(8,0,true);v.setUint16(10,0,true);v.setUint16(12,0x21,true);
    v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);
    v.setUint16(26,name.length,true);v.setUint16(28,0,true);h.set(name,30);
    parts.push(h,data);
    var ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0x21,true);
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);
    cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);
    ch.set(name,46);central.push(ch);
    offset+=h.length+data.length;
  });
  var cdSize=central.reduce(function(a,b){return a+b.length},0);
  var end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
  return new Blob(parts.concat(central,[end]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xesc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function colName(n){var s='';while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s}

/* sheet: {name, header:[], rows:[][], moneyCols:[idx], wrapCols:[idx]} */
function sheetXML(sheet){
  var rows='';
  var h='<row r="1" ht="30" customHeight="1">'+sheet.header.map(function(v,i){
    return '<c r="'+colName(i+1)+'1" t="inlineStr" s="1"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';
  }).join('')+'</row>';
  rows+=h;
  sheet.rows.forEach(function(r,ri){
    var rn=ri+2,cells='';
    r.forEach(function(v,ci){
      var ref=colName(ci+1)+rn;
      var isMoney=(sheet.moneyCols||[]).indexOf(ci)>=0;
      if(isMoney&&typeof v==='number'){
        cells+='<c r="'+ref+'" s="2"><v>'+(v/100)+'</v></c>';
      }else if(v==null||v===''){
        cells+='';
      }else if(typeof v==='number'){
        cells+='<c r="'+ref+'"><v>'+v+'</v></c>';
      }else{
        var style=(sheet.wrapCols||[]).indexOf(ci)>=0?3:0;
        cells+='<c r="'+ref+'" t="inlineStr" s="'+style+'"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';
      }
    });
    rows+='<row r="'+rn+'">'+cells+'</row>';
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>'+
    sheet.header.map(function(_,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+((sheet.widths||[])[i]||18)+'" customWidth="1"/>'}).join('')+
    '</cols><sheetData>'+rows+'</sheetData><autoFilter ref="A1:'+colName(Math.max(1,sheet.header.length))+Math.max(1,sheet.rows.length+1)+'"/></worksheet>';
}
var STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;¥&quot;#,##0.00"/></numFmts>'+
 '<fonts count="3"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font><font><sz val="11"/><name val="Microsoft YaHei"/></font></fonts>'+
 '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2B6F92"/><bgColor indexed="64"/></patternFill></fill></fills>'+
 '<borders count="2"><border/><border><left style="thin"><color rgb="FFDDE4E9"/></left><right style="thin"><color rgb="FFDDE4E9"/></right><top style="thin"><color rgb="FFDDE4E9"/></top><bottom style="thin"><color rgb="FFDDE4E9"/></bottom><diagonal/></border></borders>'+
 '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
 '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
 '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'+
 '<xf numFmtId="164" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'+
 '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'+
 '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function buildXlsx(sheets){
  var files=[];
  files.push({name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map(function(_,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('')+'</Types>'});
  files.push({name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
  files.push({name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map(function(s,i){return '<sheet name="'+xesc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('')+'</sheets></workbook>'});
  files.push({name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map(function(_,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'});
  files.push({name:'xl/styles.xml',data:STYLES});
  sheets.forEach(function(s,i){files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:sheetXML(s)})});
  return zip(files);
}
function download(blob,filename){
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url)},1200);
}

function csv(sheet){
  var q=function(v){var s=String(v==null?'':v);return '"'+s.replace(/"/g,'""')+'"'};
  var lines=[sheet.header.map(q).join(',')].concat(sheet.rows.map(function(r){return r.map(q).join(',')}));
  return '\ufeff'+lines.join('\r\n');
}

/* ---------- 业务导出 ---------- */
function expenseSheets(){
  var L=window.Ledger, days=window.App?window.App.days():window.Core.buildItinerary();
  var ms=L.members(),exps=L.expenses(),st=L.stats(),mp={};
  ms.forEach(function(m){mp[m.id]=m.name});
  function payerNames(e){return (e.payers||[]).map(function(p){return (mp[p.memberId]||'?')+' '+C.money(p.amount)}).join('；')}
  function splitText(e){
    var sh=L.computeShares(e,ms);
    if(e.mode==='personal')return '个人消费 · '+(mp[e.personalId]||'');
    return Object.keys(sh).map(function(k){return (mp[k]||'?')+' '+C.money(sh[k])}).join('；');
  }
  var s1={name:'01 旅行总账',header:['编号','日期','时间','项目名称','消费类别','金额（元）','付款人及金额','分摊方式','分摊结果','支付方式','地点','旅行模块','备注','同步状态'],moneyCols:[5],widths:[14,12,8,24,16,14,30,14,40,12,16,16,28,12],wrapCols:[3,6,8,12],rows:[]};
  exps.forEach(function(e,i){s1.rows.push([e.id,e.date,e.time||'',e.title,e.category,Math.round(e.amount||0),payerNames(e),({all:'全员均摊',selected:'指定成员均摊',custom:'自定义金额',ratio:'按比例分摊',personal:'个人消费'})[e.mode]||e.mode,
    splitText(e),e.method||'',e.location||'',e.note||'',e.sync?'已同步':'本地未同步'])});

  var s2={name:'02 每日消费明细',header:['实际消费日期','消费笔数','当日支出（元）','退款（元）','主要类别'],moneyCols:[2,3],widths:[16,12,16,16,40],wrapCols:[4],rows:[]};
  var byDay=L.byDay();
  byDay.forEach(function(d){
    var es=exps.filter(function(e){return (e.date||'未填日期')===d.date}),cats={};es.forEach(function(e){cats[e.category]=(cats[e.category]||0)+Math.round(e.amount||0)});
    var refund=es.filter(function(e){return e.amount<0}).reduce(function(a,e){return a+Math.round(e.amount)},0);
    s2.rows.push([d.date,d.count,d.amount+refund,refund,Object.keys(cats).map(function(k){return k+' '+C.money(cats[k])}).join('；')]);
  });

  var s3={name:'03 各成员个人账单',header:['成员','实际付款（元）','个人消费（元）','公共应摊（元）','应承担合计（元）','已收结算（元）','已付结算（元）','未结算余额（元）','状态','参与账单数'],moneyCols:[1,2,3,4,5,6,7],widths:[16,16,16,16,16,16,16,18,12,12],wrapCols:[],rows:[]};
  ms.forEach(function(m){var o=st[m.id];s3.rows.push([m.name,o.paid,o.personalConsumed,o.publicConsumed,o.consumed,o.received,o.paidSettle,o.balance,o.balance>0?'应收款':o.balance<0?'应付款':'已结清',o.count])});

  var sc=L.settlements();
  var s4={name:'04 AA结算明细',header:['付款人','收款人','金额（元）','状态','已结金额（元）','结算日期','范围','凭证','备注','创建时间'],moneyCols:[2,4],widths:[14,14,14,12,16,14,20,12,26,20],wrapCols:[8],rows:[]};
  sc.forEach(function(s){s4.rows.push([mp[s.from]||s.from,mp[s.to]||s.to,Math.round(s.amount||0),({pending:'待结算',paid:'已结算',partial:'部分结算',cancelled:'已取消'})[s.status]||s.status,Math.round(s.paidAmount||0),s.date||'',s.scopeLabel||'总账结算',s.receipt?'有':'无',s.note||'',new Date(s.createdAt||Date.now()).toLocaleString('zh-CN')])});

  var s5={name:'05 实际支出分类',header:['费用类别','实际支出（元）'],moneyCols:[1],widths:[26,20],rows:L.byCategory().map(function(c){return [c.name,c.amount]})};
  s5.rows.push(['实际总支出',L.totals().actual]);

  var ps=L.poolStats();
  var s6={name:'06 公共资金流水',header:['日期','类型','成员','金额（元）','说明','公众保管人'],moneyCols:[3],widths:[14,14,16,16,36,16],wrapCols:[4],rows:[]};
  L.pool().contributions.forEach(function(c){s6.rows.push([c.date||'','预缴',mp[c.memberId]||'',Math.round(c.amount||0),c.note||'公共旅行基金预缴（资金转移，不计入旅行消费）',mp[ps.custodian]||''])});
  exps.filter(function(e){return e.paidFromPool}).forEach(function(e){s6.rows.push([e.date||'','公共资金消费','公共资金池',Math.round(e.amount||0),e.title,mp[ps.custodian]||''])});
  s6.rows.push(['','资金池余额','',ps.balance,'预缴合计 - 公共资金消费合计 = '+C.money(ps.balance),'']);

  var s7={name:'07 已结算转账记录',header:['付款人','收款人','实际结算金额（元）','结算日期','转账凭证','备注','状态'],moneyCols:[2],widths:[14,14,20,14,12,30,12],wrapCols:[5],rows:[]};
  sc.filter(function(s){return s.status==='paid'||s.status==='partial'}).forEach(function(s){
    s7.rows.push([mp[s.from]||s.from,mp[s.to]||s.to,Math.round(s.paidAmount||0),s.date||'',s.receipt?'有':'无',s.note||'',s.status]);
  });
  return [s1,s2,s3,s4,s5,s6,s7];
}
function exportLedgerExcel(){
  var sheets=expenseSheets();
  download(buildXlsx(sheets),'西藏旅行账本_'+C.today()+'.xlsx');C.toast('已导出 7 个工作表的 Excel 账本');
}
function exportLedgerCSV(){
  var s=expenseSheets()[0];
  download(new Blob([csv(s)],{type:'text/csv;charset=utf-8'}),'西藏旅行总账_'+C.today()+'.csv');C.toast('已导出 CSV 总账');
}
function exportItineraryExcel(){
  var days=window.App?window.App.days():C.buildItinerary();
  var s={name:'每日行程',header:['天数','实际日期','星期','模块','路线','上午','中午','下午','晚上','当日景点','景点详情','住宿','住宿海拔(m)','里程/驾驶','行程强度','备选方案','注意事项','个人笔记','是否完成'],widths:[8,14,8,18,26,26,26,26,26,30,40,14,14,20,12,36,36,36,10],wrapCols:[4,5,6,7,8,9,10,15,16,17],rows:[]};
  days.forEach(function(d){
    var rec=(window.App&&window.App.record(d.day))||{};
    s.rows.push([d.day,d.date,d.week,d.rawModule,d.route,
      (d.slots.morning||[]).join('\n'),(d.slots.noon||[]).join('\n'),(d.slots.afternoon||[]).join('\n'),(d.slots.evening||[]).join('\n'),
      d.spots.map(function(p){return p.name}).join('\n'),
      d.spots.map(function(p){return p.name+'：'+(p.detail||'')}).join('\n'),
      d.lodging,C.alt(d.lodgingAlt),d.drivingRaw,(d.intensity||'中'),(d.alternatives||[]).join('\n'),
      (d.notes||[]).join('\n'),rec.note||'',rec.done?'是':'否']);
  });
  download(buildXlsx([s]),'西藏冬季行程_'+C.today()+'.xlsx');C.toast('已导出行程 Excel');
}
function exportLedgerJSON(){
  download(new Blob([JSON.stringify(window.Ledger.backup(),null,2)],{type:'application/json'}),'西藏账本备份_'+C.today()+'.json');
  C.toast('已导出账本备份文件');
}

/* ---------- 全量备份：计划 + 足迹 + 账本 + 设置 ---------- */
function fullBackup(){
  var S=window.Store;
  return {version:2,exportedAt:new Date().toISOString(),
    plan:{days:S.get('plan.v2.days',null),toggles:S.get('plan.v2.toggles',null),
          flex:S.get('plan.v2.flex',0),departure:S.get('plan.v2.departure',null)},
    footprint:S.get('foot.v1.records',{}),
    ledger:window.Ledger.backup(),
    settings:S.get('settings',null)};
}
function fullRestore(data){
  if(!data||data.version!==2)return {ok:false,error:'备份文件版本不匹配'};
  var S=window.Store;
  try{
    if(data.plan){['days','toggles','flex','departure'].forEach(function(k){if(data.plan[k]!=null)S.set('plan.v2.'+k,data.plan[k])})}
    if(data.footprint)S.set('foot.v1.records',data.footprint);
    if(data.ledger)window.Ledger.restore(data.ledger);
    if(data.settings)S.set('settings',data.settings);
    return {ok:true};
  }catch(e){return {ok:false,error:'恢复失败：'+e.message}}
}
function exportFullBackup(){
  download(new Blob([JSON.stringify(fullBackup(),null,2)],{type:'application/json'}),'西藏旅行全部数据_'+C.today()+'.json');
  C.toast('已导出全部数据备份（计划/足迹/账本/设置）');
}
window.Exporter={buildXlsx:buildXlsx,download:download,csv:csv,exportLedgerExcel:exportLedgerExcel,
  exportLedgerCSV:exportLedgerCSV,exportItineraryExcel:exportItineraryExcel,exportLedgerJSON:exportLedgerJSON,
  expenseSheets:expenseSheets,fullBackup:fullBackup,fullRestore:fullRestore,exportFullBackup:exportFullBackup};
})();
