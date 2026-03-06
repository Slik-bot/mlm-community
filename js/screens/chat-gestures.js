// ════════════════════════════════════════
// CHAT GESTURES — TRAFIQO
// Жесты, swipe-reply
// ════════════════════════════════════════

// ── События пузыря ─────────────────────

function bindBubbleEvents(wrapper, bbl, msg, isOut) {
  // Long-press → контекстное меню
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
  // Swipe влево → reply через swipe-manager
  const springBack = () => {
    bbl.style.transition = 'transform 280ms cubic-bezier(0.16,1,0.3,1)';
    bbl.style.transform = 'translateX(0)';
    setTimeout(() => { bbl.style.transition = ''; }, 280);
    hideReplyHint(wrapper);
  };
  const swipeReply = () => { springBack(); startReply(msg); };
  createSwipeHandler(wrapper, {
    threshold: 60, resistance: 0.5,
    onMove(shift) {
      bbl.style.transform = 'translateX(' + shift + 'px)';
      if (Math.abs(shift) >= 30) showReplyHint(wrapper, isOut);
      else hideReplyHint(wrapper);
    },
    onSwipeLeft: swipeReply,
    onCancel: springBack
  });
}

// ── Reply hint (иконка при свайпе) ────

function showReplyHint(wrapper, isOut) {
  if (wrapper.querySelector('.reply-hint')) return;
  const el = document.createElement('div');
  el.className = 'reply-hint';
  el.style.cssText = 'position:absolute;top:50%;width:24px;height:24px;'
    + 'border-radius:50%;background:rgba(139,92,246,0.15);'
    + 'display:flex;align-items:center;justify-content:center;'
    + 'transform:translateY(-50%) scale(0);transition:transform 150ms ease;'
    + (isOut ? 'right:8px' : 'left:8px');
  el.innerHTML = '<svg width="14" height="14" fill="none" stroke="#8b5cf6"'
    + ' stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">'
    + '<path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/></svg>';
  wrapper.style.position = 'relative';
  wrapper.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-50%) scale(1)';
  });
}

function hideReplyHint(wrapper) {
  const el = wrapper.querySelector('.reply-hint');
  if (!el) return;
  el.style.transform = 'translateY(-50%) scale(0)';
  setTimeout(() => el.remove(), 100);
}

// ── Свайп экрана → goBack() ──────────

let _screenSw = null;

function initChatScreenSwipe(screenEl) {
  if (_screenSw) _screenSw.destroy();
  const spring = () => {
    screenEl.style.transition = 'transform 280ms cubic-bezier(0.16,1,0.3,1)';
    screenEl.style.transform = 'translateX(0)';
    setTimeout(() => { screenEl.style.transition = ''; }, 280);
  };
  _screenSw = createSwipeHandler(screenEl, {
    threshold: 80, resistance: 0.3,
    onMove(shift) {
      if (shift <= 0) return;
      screenEl.style.transform = 'translateX(' + shift + 'px)';
    },
    onSwipeRight() { spring(); setTimeout(() => window.goBack?.(), 280); },
    onCancel: spring
  });
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
window.initChatScreenSwipe = initChatScreenSwipe;
