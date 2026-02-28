// TRAFIQO Splash Screen — 2 seconds
// Compressed version: same visuals, 7x faster

window.initSplash = function(callback) {
  var screen = document.createElement('div');
  screen.id = 'splash-screen';
  screen.innerHTML = '<canvas id="splash-canvas"></canvas>' +
    '<div id="splash-stage">' +
      '<div id="splash-letters"></div>' +
      '<div id="splash-underline-wrap"><div id="splash-underline"></div></div>' +
      '<div id="splash-sub">The Infrastructure of Real Digital Economy</div>' +
    '</div>';
  document.body.insertBefore(screen, document.body.firstChild);

  var canvas = document.getElementById('splash-canvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width = window.innerWidth;
  var H = canvas.height = window.innerHeight;

  var resizeHandler = function() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGrid();
  };
  window.addEventListener('resize', resizeHandler);

  var SYMS = ['0','1','2','3','4','5','6','7','8','9','$','%','+','-'];
  var CELL = 13;
  var WORD = 'TRAFIQO';

  var grid = [];
  function buildGrid() {
    grid = [];
    var cols = Math.ceil(W / CELL) + 1;
    var rows = Math.ceil(H / CELL) + 1;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        grid.push({
          x: c * CELL, y: r * CELL,
          sym: SYMS[Math.floor(Math.random() * SYMS.length)],
          alpha: 0.15 + Math.random() * 0.30,
          cyan: Math.random() < 0.04
        });
      }
    }
  }
  buildGrid();

  function drawGrid(fade) {
    if (fade < 0.003) return;
    ctx.font = (CELL - 2) + 'px "SF Mono","Courier New",monospace';
    for (var i = 0; i < grid.length; i++) {
      var g = grid[i];
      var a = g.alpha * fade;
      if (a < 0.003) continue;
      ctx.fillStyle = g.cyan
        ? 'rgba(0,212,255,' + (a * 0.7) + ')'
        : 'rgba(255,255,255,' + a + ')';
      ctx.fillText(g.sym, g.x, g.y);
    }
  }

  function easeOut4(t) { return 1 - Math.pow(1 - t, 4); }
  function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(t) { return Math.max(0, Math.min(1, t)); }

  var lettersEl = document.getElementById('splash-letters');
  var underlineEl = document.getElementById('splash-underline');
  var subEl = document.getElementById('splash-sub');
  var letterEls = [];
  var letterWidthCache = 0;

  WORD.split('').forEach(function(ch) {
    var span = document.createElement('span');
    span.className = 'splash-letter';
    span.textContent = ch;
    lettersEl.appendChild(span);
    letterEls.push(span);
  });

  var doneCalled = false;
  function finish() {
    if (doneCalled) return;
    doneCalled = true;
    window.removeEventListener('resize', resizeHandler);
    screen.classList.add('done');
    setTimeout(function() {
      if (screen.parentNode) screen.parentNode.removeChild(screen);
      if (typeof callback === 'function') callback();
    }, 300);
  }

  var safetyTimer = setTimeout(finish, 5000);
  var startTime = Date.now();

  // Timeline (2s total):
  // 0-0.4s   grid fades in
  // 0.3-0.8s grid fades out
  // 0.2s+    letters appear (stagger 0.06s, duration 0.5s)
  // 0.9-1.3s underline draws
  // 1.1-1.5s subtitle appears
  // 1.7s     finish

  function animate() {
    try {
      var elapsed = (Date.now() - startTime) / 1000;

      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, W, H);

      if (elapsed < 0.4) {
        drawGrid(easeOut3(clamp(elapsed / 0.4)));
      } else if (elapsed < 0.8) {
        drawGrid(lerp(1, 0, easeInOut(clamp((elapsed - 0.3) / 0.5))));
      }

      if (elapsed >= 0.2) {
        for (var i = 0; i < letterEls.length; i++) {
          var s = 0.2 + i * 0.06;
          var e = s + 0.5;
          var p = easeOut4(clamp((elapsed - s) / (e - s)));
          letterEls[i].style.opacity = p;
          letterEls[i].style.transform = 'scale(' + lerp(2.5, 1, p) + ') translateY(' + lerp(-20, 0, p) + 'px)';
          letterEls[i].style.filter = p < 0.99 ? 'blur(' + lerp(12, 0, p) + 'px)' : 'none';
        }
      }

      if (elapsed >= 0.9 && elapsed < 1.3) {
        var pLine = easeOut3(clamp((elapsed - 0.9) / 0.4));
        if (!letterWidthCache) letterWidthCache = lettersEl.offsetWidth || W * 0.7;
        underlineEl.style.width = (pLine * letterWidthCache) + 'px';
        underlineEl.style.opacity = '1';
      } else if (elapsed >= 1.3) {
        if (!letterWidthCache) letterWidthCache = lettersEl.offsetWidth || W * 0.7;
        underlineEl.style.width = letterWidthCache + 'px';
      }

      if (elapsed >= 1.1 && elapsed < 1.5) {
        var pSub = easeOut3(clamp((elapsed - 1.1) / 0.4));
        subEl.style.color = 'rgba(255,255,255,' + (pSub * 0.5) + ')';
        subEl.style.clipPath = 'inset(0 ' + ((1 - pSub) * 100) + '% 0 0)';
      } else if (elapsed >= 1.5) {
        subEl.style.color = 'rgba(255,255,255,0.5)';
        subEl.style.clipPath = 'inset(0 0% 0 0)';
      }

      if (elapsed >= 1.7) {
        clearTimeout(safetyTimer);
        finish();
        return;
      }
      requestAnimationFrame(animate);
    } catch (err) {
      clearTimeout(safetyTimer);
      finish();
    }
  }

  requestAnimationFrame(animate);
};
