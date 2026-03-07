(function() {
'use strict';

const REACTIONS = ['👍','🔥','🤝','❤️','🥰','👎','👏'];
const EDIT_LIMIT_MS = 48 * 60 * 60 * 1000;

let overlay, container;

function getMyId() {
  return window.getCurrentUser?.()?.id || window._chatMyId?.() || null;
}

function close() {
  if (!overlay) return;
  const ov = overlay;
  const ct = container;
  overlay = null;
  container = null;
  ov.classList.remove('active');
  ct.classList.remove('active');
  setTimeout(() => { ov.remove(); ct.remove(); }, 220);
}

function buildReactions(msgId) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-ctx-bubble';
  REACTIONS.forEach(emoji => {
    const btn = document.createElement('span');
    btn.className = 'msg-ctx-emoji';
    btn.textContent = emoji;
    btn.addEventListener('click', () => { sendReaction(msgId, emoji); close(); });
    bubble.appendChild(btn);
  });
  const more = document.createElement('button');
  more.className = 'msg-ctx-more';
  more.textContent = '▾';
  bubble.appendChild(more);
  return bubble;
}

function buildMenu(msgId, isOwn, createdAt) {
  const menu = document.createElement('div');
  menu.className = 'msg-ctx-menu';
  const canEdit = isOwn &&
    (Date.now() - new Date(createdAt).getTime() < EDIT_LIMIT_MS);
  const items = [
    { label: 'Ответить',    action: () => triggerReply(msgId) },
    { label: 'Скопировать', action: () => copyText(msgId) },
    ...(canEdit ? [{ label: 'Изменить', action: () => triggerEdit(msgId) }] : []),
    { label: 'Закрепить',   action: () => pinMsg(msgId) },
    { label: 'Переслать',   action: () => forwardMsg(msgId) },
    { divider: true },
    ...(isOwn ? [{
      label: 'Удалить', danger: true, action: () => deleteMsg(msgId)
    }] : []),
    { label: 'Выбрать', action: () => selectMsg(msgId) },
  ];
  items.forEach(item => {
    if (item.divider) {
      const d = document.createElement('div');
      d.className = 'msg-ctx-divider';
      menu.appendChild(d);
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'msg-ctx-item' + (item.danger ? ' danger' : '');
    btn.innerHTML = `<span>${item.label}</span>`;
    btn.addEventListener('click', () => { item.action(); close(); });
    menu.appendChild(btn);
  });
  return menu;
}

function buildMsgClone(msgEl) {
  const clone = document.createElement('div');
  clone.className = 'msg-ctx-clone';
  clone.innerHTML = msgEl.outerHTML;
  return clone;
}

window.showCtx = function(msgEl, msgId, isOwn, createdAt) {
  if (overlay) close();

  overlay = document.createElement('div');
  overlay.className = 'msg-ctx-overlay';
  overlay.addEventListener('click', close);

  container = document.createElement('div');
  container.className = 'msg-ctx-container';

  container.appendChild(buildReactions(msgId));
  container.appendChild(buildMsgClone(msgEl));
  container.appendChild(buildMenu(msgId, isOwn, createdAt));

  document.body.appendChild(overlay);
  document.body.appendChild(container);

  requestAnimationFrame(() => {
    overlay.classList.add('active');
    container.classList.add('active');
  });
};

window.closeCtx = close;
window.showMsgContextMenu = window.showCtx;
window.closeMsgContextMenu = close;
window._ctxReady = true;

async function sendReaction(msgId, emoji) {
  await window.sb?.from?.('reactions')
    .upsert({ message_id: msgId, user_id: getMyId(), emoji },
             { onConflict: 'message_id,user_id' });
}

function copyText(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .bbl-text`);
  if (el) navigator.clipboard?.writeText(el.textContent.trim());
}

function triggerReply(msgId) {
  document.dispatchEvent(new CustomEvent('chat:reply', { detail: { msgId } }));
}

function triggerEdit(msgId) {
  document.dispatchEvent(new CustomEvent('chat:edit', { detail: { msgId } }));
}

function pinMsg(msgId) {
  document.dispatchEvent(new CustomEvent('chat:pin', { detail: { msgId } }));
}

function forwardMsg(msgId) {
  document.dispatchEvent(new CustomEvent('chat:forward', { detail: { msgId } }));
}

async function deleteMsg(msgId) {
  await window.sb?.from?.('messages').delete().eq('id', msgId);
  document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();
}

function selectMsg(msgId) {
  document.dispatchEvent(new CustomEvent('chat:select', { detail: { msgId } }));
}

})();
