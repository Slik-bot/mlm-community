// ═══════════════════════════════════════
// DNA CARD — js/dna-card.js
// Luxury-карточка результата ДНК-теста
// ═══════════════════════════════════════

// ─── PATTERN DRAWS ─────────────────────

function drawGeo(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.6;
  const size = 28;
  for (let x = 0; x < w + size; x += size) {
    for (let y = 0; y < h + size; y += size) {
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y);
      ctx.lineTo(x, y + size / 2);
      ctx.lineTo(x - size / 2, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function drawWaves(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  for (let y = -20; y < h + 20; y += 18) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const wave = Math.sin((x / w) * Math.PI * 4 + y * 0.1) * 6;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawSparks(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  const rand = (n) => {
    let v = Math.sin(n * 9301 + 49297) * 233280;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 50; i++) {
    const px = rand(i) * w;
    const py = rand(i + 100) * h;
    const s = rand(i + 200) * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();
    if (rand(i + 300) > 0.6) {
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px, py - 1);
      ctx.stroke();
      ctx.globalAlpha = 0.7;
    }
  }
}

function drawCrystal(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.55;
  const pts = [];
  const rand = (n) => {
    let v = Math.sin(n * 127.1 + 311.7) * 43758.5;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 20; i++) {
    pts.push({ x: rand(i) * w, y: rand(i + 20) * h });
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (dist < 100) {
        ctx.globalAlpha = 0.55 * (1 - dist / 100);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }
}

const PATTERN_DRAWS = {
  geo: drawGeo, waves: drawWaves,
  sparks: drawSparks, crystal: drawCrystal
};

let activeDNA = 'S';
let cardSerial = 1;
let revealRunning = false;

// ─── APPLY DNA ─────────────────────────

function applyDNA(type) {
  activeDNA = type;
  const d = window.DNA_TYPES[type];
  if (!d) return;

  window.applyDnaTheme(type);

  const typeNameEl = document.getElementById('typeName');
  typeNameEl.textContent = d.name;
  typeNameEl.classList.toggle('long', d.name.length > 7);
  document.getElementById('typeDesc').textContent = d.desc;
  document.getElementById('dnaLabel').textContent = 'ТВОЙ БИЗНЕС-ДНК';

  const tagsEl = document.getElementById('typeTags');
  tagsEl.innerHTML = '';
  d.tags.forEach(t => {
    const s = document.createElement('span');
    s.className = 'dnr-tag';
    s.textContent = t;
    tagsEl.appendChild(s);
  });

  cardSerial = Math.floor(Math.random() * 90000) + 10000;
  document.getElementById('serialNum').textContent =
    `${d.serial}-${String(cardSerial).padStart(5, '0')}`;

  document.getElementById('figSvg').innerHTML = window.CHESS_SVG.pawn;

  const canvas = document.getElementById('patternCanvas');
  const ctx = canvas.getContext('2d');
  const patternFn = PATTERN_DRAWS[d.pattern];
  if (patternFn) patternFn(ctx, canvas.width, canvas.height, d.color);
}

function renderStars(filled) {
  const row = document.getElementById('starsRow');
  if (!row) return '';
  let html = '';
  for (let i = 0; i < 5; i++) {
    const opacity = i < filled ? '1' : '0.2';
    html += `<svg viewBox="0 0 24 24" fill="var(--dna-c)" width="14" height="14" style="opacity:${opacity}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  row.innerHTML = html;
  return html;
}

// ─── HOLOGRAPHIC EFFECT ────────────────

function initHolo() {
  const card = document.getElementById('mainCard');
  const holo = document.getElementById('cardHolo');
  const wrap = document.getElementById('cardWrap');
  const sceneEl = document.getElementById('scene');
  if (!sceneEl || !card || !holo || !wrap) return;

  sceneEl.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    wrap.style.transform =
      `rotateX(${dy * -12}deg) rotateY(${dx * 12}deg)`;
    holo.style.setProperty('--holo-angle',
      Math.atan2(dy, dx) * (180 / Math.PI) + 'deg');
    holo.style.opacity = '0.6';
  });

  sceneEl.addEventListener('mouseleave', () => {
    wrap.style.transform = 'rotateX(0) rotateY(0)';
    wrap.style.transition =
      'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    holo.style.opacity = '0';
    setTimeout(() => {
      wrap.style.transition = 'transform 0.1s ease-out';
    }, 600);
  });

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      const x = (e.gamma || 0) / 30;
      const y = (e.beta || 0) / 30 - 1;
      wrap.style.transform =
        `rotateX(${y * -12}deg) rotateY(${x * 12}deg)`;
      holo.style.setProperty('--holo-angle',
        Math.atan2(y, x) * (180 / Math.PI) + 'deg');
      holo.style.opacity = '0.6';
    });
  }
}

// ─── REVEAL ANIMATION ──────────────────

function runReveal() {
  if (revealRunning) return;
  revealRunning = true;

  const d = window.DNA_TYPES[activeDNA];
  const card = document.getElementById('mainCard');
  card.classList.remove('revealed');
  card.style.opacity = '0';

  const screen = document.getElementById('revealScreen');
  screen.classList.remove('hidden');

  const roulette = document.getElementById('roulette');
  const label = document.getElementById('revLabel');
  const orbs = roulette.querySelectorAll('.orb-spin');

  roulette.classList.add('spinning');
  label.textContent = 'Кто ты?';

  setTimeout(() => {
    roulette.classList.remove('spinning');
    label.textContent = 'Определяем...';
    orbs.forEach((o, i) => {
      const key = 'orb-' + activeDNA.toLowerCase();
      if (o.className.indexOf(key) === -1) {
        setTimeout(() => {
          o.style.opacity = '0.15';
          o.style.transform = 'scale(0.7)';
        }, i * 150);
      } else {
        setTimeout(() => {
          o.style.transform = 'scale(1.4)';
          o.style.boxShadow = `0 0 40px ${d.color}`;
        }, 200);
      }
    });
    label.textContent = 'Найдено!';
  }, 1500);

  setTimeout(() => {
    const wave = document.getElementById('revWave');
    wave.style.background = d.color;
    wave.classList.add('explode');
  }, 2800);

  setTimeout(() => {
    const flash = document.getElementById('revFlash');
    flash.style.background = d.color;
    flash.classList.add('go');
  }, 3100);

  setTimeout(() => {
    screen.classList.add('hidden');
    document.getElementById('revWave').classList.remove('explode');
    document.getElementById('revFlash').classList.remove('go');
    orbs.forEach(o => {
      o.style.opacity = '1';
      o.style.transform = '';
      o.style.boxShadow = '';
    });

    applyDNA(activeDNA);
    card.style.opacity = '';
    card.classList.add('revealed');

    setTimeout(() => {
      document.getElementById('xpFill').style.width = '4%';
      document.getElementById('careerDone').style.width = '0%';
    }, 800);

    revealRunning = false;

    setTimeout(() => {
      const row = document.getElementById('starsRow');
      if (row) renderStars(1);
    }, 4000);
  }, 3600);
}

// ─── XP TOAST ──────────────────────────

function showXpToast(amount) {
  const toast = document.getElementById('xpToast');
  const d = window.DNA_TYPES[activeDNA];
  const big = amount >= 5000;
  toast.textContent = '+' + amount.toLocaleString('ru') + ' XP';
  toast.style.fontSize = big ? '18px' : '16px';
  toast.style.color = big ? '#fbbf24' : d.color;
  toast.style.borderColor = big ? '#fbbf24' : d.color;
  toast.style.boxShadow = `0 8px 32px ${
    big ? 'rgba(251,191,36,0.35)' : d.glow
  }`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── LEVEL UP ──────────────────────────

function showLevelUp() {
  const d = window.DNA_TYPES[activeDNA];
  document.getElementById('luFig').textContent = '\u265E';
  document.getElementById('luFig').style.color = d.color;
  document.getElementById('luTitle').textContent = 'КОНЬ';
  document.getElementById('luTitle').style.color = d.color;
  document.getElementById('luOverlay').classList.add('active');
  spawnConfetti();
}

function closeLevelUp() {
  document.getElementById('luOverlay').classList.remove('active');
  document.querySelectorAll('.confetti').forEach(c => c.remove());
}

function spawnConfetti() {
  const d = window.DNA_TYPES[activeDNA];
  const colors = [d.color, d.light, '#fbbf24', '#fff'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-12px';
    c.style.background =
      colors[Math.floor(Math.random() * colors.length)];
    c.style.setProperty('--d',
      (1.5 + Math.random() * 2) + 's');
    c.style.setProperty('--delay',
      Math.random() * 0.8 + 's');
    c.style.setProperty('--dx',
      (Math.random() * 200 - 100) + 'px');
    c.style.width = (6 + Math.random() * 6) + 'px';
    c.style.height = (6 + Math.random() * 6) + 'px';
    document.body.appendChild(c);
  }
  setTimeout(() => {
    document.querySelectorAll('.confetti').forEach(c => c.remove());
  }, 5000);
}

// ─── SHARE ─────────────────────────────

function shareCard() {
  const d = window.DNA_TYPES[activeDNA];
  const serial = document.getElementById('serialNum').textContent;
  const text = [
    `\u042F \u2014 ${d.name} \u043D\u0430 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 TRAFIQO`,
    '\u0423\u0440\u043E\u0432\u0435\u043D\u044C: \u041F\u0435\u0448\u043A\u0430 \u2605',
    `ID: ${serial}`,
    `\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u2192 trafiqo.app/ref/${serial}`
  ].join('\n');

  if (navigator.share) {
    navigator.share({ title: 'TRAFIQO Identity', text });
  } else {
    navigator.clipboard?.writeText(text);
    const t = document.getElementById('xpToast');
    t.textContent = 'Скопировано!';
    t.style.color = '#22c55e';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }
}

// ─── INIT ──────────────────────────────

function initDnaResult() {
  const raw = localStorage.getItem('dnaType') || 'S';
  const safe = ['S', 'C', 'K', 'A'].includes(raw) ? raw : 'S';
  activeDNA = safe;

  applyDNA(activeDNA);

  const card = document.getElementById('mainCard');
  card.classList.add('revealed');

  setTimeout(() => {
    document.getElementById('xpFill').style.width = '4%';
  }, 900);

  initHolo();

  document.getElementById('dnrBtnContinue')
    ?.addEventListener('click', () => window.goTo('scrFeed'));
  document.getElementById('dnrBtnShare')
    ?.addEventListener('click', shareCard);
  document.getElementById('luBtnClose')
    ?.addEventListener('click', closeLevelUp);

  setTimeout(() => runReveal(), 300);
}

window.initDnaResult = initDnaResult;
