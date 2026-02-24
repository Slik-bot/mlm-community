// =======================================
// ИНТЕРАКТИВНОСТЬ ЛЕНТЫ
// Отделено от feed.js
// =======================================

// ===== COPY POST LINK =====
function copyPostLink(postId) {
  const url = location.origin + location.pathname + '?post=' + postId;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('Ссылка скопирована');
    });
  } else {
    showToast('Не удалось скопировать');
  }
  closePopovers();
}

// ===== POST MENU ACTIONS =====
window.copyPostText = function(postId) {
  closePopovers();
  const card = document.querySelector('.post-card[data-post-id="' + postId + '"]');
  if (!card) return;
  const body = card.querySelector('.post-body');
  const text = body ? (body.getAttribute('data-full') || body.textContent) : '';
  navigator.clipboard.writeText(text.trim()).then(function() { showToast('Текст скопирован'); });
};

window.editPost = function(postId) {
  closePopovers();
  const card = document.querySelector('.post-card[data-post-id="' + postId + '"]');
  if (!card) return;
  const body = card.querySelector('.post-body');
  const text = body ? (body.getAttribute('data-full') || body.textContent) : '';
  const ta = document.getElementById('createTa');
  if (ta) ta.value = text.trim();
  openCreate();
  window._editingPostId = postId;
};

window.deletePost = function(postId) {
  closePopovers();
  if (!confirm('Удалить пост?')) return;
  sb.from('posts').delete().eq('id', postId).eq('author_id', (getCurrentUser()?.id || currentAuthUser?.id)).then(function() {
    const card = document.querySelector('.post-card[data-post-id="' + postId + '"]');
    if (card) { card.style.transition = 'all .3s'; card.style.opacity = '0'; card.style.transform = 'scale(.95)'; setTimeout(function() { card.remove(); }, 300); }
    showToast('Пост удалён');
  });
};

window.hidePost = function(postId) {
  closePopovers();
  const card = document.querySelector('.post-card[data-post-id="' + postId + '"]');
  if (card) { card.style.transition = 'all .3s'; card.style.opacity = '0'; card.style.transform = 'scale(.95)'; setTimeout(function() { card.remove(); }, 300); }
  showToast('Пост скрыт');
};

window.reportPost = function(postId) {
  closePopovers();
  showToast('Жалоба отправлена');
};

// ========== REVIEW ACCORDION ==========
function toggleReview(idx) {
  const target = document.getElementById('rvwFull' + idx);
  if (!target) return;
  const isOpen = target.classList.contains('open');
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('rvwFull' + i);
    if (el) el.classList.remove('open');
    const btns = document.querySelectorAll('.rvw-more');
    if (btns[i]) btns[i].textContent = 'Читать полностью';
  }
  if (!isOpen) {
    target.classList.add('open');
    const allBtns = document.querySelectorAll('.rvw-more');
    if (allBtns[idx]) allBtns[idx].textContent = 'Свернуть';
  }
}

// ===== DOUBLE TAP HEART =====
let _lastTapTime = 0;
let _lastTapCard = null;

document.addEventListener('touchend', function(e) {
  const card = e.target.closest('.post-card');
  if (!card || e.target.closest('.post-react') || e.target.closest('.post-more') || e.target.closest('.pop')) return;
  const now = Date.now();
  if (now - _lastTapTime < 300 && _lastTapCard === card) {
    e.preventDefault();
    showBigHeart(card);
    const likeBtn = card.querySelector('.r-btn');
    if (likeBtn && !likeBtn.classList.contains('liked')) likeBtn.click();
    _lastTapTime = 0;
    _lastTapCard = null;
  } else {
    _lastTapTime = now;
    _lastTapCard = card;
  }
});

function showBigHeart(card) {
  const rect = card.getBoundingClientRect();
  const h = document.createElement('div');
  h.className = 'big-heart';
  h.innerHTML = '<svg viewBox="0 0 24 24" fill="#f87171"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  h.style.left = (rect.left + rect.width / 2) + 'px';
  h.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(h);
  setTimeout(function() { h.remove(); }, 900);
}

// ===== REACTIONS (long press) =====
const REACTIONS = [
  { emoji: '❤️', name: 'love', color: '#ef4444' },
  { emoji: '🔥', name: 'fire', color: '#f59e0b' },
  { emoji: '👏', name: 'clap', color: '#22c55e' },
  { emoji: '🤔', name: 'think', color: '#3b82f6' },
  { emoji: '⭐', name: 'star', color: '#fbbf24' },
  { emoji: '💯', name: 'hundred', color: '#8b5cf6' }
];
let longPressTimer = null, longPressTarget = null;

document.addEventListener('touchstart', function(e) {
  const postCard = e.target.closest('.post-card');
  if (!postCard || e.target.closest('.post-react')) return;
  longPressTarget = postCard;
  longPressTimer = setTimeout(function() {
    showReactionPicker(postCard, e.touches[0].clientX, e.touches[0].clientY);
  }, 500);
}, { passive: true });
document.addEventListener('touchend', function() { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
document.addEventListener('touchmove', function() { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });

function showReactionPicker(postCard, x, y) {
  const old = document.querySelector('.reaction-picker'); if (old) old.remove();
  const picker = document.createElement('div'); picker.className = 'reaction-picker';
  REACTIONS.forEach(function(r) {
    const btn = document.createElement('button'); btn.className = 'reaction-btn'; btn.innerHTML = r.emoji;
    btn.style.setProperty('--reaction-color', r.color);
    btn.addEventListener('click', function() { handleReaction(postCard.dataset.postId, r); picker.remove(); });
    picker.appendChild(btn);
  });
  const rect = postCard.getBoundingClientRect();
  picker.style.left = (rect.left + rect.width / 2) + 'px';
  picker.style.top = (rect.top + 20) + 'px';
  document.body.appendChild(picker);
  requestAnimationFrame(function() { picker.classList.add('show'); });
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(function() {
    const closeHandler = function(e) { if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', closeHandler); } };
    document.addEventListener('click', closeHandler);
  }, 100);
}

function handleReaction(postId, reaction) {
  showReactionAnimation(reaction);
  const card = document.querySelector('[data-post-id="' + postId + '"]');
  if (card) {
    const likeBtn = card.querySelector('.r-btn');
    if (likeBtn && !likeBtn.classList.contains('liked')) {
      likeBtn.classList.add('liked');
      const numEl = likeBtn.querySelector('.r-n');
      if (numEl) numEl.textContent = (parseInt(numEl.textContent) || 0) + 1;
    }
  }
}

function showReactionAnimation(reaction) {
  const emoji = document.createElement('div'); emoji.className = 'reaction-emoji-fly';
  emoji.textContent = reaction.emoji;
  emoji.style.left = (window.innerWidth / 2) + 'px'; emoji.style.top = (window.innerHeight / 2) + 'px';
  document.body.appendChild(emoji);
  setTimeout(function() { emoji.remove(); }, 1000);
}

// ===== SHARE BOTTOM SHEET =====
window.showShareSheet = function(postId) {
  const sheet = document.createElement('div'); sheet.className = 'share-sheet';
  sheet.innerHTML = '<div class="share-sheet-backdrop"></div><div class="share-sheet-content"><div class="share-sheet-handle"></div><div class="share-sheet-title">Поделиться</div><div class="share-options"><button class="share-opt" data-share="telegram"><div class="share-opt-icon">📱</div><div class="share-opt-label">Telegram</div></button><button class="share-opt" data-share="whatsapp"><div class="share-opt-icon">💬</div><div class="share-opt-label">WhatsApp</div></button><button class="share-opt" data-share="copy"><div class="share-opt-icon">🔗</div><div class="share-opt-label">Копировать</div></button><button class="share-opt" data-share="native"><div class="share-opt-icon">↗️</div><div class="share-opt-label">Ещё...</div></button></div><button class="share-cancel">Отмена</button></div>';
  document.body.appendChild(sheet);
  requestAnimationFrame(function() { sheet.classList.add('show'); });
  sheet.querySelector('.share-sheet-backdrop').addEventListener('click', function() { closeShareSheet(sheet); });
  sheet.querySelector('.share-cancel').addEventListener('click', function() { closeShareSheet(sheet); });
  sheet.querySelectorAll('.share-opt').forEach(function(opt) {
    opt.addEventListener('click', function() { handleShare(postId, opt.dataset.share); closeShareSheet(sheet); });
  });
};

function closeShareSheet(sheet) {
  sheet.classList.remove('show');
  setTimeout(function() { sheet.remove(); }, 300);
}

async function handleShare(postId, type) {
  const postUrl = location.origin + '/post/' + postId;
  const text = 'Смотри какой крутой пост в TRAFIQO!';
  switch (type) {
    case 'telegram': window.open('https://t.me/share/url?url=' + encodeURIComponent(postUrl) + '&text=' + encodeURIComponent(text), '_blank'); break;
    case 'whatsapp': window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + postUrl), '_blank'); break;
    case 'copy':
      try { await navigator.clipboard.writeText(postUrl); showToast('Ссылка скопирована!'); } catch(e) { console.error('Copy failed:', e); }
      break;
    case 'native':
      if (navigator.share) {
        try { await navigator.share({ title: 'TRAFIQO', text: text, url: postUrl }); } catch(e) { if (e.name !== 'AbortError') console.error('Share failed:', e); }
      }
      break;
  }
}
