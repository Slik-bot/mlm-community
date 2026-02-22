// ===== CONTESTS SCREENS — список конкурсов, детали =====

var currentContest = null;
var allContests = [];
var contestTab = 'active';
var contestTimerInterval = null;

var CONTEST_TYPES = {
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
  var d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ===== CONTESTS LIST =====

function initContests() {
  contestTab = 'active';
  updateContestTabUI();
  loadContests();
}

async function loadContests() {
  var result = await window.sb.from('contests')
    .select('*, participants:contest_participants(user_id)')
    .order('starts_at', { ascending: false });

  allContests = result.data || [];
  var now = Date.now();

  var filtered = allContests.filter(function(c) {
    var start = new Date(c.starts_at).getTime();
    var end = new Date(c.ends_at).getTime();
    if (contestTab === 'active') return start <= now && end >= now;
    if (contestTab === 'upcoming') return start > now;
    return end < now;
  });

  renderContestsList(filtered);
}

function renderContestsList(contests) {
  var list = document.getElementById('contestsList');
  var empty = document.getElementById('contestsEmpty');
  if (!list) return;

  if (!contests.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = contests.map(function(c) {
    var ct = getContestTypeLabel(c.type);
    var pCount = c.participants ? c.participants.length : 0;
    var prize = c.prize_pool ? c.prize_pool.toLocaleString('ru-RU') + ' P' : '';

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
  var btns = document.querySelectorAll('#contestsTabs .contest-tab');
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

  var ct = getContestTypeLabel(currentContest.type);
  var badge = document.getElementById('cdTypeBadge');
  if (badge) {
    badge.textContent = ct.label;
    badge.style.background = ct.color + '22';
    badge.style.color = ct.color;
  }

  var titleEl = document.getElementById('cdTitle');
  if (titleEl) titleEl.textContent = currentContest.title;

  var descEl = document.getElementById('cdDesc');
  if (descEl) descEl.textContent = currentContest.description || '';

  var now = Date.now();
  var end = new Date(currentContest.ends_at).getTime();
  if (end > now) {
    startContestTimer(end);
  } else {
    var timer = document.getElementById('cdTimer');
    if (timer) timer.innerHTML = '<div class="cd-finished-label">Завершён</div>';
  }

  renderPrizes();
  loadContestLeaderboard();
  loadMyPosition();
}

function renderPrizes() {
  var el = document.getElementById('cdPrizes');
  if (!el || !currentContest.prizes) { if (el) el.innerHTML = ''; return; }

  var colors = ['#fbbf24', '#94a3b8', '#b45309'];
  var bgColors = ['rgba(251,191,36,0.2)', 'rgba(148,163,184,0.2)', 'rgba(180,83,9,0.2)'];

  el.innerHTML = currentContest.prizes.map(function(p, i) {
    var c = colors[i] || 'rgba(255,255,255,0.5)';
    var bg = bgColors[i] || 'rgba(255,255,255,0.08)';
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
    var diff = endsAt - Date.now();
    if (diff <= 0) {
      clearInterval(contestTimerInterval);
      var timer = document.getElementById('cdTimer');
      if (timer) timer.innerHTML = '<div class="cd-finished-label">Завершён</div>';
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var dEl = document.getElementById('timerDays');
    var hEl = document.getElementById('timerHours');
    var mEl = document.getElementById('timerMins');
    if (dEl) dEl.textContent = String(days).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
  }

  updateTimer();
  contestTimerInterval = setInterval(updateTimer, 60000);
}

async function loadContestLeaderboard() {
  var result = await window.sb.from('contest_participants')
    .select('*, user:users(id, name, avatar_url, level)')
    .eq('contest_id', currentContest.id)
    .order('score', { ascending: false })
    .limit(20);

  renderLeaderboard(result.data || []);
}

function renderLeaderboard(participants) {
  var el = document.getElementById('cdLeaderboard');
  if (!el) return;

  if (!participants.length) {
    el.innerHTML = '<div class="lb-empty">Пока нет участников</div>';
    return;
  }

  var myId = window.currentUser ? window.currentUser.id : null;

  el.innerHTML = participants.map(function(p, i) {
    var user = p.user || {};
    var isMe = user.id === myId;
    var meClass = isMe ? ' lb-me' : '';
    var place = i + 1;
    var placeColors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' };
    var placeColor = placeColors[place] || 'rgba(255,255,255,0.4)';

    return '<div class="lb-row' + meClass + '">' +
      '<span class="lb-place" style="color:' + placeColor + '">' + place + '</span>' +
      '<img class="lb-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<span class="lb-name">' + escHtml(user.name || 'Участник') + '</span>' +
      '<span class="lb-score">' + (p.score || 0) + '</span>' +
    '</div>';
  }).join('');
}

async function loadMyPosition() {
  var posEl = document.getElementById('cdMyPosition');
  var joinWrap = document.getElementById('cdJoinWrap');
  if (!window.currentUser || !currentContest) return;

  var result = await window.sb.from('contest_participants')
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
    var now = Date.now();
    var end = new Date(currentContest.ends_at).getTime();
    if (joinWrap) joinWrap.classList.toggle('hidden', end < now);
  }
}

async function contestJoin() {
  if (!currentContest || !window.currentUser) return;

  var btn = document.getElementById('cdJoinBtn');
  if (btn) btn.disabled = true;

  await window.sb.from('contest_participants').insert({
    contest_id: currentContest.id,
    user_id: window.currentUser.id,
    score: 0
  });

  if (window.showToast) showToast('Вы участвуете в конкурсе!');
  var joinWrap = document.getElementById('cdJoinWrap');
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
