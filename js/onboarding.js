// ========== SETUP SCREENS ==========
var setupInterests=['Маркетинг','Продажи','Обучение','Нетворкинг','Автоматизация','Контент','Финансы','Лидерство','Рекрутинг','Личный бренд','Здоровье','Красота','Экология','Технологии','Инвестиции'];
var setupSelectedInterests=[];
var setupSelectedGoal=null;

function setupInit(){
  var cl=getDnaColor();
  // Set dots color
  var dots=document.querySelectorAll('.stp-dot.active,.stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
  // Set avatar ring color
  var av=document.getElementById('stpAvatar');
  if(av){
    av.querySelectorAll('.stp-avatar-ripple').forEach(function(r){r.style.borderColor=cl+'20';});
  }
  // Set avatar label color
  var lbl=document.querySelector('.stp-avatar-label');
  if(lbl) lbl.style.color=cl;
  // Set input focus color as CSS variable
  document.documentElement.style.setProperty('--stp-color',cl);
  // Reset
  var inp=document.getElementById('stpNameInput');
  if(inp) inp.value='';
  setupSelectedInterests=[];
  setupSelectedGoal=null;
  setupUpdateBtn1();
}

function getDnaColor(){
  var t=localStorage.getItem('dnaType')||'S';
  var colors={S:'#3b82f6',C:'#22c55e',K:'#f59e0b',A:'#a78bfa'};
  return colors[t]||'#8b5cf6';
}

function setupCheckName(){
  setupUpdateBtn1();
}

function setupUpdateBtn1(){
  var inp=document.getElementById('stpNameInput');
  var btn=document.getElementById('stpBtn1');
  if(inp&&btn){
    if(inp.value.trim().length>=2){
      btn.classList.remove('disabled');btn.disabled=false;
    }else{
      btn.classList.add('disabled');btn.disabled=true;
    }
  }
}

function setupGoBack1(){
  var hasReveal = document.getElementById('dnrScreen');
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
  var inp=document.getElementById('stpNameInput');
  var name=inp?inp.value.trim():'Участник';
  if(name.length<2) name='Участник';
  localStorage.setItem('userName',name);
  await goTo('scrSetup2');setupRenderTags();
}

function setupRenderTags(){
  var cl=getDnaColor();
  var cont=document.getElementById('stpTags');
  if(!cont) return;
  cont.innerHTML='';
  setupInterests.forEach(function(t){
    var el=document.createElement('div');
    el.className='stp-tag';
    el.textContent=t;
    el.setAttribute('data-tag',t);
    if(setupSelectedInterests.indexOf(t)!==-1) el.classList.add('selected');
    el.onclick=function(){setupToggleTag(el,t)};
    cont.appendChild(el);
  });
  setupUpdateCounter();
  // Set dot colors
  var dots=document.querySelectorAll('#scrSetup2 .stp-dot.active,#scrSetup2 .stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
}

function setupToggleTag(el,tag){
  var idx=setupSelectedInterests.indexOf(tag);
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
  var cnt=document.getElementById('stpCounter');
  var btn=document.getElementById('stpBtn2');
  var n=setupSelectedInterests.length;
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
  var cl=getDnaColor();
  setupSelectedGoal=null;
  var goals=document.querySelectorAll('.stp-goal');
  goals.forEach(function(g){g.classList.remove('selected','dimmed')});
  var btn=document.getElementById('stpBtn3');
  if(btn){btn.classList.add('disabled');btn.disabled=true;}
  // Dot colors
  var dots=document.querySelectorAll('#scrSetup3 .stp-dot.active,#scrSetup3 .stp-dot.done');
  dots.forEach(function(d){d.style.background=cl;});
}

function setupSelectGoal(el){
  var goals=document.querySelectorAll('.stp-goal');
  var val=el.getAttribute('data-goal');
  setupSelectedGoal=val;
  goals.forEach(function(g){
    if(g===el){g.classList.add('selected');g.classList.remove('dimmed');}
    else{g.classList.remove('selected');g.classList.add('dimmed');}
  });
  var btn=document.getElementById('stpBtn3');
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
  if (window.saveOnboardingStep) {
    window.saveOnboardingStep('complete').catch(console.error);
  }
  var cl=getDnaColor();
  var tp=localStorage.getItem('dnaType')||'S';
  var names={S:'Стратег',C:'Коммуникатор',K:'Креатор',A:'Аналитик'};
  var name=localStorage.getItem('userName')||'Участник';

  goTo('scrDone');

  // Set orbs
  document.getElementById('doneOrb1').style.background='radial-gradient(circle,'+cl+'15,transparent 70%)';
  document.getElementById('doneOrb2').style.background='radial-gradient(circle,'+cl+'08,transparent 70%)';

  // Check circle color
  document.getElementById('doneCheck').style.background='linear-gradient(135deg,'+cl+','+cl+'cc)';
  document.getElementById('doneCheck').style.boxShadow='0 0 32px '+cl+'30';

  // Title
  var title=document.getElementById('doneTitle');
  if(name&&name!=='Участник') title.textContent='Добро пожаловать, '+name+'!';
  else title.textContent='Добро пожаловать!';

  // Subtitle
  var sub=document.getElementById('doneSubtitle');
  sub.textContent='Ты — '+names[tp]+' · ♟ Пешка · 0 XP';
  sub.style.color=cl;

  // Particles
  var pc=document.getElementById('doneParticles');pc.innerHTML='';
  for(var i=0;i<10;i++){
    var p=document.createElement('div');p.className='dnr-bg-p';
    p.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;width:'+(1+Math.random()*1.5)+'px;height:'+(1+Math.random()*1.5)+'px;background:'+cl+';opacity:'+(0.06+Math.random()*0.12)+';animation-duration:'+(10+Math.random()*12)+'s;animation-delay:'+Math.random()*5+'s;';
    pc.appendChild(p);
  }
}

function setupFinish(){
  goTo('scrFeed');
}
