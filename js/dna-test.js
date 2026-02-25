// ========== DNA SOURCE TRACKING ==========
let dnaSource = 'onboarding'; // 'landing' or 'onboarding'
let preserveDnaResult = false;

async function dnaFromLanding(){
  dnaSource = 'landing';
  await goTo('scrDnaTest');
  if(!document.getElementById('dnaQIcon')){
    await new Promise(function(r){setTimeout(r,500)});
    await goTo('scrDnaTest');
  }
  dnaReset();
}

async function dnaFromOnboarding(){
  const existingType = localStorage.getItem('dnaType');
  if(existingType){
    // Test already passed on landing — skip test AND card, go straight to profile setup
    dnaSource = 'onboarding';
    // Сохраняем в Supabase после регистрации с лендинга
    const scores = JSON.parse(localStorage.getItem('dnaScores') || 'null');
    if(scores && window.saveDnaResult){
      window.saveDnaResult(existingType, scores).catch(console.error);
    }
    await goTo('scrSetup1');
    setupInit();
  } else {
    // No test yet — run full test
    dnaSource = 'onboarding';
    await new Promise(function(r){setTimeout(r, 80)});
    await goTo('scrDnaTest');
    if(!document.getElementById('dnaQIcon')){
      await new Promise(function(r){setTimeout(r,500)});
      await goTo('scrDnaTest');
    }
    dnaReset();
  }
}


function updateDnaResultButton(){
  const btn = document.getElementById('dnrContinueBtn');
  if(!btn) return;
  btn.textContent = dnaSource === 'landing' ? 'Создать аккаунт и сохранить →' : 'Продолжить →';
}

async function dnaResultAction(){
  if(dnaSource === 'landing'){
    preserveDnaResult = true;
    openLndModal('register');
  } else {
    await goTo('scrSetup1');
    setupInit();
  }
}

function dnaGoBack(){
  if(dnaSource === 'landing'){
    goTo('scrLanding');
  } else {
    goTo('scrWelcome');
  }
}

// ========== DNA TEST (FULL REWRITE) ==========

const dnaQIcons=[
'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
'<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
];

const dnaIc={
sFolder:'<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
sGrid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
sLayers:'<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
sGear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
cUsers:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
cChat:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
cCoffee:'<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
cHand:'<svg viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 00-4 0M14 10V4a2 2 0 00-4 0v6M10 9.5V4a2 2 0 00-4 0v10"/><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.7-.8-5.2-2.2L3.3 16.3a2 2 0 012.8-2.8L10 17"/></svg>',
kStar:'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
kPen:'<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
kMonitor:'<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
kEdit:'<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
aChart:'<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
aSearch:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
aBook:'<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
aActivity:'<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
medal:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
heart:'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
video:'<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
map:'<svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>'
};

const dnaQuestions=[
{ic:0,text:'Что для тебя важнее всего в бизнесе?',opts:[
{ic:'sFolder',c:'bl',t:'Стратегия и система',d:'Чёткий план, масштабирование, контроль процессов',ty:'S'},
{ic:'cUsers',c:'gr',t:'Люди и связи',d:'Нетворкинг, команда, крепкие партнёрства',ty:'C'},
{ic:'kStar',c:'or',t:'Креатив и контент',d:'Идеи, личный бренд, визуал, инновации',ty:'K'},
{ic:'aChart',c:'pu',t:'Данные и анализ',d:'Цифры, метрики, оптимизация процессов',ty:'A'}]},
{ic:1,text:'Какая суперсила описывает тебя лучше всего?',opts:[
{ic:'sGrid',c:'bl',t:'Строю структуры',d:'Организую процессы, людей и системы',ty:'S'},
{ic:'cChat',c:'gr',t:'Убеждаю словом',d:'Мотивирую и вдохновляю людей вокруг',ty:'C'},
{ic:'kPen',c:'or',t:'Создаю контент',d:'Визуал, тексты, презентации, видео',ty:'K'},
{ic:'aSearch',c:'pu',t:'Нахожу детали',d:'Вижу то, что другие пропускают',ty:'A'}]},
{ic:2,text:'Как ты предпочитаешь привлекать партнёров?',opts:[
{ic:'aActivity',c:'bl',t:'Через систему',d:'Воронки, автоматизация, скрипты продаж',ty:'S'},
{ic:'cCoffee',c:'gr',t:'Через общение',d:'Встречи, звонки, живой контакт',ty:'C'},
{ic:'kMonitor',c:'or',t:'Через контент',d:'Посты, видео, Stories, блог',ty:'K'},
{ic:'aBook',c:'pu',t:'Через экспертизу',d:'Обучение, кейсы, гайды, разборы',ty:'A'}]},
{ic:3,text:'Что тебя больше всего мотивирует?',opts:[
{ic:'sLayers',c:'bl',t:'Результат и масштаб',d:'Большая команда, высокий доход',ty:'S'},
{ic:'heart',c:'gr',t:'Благодарность людей',d:'Помогать другим расти и развиваться',ty:'C'},
{ic:'medal',c:'or',t:'Признание и бренд',d:'Личный бренд, публичность, аудитория',ty:'K'},
{ic:'aBook',c:'pu',t:'Глубокое понимание',d:'Разобраться в деталях, стать экспертом',ty:'A'}]},
{ic:4,text:'Какой формат обучения тебе ближе?',opts:[
{ic:'map',c:'bl',t:'Стратегические сессии',d:'Планирование, roadmap, постановка целей',ty:'S'},
{ic:'cUsers',c:'gr',t:'Групповые мастермайнды',d:'Обмен опытом в кругу лидеров',ty:'C'},
{ic:'video',c:'or',t:'Видео и визуал',d:'Короткие ролики, примеры, разборы',ty:'K'},
{ic:'aBook',c:'pu',t:'Глубокие материалы',d:'Статьи, исследования, методики',ty:'A'}]},
{ic:5,text:'Что сделаешь первым на платформе?',opts:[
{ic:'sGear',c:'bl',t:'Настрою систему',d:'Профиль, воронки, все инструменты',ty:'S'},
{ic:'cHand',c:'gr',t:'Познакомлюсь с людьми',d:'Напишу, свайпну, начну общение',ty:'C'},
{ic:'kEdit',c:'or',t:'Опубликую пост',d:'Расскажу о себе, покажу экспертизу',ty:'K'},
{ic:'aSearch',c:'pu',t:'Изучу платформу',d:'Посмотрю все разделы, разберусь',ty:'A'}]},
{ic:6,text:'Каким лидером ты хочешь стать?',opts:[
{ic:'sLayers',c:'bl',t:'Стратег-архитектор',d:'Строю империю, мыслю масштабно',ty:'S'},
{ic:'cUsers',c:'gr',t:'Наставник-мотиватор',d:'Веду за собой, зажигаю людей',ty:'C'},
{ic:'kStar',c:'or',t:'Креатор-визионер',d:'Создаю тренды, вдохновляю идеями',ty:'K'},
{ic:'aChart',c:'pu',t:'Эксперт-аналитик',d:'Решения на основе данных и фактов',ty:'A'}]}
];

const dnaTypes={
S:{name:'Стратег',color:'#3b82f6',desc:'Ты — прирождённый лидер и архитектор систем. Видишь картину целиком, строишь структуры и ведёшь команду к масштабным результатам.',tags:['Структуры','Стратегия','Делегирование','Управление']},
C:{name:'Коммуникатор',color:'#22c55e',desc:'Ты — мастер связей и наставник. Люди тянутся к тебе, ты умеешь мотивировать, обучать и создавать крепкие партнёрства.',tags:['Убеждение','Эмпатия','Связи','Обучение']},
K:{name:'Креатор',color:'#f59e0b',desc:'Ты — генератор идей и создатель контента. Личный бренд, визуал, инновации — твоя стихия. Вдохновляешь других своим творчеством.',tags:['Контент','Личный бренд','Визуал','Креативность']},
A:{name:'Аналитик',color:'#a78bfa',desc:'Ты — эксперт и исследователь. Принимаешь решения на основе данных, находишь закономерности и оптимизируешь всё вокруг.',tags:['Анализ','Исследования','Точность','Оптимизация']}
};

let dnaCur=0,dnaScores={S:0,C:0,K:0,A:0},dnaBusy=false;

function dnaSetAmb(r, g, b) {
  const a1 = document.getElementById('dnaAmb1');
  const a2 = document.getElementById('dnaAmb2');
  if (a1) a1.style.setProperty('--da1', 'rgba('+r+','+g+','+b+',.13)');
  if (a2) a2.style.setProperty('--da2', 'rgba('+r+','+g+','+b+',.07)');
}

function dnaRender(idx, dir) {
  if (idx === undefined) idx = dnaCur;
  const total = dnaQuestions.length;
  const qEl = document.getElementById('dnaQ');

  if (dir === 'next' && qEl) {
    qEl.classList.add('exit');
    qEl.addEventListener('animationend', function handler() {
      qEl.removeEventListener('animationend', handler);
      qEl.classList.remove('exit');
      dnaRenderContent(idx, total);
      qEl.classList.add('enter');
      qEl.addEventListener('animationend', function h2() {
        qEl.removeEventListener('animationend', h2);
        qEl.classList.remove('enter');
        dnaBusy = false;
      });
    });
  } else {
    dnaRenderContent(idx, total);
  }

  document.getElementById('dnaStep').textContent = (idx + 1) + ' / ' + total;
  document.getElementById('dnaFill').style.width = ((idx + 1) / total * 100) + '%';

  const dots = document.getElementById('dnaProgDots');
  if (dots) {
    dots.innerHTML = Array.from({length: total}, function(_, i) {
      let c = 'dna-pdot';
      if (i < idx) c += ' done';
      if (i === idx) c += ' active';
      return '<div class="' + c + '"></div>';
    }).join('');
  }
}

function dnaRenderContent(idx, total) {
  const q = dnaQuestions[idx];

  const icon = document.getElementById('dnaQIcon');
  if (icon) {
    const existing = icon.querySelector('svg');
    if (existing) existing.remove();
    const tmp = document.createElement('div');
    tmp.innerHTML = dnaQIcons[q.ic] || '';
    const svgEl = tmp.firstElementChild;
    if (svgEl) icon.appendChild(svgEl);
  }

  const numEl = document.getElementById('dnaNum');
  if (numEl) numEl.textContent = 'ВОПРОС ' + (idx + 1) + ' ИЗ ' + total;

  const textEl = document.getElementById('dnaText');
  if (textEl) textEl.textContent = q.text;

  const grid = document.getElementById('dnaGrid');
  if (!grid) return;

  grid.innerHTML = q.opts.map(function(o) {
    const t = o.ty.toLowerCase();
    return '<div class="dna-card dc-' + t + '" data-ty="' + o.ty + '">'
      + '<div class="dna-card-ic ' + o.c + '">' + (dnaIc[o.ic] || '') + '</div>'
      + '<div class="dna-card-t">' + o.t + '</div>'
      + '<div class="dna-card-d">' + o.d + '</div>'
      + '<div class="dna-card-chk"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'
      + '</div>';
  }).join('');

  grid.querySelectorAll('.dna-card').forEach(function(c, i) {
    c.onclick = function(ev) { dnaSelect(c, o_tyFromCard(c), ev); };
    setTimeout(function() { c.classList.add('dna-card-show'); }, i * 55);
  });
}

function o_tyFromCard(card) {
  return card.getAttribute('data-ty');
}

function dnaSelect(el, ty, ev) {
  if (dnaBusy) return;
  dnaBusy = true;

  const cards = document.querySelectorAll('#dnaGrid .dna-card');
  el.classList.add('selected');
  cards.forEach(function(c) {
    if (c !== el) c.classList.add('dimmed');
  });

  if (ev) {
    const r = document.createElement('div');
    r.className = 'dna-ripple';
    const rect = el.getBoundingClientRect();
    const s = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:' + s + 'px;height:' + s + 'px;'
      + 'left:' + (ev.clientX - rect.left - s / 2) + 'px;'
      + 'top:' + (ev.clientY - rect.top - s / 2) + 'px;'
      + 'background:rgba(255,255,255,.08)';
    el.appendChild(r);
    setTimeout(function() { r.remove(); }, 700);
  }

  const colMap = {
    S: {r:59, g:130, b:246},
    C: {r:34, g:197, b:94},
    K: {r:245, g:158, b:11},
    A: {r:167, g:139, b:250}
  };
  const col = colMap[ty];
  if (col) dnaSetAmb(col.r, col.g, col.b);

  if (navigator.vibrate) navigator.vibrate(20);

  dnaScores[ty]++;

  setTimeout(function() {
    if (dnaCur < dnaQuestions.length - 1) {
      dnaCur++;
      dnaRender(dnaCur, 'next');
    } else {
      startDnaReveal();
    }
  }, 550);
}

// ── Переход к результату ──
async function startDnaReveal(){
  let mx='S',ms=0;
  for(const t in dnaScores) if(dnaScores[t]>ms){ms=dnaScores[t];mx=t}
  localStorage.setItem('dnaType',mx);
  localStorage.setItem('dnaScores',JSON.stringify(dnaScores));
  if(window.saveDnaResult) window.saveDnaResult(mx,dnaScores).catch(console.error);
  const tp=dnaTypes[mx];
  window.dnaResult = { type: mx, name: tp.name };
  await goTo('scrDnaResult');
  if (window.runReveal) window.runReveal();
  updateDnaResultButton();
  dnaBusy=false;
}

function dnaReset(){
  dnaCur=0;dnaScores={S:0,C:0,K:0,A:0};dnaBusy=false;
  dnaRender();
}

async function dnaRetry(){await goTo('scrDnaTest');setTimeout(dnaReset,400);}
