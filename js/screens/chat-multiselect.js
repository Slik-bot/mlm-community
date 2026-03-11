// ═══════════════════════════════════════
// МУЛЬТИСЕЛЕКТ СООБЩЕНИЙ
// ═══════════════════════════════════════
const _selected = new Set();
let _active = false;

function enterSelectMode(firstMsgId) {
  _active = true;
  _selected.clear();
  const scr = document.getElementById('scrChat');
  scr?.classList.add('selecting');
  _toggleMsg(firstMsgId, true);
  _updateCount();
  _bindEvents();
}

function exitSelectMode() {
  _active = false;
  _selected.clear();
  document.getElementById('scrChat')
    ?.classList.remove('selecting');
  document.querySelectorAll('.msg.selected')
    .forEach(el => el.classList.remove('selected'));
  _updateCount();
}

function _toggleMsg(msgId, force) {
  const el = document.querySelector(
    '.msg[data-msg-id="' + msgId + '"]'
  );
  if (!el) return;
  const on = force ?? !_selected.has(msgId);
  if (on) {
    _selected.add(msgId);
    el.classList.add('selected');
  } else {
    _selected.delete(msgId);
    el.classList.remove('selected');
  }
  _updateCount();
}

function _updateCount() {
  const el = document.getElementById('selCount');
  if (el) el.textContent =
    'Выбрано: ' + _selected.size;
}

function _bindEvents() {
  document.getElementById('chatMessages')
    ?.addEventListener('click', _onMsgClick);
  document.getElementById('selCancel')
    ?.addEventListener('click', exitSelectMode);
  document.getElementById('selForward')
    ?.addEventListener('click', _onForward);
  document.getElementById('selCopy')
    ?.addEventListener('click', _onCopy);
  document.getElementById('selDelete')
    ?.addEventListener('click', _onDelete);
}

function _onMsgClick(e) {
  if (!_active) return;
  const msg = e.target.closest('.msg');
  if (!msg) return;
  _toggleMsg(msg.dataset.msgId);
}

function _onForward() {
  const ids = [..._selected];
  exitSelectMode();
  window.showFwdSheet?.(ids[0]);
}

function _onCopy() {
  const texts = [..._selected].map(id => {
    const el = document.querySelector(
      '.msg[data-msg-id="' + id + '"]'
    );
    return el?.querySelector('.bbl-text')
      ?.textContent ?? '';
  }).filter(Boolean).join('\n---\n');
  navigator.clipboard?.writeText(texts);
  window.showToast?.('Скопировано');
  exitSelectMode();
}

async function _onDelete() {
  if (!_selected.size) return;
  const ids = [..._selected];
  exitSelectMode();
  for (const id of ids) {
    await window.sb?.from('messages')
      .update({ is_deleted: true })
      .eq('id', id);
    document.querySelector(
      '.msg[data-msg-id="' + id + '"]'
    )?.remove();
  }
}

// Слушатель заглушки
document.addEventListener('chat:select', e => {
  enterSelectMode(e.detail?.msgId);
});

window.exitSelectMode = exitSelectMode;
