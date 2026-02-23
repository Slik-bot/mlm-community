// TRAFIQO Splash Screen — 5 seconds
// Based on approved design from trafiqo-grand.html

window.initSplash = function(callback) {
  // —— CREATE DOM ——
  const screen = document.createElement('div');
  screen.id = 'splash-screen';
  screen.innerHTML = `
    <canvas id="splash-canvas"></canvas>
    <div id="splash-stage">
      <div id="splash-letters"></div>
      <div id="splash-underline-wrap"><div id="splash-underline"></div></div>
      <div id="splash-sub">The Infrastructure of Real Digital Economy</div>
    </div>
  `;
  document.body.insertBefore(screen, document.body.firstChild);

  const canvas = document.getElementById('splash-canvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const resizeHandler = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGrid();
  };
  window.addEventListener('resize', resizeHandler);

  // —— SYMBOLS ——
  const SYMS = ['0','1','2','3','4','5','6','7','8','9','$','€','₽','£','¥','%','+','-'];
  const CELL = 13;
  const WORD = 'TRAFIQO';

  // —— GRID ——
  let grid = [];
  function buildGrid() {
    grid = [];
    const cols = Math.ceil(W / CELL) + 1;
    const rows = Math.ceil(H / CELL) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid.push({
          x: c * CELL, y: r * CELL,
          sym: SYMS[Math.floor(Math.random() * SYMS.length)],
          alpha: 0.15 + Math.random() * 0.30,
          timer: Math.floor(Math.random() * 80),
          interval: 20 + Math.floor(Math.random() * 60),
          cyan: Math.random() < 0.04,
        });
      }
    }
  }
  buildGrid();

  function updateGrid() {
    grid.forEach(g => {
      g.timer++;
      if (g.timer % g.interval === 0) {
        g.sym = SYMS[Math.floor(Math.random() * SYMS.length)];
        g.alpha = 0.15 + Math.random() * 0.30;
        g.cyan = Math.random() < 0.04;
      }
    });
  }

  function drawGrid(fade) {
    if (fade < 0.003) return;
    ctx.font = `${CELL-2}px "SF Mono","Courier New",monospace`;
    grid.forEach(g => {
      const a = g.alpha * fade;
      if (a < 0.003) return;
      ctx.fillStyle = g.cyan
        ? `rgba(0,212,255,${a * 0.7})`
        : `rgba(255,255,255,${a})`;
      ctx.fillText(g.sym, g.x, g.y);
    });
  }

  // —— EASING ——
  function easeOut4(t) { return 1 - Math.pow(1-t, 4); }
  function easeOut3(t) { return 1 - Math.pow(1-t, 3); }
  function easeInOut(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function lerp(a, b, t) { return a + (b-a)*t; }
  function clamp(t) { return Math.max(0, Math.min(1, t)); }

  // —— BUILD LETTERS ——
  const lettersEl = document.getElementById('splash-letters');
  const underlineEl = document.getElementById('splash-underline');
  const subEl = document.getElementById('splash-sub');
  let letterEls = [];
  let letterWidthCache = 0;

  function buildLetters() {
    lettersEl.innerHTML = '';
    letterEls = [];
    WORD.split('').forEach(ch => {
      const span = document.createElement('span');
      span.className = 'splash-letter';
      span.textContent = ch;
      lettersEl.appendChild(span);
      letterEls.push(span);
    });
  }
  buildLetters();

  // —— DONE ——
  let doneCalled = false;
  function finish() {
    if (doneCalled) return;
    doneCalled = true;
    window.removeEventListener('resize', resizeHandler);
    screen.classList.add('done');
    setTimeout(() => {
      if (screen.parentNode) screen.parentNode.removeChild(screen);
      if (typeof callback === 'function') callback();
    }, 1000);
  }

  // Защитный таймаут — если что-то пошло не так
  const safetyTimer = setTimeout(finish, 7000);

  // —— ANIMATE — 5 секунд ——
  // Тайминги:
  // 0-1s   — фон расцветает
  // 1-2.5s — фон угасает до 3%
  // 1.5s   — буквы начинают появляться (задержка 0.18s, каждая 0.9s)
  // 3.6s   — линия прорисовывается (2s)
  // 4.2s   — подпись проявляется
  // 5s     — конец

  const startTime = Date.now();
  let rafId = null;

  function animate() {
    try {
      const elapsed = (Date.now() - startTime) / 1000;

      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, W, H);
      updateGrid();

      // Фон расцветает (0-1s)
      if (elapsed < 1) {
        drawGrid(easeOut3(clamp(elapsed / 1)));
      }
      // Фон угасает (1-2.5s)
      else if (elapsed < 2.5) {
        const p = easeInOut(clamp((elapsed - 1) / 1.5));
        drawGrid(lerp(1, 0.03, p));
      }
      // Фон остаётся на 3%
      else {
        drawGrid(0.03);
      }

      // Буквы (1.5-4s)
      if (elapsed >= 1.5) {
        letterEls.forEach((el, i) => {
          const s = 1.5 + i * 0.18;
          const e = s + 0.9;
          const p = easeOut4(clamp((elapsed - s) / (e - s)));
          el.style.opacity = p;
          el.style.transform = `scale(${lerp(3, 1, p)}) translateY(${lerp(-30, 0, p)}px)`;
          el.style.filter = p < 0.99 ? `blur(${lerp(20, 0, p)}px)` : 'none';
        });
      }

      // Линия (3.6-5.6s)
      if (elapsed >= 3.6 && elapsed < 5.6) {
        const p = easeOut3(clamp((elapsed - 3.6) / 2));
        if (!letterWidthCache) letterWidthCache = lettersEl.offsetWidth || W * 0.7;
        underlineEl.style.width = `${p * letterWidthCache}px`;
        underlineEl.style.opacity = '1';
      } else if (elapsed >= 5.6) {
        if (!letterWidthCache) letterWidthCache = lettersEl.offsetWidth || W * 0.7;
        underlineEl.style.width = `${letterWidthCache}px`;
      }

      // Подпись (4.2-5.5s)
      if (elapsed >= 4.2 && elapsed < 5.5) {
        const p = easeOut3(clamp((elapsed - 4.2) / 1.3));
        subEl.style.color = `rgba(255,255,255,${p * 0.38})`;
        subEl.style.clipPath = `inset(0 ${(1-p)*100}% 0 0)`;
      } else if (elapsed >= 5.5) {
        subEl.style.color = 'rgba(255,255,255,0.38)';
        subEl.style.clipPath = 'inset(0 0% 0 0)';
      }

      // Конец на 5s
      if (elapsed >= 5) {
        clearTimeout(safetyTimer);
        finish();
        return;
      }

      rafId = requestAnimationFrame(animate);
    } catch(err) {
      clearTimeout(safetyTimer);
      finish();
    }
  }

  rafId = requestAnimationFrame(animate);
};