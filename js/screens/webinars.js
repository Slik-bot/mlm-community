// ===== WEBINARS SCREENS — список вебинаров, детали =====

let currentWebinar = null;
let allWebinars = [];
let webinarTab = 'upcoming';
let webinarTimerInterval = null;

function wbnFormatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function wbnFormatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function getWebinarStatus(w) {
  const now = Date.now();
  const start = new Date(w.starts_at).getTime();
  const end = new Date(w.ends_at).getTime();
  if (start > now) return { label: 'Скоро', color: '#3b82f6', key: 'upcoming' };
  if (end >= now) return { label: 'В эфире', color: '#22c55e', key: 'live' };
  return { label: 'Завершён', color: 'rgba(255,255,255,0.3)', key: 'past' };
}

// ===== WEBINARS LIST =====

function initWebinars() {
  webinarTab = 'upcoming';
  updateWebinarTabUI();
  loadWebinars();
}

async function loadWebinars() {
  try {
    const result = await window.sb.from('webinars')
      .select('*, host:users!webinars_host_id_fkey(id, name, avatar_url, dna_type, level), regs:webinar_registrations(user_id)')
      .order('starts_at', { ascending: false });

    if (result.error) throw result.error;
    allWebinars = result.data || [];
    filterAndRenderWebinars();
  } catch (err) {
    console.error('Load webinars error:', err);
    if (window.showToast) showToast('Ошибка загрузки вебинаров');
  }
}

function filterAndRenderWebinars() {
  const now = Date.now();
  const filtered = allWebinars.filter(function(w) {
    const start = new Date(w.starts_at).getTime();
    const end = new Date(w.ends_at).getTime();
    if (webinarTab === 'upcoming') return start > now;
    if (webinarTab === 'live') return start <= now && end >= now;
    return end < now;
  });
  renderWebinarsList(filtered);
}

function renderWebinarsList(webinars) {
  const list = document.getElementById('wbnList');
  const empty = document.getElementById('wbnEmpty');
  if (!list) return;

  if (!webinars.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = webinars.map(function(w) {
    const status = getWebinarStatus(w);
    const host = w.host || {};
    const regCount = w.regs ? w.regs.length : 0;

    return '<div class="wbn-card glass-card" onclick="openWebinar(\'' + w.id + '\')">' +
      '<div class="wbn-card-top">' +
        '<span class="wbn-card-status" style="background:' + status.color + '22;color:' + status.color + '">' + status.label + '</span>' +
        '<span class="wbn-card-date">' + wbnFormatDate(w.starts_at) + '</span>' +
      '</div>' +
      '<div class="wbn-card-title">' + escHtml(w.title) + '</div>' +
      '<div class="wbn-card-host">' +
        '<img class="wbn-card-avatar" src="' + (host.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<span class="wbn-card-host-name">' + escHtml(host.name || 'Спикер') + '</span>' +
      '</div>' +
      '<div class="wbn-card-footer">' +
        '<span class="wbn-card-time">' + wbnFormatTime(w.starts_at) + '</span>' +
        '<span class="wbn-card-regs">' + regCount + ' участников</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function switchWebinarTab(tab) {
  webinarTab = tab;
  updateWebinarTabUI();
  filterAndRenderWebinars();
}

function updateWebinarTabUI() {
  const btns = document.querySelectorAll('#wbnTabs .wbn-tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === webinarTab);
  });
}

function openWebinar(webinarId) {
  currentWebinar = allWebinars.find(function(w) { return w.id === webinarId; });
  if (currentWebinar) goTo('scrWebinarDetail');
}

// ===== WEBINAR DETAIL =====

function initWebinarDetail() {
  if (!currentWebinar) { goBack(); return; }

  const status = getWebinarStatus(currentWebinar);
  const badge = document.getElementById('wdStatusBadge');
  if (badge) {
    badge.textContent = status.label;
    badge.style.background = status.color + '22';
    badge.style.color = status.color;
  }

  const titleEl = document.getElementById('wdTitle');
  if (titleEl) titleEl.textContent = currentWebinar.title;

  const descEl = document.getElementById('wdDesc');
  if (descEl) descEl.textContent = currentWebinar.description || '';

  renderWebinarTimer();
  renderWebinarHost();
  renderWebinarInfo();
  loadWebinarParticipants();
  loadMyRegistration();
}

function renderWebinarTimer() {
  const now = Date.now();
  const start = new Date(currentWebinar.starts_at).getTime();
  const end = new Date(currentWebinar.ends_at).getTime();
  const timer = document.getElementById('wdTimer');
  if (!timer) return;

  if (start <= now && end >= now) {
    timer.innerHTML = '<div class="wd-live-badge">В эфире</div>';
    return;
  }
  if (end < now) {
    timer.innerHTML = '<div class="wd-finished-label">Завершён</div>';
    return;
  }
  startWebinarTimer(start);
}

function startWebinarTimer(startsAt) {
  if (webinarTimerInterval) clearInterval(webinarTimerInterval);

  function updateTimer() {
    const diff = startsAt - Date.now();
    if (diff <= 0) {
      clearInterval(webinarTimerInterval);
      const timer = document.getElementById('wdTimer');
      if (timer) timer.innerHTML = '<div class="wd-live-badge">В эфире</div>';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const dEl = document.getElementById('wdTimerDays');
    const hEl = document.getElementById('wdTimerHours');
    const mEl = document.getElementById('wdTimerMins');
    if (dEl) dEl.textContent = String(days).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
  }

  updateTimer();
  webinarTimerInterval = setInterval(updateTimer, 60000);
}

function renderWebinarHost() {
  const host = currentWebinar.host || {};
  const avatarEl = document.getElementById('wdHostAvatar');
  if (avatarEl) avatarEl.src = host.avatar_url || 'assets/default-avatar.svg';

  const nameEl = document.getElementById('wdHostName');
  if (nameEl) nameEl.textContent = host.name || 'Спикер';

  const levelEl = document.getElementById('wdHostLevel');
  if (levelEl) levelEl.textContent = 'Ур. ' + (host.level || 1);
}

function renderWebinarInfo() {
  const dateEl = document.getElementById('wdDate');
  if (dateEl) dateEl.textContent = wbnFormatDate(currentWebinar.starts_at);

  const timeEl = document.getElementById('wdTime');
  if (timeEl) {
    timeEl.textContent = wbnFormatTime(currentWebinar.starts_at) + ' — ' + wbnFormatTime(currentWebinar.ends_at);
  }

  const partEl = document.getElementById('wdParticipants');
  if (partEl) {
    const max = currentWebinar.max_participants;
    const count = currentWebinar.regs ? currentWebinar.regs.length : 0;
    partEl.textContent = max ? count + ' / ' + max : count + ' участников';
  }
}

async function loadWebinarParticipants() {
  try {
    const result = await window.sb.from('webinar_registrations')
      .select('*, user:users!webinar_registrations_user_id_fkey(id, name, avatar_url, level)')
      .eq('webinar_id', currentWebinar.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (result.error) throw result.error;
    renderWebinarParticipants(result.data || []);
  } catch (err) {
    console.error('Load webinar participants error:', err);
  }
}

function renderWebinarParticipants(participants) {
  const el = document.getElementById('wdPartList');
  if (!el) return;

  if (!participants.length) {
    el.innerHTML = '<div class="wd-part-empty">Пока нет участников</div>';
    return;
  }

  el.innerHTML = participants.map(function(p) {
    const user = p.user || {};
    return '<div class="wd-part-row">' +
      '<img class="wd-part-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<span class="wd-part-name">' + escHtml(user.name || 'Участник') + '</span>' +
      '<span class="wd-part-level">Ур. ' + (user.level || 1) + '</span>' +
    '</div>';
  }).join('');
}

async function loadMyRegistration() {
  const actionWrap = document.getElementById('wdActionWrap');
  const actionBtn = document.getElementById('wdActionBtn');
  if (!window.currentUser || !currentWebinar) return;

  try {
    const result = await window.sb.from('webinar_registrations')
      .select('id')
      .eq('webinar_id', currentWebinar.id)
      .eq('user_id', window.currentUser.id)
      .maybeSingle();

    if (result.error) throw result.error;

    const now = Date.now();
    const end = new Date(currentWebinar.ends_at).getTime();
    const start = new Date(currentWebinar.starts_at).getTime();

    if (end < now) {
      if (actionWrap) actionWrap.classList.add('hidden');
      return;
    }

    if (result.data) {
      if (actionBtn) {
        if (start <= now && currentWebinar.link) {
          actionBtn.textContent = 'Перейти к эфиру';
          actionBtn.onclick = function() { window.open(currentWebinar.link, '_blank'); };
        } else {
          actionBtn.textContent = 'Вы записаны';
          actionBtn.disabled = true;
        }
      }
    } else {
      if (actionBtn) {
        actionBtn.textContent = 'Записаться';
        actionBtn.disabled = false;
        actionBtn.onclick = webinarRegister;
      }
    }
  } catch (err) {
    console.error('Check registration error:', err);
  }
}

async function webinarRegister() {
  if (!currentWebinar || !window.currentUser) return;

  const btn = document.getElementById('wdActionBtn');
  if (btn) btn.disabled = true;

  try {
    const result = await window.sb.from('webinar_registrations').insert({
      webinar_id: currentWebinar.id,
      user_id: window.currentUser.id
    });

    if (result.error) throw result.error;
    if (window.showToast) showToast('Вы записаны на вебинар!');
    if (btn) btn.textContent = 'Вы записаны';
    loadWebinarParticipants();
  } catch (err) {
    console.error('Webinar register error:', err);
    if (window.showToast) showToast('Ошибка записи');
    if (btn) btn.disabled = false;
  }
}

function webinarAction() {
  webinarRegister();
}

function webinarsCleanup() {
  if (webinarTimerInterval) {
    clearInterval(webinarTimerInterval);
    webinarTimerInterval = null;
  }
}

// ===== EXPORTS =====
window.initWebinars = initWebinars;
window.initWebinarDetail = initWebinarDetail;
window.switchWebinarTab = switchWebinarTab;
window.openWebinar = openWebinar;
window.webinarAction = webinarAction;
window.webinarRegister = webinarRegister;
window.webinarsCleanup = webinarsCleanup;
