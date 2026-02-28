// ===== NOTIFICATIONS SCREEN — список уведомлений =====

const NOTIF_ICONS = {
  xp_earned: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    color: '#f59e0b'
  },
  level_up: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 2l2 4h3l-2.5 3L16 14H8l1.5-5L7 6h3l2-4z"/><rect x="7" y="16" width="10" height="2" rx="1"/><rect x="6" y="20" width="12" height="2" rx="1"/></svg>',
    color: '#8b5cf6'
  },
  like: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
    color: '#ef4444'
  },
  comment: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    color: '#3b82f6'
  },
  referral: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    color: '#22c55e'
  },
  task_approved: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',
    color: '#22c55e'
  },
  task_rejected: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    color: '#ef4444'
  },
  withdrawal: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    color: '#22c55e'
  },
  strike: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    color: '#ef4444'
  },
  system: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    color: '#8b5cf6'
  },
  deal: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10H5a7 7 0 0014 0z"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
    color: '#f59e0b'
  },
  chat: {
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    color: '#3b82f6'
  }
};

// ===== INIT =====

async function initNotifications() {
  constuser = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  showNotifSkeleton();
  updateNotifBadge();

  constresult = await window.loadNotifications(50);
  constnotifs = (result && result.data) ? result.data : [];

  hideNotifSkeleton();
  renderNotifications(notifs);
}

function showNotifSkeleton() {
  constskel = document.getElementById('notifSkeleton');
  constlist = document.getElementById('notifList');
  constempty = document.getElementById('notifEmpty');
  if (skel) skel.classList.remove('hidden');
  if (list) list.classList.add('hidden');
  if (empty) empty.classList.add('hidden');
}

function hideNotifSkeleton() {
  constskel = document.getElementById('notifSkeleton');
  constlist = document.getElementById('notifList');
  if (skel) skel.classList.add('hidden');
  if (list) list.classList.remove('hidden');
}

function renderNotifications(notifs) {
  constlistEl = document.getElementById('notifList');
  constemptyEl = document.getElementById('notifEmpty');
  if (!listEl) return;

  if (!notifs.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = notifs.map(function(n, i) {
    consticonData = NOTIF_ICONS[n.type] || NOTIF_ICONS.system;
    constunreadClass = n.is_read ? '' : ' notif-item--unread';
    consttypeClass = ' notif-type--' + (n.type || 'system');
    consttimeStr = n.created_at ? formatNotifTime(n.created_at) : '';
    consttitle = notifEsc(n.title || '');
    constbody = notifEsc(n.body || n.message || '');

    return '<div class="notif-item glass-card' + unreadClass + typeClass + '" style="animation-delay:' + (i * 40) + 'ms" onclick="markOneRead(\'' + n.id + '\', this)">' +
      '<div class="notif-item-icon" style="color:' + iconData.color + ';background:' + iconData.color + '14">' + iconData.svg + '</div>' +
      '<div class="notif-item-body">' +
        (title ? '<div class="notif-item-title">' + title + '</div>' : '') +
        (body ? '<div class="notif-item-text">' + body + '</div>' : '') +
        '<div class="notif-item-time">' + timeStr + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function formatNotifTime(isoStr) {
  constd = new Date(isoStr);
  constnow = new Date();
  constdiff = now - d;
  constmins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return mins + ' мин. назад';
  consthours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' ч. назад';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function notifEsc(str) {
  if (!str) return '';
  constdiv = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== ACTIONS =====

async function markOneRead(notifId, el) {
  if (el) el.classList.remove('notif-item--unread');

  await window.sb.from('notifications')
    .update({ is_read: true })
    .eq('id', notifId);

  updateNotifBadge();
}

async function markAllRead() {
  if (window.markNotificationsRead) {
    await window.markNotificationsRead();
  }

  constitems = document.querySelectorAll('.notif-item--unread');
  items.forEach(function(el) { el.classList.remove('notif-item--unread'); });

  updateNotifBadge();
  showToast('Все прочитано');
}

async function updateNotifBadge() {
  constuser = getCurrentUser();
  if (!user) return;

  constresult = await window.sb.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  constcount = result.count || 0;

  constbadges = document.querySelectorAll('.notif-badge');
  badges.forEach(function(badge) {
    badge.textContent = count > 99 ? '99+' : count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });

  // Legacy support for #notifBadge
  constlegacyBadge = document.getElementById('notifBadge');
  if (legacyBadge) {
    legacyBadge.textContent = count > 99 ? '99+' : count;
    if (count > 0) {
      legacyBadge.classList.remove('hidden');
    } else {
      legacyBadge.classList.add('hidden');
    }
  }
}

// ===== EXPORTS =====

window.initNotifications = initNotifications;
window.markOneRead = markOneRead;
window.markAllRead = markAllRead;
window.updateNotifBadge = updateNotifBadge;
