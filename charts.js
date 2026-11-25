/* charts.js — 纯 SVG 图表，无外部依赖，可离线使用 */
(function(){
'use strict';
var C=window.Core;
var PALETTE=['#2b6f92','#b8794b','#6d5a86','#3d8c72','#c07a5a','#5b7fa6','#8e7cbb','#4a8fa3','#a8874f','#7b8794'];
function esc(s){return C.esc(s)}
function nice(max){if(max<=0)return 10;var p=Math.pow(10,Math.floor(Math.log10(max)));var n=max/p;var m=n<=1?1:n<=2?2:n<=5?5:10;return m*p}

function lineChart(data,opt){
  opt=opt||{};
  var W=opt.width||900,H=opt.height||300,L=44,R=16,T=22,B=46;
  var iw=W-L-R,ih=H-T-B;
  var series=opt.series||[{key:'v1',name:'睡眠海拔',color:'#2b6f92'},{key:'v2',name:'最高游览海拔',color:'#b8794b'}];
  var vals=[];data.forEach(function(d){series.forEach(function(s){var v=+d[s.key]||0;vals.push(v)})});
  var max=nice(Math.max.apply(null,vals.concat([1]))),min=0;
  var x=function(i){return data.length<2?L+iw/2:L+i*iw/(data.length-1)};
  var y=function(v){return T+ih-(v-min)/(max-min)*ih};
  var g='';
  for(var i=0;i<=4;i++){var yy=T+ih-i*ih/4,v=Math.round(max*i/4);
    g+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#e8edf0" stroke-width="1"/>';
    g+='<text x="'+(L-7)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#7b8794">'+v+'</text>';}
  var step=Math.ceil(data.length/9);
  data.forEach(function(d,i){if(i%step===0||i===data.length-1)
    g+='<text x="'+x(i)+'" y="'+(H-16)+'" text-anchor="middle" font-size="10" fill="#7b8794">'+esc(d.label||d.day||'')+'</text>';});
  series.forEach(function(s){
    var pts=data.map(function(d,i){return x(i)+','+y(+d[s.key]||0)}).join(' ');
    g+='<polyline points="'+pts+'" fill="none" stroke="'+s.color+'" stroke-width="2.2" stroke-linejoin="round"/>';
    data.forEach(function(d,i){var v=+d[s.key]||0;
      if(opt.marks&&opt.marks[d.day]&&s.key==='v1'){
        g+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="5.5" fill="#fff" stroke="#c0392b" stroke-width="2"><title>'+esc(d.label+' '+opt.marks[d.day]+' · '+v+'m')+'</title></circle>';
      }else{
        g+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3" fill="'+s.color+'"><title>'+esc((d.label||d.day)+' '+s.name+' '+v+'m')+'</title></circle>';
      }});
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="折线图">'+g+'</svg>'+
    '<div class="legend">'+series.map(function(s){return '<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>'}).join('')+'</div>';
}

function barChart(data,opt){
  opt=opt||{};var W=opt.width||900,H=opt.height||280,L=48,R=14,T=18,B=42,iw=W-L-R,ih=H-T-B;
  var vals=data.map(function(d){return Math.abs(Math.round(d.value||0))});
  var max=nice(Math.max.apply(null,vals.concat([1])));
  var bw=data.length?Math.max(4,Math.min(38,iw/data.length*0.68)):10;
  var g='';
  for(var i=0;i<=4;i++){var yy=T+ih-i*ih/4,v=Math.round(max*i/100*100);
    g+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#e8edf0"/>';
    g+='<text x="'+(L-6)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#7b8794">'+C.money0(v*100)+'</text>';}
  data.forEach(function(d,i){
    var cx=L+(i+0.5)*iw/data.length,v=Math.abs(Math.round(d.value||0)),hh=v/max*ih;
    var col=d.color||'#2b6f92';
    g+='<rect x="'+(cx-bw/2)+'" y="'+(T+ih-hh)+'" width="'+bw+'" height="'+Math.max(1,hh)+'" rx="3" fill="'+col+'"><title>'+esc((d.label||'')+' '+C.money(v))+'</title></rect>';
    var step=Math.ceil(data.length/9);
    if(i%step===0||i===data.length-1)g+='<text x="'+cx+'" y="'+(H-14)+'" text-anchor="middle" font-size="10" fill="#7b8794">'+esc(d.label||'')+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="柱状图">'+g+'</svg>';
}

function groupedBar(data,opt){
  opt=opt||{};var W=opt.width||900,H=opt.height||280,L=48,R=14,T=18,B=42,iw=W-L-R,ih=H-T-B;
  var series=opt.series||[{key:'paid',name:'实际付款',color:'#2b6f92'},{key:'consumed',name:'实际消费',color:'#b8794b'}];
  var vals=[];data.forEach(function(d){series.forEach(function(s){vals.push(Math.abs(+d[s.key]||0))})});
  var max=nice(Math.max.apply(null,vals.concat([1])));
  var group=iw/(data.length||1),bw=Math.max(5,Math.min(22,group/(series.length+0.6)));
  var g='';
  for(var i=0;i<=4;i++){var yy=T+ih-i*ih/4;
    g+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#e8edf0"/>';
    g+='<text x="'+(L-6)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#7b8794">'+C.money0(max*i/4)+'</text>';}
  data.forEach(function(d,i){
    var gx=L+i*group+group/2;
    series.forEach(function(s,j){
      var v=Math.abs(Math.round(d[s.key]||0)),hh=v/max*ih;
      var xx=gx-(series.length*bw)/2+j*bw;
      g+='<rect x="'+xx+'" y="'+(T+ih-hh)+'" width="'+(bw-2)+'" height="'+Math.max(1,hh)+'" rx="2" fill="'+s.color+'"><title>'+esc((d.label||'')+' '+s.name+' '+C.money(v))+'</title></rect>';
    });
    g+='<text x="'+gx+'" y="'+(H-14)+'" text-anchor="middle" font-size="10" fill="#7b8794">'+esc(d.label||'')+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="对比柱状图">'+g+'</svg>'+
    '<div class="legend">'+series.map(function(s){return '<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>'}).join('')+'</div>';
}

function donut(data,opt){
  opt=opt||{};var size=opt.size||240,cx=size/2,cy=size/2,r=size*0.36,ir=r*0.6;
  var items=data.filter(function(d){return Math.abs(d.value||0)>0}).sort(function(a,b){return b.value-a.value});
  var total=items.reduce(function(a,d){return a+Math.abs(d.value)},0);
  if(!total)return '<div class="center muted small" style="padding:40px 0">暂无消费数据</div>';
  var ang=-Math.PI/2,g='';
  items.forEach(function(d,i){
    var v=Math.abs(d.value)/total,a=v*Math.PI*2,end=ang+a;
    var col=d.color||PALETTE[i%PALETTE.length];
    var x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);
    var x3=cx+ir*Math.cos(end),y3=cy+ir*Math.sin(end),x4=cx+ir*Math.cos(ang),y4=cy+ir*Math.sin(ang);
    var large=a>Math.PI?1:0;
    g+='<path d="M'+x1+' '+y1+' A'+r+' '+r+' 0 '+large+' 1 '+x2+' '+y2+' L'+x3+' '+y3+' A'+ir+' '+ir+' 0 '+large+' 0 '+x4+' '+y4+' Z" fill="'+col+'"><title>'+esc((d.label||d.name)+' '+C.money(d.value)+' ('+Math.round(v*100)+'%)')+'</title></path>';
    ang=end;
  });
  g+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" font-size="12" fill="#7b8794">总支出</text>';
  g+='<text x="'+cx+'" y="'+(cy+18)+'" text-anchor="middle" font-size="17" fill="#1b2733" font-weight="600">'+esc(C.money0(total))+'</text>';
  var legend='<div class="legend" style="flex-direction:column;gap:4px">'+items.map(function(d,i){
    return '<span><i style="background:'+(d.color||PALETTE[i%PALETTE.length])+'"></i>'+esc(d.label||d.name)+' '+Math.round(Math.abs(d.value)/total*100)+'% · '+C.money0(d.value)+'</span>';
  }).join('')+'</div>';
  return '<div class="row" style="align-items:flex-start"><svg viewBox="0 0 '+size+' '+size+'" style="width:'+size+'px;max-width:48%;height:auto" role="img" aria-label="饼图">'+g+'</svg>'+legend+'</div>';
}
window.Charts={lineChart:lineChart,barChart:barChart,groupedBar:groupedBar,donut:donut,PALETTE:PALETTE};
})();
