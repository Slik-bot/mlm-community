// ════════════════════════════════════════
// CHAT GESTURES — TRAFIQO
// Жесты, swipe-reply
// ════════════════════════════════════════

// ── События пузыря ─────────────────────

function bindBubbleEvents(wrapper, bbl, msg, isOut) {
  let pressTimer = null;
  let lastTouch = null;
  bbl.addEventListener('touchstart', (e) => {
    lastTouch = e.touches[0];
    pressTimer = setTimeout(() => {
      window.showMsgContextMenu(msg, isOut, lastTouch);
    }, 420);
  }, { passive: true });
  bbl.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
  bbl.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });
  bbl.addEventListener('mousedown', (e) => {
    lastTouch = { clientX: e.clientX, clientY: e.clientY };
    pressTimer = setTimeout(() => {
      window.showMsgContextMenu(msg, isOut, lastTouch);
    }, 420);
  });
  bbl.addEventListener('mouseup', () => clearTimeout(pressTimer));
  let swipeStartX = 0;
  wrapper.addEventListener('touchstart', e => {
    swipeStartX = e.touches[0].clientX;
  }, { passive: true });
  wrapper.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (dx > 60) startReply(msg);
  }, { passive: true });
}

// ── Reply ──────────────────────────────

function startReply(msg) {
  window.setChatReplyTo(msg);
  const bar = document.getElementById('chatReplyBar');
  const txt = document.getElementById('chatReplyText');
  if (bar && txt) {
    txt.textContent = msg.content?.slice(0, 60) || '';
    bar.classList.remove('hidden');
    document.getElementById('chatInput')?.focus();
  }
}

function cancelReply() {
  window.setChatReplyTo(null);
  document.getElementById('chatReplyBar')?.classList.add('hidden');
}

// ── Экспорты ───────────────────────────

window.bindBubbleEvents = bindBubbleEvents;
window.startReply = startReply;
window.cancelReply = cancelReply;
