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
    { icon: '\u21A9', label: '\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C', action: () => triggerReply(msgId) },
    { icon: '\u2A09', label: '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C', action: () => copyText(msgId) },
    ...(canEdit ? [{ icon: '\u270F\uFE0F', label: '\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C', action: () => triggerEdit(msgId) }] : []),
    { icon: '\u{1F4CC}', label: '\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C', action: () => pinMsg(msgId) },
    { icon: '\u2197', label: '\u041F\u0435\u0440\u0435\u0441\u043B\u0430\u0442\u044C', action: () => forwardMsg(msgId) },
    { divider: true },
    ...(isOwn ? [{ icon: '\u{1F5D1}', label: '\u0423\u0434\u0430\u043B\u0438\u0442\u044C', danger: true, action: () => deleteMsg(msgId) }] : []),
    { icon: '\u25CE', label: '\u0412\u044B\u0431\u0440\u0430\u0442\u044C', action: () => selectMsg(msgId) },
  ];
  items.forEach(item => {
    if (item.divider) {
      menu.appendChild(Object.assign(document.createElement('div'), { className: 'msg-ctx-divider' }));
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'msg-ctx-item' + (item.danger ? ' danger' : '');
    btn.innerHTML = '<span style="font-size:18px;width:20px;text-align:center">' + item.icon + '</span>' + item.label;
    btn.addEventListener('click', () => { item.action(); close(); });
    menu.appendChild(btn);
  });
  return menu;
}

function position(el) {
  const r = el.getBoundingClientRect();
  const wh = window.innerHeight;
  const spaceBelow = wh - r.bottom;
  wrap.style.left = Math.min(r.left, window.innerWidth - 240) + 'px';
  if (spaceBelow > 280) {
    wrap.style.top = (r.bottom + 8) + 'px';
    wrap.style.bottom = 'auto';
  } else {
    wrap.style.bottom = (wh - r.top + 8) + 'px';
    wrap.style.top = 'auto';
  }
}

function showCtx(msgEl, msgId, isOwn, createdAt) {
  console.log('[CTX] showCtx called', msgId, isOwn);
  getOrCreate();
  currentMsgEl = msgEl;
  currentMsgId = msgId;
  wrap.innerHTML = '';
  wrap.appendChild(buildReactions(msgId));
  wrap.appendChild(buildMenu(msgId, isOwn, createdAt));
  position(msgEl);
  console.log('[CTX] overlay active:', overlay.classList.contains('active'));
  console.log('[CTX] wrap style:', wrap.style.cssText);
  overlay.classList.add('active');
  wrap.classList.add('active');
}

function close() {
  overlay?.classList.remove('active');
  wrap?.classList.remove('active');
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
