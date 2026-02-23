// ===== WELCOME QUEST — Квест новичка =====

const QUEST_STEPS = [
  { title: 'Заполни профиль', screen: 'scrProfileEdit' },
  { title: 'Сделай первый пост', screen: 'scrCreate' },
  { title: 'Подпишись на компанию', screen: 'scrCompanies' },
  { title: 'Выполни первое задание', screen: 'scrTasks' },
  { title: 'Создай первую сделку', screen: 'scrDealCreate' },
  { title: 'Пригласи друга', screen: 'scrProfile' },
  { title: 'Купи первый товар', screen: 'scrShop' }
];

const QUEST_REWARD = 100;
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>';

// ===== INIT =====

async function initQuest() {
  renderSkipButton();
  const steps = await checkAllQuestSteps();
  renderQuestSteps(steps);
  updateQuestProgress(steps);
}

// ===== CHECK ALL STEPS =====

async function checkAllQuestSteps() {
  const user = window.currentUser;
  const sb = window.sb;
  if (!user || !sb) return new Array(7).fill(false);

  try {
    const results = await Promise.all([
      checkHasProfile(user),
      checkHasPost(sb, user.id),
      checkHasCompany(user),
      checkHasTaskCompletion(sb, user.id),
      checkHasDeal(sb, user.id),
      checkHasReferral(sb, user.id),
      checkHasPurchase(sb, user.id)
    ]);
    return results;
  } catch (err) {
    console.error('checkAllQuestSteps error:', err);
    return new Array(7).fill(false);
  }
}

// ===== INDIVIDUAL CHECKS =====

function checkHasProfile(user) {
  const hasName = user.name && user.name !== 'Участник';
  return !!(hasName && user.avatar_url);
}

async function checkHasPost(sb, userId) {
  const { count, error } = await sb
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  if (error) throw error;
  return count > 0;
}

function checkHasCompany(user) {
  return !!user.company_id;
}

async function checkHasTaskCompletion(sb, userId) {
  const { count, error } = await sb
    .from('task_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count > 0;
}

async function checkHasDeal(sb, userId) {
  const { count, error } = await sb
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', userId);
  if (error) throw error;
  return count > 0;
}

async function checkHasReferral(sb, userId) {
  const { count, error } = await sb
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId);
  if (error) throw error;
  return count > 0;
}

async function checkHasPurchase(sb, userId) {
  const { count, error } = await sb
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', userId);
  if (error) throw error;
  return count > 0;
}

// ===== RENDER STEPS =====

function renderQuestSteps(completedFlags) {
  const container = document.getElementById('questSteps');
  if (!container) return;
  container.textContent = '';

  QUEST_STEPS.forEach(function(step, i) {
    const isDone = completedFlags[i];
    const el = document.createElement('div');
    el.className = 'quest-step' + (isDone ? ' quest-step--done' : '');

    const num = document.createElement('div');
    num.className = 'quest-step__num';
    if (isDone) {
      num.innerHTML = CHECK_SVG;
    } else {
      num.textContent = i + 1;
    }

    const info = document.createElement('div');
    info.className = 'quest-step__info';
    const title = document.createElement('div');
    title.className = 'quest-step__title';
    title.textContent = step.title;
    info.appendChild(title);

    el.appendChild(num);
    el.appendChild(info);

    if (!isDone) {
      const btn = document.createElement('button');
      btn.className = 'quest-step__btn';
      btn.textContent = 'Перейти';
      btn.onclick = function() { goTo(step.screen); };
      el.appendChild(btn);
    } else {
      const check = document.createElement('div');
      check.className = 'quest-step__check';
      check.innerHTML = CHECK_SVG;
      el.appendChild(check);
    }

    container.appendChild(el);
  });

  const allDone = completedFlags.every(function(v) { return v; });
  if (allDone) {
    completeQuest();
  }
}

// ===== UPDATE PROGRESS =====

function updateQuestProgress(completedFlags) {
  const done = completedFlags.filter(function(v) { return v; }).length;
  const total = QUEST_STEPS.length;
  const pct = Math.round((done / total) * 100);

  const fill = document.getElementById('questProgressFill');
  const text = document.getElementById('questProgressText');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = done + ' / ' + total;

  const reward = document.getElementById('questReward');
  if (reward && done === total) {
    reward.classList.add('quest-reward--done');
  }
}

// ===== COMPLETE QUEST =====

async function completeQuest() {
  const user = window.currentUser;
  if (!user || !window.sb) return;
  if (user.quest_completed) return;

  try {
    const { error } = await window.sb
      .from('users')
      .update({
        quest_completed: true,
        balance: (user.balance || 0) + QUEST_REWARD
      })
      .eq('id', user.id);

    if (error) throw error;

    user.quest_completed = true;
    user.balance = (user.balance || 0) + QUEST_REWARD;

    showQuestComplete();
  } catch (err) {
    console.error('completeQuest error:', err);
  }
}

// ===== COMPLETION OVERLAY =====

function showQuestComplete() {
  const existing = document.getElementById('questCompleteOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'quest-complete-overlay';
  overlay.id = 'questCompleteOverlay';

  const icon = document.createElement('div');
  icon.className = 'quest-complete__icon';
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="36" height="36"><path d="M20 6L9 17l-5-5"/></svg>';

  const title = document.createElement('div');
  title.className = 'quest-complete__title';
  title.textContent = 'Квест завершён!';

  const sub = document.createElement('div');
  sub.className = 'quest-complete__sub';
  sub.textContent = '+' + QUEST_REWARD + ' руб. зачислено на баланс';

  const btn = document.createElement('button');
  btn.className = 'quest-complete__btn';
  btn.textContent = 'Продолжить';
  btn.onclick = function() {
    overlay.classList.remove('active');
    setTimeout(function() { overlay.remove(); }, 300);
    goTo('scrFeed');
  };

  overlay.appendChild(icon);
  overlay.appendChild(title);
  overlay.appendChild(sub);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
  setTimeout(function() { overlay.classList.add('active'); }, 10);
}

// ===== SKIP BUTTON =====

function renderSkipButton() {
  const scr = document.getElementById('scrQuest');
  if (!scr) return;
  const head = scr.querySelector('.scr-head');
  if (!head) return;
  const placeholder = head.children[2];
  if (!placeholder) return;

  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.style.cssText = 'font-size:13px;opacity:0.5;width:auto;padding:0 4px';
  btn.textContent = 'Пропустить';
  btn.onclick = function() {
    localStorage.setItem('quest_shown_permanent', '1');
    goTo('scrFeed');
  };
  placeholder.replaceWith(btn);
}

// ===== SHOULD SHOW QUEST =====

function shouldShowQuest() {
  if (localStorage.getItem('quest_shown_permanent') === '1') return false;
  const user = window.currentUser;
  if (!user) return false;
  return !user.quest_completed;
}

// ===== EXPORTS =====

window.initQuest = initQuest;
window.shouldShowQuest = shouldShowQuest;
