(function(){
"use strict";
var Engine=Matter.Engine, World=Matter.World, Bodies=Matter.Bodies, Body=Matter.Body, Events=Matter.Events, Composite=Matter.Composite;

var CONFIG={
  GAME_MODE:"FREE", LOGICAL_W:720, LOGICAL_H:920,
  play:{left:34,right:686,top:0,bottom:916,dangerY:142,spawnY:58},
  autoDropMs:4000,spawnDelayMs:420,dangerHoldMs:2000,MERGE_DANGER_GRACE_TIME:2500,modeSeconds:180,
  physics:{gravity:1.05,restitution:.08,friction:.32,frictionAir:.012},
  direct:[{level:1,weight:.5},{level:2,weight:.3},{level:3,weight:.2}],seed:null
};
var PARKS=[
 {level:1,key:"geumjeongsan",short:"금정산",name:"금정산국립공원",image:"assets/characters/01_geumjeongsan_hq.webp",diameter:.085,color:"#c89558",area:66.136,score:10},
 {level:2,key:"gayasan",short:"가야산",name:"가야산국립공원",image:"assets/characters/02_gayasan_hq.webp",diameter:.108,color:"#d59655",area:76.792,score:30},
 {level:3,key:"juwangsan",short:"주왕산",name:"주왕산국립공원",image:"assets/characters/03_juwangsan_eagleowl.webp",diameter:.135,color:"#9d7557",area:106.114,score:60},
 {level:4,key:"palgongsan",short:"팔공산",name:"팔공산국립공원",image:"assets/characters/04_palgongsan_hq.webp",diameter:.165,color:"#75523c",area:126.058,score:100},
 {level:5,key:"gyeongju",short:"경주",name:"경주국립공원",image:"assets/characters/05_gyeongju_hq.webp",diameter:.20,color:"#ce743f",area:136.550,score:150},
 {level:6,key:"jirisan",short:"지리산",name:"지리산국립공원",image:"assets/characters/06_jirisan_hq.webp",diameter:.242,color:"#293830",area:483.022,score:250},
 {level:7,key:"hallyeo",short:"한려해상",name:"한려해상국립공원",image:"assets/characters/07_hallyeohaesang_hq.webp",diameter:.285,color:"#267d87",area:537.479,score:500},
 {level:8,key:"eastern",short:"동부지역본부",name:"동부지역본부",image:"assets/characters/08_eastern_eagleowl.webp",diameter:.32,color:"#b88b32",area:null,score:1000}
];
var stories=[
["고리도롱뇽은 우리나라에서만 만날 수 있어요!","고리도롱뇽은 습한 산림과 계곡 주변에 사는 우리나라 고유 양서류예요.\n앞발가락은 4개, 뒷발가락은 5개이며 물과 숲이 이어진 깨끗한 환경이 필요해요."],
["삵은 숲속 동물들의 수를 조절하는 포식자예요!","삵은 숲에 사는 고양잇과 포유류로 작은 포유류와 새 등을 잡아먹어요.\n먹이그물에서 포식자 역할을 하며 생태계의 균형을 유지하는 데 도움을 줘요."],
["수리부엉이는 소리 없이 날아 먹잇감에 접근해요!","수리부엉이는 주로 밤에 활동하는 대형 맹금류예요.\n뛰어난 시각과 청각, 비행 소리를 줄여 주는 깃털 덕분에 어둠 속에서도 먹잇감에 조용히 접근할 수 있어요."],
["담비 한 마리가 넓은 숲을 누비며 살아가요!","담비는 산림에 사는 족제비과 포유류로 발가락은 5개예요.\n활동 범위가 넓어 숲이 잘 이어져 있어야 자유롭게 이동하며 먹이를 찾을 수 있어요."],
["원앙은 사실 바람둥이일지도 몰라요!","원앙은 하천과 호수 주변에 사는 조류로 번식기에 짝을 이루어요.\n흔히 평생 같은 짝과 산다고 알려져 있지만, 다음 번식기에는 새로운 짝을 만날 수도 있어요."],
["반달가슴곰의 가슴무늬는 사람의 지문 역할을 해요!","반달가슴곰은 산림에 사는 포유류로 앞발에는 5개의 발가락이 있어요.\n가슴의 흰색 반달무늬는 개체마다 모양과 크기가 달라 각 개체를 구별하는 데 활용할 수 있어요."],
["팔색조는 땅 위를 뛰어다니며 먹이를 찾아요!","팔색조는 숲에 사는 여름철새로 화려한 깃털을 가지고 있어요.\n나무 위에만 있을 것 같지만 숲 바닥의 낙엽 사이를 돌아다니며 지렁이와 작은 동물을 찾아 먹어요."],
["일곱 국립공원이 하나로 모였어요!","금정산부터 한려해상까지 국립공원 동부지역에 속하는 공원들이에요.\n일곱 공원 중 몇 곳이나 탐방해 봤나요? 힘들고 지치는 날이라면 국립공원 여행 어때요?"]];
PARKS.forEach(function(p,i){p.headline=stories[i][0];p.description=stories[i][1]});
var $=function(s){return document.querySelector(s)}, canvas=$("#gameCanvas"),ctx=canvas.getContext("2d"),nextCanvas=$("#nextCanvas"),nctx=nextCanvas.getContext("2d");
var ui={score:$("#score"),timeBox:$("#timeBox"),time:$("#time"),toast:$("#toast"),start:$("#startOverlay"),end:$("#endOverlay"),endLabel:$("#endLabel"),endTitle:$("#endTitle"),finalScore:$("#finalScore"),highest:$("#highestPark"),progress:$("#progress"),sound:$("#soundBtn")};
var images={},engine=null,world=null,raf=0,state="START",generation=0,bodies=[],particles=[],mergeQueue=[],uid=1,score=0,highest=0,currentLevel=1,nextLevel=1,pending=null,pendingAt=0,nextSpawnAt=0,dangerSince=null,startedAt=0,lastNow=0,physicsAccumulator=0,muted=false,audioCtx=null,rng=Math.random,pointer=null,toastTimer=0,finalAchieved=false,visuals=window.ParkVisuals;
var acquired=new Set(),pausedAt=null,pausedTotal=0,resumeTimer=0,returnFocus=null;
var discoveredParks=new Set(),discoveryQueue=[],dialog=null,dialogOpenedAt=0,revealAt=0,revealDuration=0,revealLevel=0,lastRevealNow=0,finaleAt=0,tutorialFromGame=false,collectionOpen=false,infoFromCollection=false,inputReadyAt=0;
function guarded(){return performance.now()<inputReadyAt}
function armGuard(){dialogOpenedAt=performance.now();inputReadyAt=dialogOpenedAt+450}
function gameNow(){return (pausedAt===null?performance.now():pausedAt)-pausedTotal}

function park(level){return PARKS[level-1]} function radius(level){return CONFIG.LOGICAL_W*park(level).diameter/2}
function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function drawLevel(){var x=rng(),sum=0;for(var i=0;i<CONFIG.direct.length;i++){sum+=CONFIG.direct[i].weight;if(x<sum)return CONFIG.direct[i].level}return 3}
function loadImages(){PARKS.forEach(function(p){var im=new Image();images[p.level]=im;im.onload=im.onerror=function(){drawNext();drawProgressImages();drawResult();if(state==="START")render(0)};im.src=p.image})}
function buildProgress(){ui.progress.innerHTML="";PARKS.forEach(function(p){var d=document.createElement("button");d.type="button";d.className="step";d.dataset.level=p.level;d.innerHTML='<canvas width="88" height="88" aria-hidden="true"></canvas><i>'+p.level+'</i><span>'+p.short+'</span>';d.addEventListener("click",function(){openInfo(p.level)});ui.progress.appendChild(d)});updateProgress();drawProgressImages()}
function drawProgressImages(){document.querySelectorAll(".step").forEach(function(x){var c=x.querySelector("canvas"),cx=c.getContext("2d");cx.clearRect(0,0,88,88);drawPark(cx,+x.dataset.level,44,43,74,0,1)})}
function updateProgress(){document.querySelectorAll(".step").forEach(function(x){var level=+x.dataset.level,on=acquired.has(level);if(on&&!x.classList.contains("on")&&state==="PLAYING"){x.classList.add("newly-unlocked")}x.classList.toggle("on",on);x.classList.toggle("current",level===highest);x.disabled=!on;x.setAttribute("aria-label",level+"단계 "+park(level).name+(on?" 정보 보기":" 미달성"))});var count=$("#collectionCount");if(count)count.textContent=acquired.size+" / 8"}
function audio(){if(muted)return null;if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(freq,dur,type,vol,delay){var a=audio();if(!a)return;var o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);o.type=type||"sine";o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol||.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur)}
function sound(kind,level){if(kind==="drop")tone(240,.07,"sine",.025);else if(kind==="merge"){tone(420+level*35,.12,"sine",.035);tone(630+level*30,.14,"sine",.025,.045)}else if(kind==="win"){tone(523,.18,"sine",.04);tone(659,.18,"sine",.04,.14);tone(784,.28,"sine",.04,.28)}else if(kind==="over"){tone(330,.22,"triangle",.03);tone(220,.3,"triangle",.03,.18)}}
function cleanup(){pendingAt=nextSpawnAt=startedAt=lastNow=0;revealAt=revealDuration=revealLevel=lastRevealNow=finaleAt=0;returnFocus=null;physicsAccumulator=0;uid=1;infoFromResult=false;infoFromCollection=false;dialog=null;discoveryQueue=[];discoveredParks.clear();collectionOpen=false;tutorialFromGame=false;["#tutorialOverlay","#finaleOverlay","#collectionOverlay"].forEach(function(id){if($(id))$(id).classList.remove("active","playing")});generation++;if(raf)cancelAnimationFrame(raf);raf=0;clearTimeout(resumeTimer);resumeTimer=0;pausedAt=null;pausedTotal=0;var info=$("#infoOverlay");if(info)info.classList.remove("active");document.body.classList.remove("game-paused");if(engine){Events.off(engine);Composite.clear(world,false,true);Engine.clear(engine)}engine=null;world=null;bodies=[];particles=[];mergeQueue=[];pending=null;pointer=null;dangerSince=null;clearTimeout(toastTimer);ui.toast.className="toast";ui.toast.textContent="";visuals.clear()}
function initWorld(){engine=Engine.create();world=engine.world;engine.gravity.y=CONFIG.physics.gravity;var p=CONFIG.play,wall={isStatic:true,restitution:0,friction:.4,render:{visible:false}};World.add(world,[Bodies.rectangle(p.left-18,CONFIG.LOGICAL_H/2,36,CONFIG.LOGICAL_H,wall),Bodies.rectangle(p.right+18,CONFIG.LOGICAL_H/2,36,CONFIG.LOGICAL_H,wall),Bodies.rectangle(CONFIG.LOGICAL_W/2,p.bottom+18,p.right-p.left+72,36,wall)]);Events.on(engine,"collisionStart",onCollision);Events.on(engine,"afterUpdate",afterUpdate)}
function makeBody(level,x,y,settled,mergeCreated){var r=radius(level),now=gameNow(),b=Bodies.circle(x,y,r,{restitution:CONFIG.physics.restitution,friction:CONFIG.physics.friction,frictionAir:CONFIG.physics.frictionAir,density:.0016});Body.setInertia(b,Infinity);b.plugin.park={level:level,uid:uid++,mergeLocked:false,safe:!!settled,landed:!!settled,dangerAt:null,dangerGraceUntil:mergeCreated?now+CONFIG.MERGE_DANGER_GRACE_TIME:0,visualAngle:0,popUntil:now+240,generation:generation};bodies.push(b);World.add(world,b);if(!discoveredParks.has(level)&&level<8){discoveredParks.add(level);discoveryQueue.push(level)}acquired.add(level);highest=Math.max(highest,level);updateProgress();return b}
function spawnPending(now){if(state!=="PLAYING"||pending)return;pending={level:currentLevel,x:CONFIG.LOGICAL_W/2};pendingAt=now;drawNext()}
function drop(){if(state!=="PLAYING"||!pending||guarded())return false;var q=pending;pending=null;var b=makeBody(q.level,q.x,CONFIG.play.spawnY,false);Body.setVelocity(b,{x:0,y:.6});sound("drop");currentLevel=nextLevel;nextLevel=drawLevel();nextSpawnAt=gameNow()+CONFIG.spawnDelayMs;drawNext();beginDiscovery();return true}
function onCollision(ev){if(state!=="PLAYING"&&state!=="REVEAL")return;ev.pairs.forEach(function(pair){var a=pair.bodyA.plugin.park,b=pair.bodyB.plugin.park;if(a)a.landed=true;if(b)b.landed=true;if(!a||!b||a.level>=8||a.level!==b.level||a.mergeLocked||b.mergeLocked)return;a.mergeLocked=b.mergeLocked=true;mergeQueue.push({a:pair.bodyA,b:pair.bodyB,level:a.level})})}
function exists(b){return Composite.get(world,b.id,"body")===b}
function afterUpdate(){
  if(!mergeQueue.length||state!=="PLAYING")return;
  var effectLevel=0,q=mergeQueue.splice(0);q.sort(function(x,y){return x.a.id-y.a.id});
  q.forEach(function(m){
    if(state!=="PLAYING"||!exists(m.a)||!exists(m.b))return;
    removeBody(m.a);removeBody(m.b);
    var x=(m.a.position.x+m.b.position.x)/2,y=(m.a.position.y+m.b.position.y)/2,p=park(m.level);
    score+=p.score;updateScore();
    visuals.merge(x,y,Math.min(8,m.level+1),p.score,m.level===7,gameNow());
    if(m.level===7){makeBody(8,x,y,true,true);finalAchieved=true;beginFinale(m.a,m.b);return}
    var n=makeBody(m.level+1,x,y,true,true),vx=(m.a.velocity.x+m.b.velocity.x)*.18,vy=(m.a.velocity.y+m.b.velocity.y)*.18;
    Body.setVelocity(n,{x:vx,y:vy});
    effectLevel=Math.max(effectLevel,m.level+1);var created=park(m.level+1),firstFinal=created.level===7;
    showToast(firstFinal?"한려해상국립공원 완성!":created.name+"!",firstFinal?"special":"",firstFinal?1500:800,firstFinal?"한 번 더 합쳐 동부권역을 완성하세요!":"새로운 도장 발견 · +"+p.score);
    sound(firstFinal?"win":"merge",created.level);
  });
  if(state==="PLAYING"){if(discoveryQueue.length)beginDiscovery();else if(effectLevel>=5)beginReveal(effectLevel,false)}
}
function removeBody(b){World.remove(world,b);var i=bodies.indexOf(b);if(i>=0)bodies.splice(i,1)}
function burst(x,y,level){var colors=[park(Math.min(level,7)).color,"#f5cf68","#fff"];for(var i=0;i<10+level*2;i++)particles.push({x:x,y:y,vx:(Math.random()-.5)*(2+level*.2),vy:(Math.random()-.8)*(2+level*.2),life:500+Math.random()*350,color:colors[i%3],size:2+Math.random()*4})}
function updateScore(){ui.score.textContent=score.toLocaleString("ko-KR")}
function showToast(text,cls,dur,detail){ui.toast.textContent="";var title=document.createElement("strong"),sub=document.createElement("span");title.textContent=text;sub.textContent=detail||"";ui.toast.appendChild(title);ui.toast.appendChild(sub);ui.toast.className="toast "+(cls||"");ui.toast.style.setProperty("--toast-duration",(dur||900)+"ms");void ui.toast.offsetWidth;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){ui.toast.className="toast"},dur||900)}
function start(){cleanup();state="PLAYING";score=0;highest=0;acquired.clear();finalAchieved=false;uid=1;physicsAccumulator=0;rng=CONFIG.seed===null?Math.random:seeded(CONFIG.seed);currentLevel=drawLevel();nextLevel=drawLevel();nextSpawnAt=0;startedAt=gameNow();lastNow=startedAt;updateScore();buildProgress();initWorld();ui.start.classList.remove("active");ui.end.classList.remove("active");ui.timeBox.classList.toggle("hidden",CONFIG.GAME_MODE!=="180SEC");spawnPending(startedAt);raf=requestAnimationFrame(loop);audio()}
function drawResult(){var c=$("#resultCanvas");if(!c)return;var cx=c.getContext("2d");cx.clearRect(0,0,c.width,c.height);if(highest)drawPark(cx,highest,c.width/2,c.height/2,c.width*.88,0,1)}
function finish(reason){if(finalAchieved&&reason!=="SUCCESS")return;if(reason==="SUCCESS"&&state==="PLAYING"){beginFinale();return}if(state!=="PLAYING"&&!(state==="COMPLETING"&&reason==="SUCCESS"))return;state=reason;var success=reason==="SUCCESS";if(!success)sound("over");pending=null;pointer=null;ui.endLabel.textContent=success?"ALL PARKS DISCOVERED":reason==="TIME_OVER"?"TIME OVER":"EXPLORE AGAIN";ui.endTitle.textContent=success?"동부권역 완성!":"탐방을 마쳤어요";ui.finalScore.textContent=score.toLocaleString("ko-KR");ui.highest.textContent=highest?highest+"단계 · "+park(highest).short:"아직 발견한 공원이 없어요";var message=$("#resultMessage");if(message)message.textContent=success?"일곱 공원이 함께하는 동부권역을 완성했어요!":"도장 "+acquired.size+"개를 발견했어요. 다음 탐방에도 함께해요!";drawResult();var stamps=$("#resultStamps");if(stamps){stamps.textContent="";PARKS.forEach(function(p){var s=document.createElement("span");s.className=acquired.has(p.level)?"earned":"";s.textContent=p.short;stamps.appendChild(s)})}$("#finalStoryBtn").hidden=!success;ui.end.classList.toggle("success",success);ui.end.classList.add("active");dialog="result";armGuard();if($("#endActions"))$("#endActions").hidden=false;$("#retryBtn").focus()}
function restart(){cleanup();state="START";score=0;highest=0;acquired.clear();finalAchieved=false;physicsAccumulator=0;currentLevel=nextLevel=1;updateScore();buildProgress();drawNext();drawResult();ui.end.classList.remove("active","success");ui.start.classList.add("active");render(0);$("#startBtn").focus()}
function pause(){if(state!=="PLAYING")return false;pausedAt=performance.now();state="PAUSED";pointer=null;clearTimeout(toastTimer);ui.toast.classList.remove("show");document.body.classList.add("game-paused");return true}
var infoFromResult=false;
function beginDiscovery(){
 if(state!=="PLAYING"||!discoveryQueue.length)return;
 beginReveal(discoveryQueue[0],true);
}
function beginReveal(level,first){
 revealLevel=level;pause();state="REVEAL";dialog=null;revealAt=performance.now();lastRevealNow=revealAt;revealDuration=first?(revealLevel>=7?1000:revealLevel>=5?750:revealLevel===4?500:180):(revealLevel>=7?650:400);
 if(revealLevel>=5){showToast(park(revealLevel).short+(first?" 발견!":" 합체!"),"special",revealDuration);}
}
function showInfo(level,first){
 var overlay=$("#infoOverlay");returnFocus=document.activeElement;
 $("#infoTitle").textContent=park(level).name;$("#infoHeadline").textContent=park(level).headline;
 $("#infoClose").textContent=infoFromCollection?"도감으로":infoFromResult?"완료 화면으로":"계속하기 →";
 if($("#infoEyebrow"))$("#infoEyebrow").textContent=first?"새로운 국립공원을 발견했어요!":"국립공원 이야기";
 if($("#infoHint"))$("#infoHint").textContent="";
 $("#infoDescription").textContent=park(level).description;$("#infoImage").src=park(level).image;$("#infoImage").alt=park(level).name+" 캐릭터";$("#infoImage").hidden=false;
 overlay.classList.add("active");dialog="info";armGuard();$("#infoClose").focus();
}
function openInfo(level){
 if(guarded()||!acquired.has(level)||state==="COMPLETING"||state==="REVEAL"||$("#infoOverlay").classList.contains("active"))return false;
 var ended=state==="SUCCESS"||state==="GAME_OVER"||state==="TIME_OVER";
 if(!ended&&!pause())return false;
 infoFromResult=ended;infoFromCollection=collectionOpen;showInfo(level,false);return true;
}
function showPause(){if(!pause())return;infoFromResult=false;infoFromCollection=false;dialog="pause";armGuard();$("#infoHeadline").textContent="";if($("#infoEyebrow"))$("#infoEyebrow").textContent="잠시 쉬어가요";$("#infoClose").textContent="계속하기 →";$("#infoHint").textContent="";returnFocus=document.activeElement;$("#infoTitle").textContent="일시정지";$("#infoDescription").textContent="준비되면 계속하기를 눌러 주세요.";$("#infoImage").hidden=true;$("#infoOverlay").classList.add("active");$("#infoClose").focus()}
function resume(){
 if(guarded())return false;
 if(infoFromResult){infoFromResult=false;$("#infoOverlay").classList.remove("active");dialog=infoFromCollection?"collection":"result";infoFromCollection=false;armGuard();if(returnFocus&&returnFocus.isConnected)returnFocus.focus();returnFocus=null;return true}
 if(state!=="PAUSED")return false;$("#infoOverlay").classList.remove("active");dialog=null;
 if(discoveryQueue.length){var level=discoveryQueue.shift();showInfo(level,true);return true}
 state="RESUMING";showToast("잠시 후 계속해요","",1000,"1초 후 탐방을 이어갑니다");resumeTimer=setTimeout(function(){if(state!=="RESUMING")return;pausedTotal+=performance.now()-pausedAt;pausedAt=null;lastNow=gameNow();state="PLAYING";document.body.classList.remove("game-paused");inputReadyAt=performance.now()+100;if(returnFocus&&returnFocus.isConnected)returnFocus.focus();returnFocus=null;if(document.hidden)showPause()},1000);return true;
}
function showTutorial(){if(guarded())return;if(state==="START"){state="TUTORIAL";tutorialFromGame=false}else if(state==="PLAYING"){pause();tutorialFromGame=true}else return;dialog="tutorial";armGuard();$("#tutorialOverlay").classList.add("active");$("#tutorialStart").textContent=tutorialFromGame?"게임으로 돌아가기":"탐험 시작하기";$("#tutorialStart").focus()}
function closeTutorial(){if(guarded()||dialog!=="tutorial")return;$("#tutorialOverlay").classList.remove("active");dialog=null;if(tutorialFromGame){tutorialFromGame=false;resume()}else start()}
function beginFinale(a,b){
 if(state!=="PLAYING")return;pause();state="COMPLETING";finalAchieved=true;pending=null;pointer=null;discoveryQueue=[];dialog="finale";finaleAt=performance.now();armGuard();
 clearTimeout(toastTimer);ui.toast.classList.remove("show");var overlay=$("#finaleOverlay");if(overlay){overlay.classList.add("active");void overlay.offsetWidth;overlay.classList.add("playing");overlay.style.setProperty("--merge-a-x",a?((a.position.x-360)/720*100)+"%":"-20%");overlay.style.setProperty("--merge-b-x",b?((b.position.x-360)/720*100)+"%":"20%");}
 if($("#endActions"))$("#endActions").hidden=true;sound("win",8);
}
function showCollection(){if(guarded()||["SUCCESS","GAME_OVER","TIME_OVER"].indexOf(state)===-1||dialog!=="result")return;var list=$("#collectionItems");list.textContent="";PARKS.forEach(function(p){var button=document.createElement("button");button.type="button";button.className="collection-item";button.innerHTML='<img src="'+p.image+'" alt=""><span>'+p.short+'</span>';button.disabled=!acquired.has(p.level);button.addEventListener("click",function(){openInfo(p.level)});list.appendChild(button)});collectionOpen=true;dialog="collection";armGuard();$("#collectionOverlay").classList.add("active");$("#collectionClose").focus()}
function closeCollection(){if(guarded()||dialog!=="collection")return;collectionOpen=false;dialog="result";$("#collectionOverlay").classList.remove("active");armGuard();$("#collectionBtn").focus()}
function update(now,dt){if(state!=="PLAYING")return;if(mergeQueue.length){afterUpdate();if(state!=="PLAYING")return}if(!pending&&now>=nextSpawnAt)spawnPending(now);if(pending&&now-pendingAt>=CONFIG.autoDropMs)drop();if(state!=="PLAYING")return;var dangerTimes=[];bodies.forEach(function(b){var d=b.plugin.park;if(!d.safe&&b.bounds.min.y>CONFIG.play.dangerY+4)d.safe=true;d.visualAngle+=(Math.max(-.262,Math.min(.262,b.velocity.x*.025))-d.visualAngle)*.12;var above=(d.safe||d.landed)&&b.bounds.min.y<CONFIG.play.dangerY;if(now<d.dangerGraceUntil){d.dangerAt=null;return}if(above){if(d.dangerAt===null)d.dangerAt=now;dangerTimes.push(d.dangerAt)}else d.dangerAt=null});dangerSince=dangerTimes.length?Math.min.apply(Math,dangerTimes):null;if(dangerTimes.some(function(t){return now-t>=CONFIG.dangerHoldMs}))finish("GAME_OVER");if(CONFIG.GAME_MODE==="180SEC"){var left=Math.max(0,CONFIG.modeSeconds-(now-startedAt)/1000),whole=Math.ceil(left);ui.time.textContent=String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");if(left<=0)finish("TIME_OVER")}particles.forEach(function(p){p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vy+=.035*dt/16;p.life-=dt});particles=particles.filter(function(p){return p.life>0})}
function loop(){var now=gameNow(),step=1000/60,dt=Math.min(50,now-lastNow||step);lastNow=now;
 if(state==="PLAYING"){physicsAccumulator=Math.min(50,physicsAccumulator+dt);while(physicsAccumulator>=step&&state==="PLAYING"){Engine.update(engine,step);physicsAccumulator-=step}update(now,dt)}
 if(state==="REVEAL"){
  var realNow=performance.now(),elapsed=realNow-revealAt;
  if(revealLevel>=5&&elapsed<(revealLevel>=7?500:280)&&!document.hidden){Engine.update(engine,Math.min(32,realNow-lastRevealNow)*.18)}
  lastRevealNow=realNow;render(now+elapsed);
  if(elapsed>=revealDuration){
   if(discoveryQueue.length){state="PAUSED";visuals.clear();var discovered=discoveryQueue.shift();showInfo(discovered,true)}
   else{pausedTotal+=performance.now()-pausedAt;pausedAt=null;lastNow=gameNow();state="PLAYING";document.body.classList.remove("game-paused");if(document.hidden)showPause()}
  }
 }else if(state==="COMPLETING"){
  if(performance.now()-finaleAt>=4000){if($("#finaleOverlay"))$("#finaleOverlay").classList.remove("active","playing");finish("SUCCESS")}
 }else if(state!=="PAUSED"&&state!=="RESUMING")render(now);
 if(["PLAYING","PAUSED","RESUMING","REVEAL","COMPLETING"].indexOf(state)!==-1)raf=requestAnimationFrame(loop);else raf=0;
}
function coverImage(c,im,x,y,size,angle){c.save();c.translate(x,y);c.rotate(angle||0);c.beginPath();c.arc(0,0,size/2-2,0,Math.PI*2);c.clip();var ratio=im.naturalWidth/im.naturalHeight,w=size,h=size;if(ratio>1)w=size*ratio;else h=size/ratio;c.drawImage(im,-w/2,-h/2,w,h);c.restore()}
function fallback(c,p,x,y,size){c.save();c.translate(x,y);c.beginPath();c.arc(0,0,size/2,0,Math.PI*2);c.fillStyle=p.color;c.fill();c.strokeStyle="#fff";c.lineWidth=Math.max(3,size*.045);c.stroke();c.fillStyle="#fff";c.textAlign="center";c.font=Math.max(12,size*.22)+"px ParkCanvas";c.fillText(p.level+"단계",0,-2);c.font=Math.max(10,size*.16)+"px ParkCanvas";c.fillText(p.short,0,size*.22);c.restore()}
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
canvas.tabIndex=0;
canvas.addEventListener("pointerdown",function(e){if(state!=="PLAYING"||!pending)return;e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:0};pending.x=logicalX(e.clientX)});
canvas.addEventListener("pointermove",function(e){if(state!=="PLAYING"||!pending)return;if(e.pointerType==="mouse"&&!pointer){pending.x=logicalX(e.clientX);return}if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();pointer.moved=Math.max(pointer.moved,Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y));pending.x=logicalX(e.clientX)});
canvas.addEventListener("pointerup",function(e){if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();var tap=pointer.moved<10&&performance.now()-pointer.t<350;pointer=null;if(tap)drop()});canvas.addEventListener("pointercancel",function(){pointer=null});
document.addEventListener("keydown",function(e){
 if(dialog){
  if(dialog==="finale"){e.preventDefault();return}
  if(e.key==="Tab"){
   var activeOverlay=dialog==="tutorial"?$("#tutorialOverlay"):dialog==="info"||dialog==="pause"?$("#infoOverlay"):dialog==="collection"?$("#collectionOverlay"):$("#endOverlay");
   var buttons=Array.prototype.filter.call(activeOverlay.querySelectorAll("button"),function(button){return !button.disabled&&!button.hidden&&button.getClientRects().length>0});
   if(buttons.length){e.preventDefault();var position=buttons.indexOf(document.activeElement),next=position<0?(e.shiftKey?buttons.length-1:0):(position+(e.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[next].focus()}
  }
  return;
 }
 if(state!=="PLAYING"||guarded()||e.target.closest("button,input,select,textarea,a,[role=dialog]"))return;
 if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&pending){e.preventDefault();var step=e.shiftKey?22:11,r=radius(pending.level);pending.x=Math.max(CONFIG.play.left+r,Math.min(CONFIG.play.right-r,pending.x+(e.key==="ArrowLeft"?-step:step)))}else if((e.code==="Space"||e.key===" ")&&!e.repeat){e.preventDefault();drop()}
});
function bind(id,fn){var element=$(id);if(element)element.addEventListener("click",fn)}
bind("#startBtn",showTutorial);bind("#tutorialStart",closeTutorial);bind("#helpBtn",showTutorial);bind("#retryBtn",function(){if(!guarded()&&state!=="COMPLETING")restart()});bind("#homeBtn",function(){if(!guarded()&&state!=="COMPLETING")restart()});bind("#infoClose",resume);bind("#pauseBtn",function(){if(!guarded())showPause()});bind("#finalStoryBtn",function(){if(dialog==="result")openInfo(8)});bind("#collectionBtn",showCollection);bind("#collectionClose",closeCollection);
ui.sound.addEventListener("click",function(){if(state==="COMPLETING")return;muted=!muted;ui.sound.textContent=muted?"🔇":"🔊";ui.sound.setAttribute("aria-label",muted?"소리 켜기":"소리 끄기");if(!muted)audio()});
// Backdrop touches never dismiss a dialog or leak into the game.
["#infoOverlay","#tutorialOverlay","#finaleOverlay","#collectionOverlay","#endOverlay"].forEach(function(id){var el=$(id);if(el)el.addEventListener("pointerdown",function(e){e.stopPropagation()})});
document.addEventListener("visibilitychange",function(){if(document.hidden&&state==="PLAYING")showPause()});
function fitScreen(){var scale=Math.min(Math.max(1,window.innerWidth-16)/1440,Math.max(1,window.innerHeight-16)/900),v=$("#viewport");$("#app").style.transform="scale("+scale+")";v.style.width=1440*scale+"px";v.style.height=900*scale+"px"}
window.addEventListener("resize",fitScreen);fitScreen();loadImages();buildProgress();drawNext();render(0);
window.__NP_GAME__={CONFIG:CONFIG,PARKS:PARKS,start:start,showTutorial:showTutorial,closeTutorial:closeTutorial,showCollection:showCollection,closeCollection:closeCollection,restart:restart,home:restart,pause:pause,resume:resume,openInfo:openInfo,finish:finish,drop:drop,drawLevels:function(n){var out=[];while(n-->0)out.push(drawLevel());return out},forceSpawn:function(level,x,y){if(!park(level))throw new Error("Invalid park level");if(state==="START")start();if(state!=="PLAYING")throw new Error("Cannot force spawn while paused or completed");return makeBody(level,x===undefined?360:x,y===undefined?300:y,true)},snapshot:function(){var now=gameNow();return{state:state,dialog:dialog,gameCompleted:finalAchieved,discovered:Array.from(discoveredParks),discoveryQueue:discoveryQueue.slice(),inputReadyAt:inputReadyAt,score:score,highest:highest,acquired:Array.from(acquired),current:currentLevel,next:nextLevel,pending:pending&&pending.level,autoDropRemaining:pending?Math.max(0,CONFIG.autoDropMs-(now-pendingAt)):null,spawnRemaining:pending?null:Math.max(0,nextSpawnAt-now),modeRemaining:Math.max(0,CONFIG.modeSeconds*1000-(now-startedAt)),dangerRemaining:dangerSince===null?null:Math.max(0,CONFIG.dangerHoldMs-(now-dangerSince)),dynamicBodies:bodies.map(function(b){var d=b.plugin.park;return{level:d.level,x:b.position.x,y:b.position.y,locked:d.mergeLocked,dangerElapsed:d.dangerAt===null?0:Math.max(0,now-d.dangerAt),dangerGraceRemaining:Math.max(0,d.dangerGraceUntil-now)}})}}};
})();
