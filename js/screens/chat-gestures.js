// ════════════════════════════════════════
// CHAT GESTURES — TRAFIQO
// Единый gesture-менеджер для экрана чата
// ════════════════════════════════════════

// ── Константы ──────────────────────────

const REPLY_THRESHOLD = 60;
const BACK_THRESHOLD = 80;
const REPLY_RESISTANCE = 0.5;
const BACK_RESISTANCE = 0.3;

// ── Состояние жеста ────────────────────

let _gestureMode = null;
let _gestureBbl = null;
let _gestureMsg = null;
let _gestureWrapper = null;
let _screenEl = null;
let _swHandler = null;
let _hintShown = false;

// ── Единый обработчик ──────────────────

function initChatGestures(screenEl) {
  if (_swHandler) _swHandler.destroy();
  _screenEl = screenEl;
  _swHandler = createSwipeHandler(screenEl, {
    threshold: 1,
    resistance: 1,
    onMove(shift) { handleGestureMove(shift); },
    onSwipeLeft(dx) { handleGestureEnd('left', dx); },
    onSwipeRight(dx) { handleGestureEnd('right', dx); },
    onCancel() { handleGestureCancel(); }
  });
  screenEl.addEventListener('touchstart', (e) => {
    const wrapper = e.target.closest('.msg');
    if (wrapper && wrapper.closest('#chatMessages')) {
      _gestureMode = 'bubble';
      _gestureWrapper = wrapper;
      _gestureBbl = wrapper.querySelector('.bbl');
      _gestureMsg = _gestureBbl?._msg || null;
    } else {
      _gestureMode = 'screen';
    }
    _hintShown = false;
  }, { passive: true });
}

// ── Движение ───────────────────────────

function handleGestureMove(shift) {
  if (_gestureMode === 'bubble') {
    if (shift >= 0) return;
    const s = shift * REPLY_RESISTANCE;
    if (_gestureBbl) _gestureBbl.style.transform = 'translateX(' + s + 'px)';
    const hint = _gestureWrapper?.querySelector('.reply-hint');
    if (hint) {
      hint.style.transform =
        'translateY(-50%) translateX(' + (-s * 0.6) + 'px)';
    }
    if (Math.abs(s) >= 30 && !_hintShown) {
      const isOut = _gestureWrapper?.classList.contains('msg-out');
      showReplyHint(_gestureWrapper, isOut);
      haptic('light');
      _hintShown = true;
      requestAnimationFrame(() => {
        const h = _gestureWrapper?.querySelector('.reply-hint');
        if (!h) return;
        h.style.transition =
          'transform 150ms cubic-bezier(0.16,1,0.3,1)';
        h.style.transform = 'translateY(-50%) scale(1.3)';
        setTimeout(() => {
          h.style.transform = 'translateY(-50%) scale(1)';
          setTimeout(() => { h.style.transition = ''; }, 150);
        }, 150);
      });
    } else if (Math.abs(s) < 30 && _hintShown) {
      hideReplyHint(_gestureWrapper);
      _hintShown = false;
    }
  } else if (_gestureMode === 'screen') {
    if (shift <= 0) return;
    const s = shift * BACK_RESISTANCE;
    if (_screenEl) _screenEl.style.transform = 'translateX(' + s + 'px)';
  }
}

// ── Завершение свайпа ──────────────────

function handleGestureEnd(dir, dx) {
  if (_gestureMode === 'bubble' && dir === 'left') {
    springBack(_gestureBbl);
    hideReplyHint(_gestureWrapper);
    if (Math.abs(dx) >= REPLY_THRESHOLD) {
      haptic('medium');
      startReply(_gestureMsg);
    }
  } else if (_gestureMode === 'screen' && dir === 'right') {
    springBackScreen();
    if (dx >= BACK_THRESHOLD) {
      setTimeout(() => window.goBack?.(), 200);
    }
  } else {
    handleGestureCancel();
  }
  resetGesture();
}

// ── Отмена ─────────────────────────────

function handleGestureCancel() {
  if (_gestureMode === 'bubble') {
    springBack(_gestureBbl);
    hideReplyHint(_gestureWrapper);
  } else if (_gestureMode === 'screen') {
    springBackScreen();
  }
  resetGesture();
}

// ── Spring-анимации ────────────────────

function springBack(bbl) {
  if (!bbl) return;
  bbl.style.transition = 'transform 200ms cubic-bezier(0.16,1,0.3,1)';
  bbl.style.transform = 'translateX(0)';
  setTimeout(() => { bbl.style.transition = ''; }, 200);
}

function springBackScreen() {
  if (!_screenEl) return;
  _screenEl.style.transition = 'transform 200ms cubic-bezier(0.16,1,0.3,1)';
  _screenEl.style.transform = 'translateX(0)';
  setTimeout(() => { _screenEl.style.transition = ''; }, 200);
}

function resetGesture() {
  _gestureMode = null;
  _gestureBbl = null;
  _gestureMsg = null;
  _gestureWrapper = null;
  _hintShown = false;
}

// ── События пузыря (только long-press) ─

function bindBubbleEvents(wrapper, bbl, msg) {
  bbl._msg = msg;
  const isOut = wrapper.classList.contains('msg-out');
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
}

// ── Reply hint (иконка при свайпе) ─────

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
  const el = wrapper?.querySelector('.reply-hint');
  if (!el) return;
  el.style.transform = 'translateY(-50%) scale(0)';
  setTimeout(() => el.remove(), 100);
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
window.initChatGestures = initChatGestures;
window.startReply = startReply;
window.cancelReply = cancelReply;
