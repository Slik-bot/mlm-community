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
  scrMore: '/templates/more.html',
  scrQuest: '/templates/quest.html'
};
const loadedTemplates = {};

const SCREEN_INITS = {
  scrLanding: ['initLandingModals', 'initLanding'],
  scrFeed: ['initFeed'],
  scrProfile: ['initProfile'],
  scrProfileEdit: ['initProfileEdit'],
  scrProfileSettings: ['initProfileSettings'],
  scrChatList: ['initChatList'],
  scrChat: ['initChat'],
  scrChatInfo: ['initChatInfo'],
  scrDealList: ['initDealList'],
  scrDealCreate: ['initDealCreate'],
  scrDealDetail: ['initDealDetail'],
  scrShop: ['initShop'],
  scrProductDetail: ['initProductDetail'],
  scrProductCreate: ['initProductCreate'],
  scrForum: ['initForum'],
  scrForumTopic: ['initForumTopic'],
  scrForumCreate: ['initForumCreate'],
  scrTasks: ['initTasks'],
  scrTaskDetail: ['initTaskDetail'],
  scrContests: ['initContests'],
  scrContestDetail: ['initContestDetail'],
  scrExperts: ['initExperts'],
  scrExpertDetail: ['initExpertDetail'],
  scrBecomeExpert: ['initBecomeExpert'],
  scrMatch: ['initMatch'],
  scrMatchList: ['initMatchList'],
  scrAcademy: ['initAcademy'],
  scrCourse: ['initCourse'],
  scrLesson: ['initLesson'],
  scrWebinars: ['initWebinars'],
  scrWebinarDetail: ['initWebinarDetail'],
  scrAlliances: ['initAlliances'],
  scrWallet: ['initWallet'],
  scrVerification: ['initVerification'],
  scrNotifications: ['initNotifications'],
  scrMore: ['initMore'],
  scrQuest: ['initQuest'],
  scrDnaResult: ['initDnaResult']
};

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

function handleExistingTemplate(id) {
  if (id === 'scrLanding' && window.initLandingModals) window.initLandingModals();
  if (id === 'scrWelcome') {
    const scrW = document.getElementById('scrWelcome');
    if (scrW) scrW.classList.add('w-no-anim');
  }
  if (id === 'scrDnaTest' && window.dnaReset) window.dnaReset();
  if (id === 'scrDnaResult' && window.initDnaResult) window.initDnaResult();
}

function initScreenModule(id) {
  if (id === 'scrWelcome') {
    createParticles('welcomeParticles');
    resetWelcomeAnimations();
    return;
  }
  const inits = SCREEN_INITS[id];
  if (!inits) return;
  inits.forEach(function(fnName) {
    if (window[fnName]) window[fnName]();
  });
}

async function ensureTemplate(id) {
  if (document.getElementById(id)) {
    handleExistingTemplate(id);
    return;
  }
  const html = await loadTemplate(id);
  if (!html) return;
  const app = document.querySelector('.app');
  app.insertAdjacentHTML('beforeend', html);
  initScreenModule(id);
}

function updateChrome(id){
  const show = id==='scrFeed'||id==='scrCompanies'||id==='scrSearch'||id==='scrDetail'||id==='scrCreate'||id==='scrProfile'||id==='scrChatList'||id==='scrShop'||id==='scrMore';
  document.querySelector('.nav').style.display=show?'':'none';
  document.getElementById('fabBtn').style.display=show?'':'none';
}

function handleScreenTransition(currentEl, nextEl, direction) {
  const canAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canAnimate && currentEl) {
    isTransitioning = true;
    currentEl.style.pointerEvents = 'none';
    nextEl.scrollTop = 0;
    nextEl.classList.remove('hidden', 'back-hidden');
    const enterCls = direction === 'forward' ? 'scr-tr-enter-right' : 'scr-tr-enter-left';
    const exitCls = direction === 'forward' ? 'scr-tr-exit-left' : 'scr-tr-exit-right';
    nextEl.classList.add('scr-tr-enter', enterCls);
    if (direction === 'back') currentEl.classList.remove('back-hidden');
    currentEl.classList.add(exitCls);
    setTimeout(function() {
      nextEl.classList.remove('scr-tr-enter', enterCls);
      currentEl.style.transition = 'none';
      currentEl.classList.remove(exitCls);
      currentEl.classList.add(direction === 'forward' ? 'back-hidden' : 'hidden');
      currentEl.offsetHeight;
      currentEl.style.transition = '';
      currentEl.style.pointerEvents = '';
      isTransitioning = false;
    }, 400);
  } else {
    if (direction === 'forward') { currentEl.classList.add('back-hidden'); }
    else { currentEl.classList.add('hidden'); currentEl.classList.remove('back-hidden'); }
    nextEl.classList.remove('hidden', 'back-hidden');
  }
}

async function goTo(id) {
  if(isTransitioning) return;
  if (window.haptic) haptic('light');
  if (window.chatUnsubscribe) chatUnsubscribe();
  if (window.contestsCleanup && id !== 'scrContestDetail') contestsCleanup();
  if (window.webinarsCleanup && id !== 'scrWebinarDetail') webinarsCleanup();
  await ensureTemplate(id);

  const onbScreens = ['scrWelcome','scrDnaTest','scrDnaResult','scrSetup1','scrSetup2','scrSetup3','scrDone'];
  if (onbScreens.indexOf(id) !== -1) { document.body.classList.add('onboarding-mode'); }
  else { document.body.classList.remove('onboarding-mode'); }
  closePopovers(); closeFab();
  const lndEl = document.getElementById('scrLanding');
  if (lndEl && id !== 'scrLanding') lndEl.classList.add('hidden');

  const current = navHistory[navHistory.length-1];
  if(current===id) return;

  if (current === 'scrWelcome') {
    const wEl = document.getElementById('scrWelcome');
    if (wEl) { wEl.classList.remove('scr-welcome-ready'); wEl.classList.remove('w-no-anim'); }
  }

  const currentEl = document.getElementById(current);
  const nextEl = document.getElementById(id);
  if(!nextEl) return;

  if(current==='scrDnaResult'){
    const rv=document.getElementById('revealScreen'); if(rv) rv.classList.add('hidden');
    const mc=document.getElementById('mainCard'); if(mc){mc.classList.remove('revealed');mc.style.cssText='';}
  }

  navHistory.push(id);
  localStorage.setItem('lastScreen', id);
  updateChrome(id);
  handleScreenTransition(currentEl, nextEl, 'forward');

  if(id==='scrSearch') setTimeout(function(){document.getElementById('searchInp').focus()},450);
  if(id==='scrFeed'){
    const feedName=document.getElementById('feedUserName');
    if(feedName){ feedName.textContent='Привет, '+(localStorage.getItem('userName')||'Участник')+'!'; }
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
  handleScreenTransition(currentEl, prevEl, 'back');
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
