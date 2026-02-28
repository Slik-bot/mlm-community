// ═══════════════════════════════════════
// FRIENDS — Экран друзей
// ═══════════════════════════════════════

let frAccepted = [];
let frIncoming = [];
let frOutgoing = [];
let frCurrentTab = 'accepted';

const FR_FIELDS = 'id,name,avatar_url,dna_type,level,level_stars,last_active_at';

const FR_EMPTY_TEXT = {
  accepted: 'Пока нет друзей',
  incoming: 'Нет входящих запросов',
  outgoing: 'Нет исходящих запросов'
};

// ═══ Init ═══

function initFriends() {
  const user = window.currentUser;
  if (!user) return;
  frCurrentTab = 'accepted';
  frSetupTabs();
  frSetupSearch();
  frLoadData();
}

// ═══ Load Data ═══

function frLoadData() {
  const s = window.sb;
  const uid = window.currentUser.id;
  if (!s) return;
  Promise.all([
    s.from('friends')
      .select('*, friend:vw_public_profiles!user_b_id(' + FR_FIELDS + ')')
      .eq('user_a_id', uid).eq('status', 'accepted'),
    s.from('friends')
      .select('*, friend:vw_public_profiles!user_a_id(' + FR_FIELDS + ')')
      .eq('user_b_id', uid).eq('status', 'accepted'),
    s.from('friends')
      .select('*, sender:vw_public_profiles!user_a_id(' + FR_FIELDS + ')')
      .eq('user_b_id', uid).eq('status', 'pending'),
    s.from('friends')
      .select('*, receiver:vw_public_profiles!user_b_id(' + FR_FIELDS + ')')
      .eq('user_a_id', uid).eq('status', 'pending')
  ]).then(function(results) {
    const a1 = results[0].data || [];
    const a2 = results[1].data || [];
    frAccepted = a1.concat(a2);
    frIncoming = results[2].data || [];
    frOutgoing = results[3].data || [];
    frUpdateBadges();
    frRenderList();
  }).catch(function(err) {
    console.error('Friends load error:', err);
    showToast('Ошибка загрузки друзей');
  });
}

// ═══ Tabs ═══

function frSetupTabs() {
  const tabs = document.querySelectorAll('#scrFriends .fr-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('fr-active'); });
      tab.classList.add('fr-active');
      frCurrentTab = tab.getAttribute('data-tab');
      const search = document.getElementById('frSearch');
      if (search) search.value = '';
      frRenderList();
    });
  });
}

function frUpdateBadges() {
  const ba = document.getElementById('frBadgeAccepted');
  if (ba) ba.textContent = frAccepted.length || '';
  const bi = document.getElementById('frBadgeIncoming');
  if (bi) bi.textContent = frIncoming.length || '';
  const hb = document.getElementById('frHeadBadge');
  if (hb) hb.textContent = frAccepted.length ? '(' + frAccepted.length + ')' : '';
}

// ═══ Search ═══

function frSetupSearch() {
  const inp = document.getElementById('frSearch');
  if (!inp) return;
  let timeout;
  inp.addEventListener('input', function() {
    clearTimeout(timeout);
    timeout = setTimeout(function() { frRenderList(); }, 200);
  });
}

// ═══ Render List ═══

function frGetCurrentItems() {
  if (frCurrentTab === 'accepted') return frAccepted;
  if (frCurrentTab === 'incoming') return frIncoming;
  return frOutgoing;
}

function frGetProfile(item) {
  return item.friend || item.sender || item.receiver || {};
}

function frRenderList() {
  const list = document.getElementById('frList');
  const empty = document.getElementById('frEmpty');
  const emptyText = document.getElementById('frEmptyText');
  if (!list) return;

  let items = frGetCurrentItems();
  const query = (document.getElementById('frSearch') || {}).value || '';
  if (query.trim()) {
    const q = query.toLowerCase();
    items = items.filter(function(item) {
      const p = frGetProfile(item);
      return (p.name || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  if (!items.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (emptyText) emptyText.textContent = FR_EMPTY_TEXT[frCurrentTab];
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = items.map(function(item, i) {
    return frRenderCard(item, frCurrentTab, i);
  }).join('');
}

// ═══ Render Card ═══

function frRenderCard(item, type, index) {
  const p = frGetProfile(item);
  const dnaColor = window.getDnaColor ? getDnaColor(p.dna_type) : '#8b5cf6';
  const lvl = window.Gamification ? Gamification.getUserLevel(p.xp_total || 0) : null;
  const lvlLabel = lvl ? lvl.label : '';
  const icon = window.getChessIcon ? getChessIcon(p.level || 'pawn', dnaColor) : '';
  const ago = frTimeAgo(p.last_active_at);
  const avatar = p.avatar_url
    ? '<img class="fr-avatar" src="' + escHtml(p.avatar_url) + '" alt="">'
    : '<div class="fr-avatar"></div>';
  const delay = 'animation-delay:' + (index * 0.04) + 's';
  let buttons = '';
  if (type === 'accepted') {
    buttons = '<button class="fr-btn fr-btn-remove" onclick="frRemoveFriend(\'' + item.id + '\')">Удалить</button>';
  } else if (type === 'incoming') {
    buttons = '<button class="fr-btn fr-btn-accept" onclick="frAcceptFriend(\'' + item.id + '\')">Принять</button>' +
              '<button class="fr-btn fr-btn-reject" onclick="frRejectFriend(\'' + item.id + '\')">Отклонить</button>';
  } else {
    buttons = '<button class="fr-btn fr-btn-reject" onclick="frRejectFriend(\'' + item.id + '\')">Отменить</button>';
  }
  return '<div class="fr-card" style="' + delay + '">' +
    avatar.replace('class="fr-avatar"', 'class="fr-avatar" style="border-color:' + dnaColor + '"') +
    '<div class="fr-info">' +
      '<div class="fr-name">' + escHtml(p.name || 'Участник') + '</div>' +
      '<div class="fr-meta">' + icon + '<span>' + lvlLabel + '</span><span>' + ago + '</span></div>' +
    '</div>' +
    '<div class="fr-actions">' + buttons + '</div>' +
  '</div>';
}

// ═══ Actions ═══

function frAcceptFriend(rowId) {
  const s = window.sb;
  if (!s) return;
  s.from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', rowId)
    .then(function(res) {
      if (res.error) throw res.error;
      showToast('Запрос принят');
      frLoadData();
    })
    .catch(function(err) {
      console.error('Accept friend error:', err);
      showToast('Ошибка');
    });
}

function frRejectFriend(rowId) {
  const s = window.sb;
  if (!s) return;
  s.from('friends')
    .delete()
    .eq('id', rowId)
    .then(function(res) {
      if (res.error) throw res.error;
      frLoadData();
    })
    .catch(function(err) {
      console.error('Reject friend error:', err);
      showToast('Ошибка');
    });
}

function frRemoveFriend(rowId) {
  if (!confirm('Удалить из друзей?')) return;
  const s = window.sb;
  if (!s) return;
  s.from('friends')
    .delete()
    .eq('id', rowId)
    .then(function(res) {
      if (res.error) throw res.error;
      showToast('Друг удалён');
      frLoadData();
    })
    .catch(function(err) {
      console.error('Remove friend error:', err);
      showToast('Ошибка');
    });
}

// ═══ Time Ago ═══

function frTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'онлайн';
  if (min < 60) return min + ' мин назад';
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + ' ч назад';
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return days + ' дн назад';
  return Math.floor(days / 7) + ' нед назад';
}

// ═══ Exports ═══

window.initFriends = initFriends;
window.frAcceptFriend = frAcceptFriend;
window.frRejectFriend = frRejectFriend;
window.frRemoveFriend = frRemoveFriend;
