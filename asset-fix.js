(function(){
  var map={
    'assets/characters/05_gyeongju.png':'assets/characters/05_gyeongju.svg',
    'assets/characters/06_jirisan.png':'assets/characters/06_jirisan.svg',
    'assets/characters/07_hallyeohaesang.png':'assets/characters/07_hallyeohaesang.svg'
  };
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(d&&d.get&&d.set){
    Object.defineProperty(HTMLImageElement.prototype,'src',{
      configurable:true,
      enumerable:d.enumerable,
      get:d.get,
      set:function(v){d.set.call(this,map[v]||v);}
    });
  }
})();
