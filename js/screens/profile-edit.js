// ═══════════════════════════════════════
// PROFILE — РЕДАКТИРОВАНИЕ И НАСТРОЙКИ
// Отделено от profile.js
// ═══════════════════════════════════════

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

  const cityInp = document.getElementById('editCity');
  if (cityInp) cityInp.value = user.city || '';
  loadSocials(user.id);
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

  const cityInp = document.getElementById('editCity');
  const city = cityInp ? cityInp.value.trim() : '';
  const result = await updateProfile({ name: name, bio: bio, city: city });
  if (result.error) {
    showToast('Ошибка сохранения');
    return;
  }
  await saveSocials(getCurrentUser().id);
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

  const pushRow = document.getElementById('pushToggleRow');
  if (pushRow) {
    pushRow.style.display = window.isPushSupported && window.isPushSupported() ? '' : 'none';
  }

  if (window.initPush) window.initPush();

  window.sb.from('user_settings').select('*').eq('user_id', user.id).single().then(function(result) {
    const settings = result.data || {};
    setToggleState('toggleMoney', settings.push_money !== false);
    setToggleState('toggleDeals', settings.push_deals !== false);
    setToggleState('toggleProgress', settings.push_progress !== false);
    setToggleState('toggleSocial', settings.push_social !== false);
    const lang = settings.language || 'ru';
    const btns = document.querySelectorAll('#langSwitcher .lang-btn');
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.lang === lang); });
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

// ===== Язык интерфейса =====

async function profileSetLanguage(lang, el) {
  const btns = document.querySelectorAll('#langSwitcher .lang-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  const user = getCurrentUser();
  if (user) await window.sb.from('user_settings').update({ language: lang }).eq('user_id', user.id);
}

// ===== Соцсети — загрузка / сохранение =====

const SOCIAL_MAP = [
  { key: 'telegram', id: 'socialTelegram' }, { key: 'instagram', id: 'socialInstagram' },
  { key: 'youtube', id: 'socialYoutube' }, { key: 'tiktok', id: 'socialTiktok' },
  { key: 'vk', id: 'socialVk' }
];

async function loadSocials(userId) {
  const res = await window.sb.from('social_links').select('platform, url').eq('user_id', userId);
  if (!res.data) return;
  res.data.forEach(function(s) {
    const m = SOCIAL_MAP.find(function(x) { return x.key === s.platform; });
    if (m) { const inp = document.getElementById(m.id); if (inp) inp.value = s.url || ''; }
  });
}

async function saveSocials(userId) {
  for (let i = 0; i < SOCIAL_MAP.length; i++) {
    const p = SOCIAL_MAP[i];
    const inp = document.getElementById(p.id);
    const val = inp ? inp.value.trim() : '';
    if (val) {
      await window.sb.from('social_links').upsert(
        { user_id: userId, platform: p.key, url: val, is_verified: false },
        { onConflict: 'user_id, platform' }
      );
    } else {
      await window.sb.from('social_links').delete().eq('user_id', userId).eq('platform', p.key);
    }
  }
}

// ЭКСПОРТЫ
window.initProfileEdit = initProfileEdit;
window.initProfileSettings = initProfileSettings;
window.profileSaveEdit = profileSaveEdit;
window.profilePickAvatar = profilePickAvatar;
window.profileToggleSetting = profileToggleSetting;
window.togglePushNotifications = togglePushNotifications;
window.profileSetLanguage = profileSetLanguage;
