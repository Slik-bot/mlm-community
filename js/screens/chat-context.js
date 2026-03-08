(function() {
'use strict';

const REACTIONS = ['👍','🔥','🤝','❤️','🥰','👎','👏'];
const EDIT_LIMIT_MS = 15 * 60 * 1000; // 15 минут по ТЗ

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
    let reacted = false;
    const onReact = (e) => {
      console.error('[RX] onReact fired, reacted:', reacted);
      e.stopPropagation();
      e.preventDefault();
      if (reacted) return;
      reacted = true;
      flyEmoji(emoji, btn, msgEl);
      sendReaction(msgId, emoji);
      close();
    };
    btn.addEventListener('touchend', onReact, { passive: false });
    btn.addEventListener('click', onReact);
    bubble.appendChild(btn);
  });
  return bubble;
}

function flyEmoji(emoji, fromEl, msgEl) {
  console.error('[RX] flyEmoji called, msgEl:', msgEl?.className, 'in DOM:', document.body.contains(msgEl));
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
    console.error('[RX] setTimeout 600ms fired');
    main.remove();
    showReactionBadge(msgEl, emoji);
  }, 600);
}

function showReactionBadge(msgEl, emoji) {
  const msgWrapper = msgEl.closest('.msg') || msgEl.parentElement;
  let rxRow = msgWrapper.querySelector('.bbl-reactions');
  if (!rxRow) {
    rxRow = document.createElement('div');
    rxRow.className = 'bbl-reactions';
    msgWrapper.appendChild(rxRow);
  }
  let pill = rxRow.querySelector(`[data-emoji="${emoji}"]`);
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'rx-pill';
    pill.dataset.emoji = emoji;
    pill.dataset.count = '1';
    pill.innerHTML = `${emoji} <span class="rx-cnt">1</span>`;
    rxRow.appendChild(pill);
    console.error('[RX] pill appended, parent in DOM:', document.body.contains(msgEl), 'msgEl:', msgEl.className);
    setTimeout(() => console.error('[RX] pill after 1s, exists:', document.body.contains(msgEl)), 1000);
    requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('pop')));
  } else {
    const cnt = pill.querySelector('.rx-cnt');
    const count = parseInt(pill.dataset.count || '1') + 1;
    pill.dataset.count = String(count);
    if (cnt) cnt.textContent = String(count);
    pill.classList.remove('pop');
    setTimeout(() => pill.classList.add('pop'), 50);
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
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  container = document.createElement('div');
  container.className = 'msg-ctx-container';

  // container.appendChild(buildReactions(msgId, msgEl)); // temp: отключено до переработки
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
window.showReactionBadge = showReactionBadge;

async function sendReaction(msgId, emoji) {
  const uid = getMyId();
  if (!uid || !window.sb) return;
  try {
    await window.sb.from('reactions').upsert(
      {
        user_id: uid,
        target_type: 'message',
        target_id: msgId,
        reaction_type: emoji
      },
      { onConflict: 'user_id,target_id,target_type' }
    );
  } catch (err) {
    console.error('[RX] sendReaction error:', err);
  }
}

function showCopyHint(msgId) {
  const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) return;
  const rect = msgEl.getBoundingClientRect();
  const hint = document.createElement('div');
  hint.className = 'copy-hint';
  hint.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Скопировано`;
  document.body.appendChild(hint);
  const hintW = 160;
  const left = Math.min(rect.left + rect.width / 2 - hintW / 2, window.innerWidth - hintW - 16);
  hint.style.left = Math.max(16, left) + 'px';
  hint.style.top = (rect.top - 44 + window.scrollY) + 'px';
  requestAnimationFrame(() => requestAnimationFrame(() => hint.classList.add('show')));
  setTimeout(() => {
    hint.classList.add('hide');
    setTimeout(() => hint.remove(), 220);
  }, 600);
}

function copyText(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .bbl-text`);
  if (el) {
    navigator.clipboard?.writeText(el.textContent.trim());
    showCopyHint(msgId);
  }
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
