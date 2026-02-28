// ===== LEADERBOARD SCREEN — топ пользователей по XP =====

let lbPeriod = 'week';
let lbData = [];
let lbMyRank = null;

// ===== INIT =====

function initLeaderboard() {
  lbPeriod = 'week';
  updateTabUI();
  loadLeaderboard();
}

// ===== TAB SWITCHING =====

function switchLeaderboardTab(period) {
  if (period === lbPeriod) return;
  lbPeriod = period;
  updateTabUI();
  loadLeaderboard();
}

function updateTabUI() {
  const btns = document.querySelectorAll('#lbTabs .lb-tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-period') === lbPeriod);
  });
}

// ===== DATA LOADING =====

async function loadLeaderboard() {
  const listEl = document.getElementById('lbList');
  const loadingEl = document.getElementById('lbLoading');
  const emptyEl = document.getElementById('lbEmpty');
  const podiumEl = document.getElementById('lbPodium');
  const myPosEl = document.getElementById('lbMyPosition');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (listEl) listEl.innerHTML = '';
  if (podiumEl) podiumEl.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (myPosEl) myPosEl.classList.add('hidden');

  try {
    const users = await fetchLbData(lbPeriod);
    if (loadingEl) loadingEl.classList.add('hidden');

    if (!users || !users.length) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    lbData = users;
    findMyRank();
    renderMyPosition();
    renderPodium();
    renderList();
  } catch (err) {
    console.error('Leaderboard load error:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
    showToast('Ошибка загрузки лидерборда');
  }
}

async function fetchLbData(period) {
  if (period === 'all') return fetchAllTime();
  return fetchByPeriod(period);
}

async function fetchAllTime() {
  const { data, error } = await window.sb.from('users')
    .select('id, name, avatar_url, xp_total, dna_type')
    .order('xp_total', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map(function(u) {
    u.display_xp = u.xp_total;
    return u;
  });
}

async function fetchByPeriod(period) {
  const start = period === 'week' ? getWeekStart() : getMonthStart();

  const { data: txns, error: txErr } = await window.sb.from('transactions')
    .select('user_id, amount')
    .eq('type', 'task_reward')
    .gte('created_at', start.toISOString());
  if (txErr) throw txErr;
  if (!txns || !txns.length) return [];

  const map = {};
  txns.forEach(function(t) {
    map[t.user_id] = (map[t.user_id] || 0) + (t.amount || 0);
  });

  const sorted = Object.entries(map)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 50);

  const userIds = sorted.map(function(e) { return e[0]; });
  if (!userIds.length) return [];

  const { data: profiles, error: pErr } = await window.sb.from('users')
    .select('id, name, avatar_url, dna_type, xp_total')
    .in('id', userIds);
  if (pErr) throw pErr;

  const pMap = {};
  (profiles || []).forEach(function(p) { pMap[p.id] = p; });

  return sorted.map(function(entry) {
    const p = pMap[entry[0]] || {};
    return {
      id: entry[0],
      name: p.name || 'Участник',
      avatar_url: p.avatar_url || '',
      dna_type: p.dna_type || '',
      xp_total: p.xp_total || 0,
      display_xp: entry[1]
    };
  });
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
  const el = document.getElementById('lbMyPosition');
  if (!el) return;
  const user = getCurrentUser();
  if (!user) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');

  const rankEl = document.getElementById('lbMyRank');
  if (rankEl) rankEl.textContent = lbMyRank ? '#' + lbMyRank : 'Не в топ-50';

  const avatarEl = document.getElementById('lbMyAvatar');
  if (avatarEl) {
    avatarEl.src = user.avatar_url || '';
    avatarEl.style.display = user.avatar_url ? '' : 'none';
  }

  const nameEl = document.getElementById('lbMyName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';

  const lvl = window.Gamification.getUserLevel(user.xp_total || 0);
  const dnaColor = getDnaColor(user.dna_type);

  const chessEl = document.getElementById('lbMyChess');
  if (chessEl) chessEl.innerHTML = getChessIcon(lvl.level, dnaColor);

  const starsEl = document.getElementById('lbMyStars');
  if (starsEl) starsEl.textContent = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);

  const xpEl = document.getElementById('lbMyXp');
  if (xpEl) {
    const myEntry = lbData.find(function(u) { return u.id === user.id; });
    xpEl.textContent = fmtXp(myEntry ? myEntry.display_xp : (user.xp_total || 0)) + ' XP';
  }
}

// ===== RENDER PODIUM (TOP 3) =====

function renderPodium() {
  const el = document.getElementById('lbPodium');
  if (!el) return;
  if (lbData.length < 3) { el.innerHTML = ''; return; }

  const order = [1, 0, 2];
  const cls = ['lb-podium-second', 'lb-podium-first', 'lb-podium-third'];
  const mCls = ['lb-medal--silver', 'lb-medal--gold', 'lb-medal--bronze'];
  const mNum = ['2', '1', '3'];

  el.innerHTML = order.map(function(idx, i) {
    const u = lbData[idx];
    const lvl = window.Gamification.getUserLevel(u.xp_total || 0);
    const dnaColor = getDnaColor(u.dna_type);
    const stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    const avatar = u.avatar_url
      ? '<img class="lb-podium-img" src="' + lbEsc(u.avatar_url) + '" alt="">'
      : '<div class="lb-podium-ph">' + (u.name || '?')[0] + '</div>';

    return '<div class="lb-podium-card ' + cls[i] + '"' +
      ' onclick="openLbUser(\'' + u.id + '\')">' +
      '<div class="lb-medal ' + mCls[i] + '">' + mNum[i] + '</div>' +
      '<div class="lb-podium-ava">' + avatar + '</div>' +
      '<div class="lb-podium-name">' + lbEsc(u.name || 'Участник') + '</div>' +
      '<div class="lb-podium-lvl">' +
        getChessIcon(lvl.level, dnaColor) +
        ' <span class="lb-stars">' + stars + '</span>' +
      '</div>' +
      '<div class="lb-podium-xp">' + fmtXp(u.display_xp || 0) + ' XP</div>' +
    '</div>';
  }).join('');
}

// ===== RENDER LIST (4-50) =====

function renderList() {
  const el = document.getElementById('lbList');
  if (!el) return;
  const me = getCurrentUser();
  const myId = me ? me.id : null;
  const startIdx = lbData.length >= 3 ? 3 : 0;

  el.innerHTML = lbData.slice(startIdx).map(function(u, i) {
    const rank = startIdx + i + 1;
    const lvl = window.Gamification.getUserLevel(u.xp_total || 0);
    const dnaColor = getDnaColor(u.dna_type);
    const stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    const meClass = u.id === myId ? ' lb-row--me' : '';
    const avatar = u.avatar_url
      ? '<img class="lb-row-img" src="' + lbEsc(u.avatar_url) + '" alt="">'
      : '<div class="lb-row-ph">' + (u.name || '?')[0] + '</div>';

    return '<div class="lb-row glass-card' + meClass + '"' +
      ' onclick="openLbUser(\'' + u.id + '\')">' +
      '<div class="lb-row-rank">' + rank + '</div>' +
      '<div class="lb-row-ava">' + avatar + '</div>' +
      '<div class="lb-row-info">' +
        '<div class="lb-row-name">' + lbEsc(u.name || 'Участник') + '</div>' +
        '<div class="lb-row-lvl">' +
          '<span class="lb-row-chess">' + getChessIcon(lvl.level, dnaColor) + '</span>' +
          ' <span class="lb-stars">' + stars + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="lb-row-xp">' + fmtXp(u.display_xp || 0) + ' XP</div>' +
    '</div>';
  }).join('');
}

// ===== USER TAP =====

function openLbUser(userId) {
  const me = getCurrentUser();
  if (me && userId === me.id) {
    goTo('scrProfile');
    return;
  }
  const u = lbData.find(function(d) { return d.id === userId; });
  if (u) {
    const lvl = window.Gamification.getUserLevel(u.xp_total || 0);
    showToast(u.name + ' · Уровень ' + lvl.level + ' · ' + fmtXp(u.display_xp || 0) + ' XP');
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
window.openLbUser = openLbUser;
