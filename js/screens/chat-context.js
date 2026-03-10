(function() {
'use strict';

const EDIT_LIMIT_MS = 15 * 60 * 1000; // 15 минут по ТЗ

let overlay, container;

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
  inner.classList.add('msg-ctx-clone-inner');
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
  await window.deleteMessage?.(msgId);
}

function selectMsg(msgId) {
  document.dispatchEvent(new CustomEvent('chat:select', { detail: { msgId } }));
}

})();
