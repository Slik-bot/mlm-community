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

function buildReactions(msgId, msgEl) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-ctx-bubble';
  REACTIONS.forEach(emoji => {
    const btn = document.createElement('span');
    btn.className = 'msg-ctx-emoji';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      flyEmoji(emoji, btn, msgEl);
      sendReaction(msgId, emoji);
      close();
    });
    bubble.appendChild(btn);
  });
  return bubble;
}

function flyEmoji(emoji, fromEl, msgEl) {
  const from = fromEl.getBoundingClientRect();
  const row = msgEl.closest('.msg') || msgEl.parentElement;
  const to = row ? row.getBoundingClientRect() : from;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'emoji-burst';
    el.textContent = emoji;
    const angle = (360 / count) * i;
    const dist = 40 + Math.random() * 30;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    el.style.cssText = `left:${cx}px;top:${cy}px;
      --tx:${tx}px;--ty:${ty}px;
      --delay:${i * 20}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  const main = document.createElement('span');
  main.className = 'emoji-burst main';
  main.textContent = emoji;
  main.style.cssText = `left:${cx}px;top:${cy}px;
    --tx:${to.left + to.width/2 - cx}px;
    --ty:${to.top + to.height/2 - cy}px;
    --delay:0ms`;
  document.body.appendChild(main);
  setTimeout(() => {
    main.remove();
    showReactionBadge(msgEl, emoji);
  }, 600);
}

function showReactionBadge(msgEl, emoji) {
  let badge = msgEl.querySelector(`.bbl-rx[data-emoji="${emoji}"]`);
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'bbl-rx';
    badge.dataset.emoji = emoji;
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji;
    const cnt = document.createElement('span');
    cnt.className = 'rx-cnt';
    cnt.textContent = '1';
    badge.appendChild(emojiSpan);
    badge.appendChild(cnt);
    const meta = msgEl.querySelector('.bbl-meta');
    if (meta) msgEl.insertBefore(badge, meta);
    else msgEl.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add('pop'));
  } else {
    const cnt = badge.querySelector('.rx-cnt');
    const count = parseInt(cnt?.textContent || '1') + 1;
    if (cnt) cnt.textContent = String(count);
    badge.classList.remove('pop');
    requestAnimationFrame(() => badge.classList.add('pop'));
  }
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
  const msgRow = msgEl.closest('.msg') || msgEl.parentElement;
  const clone = document.createElement('div');
  clone.className = 'msg-ctx-clone';
  const inner = (msgRow || msgEl).cloneNode(true);
  inner.style.pointerEvents = 'none';
  inner.style.maxWidth = '100%';
  clone.appendChild(inner);
  return clone;
}

window.showCtx = function(msgEl, msgId, isOwn, createdAt) {
  if (overlay) close();

  overlay = document.createElement('div');
  overlay.className = 'msg-ctx-overlay';
  overlay.addEventListener('click', close);

  container = document.createElement('div');
  container.className = 'msg-ctx-container';

  container.appendChild(buildReactions(msgId, msgEl));
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
