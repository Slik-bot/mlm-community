// ===== LANDING =====

// ═══ ECOSYSTEM MODAL DATA ═══
const ECO_DATA = {
  1:{title:'ДНК-тест бизнеса',text:'7 вопросов — 60 секунд — и система определяет твой бизнес-ДНК: Стратег, Коммуникатор, Креатор или Аналитик.\n\nЭто не развлекательный тест. Результат влияет на всё: какие ежедневные квесты тебе выпадают, кого Матч-система подбирает в партнёры, какой контент в ленте показывается первым, какие инструменты в магазине рекомендуются.\n\nКаждый ДНК-тип получает свой цвет — и твоя шахматная фигура окрашивается в него. Стратег — синяя, Коммуникатор — зелёная, Креатор — оранжевая, Аналитик — фиолетовая. Это твоя визуальная идентичность в сообществе.\n\nМожно пройти бесплатно прямо сейчас — даже без регистрации.'},
  2:{title:'Матч-система',text:'Полноэкранные карточки участников — свайпай как в Tinder, только для бизнеса. Вправо — интерес, влево — пропуск. Один Superlike в день с золотой рамкой.\n\nАлгоритм подбора учитывает 7 факторов: ДНК-совместимость (30%), общие интересы (20%), совпадение целей (20%), уровень опыта (10%), общие друзья (10%), активность (5%), география (5%). Кольцо вокруг аватара показывает процент совместимости.\n\nПри матче — экран с конфетти, два аватара, процент совместимости и автоматический icebreaker в чате. Не нужно придумывать, с чего начать разговор.\n\nPRO — 10 свайпов в день, BUSINESS — безлимит.'},
  3:{title:'Геймификация',text:'Система «Импульс» — как Duolingo, но для бизнеса. Каждое утро 3 персональных квеста под твой ДНК-тип. Выполнил все три — бонус x1.5 к XP.\n\nXP начисляются за всё: пост = 15 XP, кейс «Было/Стало» = 30 XP, комментарий = 3 XP, матч = 15 XP, продажа инструмента = 20 XP, шеринг в Telegram = 15 XP.\n\nСтрик-серии умножают заработок: 7 дней подряд — x1.3, 30 дней — x2.0, 90 дней — x3.0 ко всем XP. Плюс 50+ ачивок: от «Первое слово» до секретных — «Ночная сова» (заходи в 00:00-05:00), «Марафонец» (streak 100 дней).\n\nЕженедельные челленджи с призами, сезоны каждые 3 месяца с эксклюзивными бейджами.'},
  4:{title:'Маркетплейс',text:'Внутренний магазин инструментов: гайды, воронки, AI-ассистенты, шаблоны, курсы — всё для сетевого бизнеса. От бесплатных lead-магнитов до премиум-курсов (99–9990 руб).\n\nЛюбой участник уровня Слон+ может создавать и продавать. Экономика создателей: Новый автор → Проверенный (10+ продаж) → Топ-автор (50+, рейтинг 4.5+) → Эксперт магазина (100+). Комиссия снижается с ростом: 15% → 12% → 10%.\n\nБандлы со скидкой -20%, Flash Sale каждые 24 часа с -50%, промокоды, кешбэк 10% за отзыв. Оплата: карта, Telegram Stars, промокод. Гарантия возврата 24 часа.\n\nЭто не просто магазин — это полноценная экономика создателей внутри сообщества.'},
  5:{title:'Академия',text:'Библиотека микро-уроков по 30-60 секунд. 4 категории: Личный бренд, Рекрутинг, Продажа инструментов, Гайд по приложению — по 5 уроков в каждой.\n\nФормат: текст + скриншот + готовый шаблон для копирования + кнопка действия. Прочитал — сразу применил. Уроки привязаны к Карте возможностей — RPG-маршрут с 5 ветками по 5 шагов.\n\nМаршрут новичка: 7 дней, 10 шагов, ~300 XP. День 1 — профиль + первый пост. День 3 — Story + комментарии. День 5 — Матч + сообщение. День 7 — кейс + помощь новичку. Финал: ачивка «Первопроходец» + 100 XP бонус.\n\nLive-воркшопы от лидеров каждую неделю. Прошёл курс — сертификат + XP + бейдж.'},
  6:{title:'Аналитика',text:'Персональный дашборд в реальном времени: рост сети, активность команды, конверсии, динамика дохода. Для BUSINESS — расширенная аналитика по каждому участнику.\n\nЕженедельный автоматический отчёт каждое воскресенье: XP, квесты, streak, позиция в топ-%. До следующего уровня — конкретно в днях. Можно поделиться отчётом (виральность!).\n\nГраф связей — визуальная карта твоего нетворка на d3.js: прямые друзья → друзья друзей → 3-й круг. Статистика: «Через 1 рукопожатие — 156 человек. Найти путь к...»\n\nПубличный лендинг trafiqo.app/@username — SEO-визитка с аватаром, ДНК, компаниями, кейсами и рейтингом.'}
};

// ═══ TARIFF MODAL DATA ═══
const TARIFF_DATA = {
  free: {
    title: 'FREE — Бесплатно',
    color: 'rgba(255,255,255,0.5)',
    content: '<div style="font-size:13.5px;line-height:1.75;color:rgba(255,255,255,0.65);">' +
      '<p style="margin-bottom:12px;">Бесплатный тариф — это полноценный вход в экосистему TRAFIQO. Без оплаты, без ограничений по времени.</p>' +
      '<h4 style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);margin:16px 0 8px;">Что входит:</h4>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>Лента и Stories</strong> — читай кейсы, смотри Stories, следи за экспертами</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>ДНК-тест бизнеса</strong> — определи свой тип: Стратег, Коммуникатор, Креатор, Аналитик</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>10 диалогов в чате</strong> — общайся с участниками сообщества</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>5 постов в месяц</strong> — делись опытом и кейсами</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>Форум и Академия</strong> — доступ к обучению и обсуждениям</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>3 матча в день</strong> — находи партнёров через Матч-систему</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>Магазин (покупка)</strong> — покупай инструменты от создателей</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">✓ <strong>Реферальная</strong> — 1 месяц PRO за приглашённого друга</div>' +
      '</div>' +
      '<p style="margin-top:14px;color:rgba(255,255,255,0.4);font-size:12px;text-align:center;">Начни бесплатно — обновись, когда будешь готов расти быстрее.</p>' +
    '</div>'
  },
  pro: {
    title: 'PRO — 599₽/мес',
    color: 'rgba(139,92,246,0.8)',
    content: '<div style="font-size:13.5px;line-height:1.75;color:rgba(255,255,255,0.65);">' +
      '<p style="margin-bottom:8px;">Самый популярный тариф. Снимает все основные ограничения и открывает мощные инструменты роста.</p>' +
      '<div style="padding:8px 12px;border-radius:8px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);margin-bottom:12px;font-size:12px;color:rgba(139,92,246,0.7);text-align:center;font-weight:600;">Годовая подписка: 4 990₽ — экономия 30%</div>' +
      '<h4 style="font-size:14px;font-weight:700;color:rgba(139,92,246,0.9);margin:12px 0 8px;">Всё из FREE плюс:</h4>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Безлимит постов и чатов</strong> — никаких ограничений на общение</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Матч: 10 свайпов/день</strong> — в 3 раза больше контактов</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>1 компания</strong> — создай карточку своей компании</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Магазин: 3 инструмента</strong> — продавай свои гайды и курсы</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Реферальная 15%</strong> — с каждой подписки приведённого</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>1 заморозка streak/мес</strong> — не потеряй серию</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Фиолетовая animated рамка</strong> — выделяйся в ленте</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.08);">✓ <strong>Все фильтры и категории</strong> — находи нужное быстрее</div>' +
      '</div>' +
      '<p style="margin-top:14px;color:rgba(139,92,246,0.5);font-size:12px;text-align:center;">Самый выгодный выбор для активного роста в сообществе.</p>' +
    '</div>'
  },
  biz: {
    title: 'BUSINESS — 1 490₽/мес',
    color: 'rgba(251,191,36,0.8)',
    content: '<div style="font-size:13.5px;line-height:1.75;color:rgba(255,255,255,0.65);">' +
      '<p style="margin-bottom:8px;">Максимальный тариф для лидеров и команд. Полный доступ ко всем инструментам без ограничений.</p>' +
      '<div style="padding:8px 12px;border-radius:8px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.12);margin-bottom:12px;font-size:12px;color:rgba(251,191,36,0.7);text-align:center;font-weight:600;">Годовая подписка: 11 990₽ — экономия 33%</div>' +
      '<h4 style="font-size:14px;font-weight:700;color:rgba(251,191,36,0.9);margin:12px 0 8px;">Всё из PRO плюс:</h4>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Безлимит матчей</strong> — неограниченный нетворкинг</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>5 компаний</strong> — управляй несколькими бизнесами</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Безлимит инструментов</strong> — продавай без ограничений</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Аналитика по команде</strong> — дашборд по каждому участнику</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Реферальная 20%</strong> — максимальная комиссия</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>3 заморозки streak/мес</strong> — тройная защита серии</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Приоритет в ленте</strong> — твои посты видят первыми</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Золотая animated рамка</strong> — VIP-статус в сообществе</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.08);">✓ <strong>Расширенная аналитика</strong> — курсы, лидерборды, API</div>' +
      '</div>' +
      '<p style="margin-top:14px;color:rgba(251,191,36,0.5);font-size:12px;text-align:center;">Для тех, кто строит серьёзный бизнес и масштабирует команды.</p>' +
    '</div>'
  }
};

// ═══ INIT SUBFUNCTIONS ═══

function initLndHeader() {
  const lnd=document.getElementById('scrLanding');
  const hdr=document.getElementById('lndHdr');
  if(lnd&&hdr) lnd.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',lnd.scrollTop>40);});
  const app=document.querySelector('.app');
  document.querySelectorAll('#scrLanding > .lnd-modal-bg').forEach(function(m){app.appendChild(m);});
}

function createParticles(containerId) {
  const c=document.getElementById(containerId);
  if(!c) return;
  c.innerHTML='';
  for(let i=0;i<18;i++){
    const b=document.createElement('div');b.className='lnd-bubble';
    const sz=Math.random()*16+8;
    b.style.width=sz+'px';b.style.height=sz+'px';
    b.style.left=Math.random()*100+'%';
    b.style.setProperty('--dur',(Math.random()*12+10)+'s');
    b.style.setProperty('--del',(Math.random()*15)+'s');
    b.style.setProperty('--sway',(Math.random()*40+15)+'px');
    b.style.setProperty('--op',(Math.random()*0.35+0.3));
    c.appendChild(b);
  }
  for(let j=0;j<25;j++){
    const g=document.createElement('div');g.className='lnd-glow';
    const gs=Math.random()*5+3;
    g.style.width=gs+'px';g.style.height=gs+'px';
    g.style.left=Math.random()*100+'%';g.style.top=Math.random()*100+'%';
    g.style.setProperty('--pdur',(Math.random()*3+2)+'s');
    g.style.setProperty('--del',(Math.random()*5)+'s');
    g.style.setProperty('--op',(Math.random()*0.4+0.35));
    c.appendChild(g);
  }
  for(let k=0;k<5;k++){
    const o=document.createElement('div');o.className='lnd-orb-float';
    const os=Math.random()*60+40;
    o.style.width=os+'px';o.style.height=os+'px';
    o.style.left=(Math.random()*90+5)+'%';o.style.top=(Math.random()*80+10)+'%';
    o.style.setProperty('--dur',(Math.random()*15+20)+'s');
    o.style.setProperty('--del',(Math.random()*10)+'s');
    o.style.setProperty('--op',(Math.random()*0.15+0.08));
    c.appendChild(o);
  }
}

function initLndCarousel() {
  const c=document.getElementById('lndCarousel');
  const dots=document.querySelectorAll('#lndDots span');
  if(c&&dots.length){
    c.addEventListener('scroll',function(){
      const idx=Math.round(c.scrollLeft/(c.scrollWidth/dots.length));
      dots.forEach(function(d,i){d.classList.toggle('active',i===idx);});
    });
  }
}

function initLndScrollReveal() {
  const landing=document.getElementById('scrLanding');
  if(!landing) return;
  let srElements=[];
  let srTicking=false;
  const srCheck=function(){
    const landingRect=landing.getBoundingClientRect();
    const threshold=landing.clientHeight*0.82;
    srElements.forEach(function(item){
      if(item.revealed) return;
      const rect=item.el.getBoundingClientRect();
      if(rect.top-landingRect.top<threshold){item.el.classList.add('sr-visible');item.revealed=true;}
    });
    srElements=srElements.filter(function(item){return !item.revealed;});
    if(srElements.length===0){
      landing.removeEventListener('scroll',srOnScroll);
      document.removeEventListener('touchmove',srOnScroll);
    }
  };
  const srOnScroll=function(){
    if(!srTicking){
      srTicking=true;
      requestAnimationFrame(function(){srCheck();srTicking=false;});
    }
  };
  landing.querySelectorAll('[data-sr]').forEach(function(el){srElements.push({el:el,revealed:false});});
  if(srElements.length>0){
    landing.addEventListener('scroll',srOnScroll,{passive:true});
    document.addEventListener('touchmove',srOnScroll,{passive:true});
    srCheck();
    setTimeout(srCheck,500);
    setTimeout(srCheck,1500);
    setTimeout(function(){
      srElements.forEach(function(item){if(!item.revealed){item.el.classList.add('sr-visible');item.revealed=true;}});
      srElements=[];
    },4000);
  }
}

function initLndEcoModal() {
  const overlay=document.getElementById('ecoModalOverlay');
  const titleEl=document.getElementById('ecoModalTitle');
  const textEl=document.getElementById('ecoModalText');
  const iconEl=document.getElementById('ecoModalIcon');
  const closeBtn=document.getElementById('ecoModalClose');
  if(!overlay) return;
  document.querySelectorAll('[data-eco]').forEach(function(card){
    card.style.cursor='pointer';
    card.addEventListener('click',function(){
      const id=this.getAttribute('data-eco');
      const data=ECO_DATA[id];
      if(!data)return;
      titleEl.textContent=data.title;
      textEl.innerHTML=data.text.replace(/\n\n/g,'<br><br>');
      const svgSource=this.querySelector('svg');
      if(svgSource){iconEl.innerHTML=svgSource.outerHTML;}
      overlay.classList.add('open');
      document.body.style.overflow='hidden';
    });
  });
  const closeModal=function(){overlay.classList.remove('open');document.body.style.overflow='';};
  closeBtn.addEventListener('click',closeModal);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
}

function initLndAccordion() {
  document.querySelectorAll('[data-toggle]').forEach(function(trigger){
    trigger.addEventListener('click',function(e){
      e.stopPropagation();
      const targetId=this.getAttribute('data-toggle');
      const target=document.getElementById(targetId);
      const arrow=this.querySelector('.lnd-arrow');
      if(!target)return;
      const section=this.closest('section,.lnd-glass');
      if(section){
        section.querySelectorAll('.lnd-expand.open').forEach(function(el){
          if(el!==target){
            el.classList.remove('open');
            const otherId=el.id;
            const otherTrigger=section.querySelector('[data-toggle="'+otherId+'"]');
            if(otherTrigger){const otherArrow=otherTrigger.querySelector('.lnd-arrow');if(otherArrow)otherArrow.classList.remove('open');}
          }
        });
      }
      target.classList.toggle('open');
      if(arrow)arrow.classList.toggle('open');
    });
  });
}

function initLndInsideModal() {
  const overlay=document.getElementById('insideModalOverlay');
  const openBtn=document.getElementById('insideBtnOpen');
  const closeBtn=document.getElementById('insideModalClose');
  if(!overlay||!openBtn) return;
  openBtn.addEventListener('click',function(){
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
  });
  const closeInsideModal=function(){overlay.classList.remove('open');document.body.style.overflow='';};
  if(closeBtn)closeBtn.addEventListener('click',closeInsideModal);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeInsideModal();});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&overlay.classList.contains('open'))closeInsideModal();
  });
}

function initLndScrollToDna() {
  const link=document.getElementById('dnaScrollLink');
  if(link){
    link.addEventListener('click',function(e){
      e.preventDefault();
      const el=document.getElementById('dnaSection');
      if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
}

function initLndTariffModals() {
  const overlay=document.getElementById('tariffOverlay');
  const titleEl=document.getElementById('tariffModalTitle');
  const bodyEl=document.getElementById('tariffModalBody');
  const closeBtn=document.getElementById('tariffModalClose');
  if(!overlay) return;
  const openTariff=function(key){
    const data=TARIFF_DATA[key];
    if(!data) return;
    titleEl.textContent=data.title;
    titleEl.style.color=data.color;
    bodyEl.innerHTML=data.content;
    overlay.style.display='flex';
    document.body.style.overflow='hidden';
  };
  const closeTariff=function(){overlay.style.display='none';document.body.style.overflow='';};
  const freeBtn=document.getElementById('tariffFree');
  const proBtn=document.getElementById('tariffPro');
  const bizBtn=document.getElementById('tariffBiz');
  if(freeBtn) freeBtn.addEventListener('click',function(){openTariff('free');});
  if(proBtn) proBtn.addEventListener('click',function(){openTariff('pro');});
  if(bizBtn) bizBtn.addEventListener('click',function(){openTariff('biz');});
  if(closeBtn) closeBtn.addEventListener('click',closeTariff);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeTariff();});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&overlay.style.display==='flex')closeTariff();
  });
}

// ═══ MAIN INIT ═══

function initLanding() {
  initLndHeader();
  createParticles('lndParticles');
  initLndCarousel();
  initLndScrollReveal();
  initLndEcoModal();
  initLndAccordion();
  initLndInsideModal();
  initLndScrollToDna();
  initLndTariffModals();
}
window.initLanding = initLanding;

// ═══ LANDING MODALS ═══

function openLndModal(type){
  closeLndModals();
  const el=document.getElementById('lnd'+type.charAt(0).toUpperCase()+type.slice(1)+'Modal');
  if(el)el.classList.add('active');
}
function closeLndModals(){
  document.querySelectorAll('.lnd-modal-bg').forEach(function(m){m.classList.remove('active');});
}
function switchLndModal(type){
  closeLndModals();
  setTimeout(function(){openLndModal(type);},200);
}
function freshRegistration(){
  if(!preserveDnaResult){
    localStorage.removeItem('dnaType');
    localStorage.removeItem('dnaScores');
  }
  preserveDnaResult = false;
  localStorage.removeItem('userName');
  localStorage.removeItem('userInterests');
  localStorage.removeItem('userGoal');
  localStorage.removeItem('onboardingDone');
}

// ═══ INFO MODALS ═══

const infoData={offer:{t:'Публичная оферта',b:'<b>1. Общие положения</b><br>Настоящий документ является официальным предложением TRAFIQO.<br><br><b>2. Регистрация</b><br>Пользователем может стать лицо старше 18 лет.<br><br><b>3. Тарифы</b><br>FREE / PRO 599₽/мес / BUSINESS 1490₽/мес.<br><br><b>4. Правила</b><br>Запрещены: спам, оскорбления, мошенничество. Нарушители блокируются.'},privacy:{t:'Конфиденциальность',b:'<b>1. Данные</b><br>Собираем: имя, email, активность, результаты ДНК-теста.<br><br><b>2. Использование</b><br>Персонализация, рекомендации, аналитика. Не передаём третьим лицам.<br><br><b>3. Защита</b><br>Шифрование TLS 1.3, AES-256. Серверы в защищённых дата-центрах.<br><br><b>4. Ваши права</b><br>Запросить копию, удалить данные, отозвать согласие.'},support:{t:'Поддержка',b:'<b>Telegram-бот</b><br>@trafiqo_support — ответ за 15 минут.<br><br><b>Email</b><br>support@trafiqo.app<br><br><b>FAQ</b><br>Частые вопросы доступны в Академии после регистрации.'},faq:{t:'FAQ',b:'<div class="faq-grid"><div class="faq-block"><div class="faq-block-q">1. Что такое ДНК-тест бизнеса?</div><div class="faq-block-a"><p>Бесплатный тест из 7 вопросов, который определяет твой тип предпринимателя — Стратег, Коммуникатор, Креатор или Аналитик. На основе результата платформа подбирает персональные рекомендации: какой контент изучать, с кем партнёриться, какую стратегию выбрать. Тест занимает 60 секунд и доступен без регистрации.</p></div></div><div class="faq-block"><div class="faq-block-q">2. Платформа бесплатная?</div><div class="faq-block-a"><p>Да, базовый тариф FREE — бесплатный навсегда. Включает ленту, Stories, ДНК-тест, 10 диалогов и 5 постов в месяц. PRO за 599₽/мес — безлимит постов и чатов, 10 свайпов/день. BUSINESS за 1 490₽/мес — аналитика команды, до 5 компаний. Годовая подписка — скидка до 33%.</p></div></div><div class="faq-block"><div class="faq-block-q">3. Чем отличается от соцсетей?</div><div class="faq-block-a"><p>Обычные соцсети — про лайки и контент. Здесь — про результат. Матч-система находит партнёров по 7 параметрам совместимости. Геймификация мотивирует расти. Карта возможностей даёт пошаговый план. Аналитика показывает, где теряешь людей. Деловая среда, где каждое знакомство — точка роста.</p></div></div><div class="faq-block"><div class="faq-block-q">4. Как работает матч-система?</div><div class="faq-block-a"><p>Алгоритм анализирует 7 факторов: ДНК-тип, нишу, опыт, цели, географию, активность и бизнес-карму. Показывает процент совместимости с другими участниками. Свайпай профили — при взаимном интересе открывается чат. На FREE — ограниченные свайпы, PRO — 10/день, BUSINESS — без лимитов.</p></div></div><div class="faq-block"><div class="faq-block-q">5. Я новичок — мне подойдёт?</div><div class="faq-block-a"><p>Именно для тебя. ДНК-тест определит точку старта. Маршрут новичка за 7 дней — около 300 XP и чёткий план. Система подберёт наставника с совместимым ДНК. Академия — 20+ микро-уроков по 30-60 секунд. Сообщество поддержит. Многие пришли без опыта и вышли на результат за 3-4 месяца.</p></div></div><div class="faq-block"><div class="faq-block-q">6. Какие компании представлены?</div><div class="faq-block-a"><p>Платформа мультикомпанийная — представители разных сетевых компаний. У каждой публичный профиль с рейтингом, отзывами и аналитикой. Можно состоять в нескольких компаниях (до 5 на BUSINESS). Мы не продвигаем конкретные бренды — даём инструменты для роста в любой структуре.</p></div></div><div class="faq-block"><div class="faq-block-q">7. Реферальная программа?</div><div class="faq-block-a"><p>Приглашай участников и получай комиссию с подписок: 15% на PRO, 20% на BUSINESS. Начисляется ежемесячно, пока приглашённый платит. Вывод от 1 000₽. Бонус обоим при регистрации через воронку: ты получаешь XP, друг — расширенный триал.</p></div></div><div class="faq-block"><div class="faq-block-q">8. Мои данные в безопасности?</div><div class="faq-block-a"><p>Да. Данные по зашифрованному SSL/TLS. Пароли хешированы. Не передаём данные третьим лицам, не показываем рекламу. Результаты ДНК-теста видны только тебе. Политика конфиденциальности — в подвале сайта.</p></div></div></div>'}};
function openInfoModal(k){const d=infoData[k];if(!d)return;document.getElementById('infoModalTitle').textContent=d.t;document.getElementById('infoModalBody').innerHTML=d.b;document.getElementById('lndInfoModal').classList.add('active');}
function closeInfoModal(){document.getElementById('lndInfoModal').classList.remove('active');}

// ═══ LOGO CLICK ═══

function logoClick(){
  const glass=document.querySelector('.logo-glass');
  if(!glass)return;
  glass.classList.remove('spinning');
  void glass.offsetWidth;
  glass.classList.add('spinning');
  glass.addEventListener('animationend',function(){glass.classList.remove('spinning');},{once:true});
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══ WELCOME PARTICLES ═══
// Вызывается из router.js при загрузке шаблона scrWelcome
