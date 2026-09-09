/* Assets must decode before a participant starts. Results remain until reset. */
(function(){'use strict';
var button=document.getElementById('startBtn'),status=document.getElementById('assetStatus');
button.disabled=true;status.textContent='친구들을 불러오고 있어요…';
var paths=window.__NP_GAME__?window.__NP_GAME__.PARKS.map(function(p){return p.image}):[];
if(!paths.length){status.textContent='게임을 불러오지 못했어요. 화면을 새로고침해 주세요.';return}
Promise.all(paths.map(function(path){return new Promise(function(resolve){var im=new Image();im.onload=function(){resolve(true)};im.onerror=function(){resolve(false)};im.src=path})})).then(function(results){var ok=results.every(Boolean);button.disabled=!ok;status.textContent=ok?'':'이미지를 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.'});
})();
