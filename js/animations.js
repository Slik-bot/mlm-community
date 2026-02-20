// ========== 3D TILT CARDS ==========
(function(){
  var TILT_MAX=6;
  var TILT_SCALE=1.02;

  function tiltInit(){
    var cards=document.querySelectorAll('#scrLanding .tilt-card');
    cards.forEach(function(card){
      card.addEventListener('mousemove',function(e){tiltMove(card,e.clientX,e.clientY);});
      card.addEventListener('mouseenter',function(){
        card.style.transform='perspective(800px) scale3d('+TILT_SCALE+','+TILT_SCALE+',1)';
      });
      card.addEventListener('mouseleave',function(){tiltReset(card);});
      card.addEventListener('touchmove',function(e){
        if(e.touches.length===1){
          tiltMove(card,e.touches[0].clientX,e.touches[0].clientY);
          card.classList.add('tilt-active');
        }
      },{passive:true});
      card.addEventListener('touchend',function(){
        tiltReset(card);
        card.classList.remove('tilt-active');
      });
    });
  }

  function tiltMove(card,cx,cy){
    var rect=card.getBoundingClientRect();
    var x=cx-rect.left;
    var y=cy-rect.top;
    var w=rect.width;
    var h=rect.height;
    var nx=(x/w-0.5)*2;
    var ny=(y/h-0.5)*2;
    var rotY=nx*TILT_MAX;
    var rotX=-ny*TILT_MAX;
    card.style.transform='perspective(800px) rotateX('+rotX+'deg) rotateY('+rotY+'deg) scale3d('+TILT_SCALE+','+TILT_SCALE+',1)';
    var glare=card.querySelector('.tilt-glare');
    if(glare){
      glare.style.setProperty('--tilt-x',(x/w*100).toFixed(1)+'%');
      glare.style.setProperty('--tilt-y',(y/h*100).toFixed(1)+'%');
    }
  }

  function tiltReset(card){
    card.style.transform='';
    var glare=card.querySelector('.tilt-glare');
    if(glare){
      glare.style.setProperty('--tilt-x','50%');
      glare.style.setProperty('--tilt-y','50%');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',tiltInit);
  }else{
    tiltInit();
  }
})();

// ========== SCROLL PARALLAX ==========
(function(){
  var landing=document.getElementById('scrLanding');
  if(!landing) return;

  var plxElements=[];
  var ticking=false;

  function initParallax(){
    /* Отключить параллакс при prefers-reduced-motion */
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Собираем элементы с data-plx-speed */
    var els=landing.querySelectorAll('[data-plx-speed]');
    els.forEach(function(el){
      plxElements.push({
        el:el,
        speed:parseFloat(el.getAttribute('data-plx-speed'))||0
      });
      el.style.willChange='transform';
    });

    if(plxElements.length===0) return;

    /* Скролл на самом контейнере #scrLanding (overflow-y:auto) */
    landing.addEventListener('scroll',onScroll,{passive:true});

    /* Начальная позиция */
    updateParallax();
  }

  function onScroll(){
    if(!ticking){
      ticking=true;
      requestAnimationFrame(function(){
        updateParallax();
        ticking=false;
      });
    }
  }

  function updateParallax(){
    var scrollTop=landing.scrollTop;
    plxElements.forEach(function(item){
      /* speed <0 = элемент отстаёт (фон), speed >0 = опережает */
      var offset=scrollTop*item.speed;
      item.el.style.transform='translate3d(0,'+offset.toFixed(1)+'px,0)';
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initParallax);
  }else{
    initParallax();
  }
})();

// ========== GRADIENT FLOW ==========
(function(){
  var landing = document.getElementById('scrLanding');
  if(!landing) return;

  /* Цветовые точки: [scrollPercent, r, g, b, alpha]
     Alpha 0.12–0.18 — заметный но не кричащий эффект */
  var stops = [
    [0,    0,   0,   0,   0    ],  /* hero — чистый фон */
    [0.12, 90,  50,  140, 0.14 ],  /* тёплый фиолетовый — экосистема */
    [0.30, 60,  40,  130, 0.16 ],  /* глубокий фиолетовый — как это работает */
    [0.50, 30,  50,  100, 0.14 ],  /* холодный синий — превью/карусель */
    [0.70, 40,  90,  80,  0.12 ],  /* бирюзовый — ДНК-секция */
    [0.85, 70,  40,  110, 0.10 ],  /* обратно фиолетовый — тарифы */
    [1,    0,   0,   0,   0    ]   /* футер — чистый */
  ];

  var gfTicking = false;

  function initGradientFlow(){
    /* Отключить для accessibility */
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    landing.addEventListener('scroll', gfOnScroll, {passive:true});
  }

  function gfOnScroll(){
    if(!gfTicking){
      gfTicking = true;
      requestAnimationFrame(function(){
        gfUpdate();
        gfTicking = false;
      });
    }
  }

  function gfUpdate(){
    var scrollTop = landing.scrollTop;
    var scrollMax = landing.scrollHeight - landing.clientHeight;
    if(scrollMax <= 0) return;

    var progress = scrollTop / scrollMax;

    /* Найти два соседних стопа */
    var from = stops[0];
    var to = stops[stops.length - 1];
    for(var i = 1; i < stops.length; i++){
      if(progress <= stops[i][0]){
        from = stops[i - 1];
        to = stops[i];
        break;
      }
    }

    /* Интерполяция + smoothstep */
    var range = to[0] - from[0];
    var t = range > 0 ? (progress - from[0]) / range : 0;
    t = Math.max(0, Math.min(1, t));
    t = t * t * (3 - 2 * t);

    var r = Math.round(from[1] + (to[1] - from[1]) * t);
    var g = Math.round(from[2] + (to[2] - from[2]) * t);
    var b = Math.round(from[3] + (to[3] - from[3]) * t);
    var a = (from[4] + (to[4] - from[4]) * t).toFixed(3);

    landing.style.setProperty('--gflow-color', 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
  }

  /* Запуск */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initGradientFlow);
  } else {
    initGradientFlow();
  }
})();

// ========== MAGNETIC BUTTONS ==========
(function(){
  var MAG_STRENGTH = 0.35;  /* сила притяжения (0.2=слабая, 0.5=сильная) */

  function initMagnetic(){
    /* Только десктоп — на мобильных нет курсора */
    if('ontouchstart' in window && !window.matchMedia('(pointer:fine)').matches) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var buttons = document.querySelectorAll('#scrLanding .mag-btn');

    for(var i = 0; i < buttons.length; i++){
      (function(btn){
        btn.addEventListener('mousemove', function(e){
          var rect = btn.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 2;
          var moveX = (e.clientX - cx) * MAG_STRENGTH;
          var moveY = (e.clientY - cy) * MAG_STRENGTH;
          btn.style.transform = 'translate(' + moveX.toFixed(1) + 'px,' + moveY.toFixed(1) + 'px)';
        });

        btn.addEventListener('mouseleave', function(){
          btn.style.transform = '';
        });
      })(buttons[i]);
    }
  }

  /* Запуск */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initMagnetic);
  } else {
    initMagnetic();
  }
})();
