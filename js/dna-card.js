// ═══════════════════════════════════════
// DNA CARD — Премиальная карточка результата ДНК
// Адаптация макета trafiqo-card-premium
// ═══════════════════════════════════════

// --- Конфиг ДНК-типов ---
const DNA_CARD = {
  S: { color:'#3b82f6', light:'#93c5fd', glow:'rgba(59,130,246,0.6)',
    name:'СТРАТЕГ', serial:'STR',
    desc:'Ты — архитектор систем. Видишь паттерны там, где другие видят хаос. Твоя сила — стратегическое мышление и умение превращать сложное в простое и масштабируемое.',
    tags:['Структуры','Стратегия','Делегирование','Системы'], pattern:'geo' },
  C: { color:'#22c55e', light:'#86efac', glow:'rgba(34,197,94,0.6)',
    name:'КОММУНИКАТОР', serial:'COM',
    desc:'Ты — связующее звено мира. Умеешь вдохновлять и объединять людей. Твоя сила в словах, эмпатии и способности создавать доверие с первых секунд.',
    tags:['Нетворкинг','Переговоры','Вдохновение','Команда'], pattern:'waves' },
  K: { color:'#f59e0b', light:'#fcd34d', glow:'rgba(245,158,11,0.6)',
    name:'КРЕАТОР', serial:'CRE',
    desc:'Ты — творческая сила. Видишь красоту и возможности там, где другие видят обыденность. Создаёшь уникальные идеи и воплощаешь их с особым вкусом.',
    tags:['Творчество','Контент','Инновации','Визуализация'], pattern:'sparks' },
  A: { color:'#a78bfa', light:'#c4b5fd', glow:'rgba(167,139,250,0.6)',
    name:'АНАЛИТИК', serial:'ANL',
    desc:'Ты — кристаллический разум. Данные — твой язык, точность — твой стиль. Находишь скрытые закономерности и превращаешь информацию в решения.',
    tags:['Данные','Аналитика','Точность','Исследование'], pattern:'crystal' }
};

// --- Шахматные SVG ---
const CHESS_SVG = {
  pawn: '<path d="M50 12a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm-8 30l-6 36h28l-6-36H42zm-12 40h40v8H30v-8zm-6 10h52v10H24v-10z" fill="currentColor"/>'
};

let dcActiveDNA = 'S';
let dcRevealRunning = false;

// --- Canvas-паттерны ---
function dcDrawGeo(ctx, w, h, color) {
  ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.6;
  const s = 28;
  for (let x = 0; x < w + s; x += s) {
    for (let y = 0; y < h + s; y += s) {
      ctx.strokeRect(x-s/2, y-s/2, s, s);
      ctx.beginPath(); ctx.moveTo(x, y-s/2); ctx.lineTo(x+s/2, y);
      ctx.lineTo(x, y+s/2); ctx.lineTo(x-s/2, y); ctx.closePath(); ctx.stroke();
    }
  }
}
function dcDrawWaves(ctx, w, h, color) {
  ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
  for (let y = -20; y < h + 20; y += 18) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const wave = Math.sin((x/w)*Math.PI*4 + y*0.1)*6;
      if (x === 0) ctx.moveTo(x, y+wave); else ctx.lineTo(x, y+wave);
    }
    ctx.stroke();
  }
}
function dcDrawSparks(ctx, w, h, color) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle = color; ctx.globalAlpha = 0.7;
  const rnd = (n) => { let x = Math.sin(n*9301+49297)*233280; return x-Math.floor(x); };
  for (let i = 0; i < 50; i++) {
    const x = rnd(i)*w, y = rnd(i+100)*h, sz = rnd(i+200)*2+0.5;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI*2); ctx.fill();
    if (rnd(i+300) > 0.6) {
      ctx.lineWidth = 0.5; ctx.strokeStyle = color; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(x, y-6); ctx.lineTo(x, y-1); ctx.stroke(); ctx.globalAlpha = 0.7;
    }
  }
}
function dcDrawCrystal(ctx, w, h, color) {
  ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.55;
  const rnd = (n) => { let x = Math.sin(n*127.1+311.7)*43758.5; return x-Math.floor(x); };
  const pts = [];
  for (let i = 0; i < 20; i++) pts.push({ x: rnd(i)*w, y: rnd(i+20)*h });
  for (let i = 0; i < pts.length; i++) {
    for (let j = i+1; j < pts.length; j++) {
      const dist = Math.hypot(pts[i].x-pts[j].x, pts[i].y-pts[j].y);
      if (dist < 100) {
        ctx.globalAlpha = 0.55*(1-dist/100);
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
  }
}
const DC_PATTERNS = { geo: dcDrawGeo, waves: dcDrawWaves, sparks: dcDrawSparks, crystal: dcDrawCrystal };

// --- Применить ДНК-тип к карточке ---
function applyDNA(type) {
  dcActiveDNA = type;
  const d = DNA_CARD[type];
  const root = document.getElementById('scrDnaResult');
  if (!root) return;
  const r = parseInt(d.color.slice(1,3),16);
  const g = parseInt(d.color.slice(3,5),16);
  const b = parseInt(d.color.slice(5,7),16);
  root.style.setProperty('--c', d.color);
  root.style.setProperty('--c2', d.color);
  root.style.setProperty('--cl', d.light);
  root.style.setProperty('--cg', d.glow);
  root.style.setProperty('--cr', r);
  root.style.setProperty('--cg-val', g);
  root.style.setProperty('--cb', b);

  const el = (id) => document.getElementById(id);
  el('typeName').textContent = d.name;
  el('typeDesc').textContent = d.desc;
  el('dnaLabel').textContent = 'ТВОЙ БИЗНЕС-ДНК';
  el('dnrBadge').textContent = '♟ ПЕШКА · УРОВЕНЬ 1';

  // Теги
  const tagsEl = el('typeTags');
  tagsEl.innerHTML = '';
  d.tags.forEach(function(t) {
    const s = document.createElement('span');
    s.className = 'dna-tag'; s.textContent = t; tagsEl.appendChild(s);
  });

  // Серийный номер
  const serial = Math.floor(Math.random()*90000)+10000;
  el('serialNum').textContent = d.serial + '-' + String(serial).padStart(5,'0');

  // Фигура SVG
  el('figSvg').innerHTML = CHESS_SVG.pawn;

  // Canvas-паттерн
  const canvas = el('patternCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    DC_PATTERNS[d.pattern](ctx, canvas.width, canvas.height, d.color);
  }
  dcRenderStars(1);
}

function dcRenderStars(filled) {
  const row = document.getElementById('starsRow');
  if (!row) return;
  row.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    s.className = 'dnr-star ' + (i < filled ? 'lit' : 'dim');
    s.textContent = i < filled ? '★' : '☆';
    if (i < filled) s.style.transition = 'all 0.4s cubic-bezier(0.34,1.56,0.64,1) ' + (i*0.12) + 's';
    row.appendChild(s);
  }
}

// --- Голографический эффект ---
function dcInitHolo() {
  const card = document.getElementById('mainCard');
  const holo = document.getElementById('cardHolo');
  const wrap = document.getElementById('cardWrap');
  const scene = document.getElementById('dnrScene');
  if (!card || !holo || !wrap || !scene) return;

  scene.addEventListener('mousemove', function(e) {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = (e.clientX - cx)/(rect.width/2), dy = (e.clientY - cy)/(rect.height/2);
    wrap.style.transform = 'rotateX(' + (dy*-12) + 'deg) rotateY(' + (dx*12) + 'deg)';
    holo.style.setProperty('--holo-angle', Math.atan2(dy,dx)*(180/Math.PI) + 'deg');
    holo.style.opacity = '0.6';
  });
  scene.addEventListener('mouseleave', function() {
    wrap.style.transform = 'rotateX(0) rotateY(0)';
    wrap.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    holo.style.opacity = '0';
    setTimeout(function() { wrap.style.transition = 'transform 0.1s ease-out'; }, 600);
  });
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function(e) {
      const x = (e.gamma || 0)/30, y = (e.beta || 0)/30 - 1;
      wrap.style.transform = 'rotateX(' + (y*-12) + 'deg) rotateY(' + (x*12) + 'deg)';
      holo.style.setProperty('--holo-angle', Math.atan2(y,x)*(180/Math.PI) + 'deg');
      holo.style.opacity = '0.6';
    });
  }
}

// --- Частицы reveal ---
function dcSpawnParticles(color) {
  const c = document.getElementById('revParticles');
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'rev-particle';
    const sz = 2 + Math.random()*4;
    p.style.cssText = 'width:'+sz+'px;height:'+sz+'px;background:'+color+';left:'+Math.random()*100+'%;bottom:-20px;opacity:0;animation-duration:'+(3+Math.random()*4)+'s;animation-delay:'+(Math.random()*2)+'s;box-shadow:0 0 '+(sz*2)+'px '+color+';';
    c.appendChild(p);
  }
}

// --- REVEAL: Фазовые подфункции ---

function revealPhase2Slow(orbs, label) {
  const roulette = document.getElementById('roulette');
  if (roulette) roulette.classList.remove('spinning');
  label.textContent = 'Анализируем данные...';
  orbs.forEach(function(o) {
    if (!o.classList.contains('orb-' + dcActiveDNA.toLowerCase())) {
      o.style.opacity = '0.08'; o.style.transform += ' scale(0.6)'; o.style.filter = 'blur(2px)';
    }
  });
}

function revealPhase3Winner(orbs, label, d) {
  label.textContent = 'Тип определён!'; label.style.color = d.color;
  orbs.forEach(function(o) {
    if (o.classList.contains('orb-' + dcActiveDNA.toLowerCase())) {
      o.style.transform = 'scale(1.5)';
      o.style.boxShadow = '0 0 60px '+d.color+', 0 0 20px '+d.color;
      o.style.borderColor = d.color;
      o.style.background = 'radial-gradient(circle, '+d.color+'40, '+d.color+'08)';
    }
  });
  const wr = document.getElementById('winnerRings');
  wr.querySelectorAll('.winner-ring').forEach(function(r) { r.style.borderColor = d.color; });
  wr.style.display = 'block';
}

function revealPhase4Ascend(orbs, label, d) {
  orbs.forEach(function(o) {
    if (o.classList.contains('orb-' + dcActiveDNA.toLowerCase())) {
      o.style.transform = 'scale(1.8) translateY(-20px)';
      o.style.boxShadow = '0 0 80px '+d.color+', 0 0 30px '+d.color+', 0 30px 60px rgba(0,0,0,0.5)';
    }
  });
  label.textContent = 'Найдено!'; label.style.fontSize = '13px'; label.style.letterSpacing = '6px';
}

function revealPhase5Explode(screen, d) {
  document.getElementById('revWave').style.background = 'radial-gradient(circle, '+d.color+', transparent 70%)';
  document.getElementById('revWave').classList.add('explode');
  document.getElementById('revWave2').style.borderColor = d.color;
  document.getElementById('revWave2').classList.add('explode');
  document.getElementById('winnerRings').style.display = 'none';
  screen.style.animation = 'dcScreenShake 0.4s ease';
}

function revealPhase6Flash(d) {
  const flash = document.getElementById('revFlash');
  flash.style.background = d.color; flash.classList.add('go');
  document.getElementById('revDark').classList.add('go');
}

function revealPhase7Card(screen, card, orbs, aurora, label) {
  screen.classList.add('hidden');
  document.getElementById('revWave').classList.remove('explode');
  document.getElementById('revWave2').classList.remove('explode');
  document.getElementById('revFlash').classList.remove('go');
  document.getElementById('revDark').classList.remove('go');
  orbs.forEach(function(o) { o.style.cssText = ''; });
  aurora.classList.remove('active');
  label.style.cssText = ''; screen.style.animation = '';

  applyDNA(dcActiveDNA);

  card.style.opacity = ''; card.style.transform = ''; card.style.filter = '';
  card.classList.add('revealed');

  setTimeout(function() {
    const fill = document.getElementById('xpFill');
    if (fill) fill.style.width = '4%';
    const stars = document.querySelectorAll('#scrDnaResult .dnr-star');
    stars.forEach(function(s, i) {
      setTimeout(function() {
        s.style.opacity = '1'; s.style.transform = 'scale(1) rotate(0)';
        if (i === 0) { s.className = 'dnr-star lit'; s.textContent = '★'; }
      }, i*130 + 300);
    });
    setTimeout(function() {
      const cd = document.getElementById('careerDone');
      if (cd) cd.style.width = '0%';
    }, 600);
  }, 700);

  dcRevealRunning = false;

  const revDark = document.getElementById('revDark');
  if (revDark) revDark.style.opacity = '0';
  const revFlash = document.getElementById('revFlash');
  if (revFlash) revFlash.style.opacity = '0';
}

// --- REVEAL: Оркестратор ---
function runReveal() {
  if (dcRevealRunning) return;

  const card = document.getElementById('mainCard');
  const screen = document.getElementById('revealScreen');
  const roulette = document.getElementById('roulette');

  if (!card || !screen || !roulette) {
    if (card) {
      card.classList.add('revealed');
      const body = document.getElementById('cardBody');
      if (body) body.classList.add('go');
    }
    return;
  }

  dcRevealRunning = true;
  card.classList.remove('revealed');
  card.style.opacity = '0'; card.style.transform = 'scale(0.5) translateY(80px)'; card.style.filter = 'blur(30px)';
  screen.classList.remove('hidden');

  const label = document.getElementById('revLabel');
  const orbs = roulette.querySelectorAll('.orb-spin');
  const aurora = document.getElementById('revAurora');
  const d = DNA_CARD[dcActiveDNA];

  aurora.querySelectorAll('.rev-aurora-band').forEach(function(b) { b.style.background = d.color; });
  aurora.classList.add('active');
  dcSpawnParticles(d.color);

  roulette.classList.add('spinning');
  label.textContent = 'Сканируем профиль...'; label.style.opacity = '1';

  setTimeout(function() { revealPhase2Slow(orbs, label); }, 2000);
  setTimeout(function() { revealPhase3Winner(orbs, label, d); }, 3000);
  setTimeout(function() { revealPhase4Ascend(orbs, label, d); }, 3800);
  setTimeout(function() { revealPhase5Explode(screen, d); }, 4500);
  setTimeout(function() { revealPhase6Flash(d); }, 4700);
  setTimeout(function() { revealPhase7Card(screen, card, orbs, aurora, label); }, 5300);
}

// --- XP Toast ---
function showXpToast(amount) {
  const toast = document.getElementById('xpToast');
  if (!toast) return;
  const big = amount >= 5000;
  const d = DNA_CARD[dcActiveDNA];
  toast.textContent = '+' + amount.toLocaleString('ru') + ' XP';
  toast.style.fontSize = big ? '18px' : '16px';
  toast.style.color = big ? '#fbbf24' : d.color;
  toast.style.borderColor = big ? '#fbbf24' : d.color;
  toast.style.boxShadow = '0 8px 32px ' + (big ? 'rgba(251,191,36,0.35)' : d.glow);
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

// --- Level Up ---
function showLevelUp() {
  const ol = document.getElementById('luOverlay');
  const d = DNA_CARD[dcActiveDNA];
  document.getElementById('luFig').textContent = '♞';
  document.getElementById('luFig').style.color = d.color;
  document.getElementById('luTitle').textContent = 'КОНЬ';
  document.getElementById('luTitle').style.color = d.color;
  ol.classList.add('active');
  dcSpawnConfetti();
}
function closeLevelUp() {
  document.getElementById('luOverlay').classList.remove('active');
  document.querySelectorAll('.confetti').forEach(function(c) { c.remove(); });
}
function dcSpawnConfetti() {
  const colors = [DNA_CARD[dcActiveDNA].color, DNA_CARD[dcActiveDNA].light, '#fbbf24', '#fff'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw'; c.style.top = '-12px';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.setProperty('--d', (1.5+Math.random()*2)+'s');
    c.style.setProperty('--delay', Math.random()*0.8+'s');
    c.style.setProperty('--dx', (Math.random()*200-100)+'px');
    c.style.width = (6+Math.random()*6)+'px'; c.style.height = (6+Math.random()*6)+'px';
    document.body.appendChild(c);
  }
  setTimeout(function() { document.querySelectorAll('.confetti').forEach(function(c) { c.remove(); }); }, 5000);
}

// --- Поделиться ---
function shareCard() {
  const d = DNA_CARD[dcActiveDNA];
  const serial = document.getElementById('serialNum').textContent;
  const text = 'Я — ' + d.name + ' в TRAFIQO!\nУровень: Пешка ★\nID: ' + serial;
  if (navigator.share) {
    navigator.share({ title: 'TRAFIQO — DNA', text: text });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showXpToast(0);
    const t = document.getElementById('xpToast');
    t.textContent = 'Скопировано!'; t.style.color = '#22c55e';
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  }
}

// --- Главная init-функция ---
function initDnaResult() {
  const type = window.dnaResult?.type || localStorage.getItem('dnaType') || 'S';
  dcActiveDNA = type;
  if (window.applyDnaTheme) applyDnaTheme(type);
  applyDNA(type);
  dcInitHolo();
  runReveal();

  // Гарантия: если reveal не показал карточку — показать напрямую
  const card = document.getElementById('mainCard');
  if (card && !card.classList.contains('revealed')) {
    card.classList.add('revealed');
    const body = document.getElementById('cardBody');
    if (body) body.classList.add('go');
    setTimeout(() => {
      const xp = document.getElementById('xpFill');
      if (xp) xp.style.width = '4%';
    }, 800);
  }
}

// ЭКСПОРТЫ
window.initDnaResult = initDnaResult;
window.applyDNA = applyDNA;
window.runReveal = runReveal;
window.showXpToast = showXpToast;
window.showLevelUp = showLevelUp;
window.closeLevelUp = closeLevelUp;
window.shareCard = shareCard;
window.revealPhase2Slow = revealPhase2Slow;
window.revealPhase3Winner = revealPhase3Winner;
window.revealPhase4Ascend = revealPhase4Ascend;
window.revealPhase5Explode = revealPhase5Explode;
window.revealPhase6Flash = revealPhase6Flash;
window.revealPhase7Card = revealPhase7Card;
