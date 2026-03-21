// ═══════════════════════════════════════
// FORUM GESTURES
// Отделено от forum.js
// ═══════════════════════════════════════

function initForumTopicSwipe() {
  const scr = document.getElementById('scrForumTopic');
  if (scr && !scr._swipeBack) {
    scr._swipeBack = true;
    let _sx = 0, _sy = 0;
    scr.addEventListener('touchstart', function(e) {
      _sx = e.touches[0].clientX;
      _sy = e.touches[0].clientY;
    }, { passive: true });
    scr.addEventListener('touchend', function(e) {
      const dx = e.changedTouches[0].clientX - _sx;
      const dy = Math.abs(e.changedTouches[0].clientY - _sy);
      if (dx > 60 && dy < 40) goBack();
    }, { passive: true });
  }
}

function attachReplySwipe() {
  const rows = document.querySelectorAll('.forum-reply-row');
  rows.forEach(function(row) {
    if (row._swipe) return;
    row._swipe = true;
    const btn = row.querySelector('.reply-reply-btn');
    if (!btn) return;
    _bindReplySwipe(row, function() { btn.click(); });
  });
}

function _bindReplySwipe(el, onReply) {
  const TRIGGER_X = 60;
  const MAX_X = 70;
  let startX = 0, startY = 0, isDragging = false, triggered = false;

  el.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = false;
    triggered = false;
    el.style.transition = 'none';
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!isDragging && Math.abs(dy) > Math.abs(dx)) return;
    isDragging = true;
    if (dx >= 0) return;
    const shift = Math.min(Math.abs(dx), MAX_X);
    el.style.transform = 'translateX(-' + shift + 'px)';
    if (shift >= TRIGGER_X && !triggered) {
      triggered = true;
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    }
  }, { passive: true });

  el.addEventListener('touchend', function() {
    el.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = 'translateX(0)';
    if (triggered) setTimeout(function() { onReply(); }, 50);
    isDragging = false;
    triggered = false;
  });
}

function attachLongPress(el, onLongPress) {
  let timer = null;
  let moved = false;

  el.addEventListener('touchstart', () => {
    moved = false;
    clearCtxEffect();
    el.classList.add('ctx-pressed');
    timer = setTimeout(() => {
      if (!moved) {
        el.classList.remove('ctx-pressed');
        try {
          window.Telegram?.WebApp?.HapticFeedback
            ?.impactOccurred('medium');
        } catch(e) {}
        document.querySelectorAll('.forum-reply-row')
          .forEach(r => {
            if (r === el) {
              r.classList.add('ctx-focused');
            } else {
              r.classList.add('ctx-blur');
            }
          });
        onLongPress();
      }
    }, 500);
  }, { passive: true });

  el.addEventListener('touchmove', () => {
    moved = true;
    el.classList.remove('ctx-pressed');
    clearTimeout(timer);
  }, { passive: true });

  el.addEventListener('touchend', () => {
    el.classList.remove('ctx-pressed');
    clearTimeout(timer);
  }, { passive: true });

  el.addEventListener('touchcancel', () => {
    el.classList.remove('ctx-pressed');
    clearTimeout(timer);
  }, { passive: true });
}

function clearCtxEffect() {
  document.querySelectorAll(
    '.ctx-focused, .ctx-blur, .ctx-pressed'
  ).forEach(el => {
    el.classList.remove('ctx-focused','ctx-blur','ctx-pressed');
  });
}

// ЭКСПОРТЫ
window.initForumTopicSwipe = initForumTopicSwipe;
window.attachReplySwipe = attachReplySwipe;
window.attachLongPress = attachLongPress;
window.clearCtxEffect = clearCtxEffect;
