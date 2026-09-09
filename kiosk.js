(function(){
  "use strict";
  var end=document.getElementById("endOverlay");
  var home=document.getElementById("homeBtn");
  var retry=document.getElementById("retryBtn");
  var hint=document.getElementById("returnHint");
  var timer=0,interval=0,left=15;

  function clearTimers(){
    if(timer)clearTimeout(timer);
    if(interval)clearInterval(interval);
    timer=0;interval=0;left=15;
    if(hint)hint.textContent="";
  }
  function goHome(){
    clearTimers();
    var base=location.pathname;
    location.replace(base+"?kiosk=7");
  }
  function startCountdown(){
    clearTimers();
    left=15;
    if(hint)hint.textContent=left+"초 후 시작 화면으로 돌아갑니다.";
    interval=setInterval(function(){
      left--;
      if(hint)hint.textContent=left>0?left+"초 후 시작 화면으로 돌아갑니다.":"다음 플레이어를 위해 시작 화면으로 돌아갑니다.";
      if(left<=0){clearInterval(interval);interval=0;}
    },1000);
    timer=setTimeout(goHome,15000);
  }

  if(home)home.addEventListener("click",goHome);
  if(retry)retry.addEventListener("click",clearTimers);
  if(end){
    new MutationObserver(function(){
      if(end.classList.contains("active"))startCountdown();
      else clearTimers();
    }).observe(end,{attributes:true,attributeFilter:["class"]});
  }
})();
