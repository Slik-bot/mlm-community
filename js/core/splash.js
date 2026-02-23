// ═══════════════════════════════════════
// SPLASH SCREEN — TRAFIQO Animation
// js/core/splash.js
// ═══════════════════════════════════════

(function() {

const CELL = 13;
const CHARS = '0123456789$€₽£¥%+-';
const WORD = 'TRAFIQO';

function buildDOM(splash) {
  const canvas = document.createElement('canvas');
  canvas.className = 'splash-canvas';
  splash.appendChild(canvas);

  const center = document.createElement('div');
  center.className = 'splash-center';
  splash.appendChild(center);

  const lettersWrap = document.createElement('div');
  lettersWrap.className = 'splash-letters';
  center.appendChild(lettersWrap);

  const letters = [];
  for (let i = 0; i < WORD.length; i++) {
    const span = document.createElement('span');
    span.className = 'splash-letter';
    span.textContent = WORD[i];
    lettersWrap.appendChild(span);
    letters.push(span);
  }

  const line = document.createElement('div');
  line.className = 'splash-line';
  center.appendChild(line);

  const sub = document.createElement('div');
  sub.className = 'splash-subtitle';
  sub.textContent = 'The Infrastructure of Real Digital Economy';
  center.appendChild(sub);

  return {
    canvas: canvas,
    ctx: canvas.getContext('2d'),
    letters: letters,
    line: line,
    sub: sub
  };
}

function createGrid(w, h) {
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const total = cols * rows;
  const cells = [];
  for (let i = 0; i < total; i++) {
    cells.push({
      ch: CHARS[Math.floor(Math.random() * CHARS.length)],
      op: 0.04 + Math.random() * 0.11,
      cy: Math.random() < 0.02,
      nx: Math.random() * 2000
    });
  }
  return { cols: cols, rows: rows, cells: cells };
}

function drawGrid(ctx, grid, now, elapsed) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  let alpha = 1;
  if (elapsed > 1 && elapsed <= 2.5) {
    alpha = 1 - 0.97 * ((elapsed - 1) / 1.5);
  } else if (elapsed > 2.5) {
    alpha = 0.03;
  }

  ctx.font = '10px monospace';
  const cells = grid.cells;
  const cols = grid.cols;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (now > c.nx) {
      c.ch = CHARS[Math.floor(Math.random() * CHARS.length)];
      c.op = 0.04 + Math.random() * 0.11;
      c.cy = Math.random() < 0.02;
      c.nx = now + 500 + Math.random() * 3000;
    }
    const a = c.op * alpha;
    if (a < 0.005) continue;
    ctx.fillStyle = c.cy
      ? 'rgba(0,255,255,' + a + ')'
      : 'rgba(255,255,255,' + a + ')';
    ctx.fillText(c.ch, (i % cols) * CELL, Math.floor(i / cols) * CELL + 10);
  }
}

function updateLetters(letters, elapsed) {
  for (let i = 0; i < letters.length; i++) {
    const t0 = 1.5 + i * 0.18;
    const el = letters[i];
    if (elapsed < t0) {
      el.style.opacity = '0';
    } else if (elapsed < t0 + 0.9) {
      const p = (elapsed - t0) / 0.9;
      const e = 1 - Math.pow(1 - p, 4);
      el.style.opacity = String(e);
      el.style.transform = 'scale(' + (3 - 2 * e) + ')';
      el.style.filter = 'blur(' + (20 * (1 - e)) + 'px)';
    } else {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      el.style.filter = 'none';
    }
  }
}

function updateLine(line, elapsed) {
  if (elapsed < 3.8) return;
  const t = Math.min((elapsed - 3.8) / 2, 1);
  line.style.transform = 'scaleX(' + t + ')';
  line.style.opacity = '1';
}

function updateSubtitle(sub, elapsed) {
  if (elapsed < 4.3) return;
  const t = Math.min((elapsed - 4.3) / 2.5, 1);
  sub.style.clipPath = 'inset(0 ' + ((1 - t) * 100) + '% 0 0)';
  sub.style.opacity = '1';
}

window.initSplash = function(callback) {
  const splash = document.getElementById('splash-screen');
  if (!splash) { if (callback) callback(); return; }

  const dom = buildDOM(splash);
  dom.canvas.width = window.innerWidth;
  dom.canvas.height = window.innerHeight;
  const grid = createGrid(window.innerWidth, window.innerHeight);
  const startTime = performance.now();
  let animId;

  function onResize() {
    dom.canvas.width = window.innerWidth;
    dom.canvas.height = window.innerHeight;
    const g = createGrid(window.innerWidth, window.innerHeight);
    grid.cols = g.cols;
    grid.rows = g.rows;
    grid.cells = g.cells;
  }
  window.addEventListener('resize', onResize);

  function tick(now) {
    const elapsed = (now - startTime) / 1000;
    if (elapsed >= 6) return;
    animId = requestAnimationFrame(tick);
    drawGrid(dom.ctx, grid, now, elapsed);
    updateLetters(dom.letters, elapsed);
    updateLine(dom.line, elapsed);
    updateSubtitle(dom.sub, elapsed);
    if (elapsed >= 5) splash.classList.add('done');
  }

  animId = requestAnimationFrame(tick);

  setTimeout(function() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    splash.remove();
    if (callback) callback();
  }, 6000);
};

})();
