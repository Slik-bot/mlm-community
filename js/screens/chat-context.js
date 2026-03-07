(function() {
'use strict';
// ═══════════════════════════════════════
// CHAT — КОНТЕКСТНОЕ МЕНЮ + РЕАКЦИИ
// Telegram-стиль: emoji bubble + action menu
// ═══════════════════════════════════════

const REACTIONS = ['\u{1F44D}','\u{1F525}','\u{1F91D}','\u{2764}\u{FE0F}','\u{1F970}','\u{1F44E}','\u{1F44F}'];
const EDIT_LIMIT_MS = 48 * 60 * 60 * 1000;

let overlay, wrap, currentMsgEl, currentMsgId;

function getOrCreate() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'msg-ctx-overlay';
  overlay.addEventListener('click', close);
  wrap = document.createElement('div');
  wrap.className = 'msg-ctx-wrap';
  document.body.append(overlay, wrap);
}

function buildReactions(msgId) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-ctx-bubble';
  REACTIONS.forEach(emoji => {
    const btn = document.createElement('span');
    btn.className = 'msg-ctx-emoji';
    btn.textContent = emoji;
    btn.addEventListener('click', () => sendReaction(msgId, emoji));
    bubble.appendChild(btn);
  });
  const more = document.createElement('button');
  more.className = 'msg-ctx-more';
  more.textContent = '\u25BC';
  bubble.appendChild(more);
  return bubble;
}

function buildMenu(msgId, isOwn, createdAt) {
  const menu = document.createElement('div');
  menu.className = 'msg-ctx-menu';
  const canEdit = isOwn && (Date.now() - new Date(createdAt).getTime() < EDIT_LIMIT_MS);
  const items = [
    { label: 'Ответить', action: () => triggerReply(msgId) },
    { label: 'Скопировать', action: () => copyText(msgId) },
    ...(canEdit ? [{ label: 'Изменить', action: () => triggerEdit(msgId) }] : []),
    { label: 'Закрепить', action: () => pinMsg(msgId) },
    { label: 'Переслать', action: () => forwardMsg(msgId) },
    { divider: true },
    ...(isOwn ? [{ label: 'Удалить', danger: true, action: () => deleteMsg(msgId) }] : []),
    { label: 'Выбрать', action: () => selectMsg(msgId) },
  ];
  items.forEach(item => {
    if (item.divider) {
      menu.appendChild(Object.assign(document.createElement('div'), { className: 'msg-ctx-divider' }));
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'msg-ctx-item' + (item.danger ? ' danger' : '');
    btn.innerHTML = '<span>' + item.label + '</span>';
    btn.addEventListener('click', () => { item.action(); close(); });
    menu.appendChild(btn);
  });
  return menu;
}

function position(el) {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 240;
  const menuH = 320;
  let left = r.left;
  let top = r.bottom + 8;
  if (left + menuW > vw - 8) left = vw - menuW - 8;
  if (left < 8) left = 8;
  if (top + menuH > vh - 8) top = r.top - menuH - 8;
  if (top < 8) top = 8;
  wrap.style.left = left + 'px';
  wrap.style.top = top + 'px';
  wrap.style.bottom = 'auto';
  wrap.style.right = 'auto';
  wrap.style.width = menuW + 'px';
}

function showCtx(msgEl, msgId, isOwn, createdAt) {
  getOrCreate();
  currentMsgEl = msgEl;
  currentMsgId = msgId;
  wrap.innerHTML = '';
  wrap.appendChild(buildReactions(msgId));
  wrap.appendChild(buildMenu(msgId, isOwn, createdAt));
  position(msgEl);
  overlay.classList.add('active');
  wrap.classList.add('active');
}

function close() {
  if (!overlay) return;
  const ov = overlay;
  const wr = wrap;
  overlay = null;
  wrap = null;
  ov.classList.remove('active');
  wr.classList.remove('active');
  setTimeout(() => {
    ov.remove();
    wr.remove();
  }, 220);
}

async function sendReaction(msgId, emoji) {
  close();
  const myId = window.getCurrentUser?.()?.id;
  if (!myId) return;
  const existing = await window.sb
    .from('reactions')
    .select('id')
    .eq('user_id', myId)
    .eq('target_type', 'message')
    .eq('target_id', msgId)
    .eq('reaction_type', emoji)
    .maybeSingle();

  if (existing.data) {
    await window.sb.from('reactions').delete().eq('id', existing.data.id);
    window.removeReactionFromBubble?.(msgId, emoji, myId);
  } else {
    await window.sb.from('reactions')
      .upsert({ user_id: myId, target_type: 'message', target_id: msgId, reaction_type: emoji });
    window.addReactionToBubble?.(msgId, emoji, null);
  }
}

function copyText(msgId) {
  const el = document.querySelector('[data-msg-id="' + msgId + '"] .bbl-text');
  if (el) navigator.clipboard?.writeText(el.textContent.trim());
  window.showToast?.('Скопировано');
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
  await window.sb.from('messages').delete().eq('id', msgId);
  document.querySelector('[data-msg-id="' + msgId + '"]')?.remove();
}

function selectMsg(msgId) {
  document.dispatchEvent(new CustomEvent('chat:select', { detail: { msgId } }));
}

// ── Экспорты ───────────────────────────
window.showCtx = showCtx;
window.closeCtx = close;
window.showMsgContextMenu = showCtx;
window.closeMsgContextMenu = close;
window._ctxReady = true;
})();
