// ===== PROFILE SCREENS — просмотр, редактирование, настройки =====

// ===== ДНК-цвета — см. js/utils/dna.js =====

const DNA_NAMES = {
  strategist: 'Стратег',
  communicator: 'Коммуникатор',
  creator: 'Креатор',
  analyst: 'Аналитик'
};

// ===== Уровни — см. js/utils/gamification.js =====

function getChessIcon(level, color) {
  const c = color || '#8b5cf6';
  const icons = {
    pawn: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M9 21h6"/><path d="M10 21v-4a2 2 0 012-2v0a2 2 0 012 2v4"/><path d="M7 21a7 7 0 010-1c0-2 2-3 5-3s5 1 5 3a7 7 0 010 1"/></svg>',
    knight: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M8 16l-1 5h10l-1-5"/><path d="M7 16c0-4 2-6 3-8l-2-3c0 0 3-2 5-2s4 2 4 5c0 4-2 6-2 8"/><circle cx="14" cy="7" r="1" fill="' + c + '"/></svg>',
    bishop: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M8 21h8"/><path d="M9 21v-1a7 7 0 016 0v1"/><path d="M12 3a5 5 0 00-3 9l1 4h4l1-4a5 5 0 00-3-9z"/><circle cx="12" cy="3" r="1" fill="' + c + '"/></svg>',
    rook: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M7 21h10"/><path d="M8 21v-2h8v2"/><path d="M9 19V9h6v10"/><path d="M7 9h10"/><path d="M7 9V5h2v2h2V5h2v2h2V5h2v4"/></svg>',
    queen: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M7 21h10"/><path d="M8 21l1-5h6l1 5"/><path d="M3 6l4 10h10l4-10"/><circle cx="3" cy="5" r="1" fill="' + c + '"/><circle cx="8" cy="3" r="1" fill="' + c + '"/><circle cx="12" cy="2" r="1" fill="' + c + '"/><circle cx="16" cy="3" r="1" fill="' + c + '"/><circle cx="21" cy="5" r="1" fill="' + c + '"/></svg>',
    king: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M12 2v4"/><path d="M10 4h4"/><path d="M7 21h10"/><path d="M8 21l1-5h6l1 5"/><path d="M5 8l2 8h10l2-8"/><path d="M5 8l3-2 4 3 4-3 3 2"/></svg>'
  };
  return icons[level] || icons.pawn;
}
window.getChessIcon = getChessIcon;

// getDnaColor — см. js/utils/dna.js

// ===== initProfile =====

function pfShow(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function pfHide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

async function initProfile() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  const viewId = window._viewProfileId;
  const myId = user.id;
  const isOwn = !viewId || viewId === myId;
  const profileUserId = isOwn ? myId : viewId;

  const result = await loadProfile(profileUserId);
  if (!result.data) return;
  renderProfile(result.data);

  if (isOwn) {
    pfShow('profileEditBlock');
    pfShow('profileSettingsBtn');
    pfShow('profileBalanceBlock');
    pfShow('profileVerifyBlock');
    pfHide('profileForeignActions');
  } else {
    pfHide('profileEditBlock');
    pfHide('profileSettingsBtn');
    pfHide('profileBalanceBlock');
    pfHide('profileVerifyBlock');
    pfShow('profileForeignActions');
    await checkFriendStatus(myId, profileUserId);
    window._viewProfileId = null;
  }
}

// ===== renderProfile =====

function renderProfileHeader(user, dnaColor, lvl) {
  const avatar = document.getElementById('profileAvatar');
  if (avatar) { avatar.src = user.avatar_url || ''; avatar.style.display = user.avatar_url ? '' : 'none'; }
  const ring = document.getElementById('profileDnaRing');
  if (ring) ring.style.borderColor = dnaColor;
  const chessEl = document.getElementById('profileChessIcon');
  if (chessEl) chessEl.innerHTML = getChessIcon(lvl.level, dnaColor);
  const levelEl = document.getElementById('profileLevel');
  if (levelEl) {
    const stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    levelEl.textContent = lvl.label + ' ' + stars;
  }
  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';
  const badge = document.getElementById('profileDnaBadge');
  if (badge) {
    const dnaName = DNA_NAMES[user.dna_type] || '';
    if (dnaName) {
      badge.textContent = dnaName; badge.style.background = dnaColor + '20';
      badge.style.color = dnaColor; badge.style.display = '';
    } else { badge.style.display = 'none'; }
  }
}

function renderProfileStats(user, xp, progress) {
  const balanceEl = document.getElementById('profileBalance');
  if (balanceEl) { const bal = (user.balance || 0) / 100; balanceEl.textContent = bal.toFixed(2) + ' руб.'; }
  const xpFill = document.getElementById('profileXpFill');
  if (xpFill) xpFill.style.width = progress.percent + '%';
  const xpLabel = document.getElementById('profileXpLabel');
  if (xpLabel) {
    if (progress.needed > 0) {
      xpLabel.textContent = progress.current + ' / ' + progress.needed + ' XP';
    } else {
      xpLabel.textContent = xp + ' XP (MAX)';
    }
  }
  const stats = (user.user_stats && user.user_stats[0]) || user.user_stats || {};
  let el;
  el = document.getElementById('statTasks'); if (el) el.textContent = stats.tasks_completed || 0;
  el = document.getElementById('statDeals'); if (el) el.textContent = stats.deals_count || 0;
  el = document.getElementById('statReferrals'); if (el) el.textContent = stats.referrals_count || 0;
  el = document.getElementById('statRating'); if (el) el.textContent = stats.rating || 0;
}

function renderProfileActions(user) {
  const achEl = document.getElementById('profileAchievements');
  if (achEl && user.achievements && user.achievements.length) {
    const items = user.achievements.slice(0, 6);
    achEl.innerHTML = items.map(function(a) {
      return '<div class="achievement-badge" title="' + (a.name || '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="' + (a.color || '#8b5cf6') + '" stroke-width="1.5" width="24" height="24"><path d="M6 9a6 6 0 0012 0V3H6v6z"/><path d="M12 15v3"/><path d="M8 21h8"/></svg></div>';
    }).join('');
  }
  const streak = user.streak_days || 0;
  const streakDays = document.getElementById('streakDays');
  if (streakDays) streakDays.textContent = streak + ' ' + getDaysWord(streak);
  const streakFire = document.getElementById('streakFire');
  if (streakFire) streakFire.classList.toggle('active', streak > 0);
  const mult = document.getElementById('streakMultiplier');
  if (mult) mult.textContent = 'x' + window.Gamification.getStreakMultiplier(streak);
}

function renderProfile(user) {
  const dnaColor = getDnaColor(user.dna_type);
  const xp = user.xp_total || 0;
  const lvl = window.Gamification.getUserLevel(xp);
  const progress = window.Gamification.getLevelProgress(xp);
  renderProfileHeader(user, dnaColor, lvl);
  renderProfileStats(user, xp, progress);
  renderProfileActions(user);
}

function getDaysWord(n) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last > 1 && last < 5) return 'дня';
  if (last === 1) return 'день';
  return 'дней';
}

// ===== initProfileEdit =====

function initProfileEdit() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  const nameInp = document.getElementById('editName');
  if (nameInp) nameInp.value = user.name || '';

  const bioInp = document.getElementById('editBio');
  if (bioInp) {
    bioInp.value = user.bio || '';
    const counter = document.getElementById('editBioCount');
    if (counter) counter.textContent = (user.bio || '').length;
    bioInp.addEventListener('input', function() {
      if (counter) counter.textContent = bioInp.value.length;
    });
  }

  const editAvatar = document.getElementById('editAvatar');
  if (editAvatar) {
    editAvatar.src = user.avatar_url || '';
    editAvatar.style.display = user.avatar_url ? '' : 'none';
  }

  const editRing = document.getElementById('editAvatarRing');
  if (editRing) editRing.style.borderColor = getDnaColor(user.dna_type);
}

// ===== profileSaveEdit =====

async function profileSaveEdit() {
  const nameInp = document.getElementById('editName');
  const bioInp = document.getElementById('editBio');
  const name = nameInp ? nameInp.value.trim() : '';
  const bio = bioInp ? bioInp.value.trim() : '';

  if (!name || name.length < 2) {
    showToast('Имя слишком короткое');
    return;
  }

  const result = await updateProfile({ name: name, bio: bio });
  if (result.error) {
    showToast('Ошибка сохранения');
    return;
  }
  showToast('Профиль сохранён');
  goBack();
}

// ===== profilePickAvatar =====

function profilePickAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;

    const user = getCurrentUser();
    if (!user) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = async function() {
      const size = Math.min(img.width, img.height, 500);
      canvas.width = size;
      canvas.height = size;
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

      canvas.toBlob(async function(blob) {
        const path = 'avatars/' + user.id + '/avatar.jpg';
        const uploadResult = await window.sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (uploadResult.error) { showToast('Ошибка загрузки'); return; }

        const urlData = window.sb.storage.from('avatars').getPublicUrl(path);
        const url = urlData.data.publicUrl + '?t=' + Date.now();

        await updateProfile({ avatar_url: url });

        const editAvatar = document.getElementById('editAvatar');
        if (editAvatar) { editAvatar.src = url; editAvatar.style.display = ''; }
        showToast('Фото обновлено');
      }, 'image/jpeg', 0.85);
    };
    img.src = URL.createObjectURL(file);
  };
  input.click();
}

// ===== initProfileSettings =====

function initProfileSettings() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  // Push toggle: скрыть если не поддерживается
  const pushRow = document.getElementById('pushToggleRow');
  if (pushRow) {
    pushRow.style.display = window.isPushSupported && window.isPushSupported() ? '' : 'none';
  }

  // Инициализировать состояние push toggle
  if (window.initPush) window.initPush();

  window.sb.from('user_settings').select('*').eq('user_id', user.id).single().then(function(result) {
    const settings = result.data || {};
    setToggleState('toggleMoney', settings.push_money !== false);
    setToggleState('toggleDeals', settings.push_deals !== false);
    setToggleState('toggleProgress', settings.push_progress !== false);
    setToggleState('toggleSocial', settings.push_social !== false);
  });
}

function setToggleState(id, active) {
  const el = document.getElementById(id);
  if (!el) return;
  if (active) { el.classList.add('active'); } else { el.classList.remove('active'); }
}

// ===== profileToggleSetting =====

async function profileToggleSetting(key, el) {
  const isActive = el.classList.contains('active');
  const newVal = !isActive;

  if (newVal) { el.classList.add('active'); } else { el.classList.remove('active'); }

  const user = getCurrentUser();
  if (!user) return;

  const update = {};
  update[key] = newVal;
  await window.sb.from('user_settings').update(update).eq('user_id', user.id);
}

// ===== togglePushNotifications =====

async function togglePushNotifications(el) {
  const isActive = el.classList.contains('active');

  if (isActive) {
    const ok = await window.unsubscribeFromPush();
    if (ok) el.classList.remove('active');
  } else {
    const ok = await window.subscribeToPush();
    if (ok) el.classList.add('active');
  }
}

// ===== Чужой профиль — друзья =====

async function checkFriendStatus(myId, targetId) {
  try {
    const { data: sent } = await window.sb.from('friends')
      .select('id, status')
      .eq('user_a_id', myId).eq('user_b_id', targetId)
      .maybeSingle();
    const { data: received } = await window.sb.from('friends')
      .select('id, status')
      .eq('user_a_id', targetId).eq('user_b_id', myId)
      .maybeSingle();

    if (sent?.status === 'accepted' || received?.status === 'accepted') {
      renderFriendButton('accepted', sent?.id || received?.id);
    } else if (sent?.status === 'pending') {
      renderFriendButton('pending_sent', sent.id);
    } else if (received?.status === 'pending') {
      renderFriendButton('pending_received', received.id, targetId);
    } else {
      renderFriendButton('none', null, targetId);
    }
  } catch (err) {
    console.error('checkFriendStatus error:', err);
  }
}

function renderFriendButton(status, rowId, targetId) {
  const btn = document.getElementById('profileFriendBtn');
  if (!btn) return;
  btn.className = 'prof-friend-btn';
  btn.disabled = false;
  btn.onclick = null;

  if (status === 'none') {
    btn.textContent = 'Добавить в друзья';
    btn.classList.add('prof-friend-add');
    btn.onclick = function() { profileSendFriend(targetId); };
  } else if (status === 'pending_sent') {
    btn.textContent = 'Запрос отправлен';
    btn.classList.add('prof-friend-pending');
    btn.disabled = true;
  } else if (status === 'pending_received') {
    btn.textContent = 'Принять запрос';
    btn.classList.add('prof-friend-accept');
    btn.onclick = function() { profileAcceptFriend(rowId); };
  } else if (status === 'accepted') {
    btn.textContent = 'В друзьях';
    btn.classList.add('prof-friend-accepted');
    btn.disabled = true;
  }
}

async function profileSendFriend(targetId) {
  try {
    const myId = getCurrentUser().id;
    await window.sb.from('friends').insert({
      user_a_id: myId, user_b_id: targetId
    });
    renderFriendButton('pending_sent', null);
    if (window.showToast) showToast('Запрос отправлен');
  } catch (err) {
    console.error('profileSendFriend error:', err);
  }
}

async function profileAcceptFriend(rowId) {
  try {
    await window.sb.from('friends')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', rowId);
    renderFriendButton('accepted', rowId);
    if (window.showToast) showToast('Вы теперь друзья!');
  } catch (err) {
    console.error('profileAcceptFriend error:', err);
  }
}

// ===== Экспорт =====

window.initProfile = initProfile;
window.initProfileEdit = initProfileEdit;
window.initProfileSettings = initProfileSettings;
window.profileSaveEdit = profileSaveEdit;
window.profilePickAvatar = profilePickAvatar;
window.profileToggleSetting = profileToggleSetting;
window.togglePushNotifications = togglePushNotifications;
window.profileSendFriend = profileSendFriend;
window.profileAcceptFriend = profileAcceptFriend;
