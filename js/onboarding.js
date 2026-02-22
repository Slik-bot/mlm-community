// ========== SETUP SCREENS ==========
const setupInterests=['Маркетинг','Продажи','Обучение','Нетворкинг','Автоматизация','Контент','Финансы','Лидерство','Рекрутинг','Личный бренд','Здоровье','Красота','Экология','Технологии','Инвестиции'];
let setupSelectedInterests=[];
let setupSelectedGoal=null;

function setupInit(){
  const cl=getDnaColor();
  // Set dots color
  const dots=document.querySelectorAll('.stp-dot.active,.stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
  // Set avatar ring color
  const av=document.getElementById('stpAvatar');
  if(av){
    av.querySelectorAll('.stp-avatar-ripple').forEach(function(r){r.style.borderColor=cl+'20';});
  }
  // Set avatar label color
  const lbl=document.querySelector('.stp-avatar-label');
  if(lbl) lbl.style.color=cl;
  // Set input focus color as CSS variable
  document.documentElement.style.setProperty('--stp-color',cl);
  // Pre-fill name from Telegram or reset
  const inp=document.getElementById('stpNameInput');
  if(inp) {
    const savedName = localStorage.getItem('userName');
    inp.value = savedName && savedName !== 'Участник' ? savedName : '';
  }
  setupSelectedInterests=[];
  setupSelectedGoal=null;
  setupUpdateBtn1();
}

// getDnaColor — см. js/utils/dna.js

function setupCheckName(){
  setupUpdateBtn1();
}

function setupUpdateBtn1(){
  const inp=document.getElementById('stpNameInput');
  const btn=document.getElementById('stpBtn1');
  if(inp&&btn){
    if(inp.value.trim().length>=2){
      btn.classList.remove('disabled');btn.disabled=false;
    }else{
      btn.classList.add('disabled');btn.disabled=true;
    }
  }
}

function setupGoBack1(){
  const hasReveal = document.getElementById('dnrScreen');
  if(hasReveal && hasReveal.classList.contains('active')){
    goTo('scrDnaResult');
  } else {
    goTo('scrWelcome');
  }
}

async function setupSkipName(){
  localStorage.setItem('userName','Участник');
  await goTo('scrSetup2');setupRenderTags();
}

async function setupGoStep2(){
  const inp=document.getElementById('stpNameInput');
  let name=inp?inp.value.trim():'Участник';
  if(name.length<2) name='Участник';
  localStorage.setItem('userName',name);
  await goTo('scrSetup2');setupRenderTags();
}

function setupRenderTags(){
  const cl=getDnaColor();
  const cont=document.getElementById('stpTags');
  if(!cont) return;
  cont.innerHTML='';
  setupInterests.forEach(function(t){
    const el=document.createElement('div');
    el.className='stp-tag';
    el.textContent=t;
    el.setAttribute('data-tag',t);
    if(setupSelectedInterests.indexOf(t)!==-1) el.classList.add('selected');
    el.onclick=function(){setupToggleTag(el,t)};
    cont.appendChild(el);
  });
  setupUpdateCounter();
  // Set dot colors
  const dots=document.querySelectorAll('#scrSetup2 .stp-dot.active,#scrSetup2 .stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
}

function setupToggleTag(el,tag){
  const idx=setupSelectedInterests.indexOf(tag);
  if(idx===-1){
    setupSelectedInterests.push(tag);
    el.classList.add('selected');
    el.style.borderColor=getDnaColor();
    el.style.background=getDnaColor()+'10';
  }else{
    setupSelectedInterests.splice(idx,1);
    el.classList.remove('selected');
    el.style.borderColor='';
    el.style.background='';
  }
  setupUpdateCounter();
}

function setupUpdateCounter(){
  const cnt=document.getElementById('stpCounter');
  const btn=document.getElementById('stpBtn2');
  const n=setupSelectedInterests.length;
  if(cnt){
    cnt.textContent='Выбрано: '+n+' / 15';
    if(n>=3){cnt.classList.add('enough');cnt.style.color=getDnaColor();}
    else{cnt.classList.remove('enough');cnt.style.color='';}
  }
  if(btn){
    if(n>=3){btn.classList.remove('disabled');btn.disabled=false;}
    else{btn.classList.add('disabled');btn.disabled=true;}
  }
}

async function setupSkipInterests(){
  localStorage.setItem('userInterests','[]');
  await goTo('scrSetup3');setupInitGoals();
}

async function setupGoStep3(){
  localStorage.setItem('userInterests',JSON.stringify(setupSelectedInterests));
  await goTo('scrSetup3');setupInitGoals();
}

function setupInitGoals(){
  const cl=getDnaColor();
  setupSelectedGoal=null;
  const goals=document.querySelectorAll('.stp-goal');
  goals.forEach(function(g){g.classList.remove('selected','dimmed')});
  const btn=document.getElementById('stpBtn3');
  if(btn){btn.classList.add('disabled');btn.disabled=true;}
  // Dot colors
  const dots=document.querySelectorAll('#scrSetup3 .stp-dot.active,#scrSetup3 .stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
}

function setupSelectGoal(el){
  const goals=document.querySelectorAll('.stp-goal');
  const val=el.getAttribute('data-goal');
  setupSelectedGoal=val;
  goals.forEach(function(g){
    if(g===el){g.classList.add('selected');g.classList.remove('dimmed');}
    else{g.classList.remove('selected');g.classList.add('dimmed');}
  });
  const btn=document.getElementById('stpBtn3');
  if(btn){btn.classList.remove('disabled');btn.disabled=false;}
}

function setupSkipGoal(){
  localStorage.setItem('userGoal','0');
  setupShowDone();
}

function setupGoDone(){
  localStorage.setItem('userGoal',setupSelectedGoal||'0');
  setupShowDone();
}

function setupShowDone(){
  localStorage.setItem('onboardingDone','true');
  localStorage.setItem('mlm_onboarding_step','done');
  if (window.saveOnboardingStep) {
    window.saveOnboardingStep('complete').catch(console.error);
  }
  const cl=getDnaColor();
  const tp=localStorage.getItem('dnaType')||'S';
  const names={S:'Стратег',C:'Коммуникатор',K:'Креатор',A:'Аналитик'};
  const name=localStorage.getItem('userName')||'Участник';

  goTo('scrDone');

  // Set orbs
  document.getElementById('doneOrb1').style.background='radial-gradient(circle,'+cl+'15,transparent 70%)';
  document.getElementById('doneOrb2').style.background='radial-gradient(circle,'+cl+'08,transparent 70%)';

  // Check circle color
  document.getElementById('doneCheck').style.background='linear-gradient(135deg,'+cl+','+cl+'cc)';
  document.getElementById('doneCheck').style.boxShadow='0 0 32px '+cl+'30';

  // Title
  const title=document.getElementById('doneTitle');
  if(name&&name!=='Участник') title.textContent='Добро пожаловать, '+name+'!';
  else title.textContent='Добро пожаловать!';

  // Subtitle
  const sub=document.getElementById('doneSubtitle');
  sub.textContent='Ты — '+names[tp]+' · ♟ Пешка · 0 XP';
  sub.style.color=cl;

  // Particles
  const pc=document.getElementById('doneParticles');pc.innerHTML='';
  for(let i=0;i<10;i++){
    const p=document.createElement('div');p.className='dnr-bg-p';
    p.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;width:'+(1+Math.random()*1.5)+'px;height:'+(1+Math.random()*1.5)+'px;background:'+cl+';opacity:'+(0.06+Math.random()*0.12)+';animation-duration:'+(10+Math.random()*12)+'s;animation-delay:'+Math.random()*5+'s;';
    pc.appendChild(p);
  }
}

function setupFinish(){
  goTo('scrFeed');
}
