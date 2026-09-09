/* Presentation only: no physics, scoring or gameplay timers. Offline classic script. */
(function () {
  'use strict';
  var effects = [], cache = {}, reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THEMES = ['#ae8355', '#b79b55', '#8e829e', '#738550', '#bd8b48', '#436c65', '#278d99', '#d6a33c'];
  var MAX_EFFECTS = 14;
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function sprite(p, im) {
    var ready = im && im.complete && im.naturalWidth;
    var key = p.level + ':' + (ready ? im.src : 'fallback');
    if (cache[key]) return cache[key];
    var tile = document.createElement('canvas'); tile.width = tile.height = 320;
    var c = tile.getContext('2d'), r = 146;
    c.save(); c.shadowColor = '#193d3433'; c.shadowBlur = 10; c.shadowOffsetY = 5;
    circle(c,160,156,r); c.fillStyle = '#fffcf1'; c.fill(); c.restore();
    c.save(); circle(c,160,156,r-5); c.clip();
    if (ready) {
      var ratio = im.naturalWidth / im.naturalHeight, w = 286, h = 286;
      if (ratio > 1) w *= ratio; else h /= ratio;
      c.drawImage(im,160-w/2,156-h/2,w,h);
    } else {
      c.fillStyle=p.color; c.fillRect(10,6,300,300); c.fillStyle='#fff'; c.textAlign='center';
      c.font='bold 43px "Malgun Gothic", sans-serif'; c.fillText(p.short,160,162);
      c.font='24px "Malgun Gothic", sans-serif'; c.fillText('LEVEL '+p.level,160,205);
    }
    var shade=c.createLinearGradient(0,45,0,300);
    shade.addColorStop(0,'#ffffff00'); shade.addColorStop(.65,'#ffffff00'); shade.addColorStop(1,'#29463d22');
    c.fillStyle=shade; c.fillRect(8,5,304,304); c.restore();
    circle(c,160,156,r-2); c.strokeStyle=THEMES[p.level-1]; c.lineWidth=4; c.stroke();
    circle(c,160,156,r-7); c.strokeStyle='#ffffffbb'; c.lineWidth=2; c.stroke();
    c.beginPath(); c.arc(160,156,r-12,Math.PI*1.12,Math.PI*1.56); c.lineCap='round';
    c.strokeStyle='#ffffffbb'; c.lineWidth=4; c.stroke();
    if(p.level>=5) {
      c.beginPath(); c.arc(160,156,r-3,.20,1.10); c.strokeStyle=p.level===7?'#8cdee0':'#ddc68b'; c.lineWidth=5; c.stroke();
    }
    cache[key]=tile; return tile;
  }
  function drawPark(c,p,im,x,y,size,angle,pop) {
    var s=size*(pop||1)*320/292;
    c.save(); c.translate(x,y); c.rotate(Math.max(-.262,Math.min(.262,angle||0)));
    c.drawImage(sprite(p,im),-s/2,-s*156/320,s,s); c.restore();
  }
  function background(c,w,h,p,now,danger) {
    var g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#faf8ef'); g.addColorStop(1,'#e8eee0');
    c.fillStyle=g; c.fillRect(0,0,w,h);
    c.fillStyle='#e1e7d7'; c.fillRect(0,0,p.left,h); c.fillRect(p.right,0,w-p.right,h);
    c.strokeStyle='#b8c7b240'; c.lineWidth=1;
    for(var y=30;y<h;y+=64){c.beginPath();c.moveTo(12,y);c.lineTo(p.left-9,y+14);c.moveTo(p.right+9,y+14);c.lineTo(w-12,y);c.stroke();}
    c.fillStyle='#97ad9238'; c.fillRect(p.left-3,0,3,p.bottom); c.fillRect(p.right,0,3,p.bottom);
    c.fillStyle='#c0cbb3'; c.fillRect(p.left,p.bottom,w-2*p.left,h-p.bottom);
    c.strokeStyle='#849d7977'; c.lineWidth=3;c.beginPath();c.moveTo(p.left,p.bottom);c.lineTo(p.right,p.bottom);c.stroke();
    c.save();c.setLineDash([7,10]);c.lineWidth=danger?3:1.5;
    c.strokeStyle=danger?(reduced?'#ce6550':(Math.floor(now/240)%2?'#d96c52':'#dba770')):'#c2ad9466';
    c.beginPath();c.moveTo(p.left+2,p.dangerY);c.lineTo(p.right-2,p.dangerY);c.stroke();c.restore();
    c.fillStyle=danger?'#b55742':'#a59783';c.font='12px "Malgun Gothic",sans-serif';
    c.fillText(danger?'위험 · 공간을 확보하세요':'위험선',p.left+10,p.dangerY-10);
  }
  function merge(x,y,level,points,bonus,now) {
    var kind=bonus?'sea':level===7?'sea':level===6?'mist':level===5?'gold':level===4?'leaf':'spark';
    var count=reduced?0:(bonus?30:8+level*2), bits=[];
    for(var i=0;i<count;i++) {var a=Math.PI*2*i/count;bits.push({a:a,speed:30+Math.random()*65,size:2+Math.random()*3,spin:Math.random()*6});}
    effects.push({x:x,y:y,level:level,points:points,bonus:bonus,kind:kind,born:now,duration:bonus?1500:1100,bits:bits});
    if(effects.length>MAX_EFFECTS)effects.shift();
  }
  function drawEffects(c,now,front,w,h) {
    effects=effects.filter(function(e){return now-e.born<e.duration;});
    effects.forEach(function(e){
      var t=Math.max(0,(now-e.born)/e.duration),alpha=Math.min(1,(1-t)*2),reach=(e.level>=6?90:48)+t*(e.level>=6?95:55);
      c.save();c.globalAlpha=alpha;c.strokeStyle=THEMES[e.level-1];c.fillStyle=c.strokeStyle;
      if(!front&&!reduced) {
        if(e.kind==='sea'||e.kind==='gold') {
          for(var k=0;k<(e.kind==='sea'?3:1);k++) {circle(c,e.x,e.y,reach-k*17);c.lineWidth=k===0?3:1.5;c.stroke();}
        } else if(e.kind==='mist') {
          c.globalAlpha=alpha*.22;c.fillStyle='#f5faf1';
          for(var j=-2;j<=2;j++){circle(c,e.x+j*reach*.45,e.y+25,reach*.46);c.fill();}
        }
      }
      if(front) {
        e.bits.forEach(function(b){
          var x=e.x+Math.cos(b.a)*b.speed*t*1.6,y=e.y+Math.sin(b.a)*b.speed*t*1.3-20*t;
          c.save();c.translate(x,y);c.rotate(b.spin+t*3);
          c.fillStyle=e.kind==='leaf'?'#7b9862':e.kind==='sea'?'#70c7cb':e.kind==='gold'?'#d9b969':'#e0ce8c';
          if(e.kind==='leaf'){c.beginPath();c.moveTo(-b.size*2,0);c.quadraticCurveTo(0,-b.size*2,b.size*2,0);c.quadraticCurveTo(0,b.size*2,-b.size*2,0);c.fill();}
          else {c.fillRect(-b.size/2,-b.size*1.5,b.size,b.size*3);c.fillRect(-b.size*1.5,-b.size/2,b.size*3,b.size);}
          c.restore();
        });
        var label='+'+e.points+(e.bonus?' BONUS':''),x=Math.max(100,Math.min(w-100,e.x)),y=Math.max(185,Math.min(h-35,e.y-42-(reduced?0:t*45)));
        c.textAlign='center';c.font='bold '+(e.bonus?27:23)+'px "Malgun Gothic",sans-serif';
        c.lineWidth=5;c.strokeStyle='#fffdf3';c.strokeText(label,x,y);c.fillStyle=e.bonus?'#a77828':'#31564a';c.fillText(label,x,y);
      }
      c.restore();
    });
  }
  window.ParkVisuals={drawPark:drawPark,background:background,merge:merge,drawEffects:drawEffects,clear:function(){effects=[];},effectCount:function(){return effects.length;},reduced:reduced};
})();
