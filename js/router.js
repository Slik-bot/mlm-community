// ===== NAVIGATION =====
let navHistory = ['scrLanding'];
let isTransitioning = false;

// ===== TEMPLATE LOADER =====
const TEMPLATES = {
  scrLanding: '/templates/landing.html',
  scrWelcome: '/templates/welcome.html',
  scrDone: '/templates/done.html',
  scrSearch: '/templates/search.html',
  scrCompanies: '/templates/companies.html',
  scrDetail: '/templates/detail.html',
  scrCreate: '/templates/create.html',
  scrDnaResult: '/templates/dna-result.html',
  scrSetup1: '/templates/setup1.html',
  scrSetup2: '/templates/setup2.html',
  scrSetup3: '/templates/setup3.html',
  scrDnaTest: '/templates/dna-test.html',
  scrFeed: '/templates/feed.html',
  scrProfile: '/templates/profile.html',
  scrProfileEdit: '/templates/profile-edit.html',
  scrProfileSettings: '/templates/profile-settings.html',
  scrChatList: '/templates/chat-list.html',
  scrChat: '/templates/chat.html',
  scrChatInfo: '/templates/chat-info.html',
  scrDealList: '/templates/deal-list.html',
  scrDealCreate: '/templates/deal-create.html',
  scrDealDetail: '/templates/deal-detail.html',
  scrShop: '/templates/shop.html',
  scrProductDetail: '/templates/product-detail.html',
  scrProductCreate: '/templates/product-create.html',
  scrForum: '/templates/forum.html',
  scrForumTopic: '/templates/forum-topic.html',
  scrForumCreate: '/templates/forum-create.html',
  scrTasks: '/templates/tasks.html',
  scrTaskDetail: '/templates/task-detail.html',
  scrContests: '/templates/contests.html',
  scrContestDetail: '/templates/contest-detail.html',
  scrExperts: '/templates/experts.html',
  scrExpertDetail: '/templates/expert-detail.html',
  scrBecomeExpert: '/templates/become-expert.html',
  scrMatch: '/templates/match.html',
  scrMatchList: '/templates/match-list.html',
  scrAcademy: '/templates/academy.html',
  scrCourse: '/templates/course.html',
  scrLesson: '/templates/lesson.html',
  scrWebinars: '/templates/webinars.html',
  scrWebinarDetail: '/templates/webinar-detail.html',
  scrAlliances: '/templates/alliances.html',
  scrWallet: '/templates/wallet.html',
  scrVerification: '/templates/verification.html',
  scrNotifications: '/templates/notifications.html',
  scrMore: '/templates/more.html'
};
const loadedTemplates = {};

async function loadTemplate(id) {
  if (loadedTemplates[id]) return loadedTemplates[id];
  const path = TEMPLATES[id];
  if (!path) return null;
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load ' + path);
    const html = await response.text();
    loadedTemplates[id] = html;
    return html;
  } catch (error) {
    console.error('Template load error:', error);
    return null;
  }
}

function resetWelcomeAnimations() {
  const scr = document.getElementById('scrWelcome');
  if (!scr) return;
  // Двойной rAF — гарантирует применение ПОСЛЕ полного цикла рендеринга браузера
  // Это важно для Telegram WebView где remove('hidden') вызывает reflow + restart анимаций
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (document.getElementById('scrWelcome')) {
        document.getElementById('scrWelcome').classList.add('scr-welcome-ready');
      }
    });
  });
}

async function ensureTemplate(id) {
  if (document.getElementById(id)) {
    if (id === 'scrLanding') {
      if (window.initLandingModals) window.initLandingModals();
    }
    if (id === 'scrWelcome') {
      const scrW = document.getElementById('scrWelcome');
      if (scrW) scrW.classList.add('w-no-anim');
    }
    if (id === 'scrDnaTest') {
      if (window.dnaReset) window.dnaReset();
    }
    return;
  }
  const html = await loadTemplate(id);
  if (!html) return;
  const app = document.querySelector('.app');
  app.insertAdjacentHTML('beforeend', html);

  if (id === 'scrLanding') {
    if (window.initLandingModals) window.initLandingModals();
    if (window.initLanding) window.initLanding();
  }
  if (id === 'scrFeed') {
    if (window.initFeed) window.initFeed();
  }
  if (id === 'scrProfile') {
    if (window.initProfile) window.initProfile();
  }
  if (id === 'scrProfileEdit') {
    if (window.initProfileEdit) window.initProfileEdit();
  }
  if (id === 'scrProfileSettings') {
    if (window.initProfileSettings) window.initProfileSettings();
  }
  if (id === 'scrChatList') {
    if (window.initChatList) window.initChatList();
  }
  if (id === 'scrChat') {
    if (window.initChat) window.initChat();
  }
  if (id === 'scrChatInfo') {
    if (window.initChatInfo) window.initChatInfo();
  }
  if (id === 'scrDealList') {
    if (window.initDealList) window.initDealList();
  }
  if (id === 'scrDealCreate') {
    if (window.initDealCreate) window.initDealCreate();
  }
  if (id === 'scrDealDetail') {
    if (window.initDealDetail) window.initDealDetail();
  }
  if (id === 'scrShop') {
    if (window.initShop) window.initShop();
  }
  if (id === 'scrProductDetail') {
    if (window.initProductDetail) window.initProductDetail();
  }
  if (id === 'scrProductCreate') {
    if (window.initProductCreate) window.initProductCreate();
  }
  if (id === 'scrForum') {
    if (window.initForum) window.initForum();
  }
  if (id === 'scrForumTopic') {
    if (window.initForumTopic) window.initForumTopic();
  }
  if (id === 'scrForumCreate') {
    if (window.initForumCreate) window.initForumCreate();
  }
  if (id === 'scrTasks') {
    if (window.initTasks) window.initTasks();
  }
  if (id === 'scrTaskDetail') {
    if (window.initTaskDetail) window.initTaskDetail();
  }
  if (id === 'scrContests') {
    if (window.initContests) window.initContests();
  }
  if (id === 'scrContestDetail') {
    if (window.initContestDetail) window.initContestDetail();
  }
  if (id === 'scrExperts') {
    if (window.initExperts) window.initExperts();
  }
  if (id === 'scrExpertDetail') {
    if (window.initExpertDetail) window.initExpertDetail();
  }
  if (id === 'scrBecomeExpert') {
    if (window.initBecomeExpert) window.initBecomeExpert();
  }
  if (id === 'scrMatch') {
    if (window.initMatch) window.initMatch();
  }
  if (id === 'scrMatchList') {
    if (window.initMatchList) window.initMatchList();
  }
  if (id === 'scrAcademy') {
    if (window.initAcademy) window.initAcademy();
  }
  if (id === 'scrCourse') {
    if (window.initCourse) window.initCourse();
  }
  if (id === 'scrLesson') {
    if (window.initLesson) window.initLesson();
  }
  if (id === 'scrWebinars') {
    if (window.initWebinars) window.initWebinars();
  }
  if (id === 'scrWebinarDetail') {
    if (window.initWebinarDetail) window.initWebinarDetail();
  }
  if (id === 'scrAlliances') {
    if (window.initAlliances) window.initAlliances();
  }
  if (id === 'scrWallet') {
    if (window.initWallet) window.initWallet();
  }
  if (id === 'scrVerification') {
    if (window.initVerification) window.initVerification();
  }
  if (id === 'scrNotifications') {
    if (window.initNotifications) window.initNotifications();
  }
  if (id === 'scrMore') {
    if (window.initMore) window.initMore();
  }
  if (id === 'scrWelcome') {
    createParticles('welcomeParticles');
    resetWelcomeAnimations();
  }
}

function updateChrome(id){
  const show = id==='scrFeed'||id==='scrCompanies'||id==='scrSearch'||id==='scrDetail'||id==='scrCreate'||id==='scrProfile'||id==='scrChatList'||id==='scrShop'||id==='scrMore';
  document.querySelector('.nav').style.display=show?'':'none';
  document.getElementById('fabBtn').style.display=show?'':'none';
}

async function goTo(id) {
  if(isTransitioning) return;
  if (window.haptic) haptic('light');
  if (window.chatUnsubscribe) chatUnsubscribe();
  if (window.contestsCleanup && id !== 'scrContestDetail') contestsCleanup();
  if (window.webinarsCleanup && id !== 'scrWebinarDetail') webinarsCleanup();
  await ensureTemplate(id);

  const onbScreens = ['scrWelcome','scrDnaTest','scrDnaResult','scrSetup1','scrSetup2','scrSetup3','scrDone'];
  if (onbScreens.indexOf(id) !== -1) {
    document.body.classList.add('onboarding-mode');
  } else {
    document.body.classList.remove('onboarding-mode');
  }
  closePopovers(); closeFab();
  // Скрываем лендинг при переходе к любому экрану (у него нет .scr)
  const lndEl = document.getElementById('scrLanding');
  if (lndEl && id !== 'scrLanding') lndEl.classList.add('hidden');

  const current = navHistory[navHistory.length-1];
  if(current===id) return;

  // Сброс классов анимаций Welcome при уходе с экрана
  if (current === 'scrWelcome') {
    const wEl = document.getElementById('scrWelcome');
    if (wEl) {
      wEl.classList.remove('scr-welcome-ready');
      wEl.classList.remove('w-no-anim');
    }
  }

  const currentEl = document.getElementById(current);
  const nextEl = document.getElementById(id);
  if(!nextEl) return;

  // Clean up DNA result inline styles when leaving
  if(current==='scrDnaResult'){
    const dnrRv=document.getElementById('dnrReveal');
    if(dnrRv){dnrRv.classList.remove('active');dnrRv.style.opacity='';dnrRv.style.pointerEvents='';}
    const dnrSc=document.getElementById('dnrScreen');
    if(dnrSc){dnrSc.classList.remove('active');dnrSc.style.opacity='';dnrSc.style.pointerEvents='';}
    const dnrCd=document.getElementById('dnrCard');
    if(dnrCd){dnrCd.style.cssText='';}
  }

  navHistory.push(id);
  updateChrome(id);

  const canAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(canAnimate && currentEl){
    isTransitioning = true;
    nextEl.scrollTop = 0;
    /* Показать новый экран, запустить анимации */
    nextEl.classList.remove('hidden','back-hidden');
    nextEl.classList.add('scr-tr-enter','scr-tr-enter-right');
    currentEl.classList.add('scr-tr-exit-left');

    setTimeout(function(){
      nextEl.classList.remove('scr-tr-enter','scr-tr-enter-right');
      currentEl.classList.remove('scr-tr-exit-left');
      currentEl.classList.add('back-hidden');
      isTransitioning = false;
    }, 400);
  } else {
    /* Мгновенный переход (reduced-motion fallback) */
    currentEl.classList.add('back-hidden');
    nextEl.classList.remove('hidden','back-hidden');
  }

  if(id==='scrSearch') setTimeout(function(){document.getElementById('searchInp').focus()},450);
  if(id==='scrFeed'){
    const feedName=document.getElementById('feedUserName');
    if(feedName){
      const uName=localStorage.getItem('userName')||'Участник';
      feedName.textContent='Привет, '+uName+'!';
    }
  }
}

async function goBack() {
  if(isTransitioning) return;
  if(navHistory.length<=1) return;
  if (window.haptic) haptic('light');

  const current = navHistory.pop();
  const prev = navHistory[navHistory.length-1];
  await ensureTemplate(prev);
  const currentEl = document.getElementById(current);
  const prevEl = document.getElementById(prev);
  if(!prevEl) return;

  updateChrome(prev);

  const canAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(canAnimate && currentEl){
    isTransitioning = true;
    prevEl.scrollTop = 0;
    /* Показать предыдущий экран, запустить анимации */
    prevEl.classList.remove('hidden','back-hidden');
    prevEl.classList.add('scr-tr-enter','scr-tr-enter-left');
    currentEl.classList.remove('back-hidden');
    currentEl.classList.add('scr-tr-exit-right');

    setTimeout(function(){
      prevEl.classList.remove('scr-tr-enter','scr-tr-enter-left');
      currentEl.classList.remove('scr-tr-exit-right');
      currentEl.classList.add('hidden');
      isTransitioning = false;
    }, 400);
  } else {
    /* Мгновенный переход (reduced-motion fallback) */
    currentEl.classList.add('hidden');
    currentEl.classList.remove('back-hidden');
    prevEl.classList.remove('back-hidden','hidden');
  }
}

// Init: hide nav & FAB on landing
updateChrome('scrLanding');

// ===== PARTICLES =====
(function(){
  const c=document.getElementById('particles');
  if(!c) return;
  for(let i=0;i<18;i++){
    const p=document.createElement('div');
    const isGlow=Math.random()>.5;
    p.className='particle '+(isGlow?'particle--glow':'particle--dot');
    const s=isGlow?(Math.random()*4+2):(Math.random()*2+1);
    p.style.cssText='width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'%;bottom:'+(Math.random()*-20)+'%;animation-duration:'+(Math.random()*10+8)+'s;animation-delay:'+(Math.random()*8)+'s;';
    c.appendChild(p);
  }
})();

// Фикс: reload при resume на Welcome (GPU rendering bug в Telegram WebView)
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  const scr = document.getElementById('scrWelcome');
  if (scr && !scr.classList.contains('hidden') && !scr.classList.contains('back-hidden')) {
    location.reload();
  }
});
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.onEvent('activated', function() {
    const scr = document.getElementById('scrWelcome');
    if (scr && !scr.classList.contains('hidden') && !scr.classList.contains('back-hidden')) {
      location.reload();
    }
  });
}
