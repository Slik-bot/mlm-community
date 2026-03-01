// =====================================================
// STORY GESTURES — Touch, tap, swipe, pause/resume
// Отделено от story-viewer.js
// =====================================================

// Shared state (доступно из story-viewer.js)
window.STORY_DURATION = 5000;
window._storyTimer = null;
window._storyPaused = false;
window._storyTimerStart = 0;
window._storyRemaining = 5000;

// Gesture state (локальное)
let _storyHoldTimer = null;
let _swipeStartY = 0;
let _swipeDeltaY = 0;
let _swipeActive = false;

// =====================================================
// Сброс gesture-таймеров (вызывается из story-viewer.js)
// =====================================================

function resetGestureTimers() {
  clearTimeout(_storyHoldTimer);
  _storyHoldTimer = null;
}

// =====================================================
// Long press = пауза, tap = навигация
// =====================================================

function setupStoryTouch() {
  const left = document.querySelector('.story-tap-left');
  const right = document.querySelector('.story-tap-right');
  if (left) bindTapZone(left, -1);
  if (right) bindTapZone(right, 1);
}

function bindTapZone(el, dir) {
  function onDown(e) {
    e.preventDefault();
    _storyHoldTimer = setTimeout(function() {
      _storyHoldTimer = null;
      pauseStory();
    }, 200);
  }
  function onUp(e) {
    e.preventDefault();
    if (_storyHoldTimer) {
      clearTimeout(_storyHoldTimer);
      _storyHoldTimer = null;
      window.switchStory(dir);
    } else if (window._storyPaused) {
      resumeStory();
    }
  }
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchend', onUp, { passive: false });
  el.addEventListener('touchcancel', onUp, { passive: false });
}

// =====================================================
// Пауза / Продолжение
// =====================================================

function pauseStory() {
  window._storyPaused = true;
  const elapsed = Date.now() - window._storyTimerStart;
  window._storyRemaining = Math.max(0, window.STORY_DURATION - elapsed);
  clearTimeout(window._storyTimer);
  const viewer = document.getElementById('storyViewerEl');
  if (viewer) viewer.classList.add('paused');
  const seg = document.querySelector('.story-progress-seg.active');
  if (seg) seg.classList.add('paused');
}

function resumeStory() {
  window._storyPaused = false;
  const viewer = document.getElementById('storyViewerEl');
  if (viewer) viewer.classList.remove('paused');
  const seg = document.querySelector('.story-progress-seg.active');
  if (seg) seg.classList.remove('paused');
  window._storyTimerStart = Date.now();
  window._storyTimer = setTimeout(function() {
    if (window._storyPaused) return;
    window.nextStory();
  }, window._storyRemaining);
}

// =====================================================
// Свайп вниз = закрыть (Telegram-like)
// =====================================================

function setupSwipeDown() {
  const viewer = document.getElementById('storyViewerEl');
  if (!viewer) return;

  viewer.addEventListener('touchstart', function(e) {
    _swipeStartY = e.touches[0].clientY;
    _swipeDeltaY = 0;
    _swipeActive = false;
  }, true);

  viewer.addEventListener('touchmove', function(e) {
    const dy = e.touches[0].clientY - _swipeStartY;
    if (dy <= 10) return;
    if (!_swipeActive) {
      _swipeActive = true;
      clearTimeout(_storyHoldTimer);
      _storyHoldTimer = null;
      viewer.style.transition = 'none';
    }
    _swipeDeltaY = dy;
    viewer.style.transform = 'translateY(' + dy + 'px)';
    viewer.style.opacity = String(Math.max(0.2, 1 - dy / 400));
  }, true);

  viewer.addEventListener('touchend', function(e) {
    if (!_swipeActive) return;
    e.stopPropagation();
    if (_swipeDeltaY > 150) {
      viewer.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
      viewer.style.transform = 'translateY(100%)';
      viewer.style.opacity = '0';
      setTimeout(window.closeStoryViewer, 300);
    } else {
      viewer.style.transition = 'transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms cubic-bezier(0.16,1,0.3,1)';
      viewer.style.transform = '';
      viewer.style.opacity = '';
    }
    _swipeActive = false;
    _swipeDeltaY = 0;
  }, true);
}

// =====================================================
// EXPORTS
// =====================================================

window.setupStoryTouch = setupStoryTouch;
window.setupSwipeDown = setupSwipeDown;
window.pauseStory = pauseStory;
window.resumeStory = resumeStory;
window.resetGestureTimers = resetGestureTimers;
