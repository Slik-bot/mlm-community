// ═══════════════════════════════════════
// DNA CARD — Премиальная карточка v4
// ═══════════════════════════════════════

let dcActive = 'S';
let dcRevealRunning = false;

const el = (id) => document.getElementById(id);

// ── Canvas паттерны ──
function dcDrawGeo(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.6;
  const s = 28;
  for (let x = 0; x < w + s; x += s) {
    for (let y = 0; y < h + s; y += s) {
      ctx.strokeRect(x - s / 2, y - s / 2, s, s);
      ctx.beginPath();
      ctx.moveTo(x, y - s / 2);
      ctx.lineTo(x + s / 2, y);
      ctx.lineTo(x, y + s / 2);
      ctx.lineTo(x - s / 2, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function dcDrawWaves(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  for (let y = -20; y < h + 20; y += 18) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const wave = Math.sin((x / w) * Math.PI * 4 + y * 0.1) * 6;
      x === 0 ? ctx.moveTo(x, y + wave) : ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function dcDrawSparks(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  const rnd = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
  for (let i = 0; i < 50; i++) {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(rnd(i) * w, rnd(i + 100) * h, rnd(i + 200) * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (rnd(i + 300) > 0.6) {
      ctx.lineWidth = 0.5; ctx.strokeStyle = color; ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(rnd(i) * w, rnd(i + 100) * h - 6);
      ctx.lineTo(rnd(i) * w, rnd(i + 100) * h - 1);
      ctx.stroke();
    }
  }
}

function dcDrawCrystal(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color; ctx.lineWidth = 0.6;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5; return x - Math.floor(x); };
  const pts = Array.from({ length: 20 }, (_, i) => ({ x: rnd(i) * w, y: rnd(i + 20) * h }));
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (dist < 100) {
        ctx.globalAlpha = 0.55 * (1 - dist / 100);
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
  }
}

const DC_PATTERNS = { geo: dcDrawGeo, waves: dcDrawWaves, sparks: dcDrawSparks, crystal: dcDrawCrystal };

// ── Применить ДНК-тип ──
function dcApplyDNA(type) {
  dcActive = type;
  const d = window.DNA_TYPES[type];
  const root = document.documentElement;
  root.style.setProperty('--dna-c',      d.color);
  root.style.setProperty('--dna-cl',     d.light);
  root.style.setProperty('--dna-cg',     d.glow);
  root.style.setProperty('--dna-cr',     d.r);
  root.style.setProperty('--dna-cg-val', d.g);
  root.style.setProperty('--dna-cb',     d.b);
  document.body.style.backgroundImage =
    `radial-gradient(ellipse 80% 40% at 50% 0%, ${d.color}14 0%, transparent 70%)`;
  const nameEl = el('typeName');
  if (nameEl) {
    nameEl.textContent = d.name;
    nameEl.classList.toggle('long', d.name.length > 7);
  }
  if (el('typeDesc')) el('typeDesc').textContent = d.desc;
  if (el('dnaLabel')) el('dnaLabel').textContent = 'ТВОЙ БИЗНЕС-ДНК';
  const tagsEl = el('typeTags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    d.tags.forEach(t => {
      const s = document.createElement('span');
      s.className = 'dnr-tag'; s.textContent = t;
      tagsEl.appendChild(s);
    });
  }
  const serial = Math.floor(Math.random() * 90000) + 10000;
  if (el('serialNum')) el('serialNum').textContent = `${d.serial}-${serial}`;
  if (el('figSvg')) el('figSvg').innerHTML = window.CHESS_SVG.pawn;
  if (el('dnrBadge')) el('dnrBadge').textContent = `♟ ПЕШКА · УРОВЕНЬ 1`;
  const canvas = el('patternCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    DC_PATTERNS[d.pattern](ctx, canvas.width, canvas.height, d.color);
  }
  dcRenderStars(1);
}

// ── Звёзды ──
function dcRenderStars(filled) {
  const row = el('starsRow');
  if (!row) return;
  row.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    s.className = 'dnr-star ' + (i < filled ? 'lit' : 'dim');
    s.textContent = i < filled ? '★' : '☆';
    if (i < filled) s.style.transition = `all 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.12}s`;
    row.appendChild(s);
  }
}

// ── Голографический 3D эффект ──
function dcInitHolo() {
  const card = el('mainCard');
  const holo = el('cardHolo');
  const wrap = el('cardWrap');
  if (!card || !holo || !wrap) return;
  const scene = el('dnrScene');
  if (!scene) return;
  scene.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    wrap.style.transform = `rotateX(${dy * -12}deg) rotateY(${dx * 12}deg)`;
    holo.style.setProperty('--holo-angle', Math.atan2(dy, dx) * (180 / Math.PI) + 'deg');
    holo.style.opacity = '0.6';
  });
  scene.addEventListener('mouseleave', () => {
    wrap.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    wrap.style.transform = 'rotateX(0) rotateY(0)';
    holo.style.opacity = '0';
    setTimeout(() => { wrap.style.transition = 'transform 0.1s ease-out'; }, 600);
  });
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      const x = (e.gamma || 0) / 30;
      const y = (e.beta || 0) / 30 - 1;
      wrap.style.transform = `rotateX(${y * -12}deg) rotateY(${x * 12}deg)`;
      holo.style.setProperty('--holo-angle', Math.atan2(y, x) * (180 / Math.PI) + 'deg');
      holo.style.opacity = '0.6';
    });
  }
}

// ── Reveal — фаза 1: подготовка ──
function dcRevealPhase1() {
  const card = el('mainCard');
  card.classList.remove('revealed');
  card.style.opacity = '0';
  el('revealScreen').classList.remove('hidden');
  const roulette = el('roulette');
  roulette.classList.add('spinning');
  el('revLabel').textContent = 'Кто ты?';
}

// ── Reveal — фаза 2: замедление ──
function dcRevealPhase2() {
  const d = window.DNA_TYPES[dcActive];
  el('roulette').classList.remove('spinning');
  el('revLabel').textContent = 'Определяем...';
  document.querySelectorAll('.orb-spin').forEach((o) => {
    const isWinner = o.classList.contains('orb-' + dcActive.toLowerCase());
    if (!isWinner) {
      o.style.opacity = '0.15'; o.style.transform = 'scale(0.7)';
    } else {
      o.style.transform = 'scale(1.4)';
      o.style.boxShadow = `0 0 40px ${d.color}`;
    }
  });
  el('revLabel').textContent = 'Найдено!';
}

// ── Reveal — фаза 3: волна и вспышка ──
function dcRevealPhase3() {
  const d = window.DNA_TYPES[dcActive];
  const wave = el('revWave');
  wave.style.background = d.color;
  wave.classList.add('explode');
  setTimeout(() => {
    const flash = el('revFlash');
    flash.style.background = d.color;
    flash.classList.add('go');
  }, 300);
}

// ── Reveal — фаза 4: показ карточки ──
function dcRevealPhase4() {
  el('revealScreen').classList.add('hidden');
  el('revWave').classList.remove('explode');
  el('revFlash').classList.remove('go');
  document.querySelectorAll('.orb-spin').forEach(o => {
    o.style.opacity = '1'; o.style.transform = ''; o.style.boxShadow = '';
  });
  dcApplyDNA(dcActive);
  const card = el('mainCard');
  card.style.opacity = '';
  card.classList.add('revealed');
  setTimeout(() => {
    if (el('xpFill')) el('xpFill').style.width = '4%';
    if (el('careerDone')) el('careerDone').style.width = '0%';
    dcRenderStars(0);
    setTimeout(() => {
      const stars = document.querySelectorAll('.dnr-star');
      stars.forEach((s, i) => setTimeout(() => {
        s.style.opacity = '1'; s.style.transform = 'scale(1) rotate(0deg)';
      }, i * 120));
      if (stars[0]) {
        stars[0].className = 'dnr-star lit'; stars[0].textContent = '★';
        stars[0].style.transition = 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)';
      }
    }, 400);
    dcRevealRunning = false;
  }, 800);
}

// ── Оркестратор reveal ──
function runReveal() {
  if (dcRevealRunning) return;
  dcRevealRunning = true;
  dcRevealPhase1();
  setTimeout(dcRevealPhase2, 1500);
  setTimeout(dcRevealPhase3, 2800);
  setTimeout(dcRevealPhase4, 3600);
}

// ── XP Toast ──
function showXpToast(amount) {
  const toast = el('xpToast');
  if (!toast) return;
  const big = amount >= 5000;
  const d = window.DNA_TYPES[dcActive];
  toast.textContent = '+' + amount.toLocaleString('ru') + ' XP';
  toast.style.fontSize = big ? '18px' : '16px';
  toast.style.color = big ? '#fbbf24' : d.color;
  toast.style.borderColor = big ? '#fbbf24' : d.color;
  toast.style.boxShadow = `0 8px 32px ${big ? 'rgba(251,191,36,0.35)' : d.glow}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Level Up ──
function dcSpawnConfetti() {
  const d = window.DNA_TYPES[dcActive];
  const colors = [d.color, d.light, '#fbbf24', '#fff'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-12px';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.setProperty('--d', (1.5 + Math.random() * 2) + 's');
    c.style.setProperty('--delay', Math.random() * 0.8 + 's');
    c.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    c.style.width = (6 + Math.random() * 6) + 'px';
    c.style.height = (6 + Math.random() * 6) + 'px';
    document.body.appendChild(c);
  }
  setTimeout(() => document.querySelectorAll('.confetti').forEach(c => c.remove()), 5000);
}

function showLevelUp() {
  const d = window.DNA_TYPES[dcActive];
  if (el('luFig')) { el('luFig').textContent = '♞'; el('luFig').style.color = d.color; }
  if (el('luTitle')) { el('luTitle').textContent = 'КОНЬ'; el('luTitle').style.color = d.color; }
  el('luOverlay')?.classList.add('active');
  dcSpawnConfetti();
}

function closeLevelUp() {
  el('luOverlay')?.classList.remove('active');
  document.querySelectorAll('.confetti').forEach(c => c.remove());
}

// ── Поделиться ──
function shareCard() {
  const d = window.DNA_TYPES[dcActive];
  const serial = el('serialNum')?.textContent || '';
  const text = `Я — ${d.name} на платформе TRAFIQO\nID: ${serial}\ntrafiqo.app`;
  if (navigator.share) {
    navigator.share({ title: 'TRAFIQO Identity', text });
  } else {
    navigator.clipboard?.writeText(text);
    const t = el('xpToast');
    if (t) { t.textContent = 'Скопировано!'; t.style.color = '#22c55e'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
  }
}

// ── Инициализация ──
function initDnaResult() {
  const type = localStorage.getItem('dnaType') ||
    document.querySelector('.app')?.dataset?.dna || 'S';
  dcActive = ['S','C','K','A'].includes(type) ? type : 'S';
  dcApplyDNA(dcActive);
  const card = el('mainCard');
  if (card) {
    card.classList.remove('revealed');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.5) translateY(80px)';
    card.style.filter = 'blur(30px)';
  }
  setTimeout(() => {
    if (el('xpFill')) el('xpFill').style.width = '4%';
    const stars = document.querySelectorAll('.dnr-star');
    setTimeout(() => {
      if (stars[0]) { stars[0].className = 'dnr-star lit'; stars[0].textContent = '★'; stars[0].style.transition = 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)'; }
      stars.forEach((s, i) => { if (i > 0) { s.style.opacity = '1'; s.style.transform = 'scale(1) rotate(0deg)'; } });
    }, 300);
  }, 900);
  dcInitHolo();
}

// ── Экспорты ──
window.initDnaResult = initDnaResult;
window.runReveal     = runReveal;
window.showXpToast   = showXpToast;
window.showLevelUp   = showLevelUp;
window.closeLevelUp  = closeLevelUp;
window.shareCard     = shareCard;
window.dcApplyDNA    = dcApplyDNA;
