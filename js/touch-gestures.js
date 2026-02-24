// =======================================
// TOUCH GESTURES — Drag-to-dismiss
// Premium UX: Apple/Instagram level
// =======================================

const DISMISS_THRESHOLD = 120;

/**
 * Add drag-to-dismiss gesture with visual feedback
 * Element follows finger, fades backdrop, springs back or dismisses
 *
 * @param {HTMLElement} el - touch listener element
 * @param {Object} opts
 * @param {HTMLElement} opts.moveTarget - element to translateY (defaults to el)
 * @param {HTMLElement} opts.fadeTarget - element to fade opacity
 * @param {number} opts.threshold - dismiss distance px (default 120)
 * @param {Function} opts.onDismiss - called on dismiss
 * @param {Function} opts.canStart - (e) => bool, gate function
 */
function handleDragStart(st, e) {
  if (!st.canStart(e)) return;
  const pt = e.touches ? e.touches[0] : e;
  st.startX = pt.clientX;
  st.startY = pt.clientY;
  st.active = true;
  st.locked = false;
  st.isVertical = false;
  st.savedTransition = st.moveTarget.style.transition || '';
  st.moveTarget.style.transition = 'none';

  if (!e.touches) {
    document.addEventListener('mousemove', st.boundMove);
    document.addEventListener('mouseup', st.boundEnd);
  }
}

function handleDragMove(st, e) {
  if (!st.active) return;
  const pt = e.touches ? e.touches[0] : e;
  const dx = pt.clientX - st.startX;
  const dy = pt.clientY - st.startY;

  if (!st.locked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
    st.locked = true;
    st.isVertical = Math.abs(dy) > Math.abs(dx);
    if (!st.isVertical) {
      st.active = false;
      st.moveTarget.style.transition = st.savedTransition;
      return;
    }
  }

  if (!st.locked || !st.isVertical) return;

  let dragDistance = dy;
  if (dragDistance < 0) dragDistance = 0;
  if (dragDistance === 0) return;

  e.preventDefault();

  const scale = Math.max(0.92, 1 - dragDistance / 1500);
  st.moveTarget.style.transform = 'translateY(' + dragDistance + 'px) scale(' + scale + ')';

  if (st.fadeTarget) {
    const fadeProgress = Math.min(dragDistance / (st.threshold * 2), 0.7);
    st.fadeTarget.style.opacity = String(1 - fadeProgress);
  }
}

function handleDragEnd(st, e) {
  if (!e.touches) {
    document.removeEventListener('mousemove', st.boundMove);
    document.removeEventListener('mouseup', st.boundEnd);
  }

  if (!st.active || !st.isVertical) {
    st.active = false;
    st.locked = false;
    st.moveTarget.style.transition = st.savedTransition;
    return;
  }

  const pt = e.changedTouches ? e.changedTouches[0] : e;
  const dy = pt.clientY - st.startY;

  const spring = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
  st.moveTarget.style.transition = spring;
  if (st.fadeTarget) {
    st.fadeTarget.style.transition = 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)';
  }

  if (dy > st.threshold) {
    st.moveTarget.style.transform = 'translateY(100vh) scale(0.9)';
    if (st.fadeTarget) st.fadeTarget.style.opacity = '0';
    setTimeout(function() { st.onDismiss(); }, 200);
  } else {
    st.moveTarget.style.transform = '';
    if (st.fadeTarget) st.fadeTarget.style.opacity = '';
    setTimeout(function() {
      st.moveTarget.style.transition = st.savedTransition;
    }, 300);
  }

  st.active = false;
  st.locked = false;
  st.isVertical = false;
}

function addDragDismiss(el, opts) {
  if (!el) {
    console.error('[TOUCH] addDragDismiss: element is null');
    return;
  }

  opts = opts || {};
  const st = {
    moveTarget: opts.moveTarget || el,
    fadeTarget: opts.fadeTarget || null,
    threshold: opts.threshold || DISMISS_THRESHOLD,
    onDismiss: opts.onDismiss || function() {},
    canStart: opts.canStart || function() { return true; },
    startX: 0, startY: 0,
    active: false, locked: false, isVertical: false,
    savedTransition: '', boundMove: null, boundEnd: null
  };

  st.boundMove = function(e) { handleDragMove(st, e); };
  st.boundEnd = function(e) { handleDragEnd(st, e); };
  const boundStart = function(e) { handleDragStart(st, e); };

  el.addEventListener('touchstart', boundStart, { passive: true });
  el.addEventListener('touchmove', st.boundMove, { passive: false });
  el.addEventListener('touchend', st.boundEnd, { passive: true });
  el.addEventListener('mousedown', boundStart);

  el._dragDismiss = { handleStart: boundStart, handleMove: st.boundMove, handleEnd: st.boundEnd };
}

/**
 * Remove drag-to-dismiss gesture from element
 */
function removeDragDismiss(el) {
  if (!el || !el._dragDismiss) return;
  const h = el._dragDismiss;
  el.removeEventListener('touchstart', h.handleStart);
  el.removeEventListener('touchmove', h.handleMove);
  el.removeEventListener('touchend', h.handleEnd);
  el.removeEventListener('mousedown', h.handleStart);
  document.removeEventListener('mousemove', h.handleMove);
  document.removeEventListener('mouseup', h.handleEnd);
  delete el._dragDismiss;
}

function handleSwipeStart(st, e) {
  const pt = e.touches ? e.touches[0] : e;
  st.startX = pt.clientX;
  st.startY = pt.clientY;
  st.startTime = Date.now();
  st.active = true;

  if (!e.touches) {
    document.addEventListener('mousemove', st.boundMove);
    document.addEventListener('mouseup', st.boundEnd);
  }
}

function handleSwipeMove(st, e) {
  if (!st.active) return;
  const pt = e.touches ? e.touches[0] : e;
  const dx = pt.clientX - st.startX;
  const dy = pt.clientY - st.startY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
    e.preventDefault();
  }
}

function handleSwipeEnd(st, e) {
  if (!e.touches) {
    document.removeEventListener('mousemove', st.boundMove);
    document.removeEventListener('mouseup', st.boundEnd);
  }

  if (!st.active) return;
  st.active = false;

  const pt = e.changedTouches ? e.changedTouches[0] : e;
  const dx = pt.clientX - st.startX;
  const dy = pt.clientY - st.startY;
  const dt = Date.now() - st.startTime;

  if (Math.abs(dx) <= Math.abs(dy)) return;

  const velocity = Math.abs(dx) / (dt || 1);
  if (Math.abs(dx) < 50 && velocity < 0.3) return;

  if (dx > 0) {
    if (st.opts.onSwipeRight) st.opts.onSwipeRight();
  } else {
    if (st.opts.onSwipeLeft) st.opts.onSwipeLeft();
  }
}

function addHorizontalSwipe(el, opts) {
  if (!el) {
    console.error('[TOUCH] addHorizontalSwipe: element is null');
    return null;
  }

  const st = {
    opts: opts || {},
    startX: 0, startY: 0, startTime: 0,
    active: false, boundMove: null, boundEnd: null
  };

  st.boundMove = function(e) { handleSwipeMove(st, e); };
  st.boundEnd = function(e) { handleSwipeEnd(st, e); };
  const boundStart = function(e) { handleSwipeStart(st, e); };

  el.addEventListener('touchstart', boundStart, { passive: true });
  el.addEventListener('touchmove', st.boundMove, { passive: false });
  el.addEventListener('touchend', st.boundEnd, { passive: true });
  el.addEventListener('mousedown', boundStart);

  el._hSwipe = { onStart: boundStart, onMove: st.boundMove, onEnd: st.boundEnd };
  return el._hSwipe;
}

/**
 * Remove horizontal swipe from element
 */
function removeHorizontalSwipe(el) {
  if (!el || !el._hSwipe) return;
  const h = el._hSwipe;
  el.removeEventListener('touchstart', h.onStart);
  el.removeEventListener('touchmove', h.onMove);
  el.removeEventListener('touchend', h.onEnd);
  el.removeEventListener('mousedown', h.onStart);
  document.removeEventListener('mousemove', h.onMove);
  document.removeEventListener('mouseup', h.onEnd);
  delete el._hSwipe;
}

// ЭКСПОРТЫ
window.addDragDismiss = addDragDismiss;
window.removeDragDismiss = removeDragDismiss;
window.addHorizontalSwipe = addHorizontalSwipe;
window.removeHorizontalSwipe = removeHorizontalSwipe;
window.handleDragStart = handleDragStart;
window.handleDragMove = handleDragMove;
window.handleDragEnd = handleDragEnd;
