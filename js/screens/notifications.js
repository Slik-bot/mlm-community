// ===== NOTIFICATIONS SCREEN — список уведомлений =====

const NOTIF_ICONS = {
  xp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  deal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 1v4M12 19v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
};

// ===== INIT =====

async function initNotifications() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  const result = await window.loadNotifications(50);
  const notifs = (result && result.data) ? result.data : [];
  renderNotifications(notifs);
}

function renderNotifications(notifs) {
  const listEl = document.getElementById('notifList');
  const emptyEl = document.getElementById('notifEmpty');
  if (!listEl) return;

  if (!notifs.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = notifs.map(function(n) {
    const icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.system;
    const unreadClass = n.is_read ? '' : ' notif-item--unread';
    const timeStr = n.created_at ? formatNotifTime(n.created_at) : '';

    return '<div class="notif-item glass-card' + unreadClass + '" onclick="markOneRead(\'' + n.id + '\', this)">' +
      '<div class="notif-item-icon">' + icon + '</div>' +
      '<div class="notif-item-body">' +
        '<div class="notif-item-text">' + notifEsc(n.message || n.title || '') + '</div>' +
        '<div class="notif-item-time">' + timeStr + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function formatNotifTime(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return mins + ' мин. назад';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' ч. назад';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function notifEsc(str) {
  if (!str) return '';
  const div = document.createElement('div');
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

  const items = document.querySelectorAll('.notif-item--unread');
  items.forEach(function(el) { el.classList.remove('notif-item--unread'); });

  updateNotifBadge();
  showToast('Все прочитано');
}

async function updateNotifBadge() {
  const user = getCurrentUser();
  if (!user) return;

  const result = await window.sb.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  const count = result.count || 0;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// ===== EXPORTS =====

window.initNotifications = initNotifications;
window.markOneRead = markOneRead;
window.markAllRead = markAllRead;
window.updateNotifBadge = updateNotifBadge;
