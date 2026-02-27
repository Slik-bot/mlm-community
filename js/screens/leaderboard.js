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
  const btns = document.querySelectorAll('#leaderboardTabs .leaderboard__tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-period') === lbPeriod);
  });
}

// ===== DATA LOADING =====

async function loadLeaderboard() {
  const listEl = document.getElementById('leaderboardList');
  const loadingEl = document.getElementById('leaderboardLoading');
  const emptyEl = document.getElementById('leaderboardEmpty');
  const myPosEl = document.getElementById('leaderboardMyPosition');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (listEl) listEl.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (myPosEl) myPosEl.classList.add('hidden');

  const users = await fetchLeaderboardData(lbPeriod);

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
  let query = window.sb.from('users')
    .select('id, name, avatar_url, xp_total, dna_type, level, level_stars, streak_days')
    .eq('is_active', true);

  if (period === 'week') {
    const weekStart = getWeekStart();
    query = query.gte('last_active_at', weekStart.toISOString());
  } else if (period === 'month') {
    const monthStart = getMonthStart();
    query = query.gte('last_active_at', monthStart.toISOString());
  }

  query = query.order('xp_total', { ascending: false }).limit(100);

  const result = await query;
  return result.data || [];
}

// ===== DATE HELPERS =====

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== MY POSITION =====

function findMyRank() {
  lbMyRank = null;
  const user = getCurrentUser();
  if (!user) return;

  for (let i = 0; i < lbData.length; i++) {
    if (lbData[i].id === user.id) {
      lbMyRank = i + 1;
      return;
    }
  }
}

function renderMyPosition() {
  const el = document.getElementById('leaderboardMyPosition');
  if (!el) return;

  const user = getCurrentUser();
  if (!user) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');

  const rankEl = document.getElementById('leaderboardMyRank');
  if (rankEl) rankEl.textContent = lbMyRank ? '#' + lbMyRank : '#—';

  const avatarEl = document.getElementById('leaderboardMyAvatar');
  if (avatarEl) {
    avatarEl.src = user.avatar_url || '';
    avatarEl.style.display = user.avatar_url ? '' : 'none';
  }

  const nameEl = document.getElementById('leaderboardMyName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';

  const lvl = window.Gamification.getUserLevel(user.xp_total || 0);
  const dnaColor = getDnaColor(user.dna_type);

  const chessEl = document.getElementById('leaderboardMyChess');
  if (chessEl) chessEl.innerHTML = getChessIcon(lvl.level, dnaColor);

  const starsEl = document.getElementById('leaderboardMyStars');
  if (starsEl) starsEl.textContent = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);

  const xpEl = document.getElementById('leaderboardMyXp');
  if (xpEl) xpEl.textContent = fmtXp(user.xp_total || 0) + ' XP';
}

// ===== RENDER LIST =====

function renderLeaderboardList() {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  const me = getCurrentUser();
  const myId = me ? me.id : null;

  listEl.innerHTML = lbData.map(function(u, i) {
    const rank = i + 1;
    const lvl = window.Gamification.getUserLevel(u.xp_total || 0);
    const dnaColor = getDnaColor(u.dna_type);
    const stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    const isMe = u.id === myId;
    const meClass = isMe ? ' leaderboard__row--me' : '';
    const medalHtml = getMedalHtml(rank);

    const avatarHtml = u.avatar_url
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
  const me = getCurrentUser();
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
