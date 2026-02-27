// ===== LEADERBOARD SCREEN — топ пользователей по XP =====

let lbPeriod = 'week';
let lbData = [];
let lbMyRank = null;

// ===== INIT =====

function initLeaderboard() {
  lbPeriod = 'week';
  updateLeaderboardTabUI();
  loadLeaderboard();
}

// ===== TAB SWITCHING =====

function switchLeaderboardTab(period) {
  if (period === lbPeriod) return;
  lbPeriod = period;
  updateLeaderboardTabUI();
  loadLeaderboard();
}

function updateLeaderboardTabUI() {
  var btns = document.querySelectorAll('#leaderboardTabs .leaderboard__tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-period') === lbPeriod);
  });
}

// ===== DATA LOADING =====

async function loadLeaderboard() {
  var listEl = document.getElementById('leaderboardList');
  var loadingEl = document.getElementById('leaderboardLoading');
  var emptyEl = document.getElementById('leaderboardEmpty');
  var myPosEl = document.getElementById('leaderboardMyPosition');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (listEl) listEl.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (myPosEl) myPosEl.classList.add('hidden');

  var users = await fetchLeaderboardData(lbPeriod);

  if (loadingEl) loadingEl.classList.add('hidden');

  if (!users || !users.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  lbData = users;
  findMyRank();
  renderMyPosition();
  renderLeaderboardList();
}

async function fetchLeaderboardData(period) {
  var query = window.sb.from('users')
    .select('id, name, avatar_url, xp_total, dna_type, level, level_stars, streak_days')
    .eq('is_active', true);

  if (period === 'week') {
    var weekStart = getWeekStart();
    query = query.gte('last_active_at', weekStart.toISOString());
  } else if (period === 'month') {
    var monthStart = getMonthStart();
    query = query.gte('last_active_at', monthStart.toISOString());
  }

  query = query.order('xp_total', { ascending: false }).limit(100);

  var result = await query;
  return result.data || [];
}

// ===== DATE HELPERS =====

function getWeekStart() {
  var d = new Date();
  var day = d.getDay();
  var diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart() {
  var d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== MY POSITION =====

function findMyRank() {
  lbMyRank = null;
  var user = getCurrentUser();
  if (!user) return;

  for (var i = 0; i < lbData.length; i++) {
    if (lbData[i].id === user.id) {
      lbMyRank = i + 1;
      return;
    }
  }
}

function renderMyPosition() {
  var el = document.getElementById('leaderboardMyPosition');
  if (!el) return;

  var user = getCurrentUser();
  if (!user) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');

  var rankEl = document.getElementById('leaderboardMyRank');
  if (rankEl) rankEl.textContent = lbMyRank ? '#' + lbMyRank : '#—';

  var avatarEl = document.getElementById('leaderboardMyAvatar');
  if (avatarEl) {
    avatarEl.src = user.avatar_url || '';
    avatarEl.style.display = user.avatar_url ? '' : 'none';
  }

  var nameEl = document.getElementById('leaderboardMyName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';

  var lvl = window.Gamification.getUserLevel(user.xp_total || 0);
  var dnaColor = getDnaColor(user.dna_type);

  var chessEl = document.getElementById('leaderboardMyChess');
  if (chessEl) chessEl.innerHTML = getChessIcon(lvl.level, dnaColor);

  var starsEl = document.getElementById('leaderboardMyStars');
  if (starsEl) starsEl.textContent = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);

  var xpEl = document.getElementById('leaderboardMyXp');
  if (xpEl) xpEl.textContent = fmtXp(user.xp_total || 0) + ' XP';
}

// ===== RENDER LIST =====

function renderLeaderboardList() {
  var listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  var me = getCurrentUser();
  var myId = me ? me.id : null;

  listEl.innerHTML = lbData.map(function(u, i) {
    var rank = i + 1;
    var lvl = window.Gamification.getUserLevel(u.xp_total || 0);
    var dnaColor = getDnaColor(u.dna_type);
    var stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    var isMe = u.id === myId;
    var meClass = isMe ? ' leaderboard__row--me' : '';
    var medalHtml = getMedalHtml(rank);

    var avatarHtml = u.avatar_url
      ? '<img class="leaderboard__row-avatar-img" src="' + lbEsc(u.avatar_url) + '" alt="">'
      : '<div class="leaderboard__row-avatar-placeholder">' + (u.name || '?')[0] + '</div>';

    return '<div class="leaderboard__row glass-card' + meClass + '" onclick="openLeaderboardUser(\'' + u.id + '\')">' +
      '<div class="leaderboard__row-rank">' + medalHtml + '</div>' +
      '<div class="leaderboard__row-avatar">' + avatarHtml + '</div>' +
      '<div class="leaderboard__row-info">' +
        '<div class="leaderboard__row-name">' + lbEsc(u.name || 'Участник') + '</div>' +
        '<div class="leaderboard__row-level">' +
          '<span class="leaderboard__row-chess">' + getChessIcon(lvl.level, dnaColor) + '</span>' +
          '<span class="leaderboard__row-stars">' + stars + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="leaderboard__row-xp">' + fmtXp(u.xp_total || 0) + ' XP</div>' +
    '</div>';
  }).join('');
}

function getMedalHtml(rank) {
  if (rank === 1) return '<span class="leaderboard__medal leaderboard__medal--gold">1</span>';
  if (rank === 2) return '<span class="leaderboard__medal leaderboard__medal--silver">2</span>';
  if (rank === 3) return '<span class="leaderboard__medal leaderboard__medal--bronze">3</span>';
  return '<span class="leaderboard__rank-num">' + rank + '</span>';
}

// ===== USER TAP =====

function openLeaderboardUser(userId) {
  var me = getCurrentUser();
  if (me && userId === me.id) {
    goTo('scrProfile');
  }
}

// ===== HELPERS =====

function fmtXp(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function lbEsc(s) {
  return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}

// ===== EXPORTS =====
window.initLeaderboard = initLeaderboard;
window.switchLeaderboardTab = switchLeaderboardTab;
window.openLeaderboardUser = openLeaderboardUser;
