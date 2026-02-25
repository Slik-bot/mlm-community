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

// ─── DNA EXTRA DATA ──────────────────

const DNA_EXTRA = {
  S: {
    strengths: [
      'Системное мышление', 'Долгосрочное планирование',
      'Анализ рисков', 'Принятие решений', 'Управление ресурсами'
    ],
    quests: [
      'Составь план на неделю', 'Проанализируй конкурента',
      'Поставь 3 цели на месяц'
    ]
  },
  C: {
    strengths: [
      'Навыки убеждения', 'Построение отношений',
      'Активное слушание', 'Работа в команде', 'Эмоциональный интеллект'
    ],
    quests: [
      'Познакомься с новым участником', 'Напиши пост в ленту',
      'Оставь 3 комментария'
    ]
  },
  K: {
    strengths: [
      'Нестандартное мышление', 'Генерация идей',
      'Визуальное мышление', 'Адаптивность', 'Вдохновение других'
    ],
    quests: [
      'Создай креативный пост', 'Предложи новую идею',
      'Сними короткое видео'
    ]
  },
  A: {
    strengths: [
      'Работа с данными', 'Критическое мышление',
      'Точность и внимание', 'Структурирование информации',
      'Поиск закономерностей'
    ],
    quests: [
      'Разбери кейс участника', 'Составь аналитику недели',
      'Найди 3 инсайта в ленте'
    ]
  }
};

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

// ─── REVEAL, LEVEL UP, CONFETTI — см. dna-reveal.js ──

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

// ─── TABS ─────────────────────────────

const TAB_PANELS = {
  archetype: 'dnrPanelArchetype',
  strengths: 'dnrPanelStrengths',
  quests: 'dnrPanelQuests'
};

function initDnaTabs() {
  const tabBar = document.getElementById('dnrTabs');
  if (!tabBar) return;

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.dnr-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;

    tabBar.querySelectorAll('.dnr-tab').forEach(t =>
      t.classList.remove('dnr-tab--active'));
    btn.classList.add('dnr-tab--active');

    Object.values(TAB_PANELS).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('dnr-panel--active');
    });
    const panel = document.getElementById(TAB_PANELS[tab]);
    if (panel) panel.classList.add('dnr-panel--active');

    if (tab === 'strengths') renderStrengths(activeDNA);
    if (tab === 'quests') renderQuests(activeDNA);
  });
}

function renderStrengths(type) {
  const list = document.getElementById('dnrStrengthsList');
  if (!list || list.children.length > 0) return;
  const data = DNA_EXTRA[type];
  if (!data) return;

  data.strengths.forEach(text => {
    const li = document.createElement('li');
    li.className = 'dnr-strength-item';
    li.textContent = text;
    list.appendChild(li);
  });
}

function renderQuests(type) {
  const container = document.getElementById('dnrQuestsList');
  if (!container || container.children.length > 0) return;
  const data = DNA_EXTRA[type];
  if (!data) return;

  data.quests.forEach(text => {
    const card = document.createElement('div');
    card.className = 'dnr-quest-card';

    const txt = document.createElement('span');
    txt.className = 'dnr-quest-text';
    txt.textContent = text;

    const btn = document.createElement('button');
    btn.className = 'dnr-quest-btn';
    btn.textContent = 'Взять';

    card.appendChild(txt);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

// ─── INIT ──────────────────────────────

function initDnaResult() {
  const wrap = document.getElementById('dnrReveal');
  if (wrap) {
    wrap.classList.add('active');
    wrap.style.opacity = '1';
  }

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
  initDnaTabs();

  document.getElementById('dnrBtnContinue')
    ?.addEventListener('click', () => {
      if (typeof dnaResultAction === 'function') {
        dnaResultAction();
      } else {
        window.goTo('scrFeed');
      }
    });
  document.getElementById('dnrBtnShare')
    ?.addEventListener('click', shareCard);
  document.getElementById('luBtnClose')
    ?.addEventListener('click', window.closeLevelUp);

  setTimeout(() => window.runDnaReveal(), 300);

  setTimeout(() => renderStars(1), 4500);
}

window.initDnaResult = initDnaResult;
