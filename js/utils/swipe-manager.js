// ════════════════════════════════════════
// SWIPE MANAGER — TRAFIQO
// Универсальный обработчик горизонтальных свайпов
// ════════════════════════════════════════

const SWIPE_DEFAULTS = { threshold: 60 };

// ── Rubber band физика ────────────────

function rubberBand(dx, max) {
  const sign = dx < 0 ? -1 : 1;
  const abs = Math.abs(dx);
  return sign * max * (1 - Math.exp(-abs / max));
}

// ── Фабрика свайп-обработчика ─────────

function createSwipeHandler(el, opts) {
  const cfg = Object.assign({}, SWIPE_DEFAULTS, opts);
  let startX = 0, startY = 0;
  let direction = null, isSwiping = false, lastDx = 0;

  const onStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    direction = null;
    isSwiping = false;
    lastDx = 0;
  };

  const onMove = (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (direction === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direction = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (direction !== 'h') return;
    e.preventDefault();
    isSwiping = true;
    lastDx = dx;
    const shift = rubberBand(dx, 60);
    if (cfg.onMove) cfg.onMove(shift);
  };

  const onEnd = () => {
    if (!isSwiping) return;
    const dx = lastDx;
    if (dx <= -cfg.threshold && cfg.onSwipeLeft) cfg.onSwipeLeft(dx);
    else if (dx >= cfg.threshold && cfg.onSwipeRight) cfg.onSwipeRight(dx);
    else if (cfg.onCancel) cfg.onCancel();
    direction = null;
    isSwiping = false;
    lastDx = 0;
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd, { passive: true });

  return {
    destroy() {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    }
  };
}

// ── Экспорт ───────────────────────────

window.createSwipeHandler = createSwipeHandler;
