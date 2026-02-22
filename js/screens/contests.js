// ===== CONTESTS SCREENS — список конкурсов, детали =====

let currentContest = null;
let allContests = [];
let contestTab = 'active';
let contestTimerInterval = null;

const CONTEST_CATEGORIES = {
  bronze: { label: 'Бронза', color: '#b45309' },
  silver: { label: 'Серебро', color: '#94a3b8' },
  gold:   { label: 'Золото', color: '#fbbf24' }
};

function getContestCategoryLabel(category) {
  return CONTEST_CATEGORIES[category] || { label: category, color: 'rgba(255,255,255,0.3)' };
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
    .select('*, entries:contest_entries(user_id)')
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
    const ct = getContestCategoryLabel(c.category);
    const eCount = c.entries ? c.entries.length : 0;
    const prize = c.prize_pool ? c.prize_pool.toLocaleString('ru-RU') + ' P' : '';

    return '<div class="contest-card glass-card" onclick="openContest(\'' + c.id + '\')">' +
      '<span class="contest-card-type" style="background:' + ct.color + '22;color:' + ct.color + '">' + ct.label + '</span>' +
      '<div class="contest-card-title">' + escHtml(c.title) + '</div>' +
      '<div class="contest-card-dates">' + formatDate(c.starts_at) + ' — ' + formatDate(c.ends_at) + '</div>' +
      '<div class="contest-card-footer">' +
        (prize ? '<span class="contest-prize">' + prize + '</span>' : '<span></span>') +
        '<span class="contest-participants">' + eCount + ' участников</span>' +
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

  const ct = getContestCategoryLabel(currentContest.category);
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

  renderPrizePool();
  loadContestLeaderboard();
  loadMyPosition();
}

function renderPrizePool() {
  const el = document.getElementById('cdPrizes');
  if (!el || !currentContest.prize_pool) { if (el) el.innerHTML = ''; return; }

  el.innerHTML = '<div class="prize-row glass-card">' +
    '<div class="prize-place" style="background:rgba(251,191,36,0.2);color:#fbbf24">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
    '</div>' +
    '<span class="prize-label">Призовой фонд</span>' +
    '<span class="prize-amount">' + currentContest.prize_pool.toLocaleString('ru-RU') + ' P</span>' +
  '</div>';
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
  const result = await window.sb.from('contest_entries')
    .select('*, user:vw_public_profiles(id, name, avatar_url, level)')
    .eq('contest_id', currentContest.id)
    .order('ticket_number', { ascending: true })
    .limit(20);

  renderLeaderboard(result.data || []);
}

function renderLeaderboard(entries) {
  const el = document.getElementById('cdLeaderboard');
  if (!el) return;

  if (!entries.length) {
    el.innerHTML = '<div class="lb-empty">Пока нет участников</div>';
    return;
  }

  const myId = window.currentUser ? window.currentUser.id : null;

  el.innerHTML = entries.map(function(e, i) {
    const user = e.user || {};
    const isMe = user.id === myId;
    const meClass = isMe ? ' lb-me' : '';
    const place = i + 1;
    const placeColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' };
    const placeColor = placeColors[place] || 'rgba(255,255,255,0.4)';

    return '<div class="lb-row' + meClass + '">' +
      '<span class="lb-place" style="color:' + placeColor + '">' + place + '</span>' +
      '<img class="lb-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<span class="lb-name">' + escHtml(user.name || 'Участник') + '</span>' +
      '<span class="lb-score">#' + (e.ticket_number || 0) + '</span>' +
    '</div>';
  }).join('');
}

async function loadMyPosition() {
  const posEl = document.getElementById('cdMyPosition');
  const joinWrap = document.getElementById('cdJoinWrap');
  if (!window.currentUser || !currentContest) return;

  const result = await window.sb.from('contest_entries')
    .select('ticket_number')
    .eq('contest_id', currentContest.id)
    .eq('user_id', window.currentUser.id)
    .maybeSingle();

  if (result.data) {
    if (posEl) {
      posEl.classList.remove('hidden');
      posEl.textContent = 'Вы участвуете. Билет #' + (result.data.ticket_number || 0);
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

  const ticketNum = (currentContest.entries_count || 0) + 1;

  await window.sb.from('contest_entries').insert({
    contest_id: currentContest.id,
    user_id: window.currentUser.id,
    ticket_number: ticketNum
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
