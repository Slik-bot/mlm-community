// ===== PROFILE SCREENS — просмотр, редактирование, настройки =====

// ===== ДНК-цвета =====

var DNA_COLORS = {
  strategist: '#3b82f6',
  communicator: '#22c55e',
  creator: '#f59e0b',
  analyst: '#a78bfa'
};

var DNA_NAMES = {
  strategist: 'Стратег',
  communicator: 'Коммуникатор',
  creator: 'Креатор',
  analyst: 'Аналитик'
};

// ===== Уровни =====

var LEVELS = {
  pawn:   { name: 'Пешка', min: 0, max: 499 },
  knight: { name: 'Конь', min: 500, max: 1999 },
  bishop: { name: 'Слон', min: 2000, max: 4999 },
  rook:   { name: 'Ладья', min: 5000, max: 14999 },
  queen:  { name: 'Ферзь', min: 15000, max: 99999 }
};

function getChessIcon(level, color) {
  var c = color || '#8b5cf6';
  var icons = {
    pawn: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M9 21h6"/><path d="M10 21v-4a2 2 0 012-2v0a2 2 0 012 2v4"/><path d="M7 21a7 7 0 010-1c0-2 2-3 5-3s5 1 5 3a7 7 0 010 1"/></svg>',
    knight: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M8 16l-1 5h10l-1-5"/><path d="M7 16c0-4 2-6 3-8l-2-3c0 0 3-2 5-2s4 2 4 5c0 4-2 6-2 8"/><circle cx="14" cy="7" r="1" fill="' + c + '"/></svg>',
    bishop: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M8 21h8"/><path d="M9 21v-1a7 7 0 016 0v1"/><path d="M12 3a5 5 0 00-3 9l1 4h4l1-4a5 5 0 00-3-9z"/><circle cx="12" cy="3" r="1" fill="' + c + '"/></svg>',
    rook: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M7 21h10"/><path d="M8 21v-2h8v2"/><path d="M9 19V9h6v10"/><path d="M7 9h10"/><path d="M7 9V5h2v2h2V5h2v2h2V5h2v4"/></svg>',
    queen: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.5"><path d="M7 21h10"/><path d="M8 21l1-5h6l1 5"/><path d="M3 6l4 10h10l4-10"/><circle cx="3" cy="5" r="1" fill="' + c + '"/><circle cx="8" cy="3" r="1" fill="' + c + '"/><circle cx="12" cy="2" r="1" fill="' + c + '"/><circle cx="16" cy="3" r="1" fill="' + c + '"/><circle cx="21" cy="5" r="1" fill="' + c + '"/></svg>'
  };
  return icons[level] || icons.pawn;
}

function getDnaColor(dnaType) {
  return DNA_COLORS[dnaType] || '#8b5cf6';
}

// ===== initProfile =====

function initProfile() {
  var user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  loadProfile(user.id).then(function(result) {
    if (result.data) {
      renderProfile(result.data);
    }
  });
}

// ===== renderProfile =====

function renderProfile(user) {
  var dnaColor = getDnaColor(user.dna_type);
  var stats = (user.user_stats && user.user_stats[0]) || user.user_stats || {};
  var level = user.level || 'pawn';
  var lvl = LEVELS[level] || LEVELS.pawn;
  var xp = user.xp_total || 0;
  var xpProgress = lvl.max > 0 ? Math.min(100, Math.round((xp - lvl.min) / (lvl.max - lvl.min + 1) * 100)) : 0;

  // Avatar
  var avatar = document.getElementById('profileAvatar');
  if (avatar) {
    avatar.src = user.avatar_url || '';
    avatar.style.display = user.avatar_url ? '' : 'none';
  }

  // DNA ring
  var ring = document.getElementById('profileDnaRing');
  if (ring) ring.style.borderColor = dnaColor;

  // Chess icon
  var chessEl = document.getElementById('profileChessIcon');
  if (chessEl) chessEl.innerHTML = getChessIcon(level, dnaColor);

  // Level name
  var levelEl = document.getElementById('profileLevel');
  if (levelEl) levelEl.textContent = lvl.name;

  // Name
  var nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';

  // DNA badge
  var badge = document.getElementById('profileDnaBadge');
  if (badge) {
    var dnaName = DNA_NAMES[user.dna_type] || '';
    if (dnaName) {
      badge.textContent = dnaName;
      badge.style.background = dnaColor + '20';
      badge.style.color = dnaColor;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  // Balance
  var balanceEl = document.getElementById('profileBalance');
  if (balanceEl) {
    var bal = (user.balance || 0) / 100;
    balanceEl.textContent = bal.toFixed(2) + ' руб.';
  }

  // XP bar
  var xpFill = document.getElementById('profileXpFill');
  if (xpFill) xpFill.style.width = xpProgress + '%';

  var xpLabel = document.getElementById('profileXpLabel');
  if (xpLabel) xpLabel.textContent = xp + ' / ' + (lvl.max + 1) + ' XP';

  // Stats
  var el;
  el = document.getElementById('statTasks'); if (el) el.textContent = stats.tasks_completed || 0;
  el = document.getElementById('statDeals'); if (el) el.textContent = stats.deals_count || 0;
  el = document.getElementById('statReferrals'); if (el) el.textContent = stats.referrals_count || 0;
  el = document.getElementById('statRating'); if (el) el.textContent = stats.rating || 0;

  // Achievements
  var achEl = document.getElementById('profileAchievements');
  if (achEl && user.achievements && user.achievements.length) {
    var html = '';
    var items = user.achievements.slice(0, 6);
    items.forEach(function(a) {
      html += '<div class="achievement-badge" title="' + (a.name || '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="' + (a.color || '#8b5cf6') + '" stroke-width="1.5" width="24" height="24"><path d="M6 9a6 6 0 0012 0V3H6v6z"/><path d="M12 15v3"/><path d="M8 21h8"/></svg>' +
        '</div>';
    });
    achEl.innerHTML = html;
  }

  // Streak
  var streak = user.streak_days || 0;
  var streakDays = document.getElementById('streakDays');
  if (streakDays) streakDays.textContent = streak + ' ' + getDaysWord(streak);

  var streakFire = document.getElementById('streakFire');
  if (streakFire) streakFire.classList.toggle('active', streak > 0);

  var mult = document.getElementById('streakMultiplier');
  if (mult) mult.textContent = 'x' + getStreakMultiplier(streak);
}

function getDaysWord(n) {
  var abs = Math.abs(n) % 100;
  var last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last > 1 && last < 5) return 'дня';
  if (last === 1) return 'день';
  return 'дней';
}

function getStreakMultiplier(days) {
  if (days >= 90) return '3.0';
  if (days >= 30) return '2.0';
  if (days >= 14) return '1.5';
  if (days >= 7) return '1.3';
  if (days >= 3) return '1.1';
  return '1.0';
}

// ===== initProfileEdit =====

function initProfileEdit() {
  var user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  var nameInp = document.getElementById('editName');
  if (nameInp) nameInp.value = user.name || '';

  var bioInp = document.getElementById('editBio');
  if (bioInp) {
    bioInp.value = user.bio || '';
    var counter = document.getElementById('editBioCount');
    if (counter) counter.textContent = (user.bio || '').length;
    bioInp.addEventListener('input', function() {
      if (counter) counter.textContent = bioInp.value.length;
    });
  }

  var editAvatar = document.getElementById('editAvatar');
  if (editAvatar) {
    editAvatar.src = user.avatar_url || '';
    editAvatar.style.display = user.avatar_url ? '' : 'none';
  }

  var editRing = document.getElementById('editAvatarRing');
  if (editRing) editRing.style.borderColor = getDnaColor(user.dna_type);
}

// ===== profileSaveEdit =====

async function profileSaveEdit() {
  var nameInp = document.getElementById('editName');
  var bioInp = document.getElementById('editBio');
  var name = nameInp ? nameInp.value.trim() : '';
  var bio = bioInp ? bioInp.value.trim() : '';

  if (!name || name.length < 2) {
    showToast('Имя слишком короткое');
    return;
  }

  var result = await updateProfile({ name: name, bio: bio });
  if (result.error) {
    showToast('Ошибка сохранения');
    return;
  }
  showToast('Профиль сохранён');
  goBack();
}

// ===== profilePickAvatar =====

function profilePickAvatar() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function() {
    var file = input.files[0];
    if (!file) return;

    var user = getCurrentUser();
    if (!user) return;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.onload = async function() {
      var size = Math.min(img.width, img.height, 500);
      canvas.width = size;
      canvas.height = size;
      var sx = (img.width - size) / 2;
      var sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

      canvas.toBlob(async function(blob) {
        var path = 'avatars/' + user.id + '/avatar.jpg';
        var uploadResult = await window.sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (uploadResult.error) { showToast('Ошибка загрузки'); return; }

        var urlData = window.sb.storage.from('avatars').getPublicUrl(path);
        var url = urlData.data.publicUrl + '?t=' + Date.now();

        await updateProfile({ avatar_url: url });

        var editAvatar = document.getElementById('editAvatar');
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
  var user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  window.sb.from('user_settings').select('*').eq('user_id', user.id).single().then(function(result) {
    var settings = result.data || {};
    setToggleState('toggleMoney', settings.push_money !== false);
    setToggleState('toggleDeals', settings.push_deals !== false);
    setToggleState('toggleProgress', settings.push_progress !== false);
    setToggleState('toggleSocial', settings.push_social !== false);
  });
}

function setToggleState(id, active) {
  var el = document.getElementById(id);
  if (!el) return;
  if (active) { el.classList.add('active'); } else { el.classList.remove('active'); }
}

// ===== profileToggleSetting =====

async function profileToggleSetting(key, el) {
  var isActive = el.classList.contains('active');
  var newVal = !isActive;

  if (newVal) { el.classList.add('active'); } else { el.classList.remove('active'); }

  var user = getCurrentUser();
  if (!user) return;

  var update = {};
  update[key] = newVal;
  await window.sb.from('user_settings').update(update).eq('user_id', user.id);
}

// ===== Toast =====

function showToast(msg) {
  var existing = document.querySelector('.profile-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'profile-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(function() { toast.classList.add('show'); });
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}

// ===== Экспорт =====

window.initProfile = initProfile;
window.initProfileEdit = initProfileEdit;
window.initProfileSettings = initProfileSettings;
window.profileSaveEdit = profileSaveEdit;
window.profilePickAvatar = profilePickAvatar;
window.profileToggleSetting = profileToggleSetting;
