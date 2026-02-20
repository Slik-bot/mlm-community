// ===== NAVIGATION =====
let navHistory = ['scrLanding'];
var isTransitioning = false;

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
  scrProfileSettings: '/templates/profile-settings.html'
};
const loadedTemplates = {};

async function loadTemplate(id) {
  if (loadedTemplates[id]) return loadedTemplates[id];
  var path = TEMPLATES[id];
  if (!path) return null;
  try {
    var response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load ' + path);
    var html = await response.text();
    loadedTemplates[id] = html;
    return html;
  } catch (error) {
    console.error('Template load error:', error);
    return null;
  }
}

async function ensureTemplate(id) {
  if (document.getElementById(id)) {
    if (id === 'scrLanding') {
      if (window.initLandingModals) window.initLandingModals();
      if (window.initLanding) window.initLanding();
    }
    return;
  }
  var html = await loadTemplate(id);
  if (!html) return;
  var app = document.querySelector('.app');
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
  if (id === 'scrWelcome') {
    createParticles('welcomeParticles');
  }
}

function updateChrome(id){
  var show = id==='scrFeed'||id==='scrCompanies'||id==='scrSearch'||id==='scrDetail'||id==='scrCreate'||id==='scrProfile';
  document.querySelector('.nav').style.display=show?'':'none';
  document.getElementById('fabBtn').style.display=show?'':'none';
}

async function goTo(id) {
  if(isTransitioning) return;
  await ensureTemplate(id);

  var onbScreens = ['scrWelcome','scrDnaTest','scrDnaResult','scrSetup1','scrSetup2','scrSetup3','scrDone'];
  if (onbScreens.indexOf(id) !== -1) {
    document.body.classList.add('onboarding-mode');
  } else {
    document.body.classList.remove('onboarding-mode');
  }
  closePopovers(); closeFab();
  const current = navHistory[navHistory.length-1];
  if(current===id) return;

  var currentEl = document.getElementById(current);
  var nextEl = document.getElementById(id);
  if(!nextEl) return;

  // Clean up DNA result inline styles when leaving
  if(current==='scrDnaResult'){
    var dnrRv=document.getElementById('dnrReveal');
    if(dnrRv){dnrRv.style.cssText='';dnrRv.classList.remove('active');}
    var dnrSc=document.getElementById('dnrScreen');
    if(dnrSc){dnrSc.style.cssText='';dnrSc.classList.remove('active');}
    var dnrCd=document.getElementById('dnrCard');
    if(dnrCd){dnrCd.style.cssText='';}
  }

  navHistory.push(id);
  updateChrome(id);

  var canAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    var feedName=document.getElementById('feedUserName');
    if(feedName){
      var uName=localStorage.getItem('userName')||'Участник';
      feedName.textContent='Привет, '+uName+'!';
    }
  }
}

async function goBack() {
  if(isTransitioning) return;
  if(navHistory.length<=1) return;

  const current = navHistory.pop();
  const prev = navHistory[navHistory.length-1];
  await ensureTemplate(prev);
  var currentEl = document.getElementById(current);
  var prevEl = document.getElementById(prev);
  if(!prevEl) return;

  updateChrome(prev);

  var canAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
