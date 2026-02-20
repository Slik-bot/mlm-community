// =======================================
// TOUCH GESTURES — Drag-to-dismiss
// Premium UX: Apple/Instagram level
// =======================================

var DISMISS_THRESHOLD = 120;

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
function addDragDismiss(el, opts) {
  if (!el) {
    console.error('[TOUCH] addDragDismiss: element is null');
    return;
  }

  opts = opts || {};
  var moveTarget = opts.moveTarget || el;
  var fadeTarget = opts.fadeTarget || null;
  var threshold = opts.threshold || DISMISS_THRESHOLD;
  var onDismiss = opts.onDismiss || function() {};
  var canStart = opts.canStart || function() { return true; };

  var startX = 0;
  var startY = 0;
  var active = false;
  var locked = false;
  var isVertical = false;
  var savedTransition = '';

  function handleStart(e) {
    if (!canStart(e)) return;
    var pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    active = true;
    locked = false;
    isVertical = false;
    savedTransition = moveTarget.style.transition || '';
    moveTarget.style.transition = 'none';

    // Mouse: bind move/up on document
    if (!e.touches) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
    }
  }

  function handleMove(e) {
    if (!active) return;
    var pt = e.touches ? e.touches[0] : e;
    var dx = pt.clientX - startX;
    var dy = pt.clientY - startY;

    // Lock direction after 10px movement
    if (!locked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      locked = true;
      isVertical = Math.abs(dy) > Math.abs(dx);
      if (!isVertical) {
        active = false;
        moveTarget.style.transition = savedTransition;
        return;
      }
    }

    if (!locked || !isVertical) return;

    // Only allow downward drag
    if (dy < 0) dy = 0;
    if (dy === 0) return;

    e.preventDefault();

    // Visual feedback: follow finger + subtle scale
    var scale = Math.max(0.92, 1 - dy / 1500);
    moveTarget.style.transform = 'translateY(' + dy + 'px) scale(' + scale + ')';

    // Fade overlay proportionally
    if (fadeTarget) {
      var fadeProgress = Math.min(dy / (threshold * 2), 0.7);
      fadeTarget.style.opacity = String(1 - fadeProgress);
    }
  }

  function handleEnd(e) {
    // Cleanup mouse listeners
    if (!e.touches) {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    }

    if (!active || !isVertical) {
      active = false;
      locked = false;
      moveTarget.style.transition = savedTransition;
      return;
    }

    var pt = e.changedTouches ? e.changedTouches[0] : e;
    var dy = pt.clientY - startY;

    // Spring transition for release
    var spring = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    moveTarget.style.transition = spring;
    if (fadeTarget) {
      fadeTarget.style.transition = 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    }

    if (dy > threshold) {
      // Dismiss: fly off screen
      moveTarget.style.transform = 'translateY(100vh) scale(0.9)';
      if (fadeTarget) fadeTarget.style.opacity = '0';
      setTimeout(function() { onDismiss(); }, 200);
    } else {
      // Spring back to original position
      moveTarget.style.transform = '';
      if (fadeTarget) fadeTarget.style.opacity = '';

      setTimeout(function() {
        moveTarget.style.transition = savedTransition;
      }, 300);
    }

    active = false;
    locked = false;
    isVertical = false;
  }

  // Touch events
  el.addEventListener('touchstart', handleStart, { passive: true });
  el.addEventListener('touchmove', handleMove, { passive: false });
  el.addEventListener('touchend', handleEnd, { passive: true });

  // Mouse: only mousedown on element
  el.addEventListener('mousedown', handleStart);

  // Store handlers for removal
  el._dragDismiss = { handleStart: handleStart, handleMove: handleMove, handleEnd: handleEnd };
}

/**
 * Remove drag-to-dismiss gesture from element
 */
function removeDragDismiss(el) {
  if (!el || !el._dragDismiss) return;
  var h = el._dragDismiss;
  el.removeEventListener('touchstart', h.handleStart);
  el.removeEventListener('touchmove', h.handleMove);
  el.removeEventListener('touchend', h.handleEnd);
  el.removeEventListener('mousedown', h.handleStart);
  document.removeEventListener('mousemove', h.handleMove);
  document.removeEventListener('mouseup', h.handleEnd);
  delete el._dragDismiss;
}

/**
 * Add horizontal swipe gesture (left/right)
 * Supports touch and mouse; mouse move/up bound on document
 *
 * @param {HTMLElement} el - element to listen on
 * @param {Object} opts - { onSwipeLeft, onSwipeRight }
 */
function addHorizontalSwipe(el, opts) {
  if (!el) {
    console.error('[TOUCH] addHorizontalSwipe: element is null');
    return null;
  }

  opts = opts || {};
  var startX = 0;
  var startY = 0;
  var startTime = 0;
  var active = false;

  function onStart(e) {
    var pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    startTime = Date.now();
    active = true;

    // Mouse: bind move/up on document for reliable tracking
    if (!e.touches) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
    }
  }

  function onMove(e) {
    if (!active) return;
    var pt = e.touches ? e.touches[0] : e;
    var dx = pt.clientX - startX;
    var dy = pt.clientY - startY;

    // Prevent page scroll on horizontal swipe
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }

  function onEnd(e) {
    if (!e.touches) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
    }

    if (!active) return;
    active = false;

    var pt = e.changedTouches ? e.changedTouches[0] : e;
    var dx = pt.clientX - startX;
    var dy = pt.clientY - startY;
    var dt = Date.now() - startTime;

    // Must be horizontal movement
    if (Math.abs(dx) <= Math.abs(dy)) return;

    // Threshold: 50px distance or velocity > 0.3 px/ms
    var velocity = Math.abs(dx) / (dt || 1);
    if (Math.abs(dx) < 50 && velocity < 0.3) return;

    if (dx > 0) {
      if (opts.onSwipeRight) opts.onSwipeRight();
    } else {
      if (opts.onSwipeLeft) opts.onSwipeLeft();
    }
  }

  // Touch events
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd, { passive: true });

  // Mouse: only mousedown on element
  el.addEventListener('mousedown', onStart);

  el._hSwipe = { onStart: onStart, onMove: onMove, onEnd: onEnd };
  return el._hSwipe;
}

/**
 * Remove horizontal swipe from element
 */
function removeHorizontalSwipe(el) {
  if (!el || !el._hSwipe) return;
  var h = el._hSwipe;
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
