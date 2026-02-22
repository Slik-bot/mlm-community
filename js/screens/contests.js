// ===== CONTESTS SCREENS — список конкурсов, детали =====

let currentContest = null;
let allContests = [];
let contestTab = 'active';
let contestTimerInterval = null;

const CONTEST_TYPES = {
  sales:     { label: 'Продажи',    color: '#22c55e' },
  referrals: { label: 'Рефералы',   color: '#8b5cf6' },
  activity:  { label: 'Активность', color: '#f59e0b' },
  content:   { label: 'Контент',    color: '#3b82f6' }
};

function getContestTypeLabel(type) {
  return CONTEST_TYPES[type] || { label: type, color: 'rgba(255,255,255,0.3)' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ===== CONTESTS LIST =====

function initContests() {
  contestTab = 'active';
  updateContestTabUI();
  loadContests();
}

async function loadContests() {
  const result = await window.sb.from('contests')
    .select('*, participants:contest_participants(user_id)')
    .order('starts_at', { ascending: false });

  allContests = result.data || [];
  const now = Date.now();

  const filtered = allContests.filter(function(c) {
    const start = new Date(c.starts_at).getTime();
    const end = new Date(c.ends_at).getTime();
    if (contestTab === 'active') return start <= now && end >= now;
    if (contestTab === 'upcoming') return start > now;
    return end < now;
  });

  renderContestsList(filtered);
}

function renderContestsList(contests) {
  const list = document.getElementById('contestsList');
  const empty = document.getElementById('contestsEmpty');
  if (!list) return;

  if (!contests.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = contests.map(function(c) {
    const ct = getContestTypeLabel(c.type);
    const pCount = c.participants ? c.participants.length : 0;
    const prize = c.prize_pool ? c.prize_pool.toLocaleString('ru-RU') + ' P' : '';

    return '<div class="contest-card glass-card" onclick="openContest(\'' + c.id + '\')">' +
      '<span class="contest-card-type" style="background:' + ct.color + '22;color:' + ct.color + '">' + ct.label + '</span>' +
      '<div class="contest-card-title">' + escHtml(c.title) + '</div>' +
      '<div class="contest-card-dates">' + formatDate(c.starts_at) + ' — ' + formatDate(c.ends_at) + '</div>' +
      '<div class="contest-card-footer">' +
        (prize ? '<span class="contest-prize">' + prize + '</span>' : '<span></span>') +
        '<span class="contest-participants">' + pCount + ' участников</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function switchContestTab(tab) {
  contestTab = tab;
  updateContestTabUI();
  loadContests();
}

function updateContestTabUI() {
  const btns = document.querySelectorAll('#contestsTabs .contest-tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === contestTab);
  });
}

function openContest(contestId) {
  currentContest = allContests.find(function(c) { return c.id === contestId; });
  if (currentContest) goTo('scrContestDetail');
}

// ===== CONTEST DETAIL =====

function initContestDetail() {
  if (!currentContest) { goBack(); return; }

  const ct = getContestTypeLabel(currentContest.type);
  const badge = document.getElementById('cdTypeBadge');
  if (badge) {
    badge.textContent = ct.label;
    badge.style.background = ct.color + '22';
    badge.style.color = ct.color;
  }

  const titleEl = document.getElementById('cdTitle');
  if (titleEl) titleEl.textContent = currentContest.title;

  const descEl = document.getElementById('cdDesc');
  if (descEl) descEl.textContent = currentContest.description || '';

  const now = Date.now();
  const end = new Date(currentContest.ends_at).getTime();
  if (end > now) {
    startContestTimer(end);
  } else {
    const timer = document.getElementById('cdTimer');
    if (timer) timer.innerHTML = '<div class="cd-finished-label">Завершён</div>';
  }

  renderPrizes();
  loadContestLeaderboard();
  loadMyPosition();
}

function renderPrizes() {
  const el = document.getElementById('cdPrizes');
  if (!el || !currentContest.prizes) { if (el) el.innerHTML = ''; return; }

  const colors = ['#fbbf24', '#94a3b8', '#b45309'];
  const bgColors = ['rgba(251,191,36,0.2)', 'rgba(148,163,184,0.2)', 'rgba(180,83,9,0.2)'];

  el.innerHTML = currentContest.prizes.map(function(p, i) {
    const c = colors[i] || 'rgba(255,255,255,0.5)';
    const bg = bgColors[i] || 'rgba(255,255,255,0.08)';
    return '<div class="prize-row glass-card">' +
      '<div class="prize-place" style="background:' + bg + ';color:' + c + '">#' + (i + 1) + '</div>' +
      '<span class="prize-label">' + escHtml(p.label || 'Место ' + (i + 1)) + '</span>' +
      '<span class="prize-amount">' + (p.amount ? p.amount.toLocaleString('ru-RU') + ' P' : '') + '</span>' +
    '</div>';
  }).join('');
}

function startContestTimer(endsAt) {
  if (contestTimerInterval) clearInterval(contestTimerInterval);

  function updateTimer() {
    const diff = endsAt - Date.now();
    if (diff <= 0) {
      clearInterval(contestTimerInterval);
      const timer = document.getElementById('cdTimer');
      if (timer) timer.innerHTML = '<div class="cd-finished-label">Завершён</div>';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const dEl = document.getElementById('timerDays');
    const hEl = document.getElementById('timerHours');
    const mEl = document.getElementById('timerMins');
    if (dEl) dEl.textContent = String(days).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
  }

  updateTimer();
  contestTimerInterval = setInterval(updateTimer, 60000);
}

async function loadContestLeaderboard() {
  const result = await window.sb.from('contest_participants')
    .select('*, user:users(id, name, avatar_url, level)')
    .eq('contest_id', currentContest.id)
    .order('score', { ascending: false })
    .limit(20);

  renderLeaderboard(result.data || []);
}

function renderLeaderboard(participants) {
  const el = document.getElementById('cdLeaderboard');
  if (!el) return;

  if (!participants.length) {
    el.innerHTML = '<div class="lb-empty">Пока нет участников</div>';
    return;
  }

  const myId = window.currentUser ? window.currentUser.id : null;

  el.innerHTML = participants.map(function(p, i) {
    const user = p.user || {};
    const isMe = user.id === myId;
    const meClass = isMe ? ' lb-me' : '';
    const place = i + 1;
    const placeColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' };
    const placeColor = placeColors[place] || 'rgba(255,255,255,0.4)';

    return '<div class="lb-row' + meClass + '">' +
      '<span class="lb-place" style="color:' + placeColor + '">' + place + '</span>' +
      '<img class="lb-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<span class="lb-name">' + escHtml(user.name || 'Участник') + '</span>' +
      '<span class="lb-score">' + (p.score || 0) + '</span>' +
    '</div>';
  }).join('');
}

async function loadMyPosition() {
  const posEl = document.getElementById('cdMyPosition');
  const joinWrap = document.getElementById('cdJoinWrap');
  if (!window.currentUser || !currentContest) return;

  const result = await window.sb.from('contest_participants')
    .select('score')
    .eq('contest_id', currentContest.id)
    .eq('user_id', window.currentUser.id)
    .maybeSingle();

  if (result.data) {
    if (posEl) {
      posEl.classList.remove('hidden');
      posEl.textContent = 'Вы участвуете. Счёт: ' + (result.data.score || 0);
    }
    if (joinWrap) joinWrap.classList.add('hidden');
  } else {
    if (posEl) posEl.classList.add('hidden');
    const now = Date.now();
    const end = new Date(currentContest.ends_at).getTime();
    if (joinWrap) joinWrap.classList.toggle('hidden', end < now);
  }
}

async function contestJoin() {
  if (!currentContest || !window.currentUser) return;

  const btn = document.getElementById('cdJoinBtn');
  if (btn) btn.disabled = true;

  await window.sb.from('contest_participants').insert({
    contest_id: currentContest.id,
    user_id: window.currentUser.id,
    score: 0
  });

  if (window.showToast) showToast('Вы участвуете в конкурсе!');
  const joinWrap = document.getElementById('cdJoinWrap');
  if (joinWrap) joinWrap.classList.add('hidden');
  loadMyPosition();
  loadContestLeaderboard();
}

function contestsCleanup() {
  if (contestTimerInterval) {
    clearInterval(contestTimerInterval);
    contestTimerInterval = null;
  }
}

// ===== EXPORTS =====
window.initContests = initContests;
window.initContestDetail = initContestDetail;
window.switchContestTab = switchContestTab;
window.openContest = openContest;
window.contestJoin = contestJoin;
window.contestsCleanup = contestsCleanup;
