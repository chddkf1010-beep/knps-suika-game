(function() {
  'use strict';
  var status = document.getElementById('offlineStatus');
  function say(text) { status.textContent = text; }
  if (!('serviceWorker' in navigator)) {
    say('이 브라우저에서는 오프라인 저장을 지원하지 않아요. 인터넷 연결을 유지해 주세요.');
    return;
  }
  say('오프라인 사용을 준비하고 있어요. 잠시 연결을 유지해 주세요…');
  var timeout = setTimeout(function() {
    say('오프라인 저장이 아직 완료되지 않았어요. 연결한 상태에서 다시 열어 주세요.');
  }, 60000);
  function check() {
    var worker = navigator.serviceWorker.controller;
    if (!worker) return;
    var channel = new MessageChannel();
    var replyTimeout = setTimeout(function() { channel.port1.close(); }, 10000);
    channel.port1.onmessage = function(event) {
      clearTimeout(replyTimeout); clearTimeout(timeout); channel.port1.close();
      say(event.data.ready ? '오프라인 준비 완료 · 이제 핫스팟을 꺼도 이용할 수 있어요.' :
        '오프라인 저장이 완전하지 않아요. 인터넷 연결을 유지해 주세요.');
    };
    worker.postMessage('OFFLINE_STATUS', [channel.port2]);
  }
  navigator.serviceWorker.addEventListener('controllerchange', check);
  navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(function() {
    check();
  }).catch(function() {
    if (navigator.serviceWorker.controller) { check(); return; }
    clearTimeout(timeout);
    say('오프라인 저장을 완료하지 못했어요. 연결을 유지하고 다시 열어 주세요.');
  });
}());
