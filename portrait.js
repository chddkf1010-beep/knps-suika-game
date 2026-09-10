/* Keep the fixed artboard fitted to a vertically rotated StandByME display. */
(function () {
  'use strict';
  var PORTRAIT_WIDTH = 900;
  var PORTRAIT_HEIGHT = 1600;
  var LANDSCAPE_WIDTH = 1440;
  var LANDSCAPE_HEIGHT = 900;

  function fitPortraitScreen() {
    var portrait = window.innerHeight >= window.innerWidth;
    var width = portrait ? PORTRAIT_WIDTH : LANDSCAPE_WIDTH;
    var height = portrait ? PORTRAIT_HEIGHT : LANDSCAPE_HEIGHT;
    var scale = Math.min(Math.max(1, window.innerWidth - 16) / width, Math.max(1, window.innerHeight - 16) / height);
    var viewport = document.getElementById('viewport');
    var app = document.getElementById('app');
    if (!viewport || !app) return;
    app.style.transform = 'scale(' + scale + ')';
    viewport.style.width = width * scale + 'px';
    viewport.style.height = height * scale + 'px';
  }

  window.addEventListener('resize', fitPortraitScreen);
  fitPortraitScreen();
}());
