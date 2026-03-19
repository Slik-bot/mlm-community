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
    let _sx = 0, _sy = 0;
    row.addEventListener('touchstart', function(e) {
      _sx = e.touches[0].clientX;
      _sy = e.touches[0].clientY;
    }, { passive: true });
    row.addEventListener('touchend', function(e) {
      const dx = _sx - e.changedTouches[0].clientX;
      const dy = Math.abs(e.changedTouches[0].clientY - _sy);
      if (dx > 50 && dy < 40) {
        const btn = row.querySelector('.reply-reply-btn');
        if (btn) btn.click();
        row.style.transition = 'transform 150ms cubic-bezier(0.16,1,0.3,1)';
        row.style.transform = 'translateX(-6px)';
        setTimeout(function() { row.style.transform = ''; }, 200);
      }
    }, { passive: true });
  });
}

// ЭКСПОРТЫ
window.initForumTopicSwipe = initForumTopicSwipe;
window.attachReplySwipe = attachReplySwipe;
