(function(){
"use strict";
var Engine=Matter.Engine, World=Matter.World, Bodies=Matter.Bodies, Body=Matter.Body, Events=Matter.Events, Composite=Matter.Composite;

var CONFIG={
  GAME_MODE:"FREE", LOGICAL_W:720, LOGICAL_H:920,
  play:{left:34,right:686,top:0,bottom:916,dangerY:142,spawnY:58},
  autoDropMs:4000,spawnDelayMs:420,dangerHoldMs:2000,modeSeconds:180,
  physics:{gravity:1.05,restitution:.08,friction:.32,frictionAir:.012},
  direct:[{level:1,weight:.5},{level:2,weight:.3},{level:3,weight:.2}],seed:null
};
var PARKS=[
 {level:1,key:"geumjeongsan",short:"금정산",name:"금정산국립공원",image:"assets/characters/01_geumjeongsan.png",diameter:.085,color:"#c89558",area:66.136,score:10},
 {level:2,key:"gayasan",short:"가야산",name:"가야산국립공원",image:"assets/characters/02_gayasan.png",diameter:.108,color:"#d59655",area:76.792,score:30},
 {level:3,key:"juwangsan",short:"주왕산",name:"주왕산국립공원",image:"assets/characters/03_juwangsan.png",diameter:.135,color:"#9d7557",area:106.114,score:60},
 {level:4,key:"palgongsan",short:"팔공산",name:"팔공산국립공원",image:"assets/characters/04_palgongsan.png",diameter:.165,color:"#75523c",area:126.058,score:100},
 {level:5,key:"gyeongju",short:"경주",name:"경주국립공원",image:"assets/characters/05_gyeongju.png",diameter:.20,color:"#ce743f",area:136.550,score:150},
 {level:6,key:"jirisan",short:"지리산",name:"지리산국립공원",image:"assets/characters/06_jirisan.png",diameter:.242,color:"#293830",area:483.022,score:250},
 {level:7,key:"hallyeo",short:"한려해상",name:"한려해상국립공원",image:"assets/characters/07_hallyeohaesang.png",diameter:.285,color:"#267d87",area:537.479,score:500}
];
var $=function(s){return document.querySelector(s)}, canvas=$("#gameCanvas"),ctx=canvas.getContext("2d"),nextCanvas=$("#nextCanvas"),nctx=nextCanvas.getContext("2d");
var ui={score:$("#score"),timeBox:$("#timeBox"),time:$("#time"),toast:$("#toast"),start:$("#startOverlay"),end:$("#endOverlay"),endLabel:$("#endLabel"),endTitle:$("#endTitle"),finalScore:$("#finalScore"),highest:$("#highestPark"),progress:$("#progress"),sound:$("#soundBtn")};
var images={},engine=null,world=null,raf=0,state="START",generation=0,bodies=[],particles=[],mergeQueue=[],uid=1,score=0,highest=1,currentLevel=1,nextLevel=1,pending=null,pendingAt=0,nextSpawnAt=0,dangerSince=null,startedAt=0,lastNow=0,physicsAccumulator=0,muted=false,audioCtx=null,rng=Math.random,pointer=null,toastTimer=0,finalAchieved=false,visuals=window.ParkVisuals;

function park(level){return PARKS[level-1]} function radius(level){return CONFIG.LOGICAL_W*park(level).diameter/2}
function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function drawLevel(){var x=rng(),sum=0;for(var i=0;i<CONFIG.direct.length;i++){sum+=CONFIG.direct[i].weight;if(x<sum)return CONFIG.direct[i].level}return 3}
function loadImages(){PARKS.forEach(function(p){var im=new Image();images[p.level]=im;im.onload=im.onerror=function(){drawNext();drawProgressImages();drawResult();if(state==="START")render(0)};im.src=p.image})}
function buildProgress(){ui.progress.innerHTML="";PARKS.forEach(function(p){var d=document.createElement("div");d.className="step";d.dataset.level=p.level;d.innerHTML='<canvas width="88" height="88" aria-hidden="true"></canvas><i>'+p.level+'</i><span>'+p.short+'</span>';ui.progress.appendChild(d)});updateProgress();drawProgressImages()}
function drawProgressImages(){document.querySelectorAll(".step").forEach(function(x){var c=x.querySelector("canvas"),cx=c.getContext("2d");cx.clearRect(0,0,88,88);drawPark(cx,+x.dataset.level,44,43,74,0,1)})}
function updateProgress(){document.querySelectorAll(".step").forEach(function(x){var level=+x.dataset.level,on=level<=highest;if(on&&!x.classList.contains("on")&&state==="PLAYING"&&level>1){x.classList.add("newly-unlocked")}x.classList.toggle("on",on);x.classList.toggle("current",level===highest);x.setAttribute("aria-label",level+"단계 "+park(level).name+(on?" 달성":" 미달성"))});var count=$("#collectionCount");if(count)count.textContent=highest+" / 7"}
function audio(){if(muted)return null;if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(freq,dur,type,vol,delay){var a=audio();if(!a)return;var o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);o.type=type||"sine";o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol||.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur)}
function sound(kind,level){if(kind==="drop")tone(240,.07,"sine",.025);else if(kind==="merge"){tone(420+level*35,.12,"sine",.035);tone(630+level*30,.14,"sine",.025,.045)}else if(kind==="win"){tone(523,.18,"sine",.04);tone(659,.18,"sine",.04,.14);tone(784,.28,"sine",.04,.28)}else if(kind==="over"){tone(330,.22,"triangle",.03);tone(220,.3,"triangle",.03,.18)}}
function cleanup(){generation++;if(raf)cancelAnimationFrame(raf);raf=0;if(engine){Events.off(engine);Composite.clear(world,false,true);Engine.clear(engine)}engine=null;world=null;bodies=[];particles=[];mergeQueue=[];pending=null;pointer=null;dangerSince=null;clearTimeout(toastTimer);ui.toast.className="toast";ui.toast.textContent="";visuals.clear()}
function initWorld(){engine=Engine.create();world=engine.world;engine.gravity.y=CONFIG.physics.gravity;var p=CONFIG.play,wall={isStatic:true,restitution:0,friction:.4,render:{visible:false}};World.add(world,[Bodies.rectangle(p.left-18,CONFIG.LOGICAL_H/2,36,CONFIG.LOGICAL_H,wall),Bodies.rectangle(p.right+18,CONFIG.LOGICAL_H/2,36,CONFIG.LOGICAL_H,wall),Bodies.rectangle(CONFIG.LOGICAL_W/2,p.bottom+18,p.right-p.left+72,36,wall)]);Events.on(engine,"collisionStart",onCollision);Events.on(engine,"afterUpdate",afterUpdate)}
function makeBody(level,x,y,settled){var r=radius(level),b=Bodies.circle(x,y,r,{restitution:CONFIG.physics.restitution,friction:CONFIG.physics.friction,frictionAir:CONFIG.physics.frictionAir,density:.0016});Body.setInertia(b,Infinity);b.plugin.park={level:level,uid:uid++,mergeLocked:false,safe:!!settled,landed:!!settled,dangerAt:null,visualAngle:0,popUntil:performance.now()+240,generation:generation};bodies.push(b);World.add(world,b);highest=Math.max(highest,level);updateProgress();return b}
function spawnPending(now){if(state!=="PLAYING"||pending)return;pending={level:currentLevel,x:CONFIG.LOGICAL_W/2};pendingAt=now;drawNext()}
function drop(){if(state!=="PLAYING"||!pending)return false;var q=pending;pending=null;var b=makeBody(q.level,q.x,CONFIG.play.spawnY,false);Body.setVelocity(b,{x:0,y:.6});sound("drop");currentLevel=nextLevel;nextLevel=drawLevel();nextSpawnAt=performance.now()+CONFIG.spawnDelayMs;drawNext();return true}
function onCollision(ev){if(state!=="PLAYING")return;ev.pairs.forEach(function(pair){var a=pair.bodyA.plugin.park,b=pair.bodyB.plugin.park;if(a)a.landed=true;if(b)b.landed=true;if(!a||!b||a.level!==b.level||a.mergeLocked||b.mergeLocked)return;a.mergeLocked=b.mergeLocked=true;mergeQueue.push({a:pair.bodyA,b:pair.bodyB,level:a.level})})}
function exists(b){return Composite.get(world,b.id,"body")===b}
function afterUpdate(){
  if(!mergeQueue.length||state!=="PLAYING")return;
  var q=mergeQueue.splice(0);q.sort(function(x,y){return x.a.id-y.a.id});
  q.forEach(function(m){
    if(!exists(m.a)||!exists(m.b))return;
    removeBody(m.a);removeBody(m.b);
    var x=(m.a.position.x+m.b.position.x)/2,y=(m.a.position.y+m.b.position.y)/2,p=park(m.level);
    score+=p.score;updateScore();
    visuals.merge(x,y,Math.min(7,m.level+1),p.score,m.level===7,performance.now());
    if(m.level===7){showToast("동부권역 완성!","bonus",1500,"+500 BONUS · 새로운 탐험을 이어가세요");sound("win");return}
    var n=makeBody(m.level+1,x,y,true),vx=(m.a.velocity.x+m.b.velocity.x)*.18,vy=(m.a.velocity.y+m.b.velocity.y)*.18;
    Body.setVelocity(n,{x:vx,y:vy});
    var created=park(m.level+1),firstFinal=created.level===7&&!finalAchieved;
    if(created.level===7)finalAchieved=true;
    showToast(firstFinal?"한려해상국립공원 완성!":created.name+"!",firstFinal?"special":"",firstFinal?1500:800,firstFinal?"동부권역 최종 단계 달성":created.area.toFixed(3)+" km² · +"+p.score);
    sound(firstFinal?"win":"merge",created.level);
  });
}
function removeBody(b){World.remove(world,b);var i=bodies.indexOf(b);if(i>=0)bodies.splice(i,1)}
function burst(x,y,level){var colors=[park(Math.min(level,7)).color,"#f5cf68","#fff"];for(var i=0;i<10+level*2;i++)particles.push({x:x,y:y,vx:(Math.random()-.5)*(2+level*.2),vy:(Math.random()-.8)*(2+level*.2),life:500+Math.random()*350,color:colors[i%3],size:2+Math.random()*4})}
function updateScore(){ui.score.textContent=score.toLocaleString("ko-KR")}
function showToast(text,cls,dur,detail){ui.toast.textContent="";var title=document.createElement("strong"),sub=document.createElement("span");title.textContent=text;sub.textContent=detail||"";ui.toast.appendChild(title);ui.toast.appendChild(sub);ui.toast.className="toast "+(cls||"");ui.toast.style.setProperty("--toast-duration",(dur||900)+"ms");void ui.toast.offsetWidth;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){ui.toast.className="toast"},dur||900)}
function start(){cleanup();state="PLAYING";score=0;highest=1;finalAchieved=false;uid=1;physicsAccumulator=0;rng=CONFIG.seed===null?Math.random:seeded(CONFIG.seed);currentLevel=drawLevel();nextLevel=drawLevel();nextSpawnAt=0;startedAt=performance.now();lastNow=startedAt;updateScore();buildProgress();initWorld();ui.start.classList.remove("active");ui.end.classList.remove("active");ui.timeBox.classList.toggle("hidden",CONFIG.GAME_MODE!=="180SEC");spawnPending(startedAt);raf=requestAnimationFrame(loop);audio()}
function drawResult(){var c=$("#resultCanvas");if(!c)return;var cx=c.getContext("2d");cx.clearRect(0,0,c.width,c.height);drawPark(cx,highest,c.width/2,c.height/2,c.width*.88,0,1)}
function finish(reason){if(state!=="PLAYING")return;state=reason;sound("over");pending=null;pointer=null;ui.endLabel.textContent=reason==="TIME_OVER"?"TIME OVER":"GAME OVER";ui.endTitle.textContent=park(highest).short+"까지 함께했어요!";ui.finalScore.textContent=score.toLocaleString("ko-KR");ui.highest.textContent=highest+"단계 · "+park(highest).short;var message=$("#resultMessage");if(message)message.textContent=highest===7?"일곱 공원의 세계를 완성했어요.":"한려해상까지 "+(7-highest)+"단계 남았어요. 다시 도전해 보세요!";drawResult();ui.end.classList.add("active")}
function restart(){start()}
function update(now,dt){if(state!=="PLAYING")return;if(!pending&&now>=nextSpawnAt)spawnPending(now);if(pending&&now-pendingAt>=CONFIG.autoDropMs)drop();var dangerTimes=[];bodies.forEach(function(b){var d=b.plugin.park;if(!d.safe&&b.bounds.min.y>CONFIG.play.dangerY+4)d.safe=true;d.visualAngle+=(Math.max(-.262,Math.min(.262,b.velocity.x*.025))-d.visualAngle)*.12;var above=(d.safe||d.landed)&&b.bounds.min.y<CONFIG.play.dangerY;if(above){if(d.dangerAt===null)d.dangerAt=now;dangerTimes.push(d.dangerAt)}else d.dangerAt=null});dangerSince=dangerTimes.length?Math.min.apply(Math,dangerTimes):null;if(dangerTimes.some(function(t){return now-t>=CONFIG.dangerHoldMs}))finish("GAME_OVER");if(CONFIG.GAME_MODE==="180SEC"){var left=Math.max(0,CONFIG.modeSeconds-(now-startedAt)/1000),whole=Math.ceil(left);ui.time.textContent=String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");if(left<=0)finish("TIME_OVER")}particles.forEach(function(p){p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vy+=.035*dt/16;p.life-=dt});particles=particles.filter(function(p){return p.life>0})}
function loop(now){var step=1000/60,dt=Math.min(50,now-lastNow||step);lastNow=now;if(state==="PLAYING"){physicsAccumulator=Math.min(50,physicsAccumulator+dt);while(physicsAccumulator>=step){Engine.update(engine,step);physicsAccumulator-=step}update(now,dt)}render(now);raf=requestAnimationFrame(loop)}
function coverImage(c,im,x,y,size,angle){c.save();c.translate(x,y);c.rotate(angle||0);c.beginPath();c.arc(0,0,size/2-2,0,Math.PI*2);c.clip();var ratio=im.naturalWidth/im.naturalHeight,w=size,h=size;if(ratio>1)w=size*ratio;else h=size/ratio;c.drawImage(im,-w/2,-h/2,w,h);c.restore()}
function fallback(c,p,x,y,size){c.save();c.translate(x,y);c.beginPath();c.arc(0,0,size/2,0,Math.PI*2);c.fillStyle=p.color;c.fill();c.strokeStyle="#fff";c.lineWidth=Math.max(3,size*.045);c.stroke();c.fillStyle="#fff";c.textAlign="center";c.font="bold "+Math.max(12,size*.22)+"px Malgun Gothic";c.fillText(p.level+"단계",0,-2);c.font="bold "+Math.max(10,size*.16)+"px Malgun Gothic";c.fillText(p.short,0,size*.22);c.restore()}
function drawPark(c,level,x,y,size,angle,pop){visuals.drawPark(c,park(level),images[level],x,y,size,angle,pop)}
function drawNext(){nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);var lv=pending?nextLevel:currentLevel;drawPark(nctx,lv,46,46,76,0,1);var name=$("#nextName");if(name)name.textContent=park(lv).short;nextCanvas.setAttribute("aria-label","다음 "+park(lv).name)}
function render(now){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  var p=CONFIG.play;visuals.background(ctx,canvas.width,canvas.height,p,now,dangerSince!==null);
  visuals.drawEffects(ctx,now,false,canvas.width,canvas.height);
  bodies.forEach(function(b){var d=b.plugin.park,pop=!visuals.reduced&&now<d.popUntil?1+.2*Math.sin((d.popUntil-now)/240*Math.PI):1;drawPark(ctx,d.level,b.position.x,b.position.y,radius(d.level)*2,d.visualAngle,pop)});
  if(pending){var hint=!visuals.reduced&&now-pendingAt>CONFIG.autoDropMs-420?Math.sin(now/45)*2:0;drawPark(ctx,pending.level,pending.x,p.spawnY+hint,radius(pending.level)*2,0,1)}
  visuals.drawEffects(ctx,now,true,canvas.width,canvas.height);
}
function logicalX(clientX){var r=canvas.getBoundingClientRect();return Math.max(CONFIG.play.left+radius(pending?pending.level:1),Math.min(CONFIG.play.right-radius(pending?pending.level:1),(clientX-r.left)*canvas.width/r.width))}
canvas.addEventListener("pointerdown",function(e){if(state!=="PLAYING"||!pending)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:0};pending.x=logicalX(e.clientX)});
canvas.addEventListener("pointermove",function(e){if(state!=="PLAYING"||!pending)return;if(e.pointerType==="mouse"&&!pointer){pending.x=logicalX(e.clientX);return}if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();pointer.moved=Math.max(pointer.moved,Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y));pending.x=logicalX(e.clientX)});
canvas.addEventListener("pointerup",function(e){if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();var tap=pointer.moved<10&&performance.now()-pointer.t<350;pointer=null;if(tap)drop()});canvas.addEventListener("pointercancel",function(){pointer=null});
document.addEventListener("keydown",function(e){if(state!=="PLAYING")return;if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&pending){e.preventDefault();var step=e.shiftKey?22:11,p=park(pending.level),r=radius(p.level);pending.x=Math.max(CONFIG.play.left+r,Math.min(CONFIG.play.right-r,pending.x+(e.key==="ArrowLeft"?-step:step)))}else if((e.code==="Space"||e.key===" ")&&!e.repeat){e.preventDefault();drop()}else if(e.key.toLowerCase()==="r"){e.preventDefault();restart()}});
$("#startBtn").addEventListener("click",start);$("#retryBtn").addEventListener("click",restart);$("#restartBtn").addEventListener("click",function(){if(state!=="START"&&confirm("현재 게임을 다시 시작할까요?"))restart()});ui.sound.addEventListener("click",function(){muted=!muted;ui.sound.textContent=muted?"🔇 소리":"🔊 소리";ui.sound.setAttribute("aria-label",muted?"소리 켜기":"소리 끄기");if(!muted)audio()});
function fitScreen(){var scale=Math.min(Math.max(1,window.innerWidth-16)/720,Math.max(1,window.innerHeight-16)/1280),v=$("#viewport");$("#app").style.transform="scale("+scale+")";v.style.width=720*scale+"px";v.style.height=1280*scale+"px"}
window.addEventListener("resize",fitScreen);fitScreen();loadImages();buildProgress();drawNext();render(0);
window.__NP_GAME__={CONFIG:CONFIG,PARKS:PARKS,start:start,restart:restart,drop:drop,drawLevels:function(n){var out=[];while(n-->0)out.push(drawLevel());return out},forceSpawn:function(level,x,y){if(state!=="PLAYING")start();return makeBody(level,x||360,y||300,true)},snapshot:function(){return{state:state,score:score,highest:highest,current:currentLevel,next:nextLevel,pending:pending&&pending.level,dynamicBodies:bodies.map(function(b){return{level:b.plugin.park.level,x:b.position.x,y:b.position.y,locked:b.plugin.park.mergeLocked}})}}};
})();
