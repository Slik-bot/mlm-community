// ========== DNA SOURCE TRACKING ==========
var dnaSource = 'onboarding'; // 'landing' or 'onboarding'
var preserveDnaResult = false;

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
  var existingType = localStorage.getItem('dnaType');
  if(existingType){
    // Test already passed on landing — skip test AND card, go straight to profile setup
    dnaSource = 'onboarding';
    await goTo('scrSetup1');
    setupInit();
  } else {
    // No test yet — run full test
    dnaSource = 'onboarding';
    await goTo('scrDnaTest');
    if(!document.getElementById('dnaQIcon')){
      await new Promise(function(r){setTimeout(r,500)});
      await goTo('scrDnaTest');
    }
    dnaReset();
  }
}


function updateDnaResultButton(){
  var btn = document.getElementById('dnrMainBtn');
  var retry = document.getElementById('dnrRetryBtn');
  if(!btn) return;

  if(dnaSource === 'landing'){
    btn.textContent = 'Создать аккаунт и сохранить →';
    if(retry) retry.textContent = 'Пройти заново';
  } else {
    btn.textContent = 'Продолжить →';
    if(retry) retry.textContent = 'Пройти заново';
  }
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

var dnaQIcons=[
'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
'<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
'<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
];

var dnaIc={
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

var dnaPawnSVG='<svg viewBox="0 0 80 100" fill="none"><circle cx="40" cy="20" r="11" fill="currentColor" opacity=".95"/><path d="M30 36c0-5 5-9 10-9h0c5 0 10 4 10 9 0 3-2 6-4 7l2 22H32l2-22c-2-1-4-4-4-7z" fill="currentColor" opacity=".8"/><path d="M30 65l-3 12h26l-3-12z" fill="currentColor" opacity=".7"/><rect x="23" y="77" width="34" height="7" rx="2.5" fill="currentColor" opacity=".85"/><rect x="19" y="84" width="42" height="8" rx="3" fill="currentColor" opacity=".95"/></svg>';

var dnaQuestions=[
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

var dnaTypes={
S:{name:'Стратег',color:'#3b82f6',desc:'Ты — прирождённый лидер и архитектор систем. Видишь картину целиком, строишь структуры и ведёшь команду к масштабным результатам.',tags:['Структуры','Стратегия','Делегирование','Управление']},
C:{name:'Коммуникатор',color:'#22c55e',desc:'Ты — мастер связей и наставник. Люди тянутся к тебе, ты умеешь мотивировать, обучать и создавать крепкие партнёрства.',tags:['Убеждение','Эмпатия','Связи','Обучение']},
K:{name:'Креатор',color:'#f59e0b',desc:'Ты — генератор идей и создатель контента. Личный бренд, визуал, инновации — твоя стихия. Вдохновляешь других своим творчеством.',tags:['Контент','Личный бренд','Визуал','Креативность']},
A:{name:'Аналитик',color:'#a78bfa',desc:'Ты — эксперт и исследователь. Принимаешь решения на основе данных, находишь закономерности и оптимизируешь всё вокруг.',tags:['Анализ','Исследования','Точность','Оптимизация']}
};

var dnaCur=0,dnaScores={S:0,C:0,K:0,A:0},dnaBusy=false;

function dnaRender(){
var q=dnaQuestions[dnaCur];
var el=document.getElementById('dnaQIcon');if(!el)return;
el.innerHTML=dnaQIcons[q.ic];
document.getElementById('dnaNum').textContent='ВОПРОС '+(dnaCur+1)+' ИЗ 7';
document.getElementById('dnaText').textContent=q.text;
document.getElementById('dnaStep').textContent=(dnaCur+1)+' / 7';
document.getElementById('dnaFill').style.width=((dnaCur+1)/7*100)+'%';
var g=document.getElementById('dnaGrid');g.innerHTML='';
q.opts.forEach(function(o){
var d=document.createElement('div');d.className='dna-card';
d.innerHTML='<div class="dna-card-chk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="dna-card-ic '+o.c+'">'+dnaIc[o.ic]+'</div><div class="dna-card-t">'+o.t+'</div><div class="dna-card-d">'+o.d+'</div>';
d.onclick=function(){dnaSelect(d,o.ty)};g.appendChild(d);});
}

function dnaSelect(el,ty){
if(dnaBusy)return;dnaBusy=true;
document.querySelectorAll('#dnaGrid .dna-card').forEach(function(c){c===el?c.classList.add('selected'):c.classList.add('dimmed')});
dnaScores[ty]++;
setTimeout(function(){
if(dnaCur<6){var b=document.getElementById('dnaQ');b.classList.add('exit');
setTimeout(function(){dnaCur++;dnaRender();b.classList.remove('exit');b.classList.add('enter');
requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.remove('enter');dnaBusy=false})})},300);
}else{startDnaReveal();}
},600);
}

async function startDnaReveal(){
  var mx='S',ms=0;
  for(var t in dnaScores) if(dnaScores[t]>ms){ms=dnaScores[t];mx=t}
  localStorage.setItem('dnaType',mx);
  localStorage.setItem('dnaScores',JSON.stringify(dnaScores));
  if (window.saveDnaResult) {
    window.saveDnaResult(mx, dnaScores).catch(console.error);
  }
  var tp=dnaTypes[mx],cl=tp.color;

  await goTo('scrDnaResult');

  var rv=document.getElementById('dnrReveal');
  if(!rv){
    await new Promise(function(r){setTimeout(r,500)});
    await goTo('scrDnaResult');
    rv=document.getElementById('dnrReveal');
  }
  if(!rv){dnaBusy=false;return;}
  var roulette=document.getElementById('dnrRoulette');
  if(!roulette){dnaBusy=false;return;}
  var label=document.getElementById('dnrRevLabel');
  var orbs=roulette.querySelectorAll('.dnr-orb-spin');
  var wave=document.getElementById('dnrWave');
  var screen=document.getElementById('dnrScreen');

  // Full reset
  rv.classList.add('active');
  screen.classList.remove('active');
  roulette.className='dnr-roulette';
  roulette.style.cssText='';
  orbs.forEach(function(o){o.className='dnr-orb-spin dnr-orb-'+o.getAttribute('data-type').toLowerCase();o.style.cssText='';});
  wave.className='dnr-wave';wave.style.background='';
  label.className='dnr-reveal-label';label.textContent='Кто ты?';
  document.getElementById('dnrRevBg').style.background='radial-gradient(circle,rgba(139,92,246,.04),transparent 60%)';

  // ─── PHASE 1: Roulette fast (0–1.5s) ───

  // ─── PHASE 2: Slowing (1.5s) ───
  setTimeout(function(){
    roulette.classList.add('slowing');
    label.textContent='Определяем...';
  },1500);

  // ─── PHASE 3: Stop + fade losers (3s) ───
  setTimeout(function(){
    roulette.classList.add('stopped');
    orbs.forEach(function(o){
      if(o.getAttribute('data-type')!==mx) o.classList.add('fade');
      else o.classList.add('winner');
    });
    label.textContent='Найдено';
    label.classList.add('big');
    document.getElementById('dnrRevBg').style.background='radial-gradient(circle,'+cl+'06,transparent 55%)';
  },3000);

  // ─── PHASE 4: Golden moment — float + aura (4s) ───
  setTimeout(function(){
    // Find winner orb and float it up
    orbs.forEach(function(o){
      if(o.getAttribute('data-type')===mx){
        o.style.transition='all 1.2s cubic-bezier(.16,1,.3,1)';
        o.style.transform='translateY(-20px)';
        o.style.boxShadow='0 0 60px '+cl+',0 0 120px '+cl+'80,0 0 180px '+cl+'40';
        o.style.width='44px';
        o.style.height='44px';
        o.style.margin='-10px';
      }
    });
    // Darken background slightly
    document.getElementById('dnrRevBg').style.background='radial-gradient(circle,'+cl+'10,rgba(0,0,0,.15) 60%)';
    label.textContent='';
  },4000);

  // ─── PHASE 5: Pause... then WAVE (5.2s) ───
  setTimeout(function(){
    if(navigator.vibrate) navigator.vibrate([30,60,100]);

    roulette.classList.add('shrink');
    label.classList.add('hide');

    wave.style.background='radial-gradient(circle,'+cl+'12 0%,'+cl+'06 30%,'+cl+'02 55%,transparent 70%)';
    wave.classList.add('fire');
  },5200);

  // ─── PHASE 6: Show luxury card (6.5s) ───
  setTimeout(function(){
    wave.classList.add('done');
    rv.classList.remove('active');
    screen.classList.add('active');

    // ── Set all card colors ──
    document.getElementById('dnrOrb1').style.background='radial-gradient(circle,'+cl+'14,transparent 70%)';
    document.getElementById('dnrOrb2').style.background='radial-gradient(circle,'+cl+'08,transparent 70%)';

    // Card header gradient
    document.getElementById('dnrCardHeader').style.background='linear-gradient(180deg,'+cl+'08 0%,'+cl+'03 60%,transparent 100%)';

    // Card top glow
    document.getElementById('dnrCard').style.borderTopColor=cl+'15';

    // Pawn ripple
    var ripple=document.getElementById('dnrPawnRipple');
    if(ripple){
      ripple.querySelectorAll('.dnr-ripple-ring').forEach(function(r){
        r.style.borderColor=cl+'30';
        r.style.setProperty('--dnr-c',cl+'25');
        r.style.boxShadow='0 0 8px '+cl+'10,inset 0 0 8px '+cl+'05';
      });
    }

    // Pawn
    var pw=document.getElementById('dnrPawn');
    pw.style.background='linear-gradient(180deg,'+cl+'14,'+cl+'06)';
    pw.style.border='1.5px solid '+cl+'18';
    pw.style.setProperty('--dnr-c',cl+'20');
    pw.style.color=cl;
    pw.innerHTML=dnaPawnSVG;

    // Badge
    var bdg=document.getElementById('dnrBadge');
    bdg.style.background=cl+'06';bdg.style.color=cl;bdg.style.borderColor=cl+'12';

    // Exclusive text
    document.getElementById('dnrExclusive').style.color=cl;

    // Label
    document.getElementById('dnrLabel').style.color=cl;

    // Name with focus effect
    var nm=document.getElementById('dnrName');
    nm.classList.add('focusing');
    nm.textContent=tp.name;
    setTimeout(function(){nm.classList.remove('focusing')},150);

    // Accent line
    var acc=document.querySelector('.dnr-accent');
    if(acc) acc.style.background=cl;

    // Decorative quote color
    document.getElementById('dnrDescQuote').style.color=cl;

    // Description
    document.getElementById('dnrDesc').textContent=tp.desc;

    // Tags
    var tg=document.getElementById('dnrTags');tg.innerHTML='';
    tp.tags.forEach(function(t){
      var s=document.createElement('span');s.className='dnr-tag';
      s.style.color=cl;s.style.borderColor=cl+'10';
      s.textContent=t;tg.appendChild(s);
    });

    // Career — active figure
    var fig0=document.getElementById('dnrFig0');
    if(fig0){fig0.style.setProperty('--dnr-c',cl+'40');fig0.style.color=cl;fig0.style.textShadow='0 0 12px '+cl+'50';}

    // Career line fill
    var lf=document.getElementById('dnrLineFill0');
    if(lf){lf.style.background='linear-gradient(90deg,'+cl+','+cl+'30)';setTimeout(function(){lf.style.width='100%'},500);}

    // XP bar
    var xb=document.getElementById('dnrXpBar');
    xb.style.background='linear-gradient(90deg,'+cl+','+cl+'50)';
    setTimeout(function(){xb.style.width='3%'},500);

    // Serial number
    var serial=document.getElementById('dnrSerial');
    if(serial) serial.textContent='#DNA-'+String(Math.floor(10000+Math.random()*89999));

    // Background particles
    var bp=document.getElementById('dnrBgParticles');bp.innerHTML='';
    for(var i=0;i<10;i++){
      var p=document.createElement('div');p.className='dnr-bg-p';
      p.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;width:'+(1+Math.random()*1.5)+'px;height:'+(1+Math.random()*1.5)+'px;background:'+cl+';opacity:'+(0.06+Math.random()*0.12)+';animation-duration:'+(10+Math.random()*12)+'s;animation-delay:'+Math.random()*5+'s;';
      bp.appendChild(p);
    }

    updateDnaResultButton();
    playDnaReveal(cl);
  },6500);
}

// ── DNA Result Reveal Animation ──
function playDnaReveal(cl){
  var scr=document.getElementById('scrDnaResult');
  if(!scr) return;

  // Glow color подстраивается под тип ДНК
  var glow=scr.querySelector('.dna-rv-glow');
  if(glow) glow.style.setProperty('--dna-glow-color',cl+'40');

  // Сброс + каскад появлений
  var items=scr.querySelectorAll('.dna-rv-item');
  items.forEach(function(el){el.classList.remove('dna-rv-visible');});
  items.forEach(function(el){
    var delay=parseInt(el.getAttribute('data-dna-rv-delay'))||0;
    setTimeout(function(){el.classList.add('dna-rv-visible');},delay);
  });
}

function dnaReset(){
  dnaCur=0;dnaScores={S:0,C:0,K:0,A:0};dnaBusy=false;
  var rv=document.getElementById('dnrReveal');
  if(rv){rv.classList.remove('active');rv.style.display='';rv.style.opacity='';rv.style.pointerEvents='';}
  var scr=document.getElementById('dnrScreen');
  if(scr){scr.classList.remove('active');scr.style.opacity='';scr.style.pointerEvents='';}
  var card=document.getElementById('dnrCard');
  if(card){card.style.opacity='';card.style.transform='';}
  var btn=document.getElementById('dnrMainBtn');
  if(btn){btn.style.opacity='';btn.style.transform='';}
  var retry=document.getElementById('dnrRetryBtn');
  if(retry){retry.style.opacity='';}
  var roulette=document.getElementById('dnrRoulette');
  if(roulette){roulette.className='dnr-roulette';roulette.style.cssText='';}
  var wave=document.getElementById('dnrWave');
  if(wave){wave.className='dnr-wave';wave.style.background='';}
  var nm=document.getElementById('dnrName');
  if(nm) nm.classList.remove('focusing');
  var orbs=document.querySelectorAll('.dnr-orb-spin');
  orbs.forEach(function(o){o.style.cssText='';});
  // Сброс reveal-анимаций
  var scrEl=document.getElementById('scrDnaResult');
  if(scrEl){scrEl.querySelectorAll('.dna-rv-item').forEach(function(el){el.classList.remove('dna-rv-visible');});}
  dnaRender();
}

async function dnaRetry(){await goTo('scrDnaTest');setTimeout(dnaReset,400);}

