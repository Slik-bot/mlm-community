// =====================================================
// STORY VIEWER — Просмотр историй (Instagram-like)
// Отделено от stories.js
// Таблица: user_stories, story_views
// =====================================================

const STORY_DURATION = 5000;

let _storyTimer = null;
let _storyList = [];
let _storyIndex = 0;
let _storyPaused = false;
let _storyHoldTimer = null;
let _storyTimerStart = 0;
let _storyRemaining = STORY_DURATION;

// =====================================================
// Инициализация просмотра
// =====================================================

function initStoryViewer() {
  const userId = window._storyViewUserId;
  if (!userId) { goBack(); return; }
  window._storyViewUserId = null;
  loadAndShowStories(userId);
}

async function loadAndShowStories(userId) {
  try {
    const stories = await loadUserStories(userId);
    if (!stories.length) {
      window.showToast('Нет активных историй');
      goBack();
      return;
    }
    _storyList = stories;
    _storyIndex = 0;
    renderStoryViewer();
  } catch (err) {
    console.error('Story viewer error:', err);
    window.showToast('Ошибка загрузки историй');
    goBack();
  }
}

// =====================================================
// Загрузка историй пользователя из БД
// =====================================================

async function loadUserStories(userId) {
  const { data, error } = await window.sb
    .from('user_stories')
    .select('id, user_id, image_url, caption, created_at, views_count')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// =====================================================
// Рендер полноэкранного viewer
// =====================================================

function buildStoryProgressHtml(total, currentIndex) {
  let html = '';
  for (let i = 0; i < total; i++) {
    const cls = i < currentIndex ? 'done' : (i === currentIndex ? 'active' : '');
    html += '<div class="story-progress-seg ' + cls + '"><div class="story-progress-fill"></div></div>';
  }
  return html;
}

function buildStoryViewerHtml(story, profile, isOwn, total) {
  const avaHtml = profile.avatar_url
    ? '<img src="' + window.escHtml(profile.avatar_url) + '" alt="">'
    : window.escHtml((profile.name || '?')[0]);
  const captionHtml = story.caption
    ? '<div class="story-caption">' + window.escHtml(story.caption) + '</div>' : '';
  const deleteHtml = isOwn
    ? '<button class="story-delete" onclick="deleteMyStory(\'' + story.id + '\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' : '';
  const viewsHtml = isOwn
    ? '<button class="story-views-btn" onclick="toggleStoryViewers(\'' + story.id + '\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>' + (story.views_count || 0) + '</span></button>' : '';
  return '<div class="story-viewer" id="storyViewerEl">' +
    '<div class="story-progress">' + buildStoryProgressHtml(total, _storyIndex) + '</div>' +
    '<div class="story-header">' +
      '<div class="story-header-ava">' + avaHtml + '</div>' +
      '<div class="story-header-info">' +
        '<div class="story-header-name">' + window.escHtml(profile.name || '') + '</div>' +
        '<div class="story-header-time">' + storyTimeAgo(story.created_at) + '</div>' +
      '</div>' +
      '<button class="story-close" onclick="closeStoryViewer()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
    '</div>' +
    '<div class="story-image-wrap"><div class="story-spinner"></div><img class="story-image story-image--loading" data-src="' + window.escHtml(story.image_url) + '" alt=""></div>' +
    captionHtml +
    '<div class="story-tap-left"></div>' +
    '<div class="story-tap-right"></div>' +
    deleteHtml +
    viewsHtml +
  '</div>';
}

function renderStoryViewer(retries) {
  const root = document.getElementById('storyViewerRoot');
  if (!root) {
    const attempt = retries || 0;
    if (attempt < 3) {
      requestAnimationFrame(function() { renderStoryViewer(attempt + 1); });
    } else {
      window.showToast('Ошибка загрузки');
    }
    return;
  }
  const story = _storyList[_storyIndex];
  if (!story) return;
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  const isOwn = user && story.user_id === user.id;
  const profile = window._storyViewProfile || {};
  root.innerHTML = buildStoryViewerHtml(story, profile, isOwn, _storyList.length);
  setupStoryTouch();
  preloadStoryImage(story);
  incrementStoryView(story.id);
}

// =====================================================
// Preload изображения + спиннер
// =====================================================

function preloadStoryImage(story) {
  const wrap = document.querySelector('.story-image-wrap');
  const imgEl = wrap ? wrap.querySelector('.story-image') : null;
  if (!imgEl) { startStoryTimer(); return; }
  const loader = new Image();
  loader.onload = function() {
    imgEl.src = story.image_url;
    imgEl.classList.remove('story-image--loading');
    const spinner = wrap.querySelector('.story-spinner');
    if (spinner) spinner.remove();
    startStoryTimer();
  };
  loader.onerror = function() {
    const spinner = wrap.querySelector('.story-spinner');
    if (spinner) spinner.remove();
    imgEl.classList.remove('story-image--loading');
    imgEl.classList.add('story-image--error');
    startStoryTimer();
  };
  loader.src = story.image_url;
}

// =====================================================
// Таймер прогресс-бара (5 сек)
// =====================================================

function startStoryTimer() {
  clearTimeout(_storyTimer);
  _storyPaused = false;
  _storyRemaining = STORY_DURATION;
  _storyTimerStart = Date.now();
  _storyTimer = setTimeout(function() {
    if (_storyPaused) return;
    nextStory();
  }, STORY_DURATION);
}

// =====================================================
// Long press = пауза (touch + mouse)
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
      switchStory(dir);
    } else if (_storyPaused) {
      resumeStory();
    }
  }
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchend', onUp, { passive: false });
  el.addEventListener('touchcancel', onUp, { passive: false });
}

function pauseStory() {
  _storyPaused = true;
  const elapsed = Date.now() - _storyTimerStart;
  _storyRemaining = Math.max(0, STORY_DURATION - elapsed);
  clearTimeout(_storyTimer);
  const viewer = document.getElementById('storyViewerEl');
  if (viewer) viewer.classList.add('paused');
  const seg = document.querySelector('.story-progress-seg.active');
  if (seg) seg.classList.add('paused');
}

function resumeStory() {
  _storyPaused = false;
  const viewer = document.getElementById('storyViewerEl');
  if (viewer) viewer.classList.remove('paused');
  const seg = document.querySelector('.story-progress-seg.active');
  if (seg) seg.classList.remove('paused');
  _storyTimerStart = Date.now();
  _storyTimer = setTimeout(function() {
    if (_storyPaused) return;
    nextStory();
  }, _storyRemaining);
}

// =====================================================
// Навигация: вперёд / назад
// =====================================================

function switchStory(dir) {
  clearTimeout(_storyTimer);
  const next = _storyIndex + dir;
  if (next < 0) { startStoryTimer(); return; }
  if (next >= _storyList.length) { closeStoryViewer(); return; }
  const imgEl = document.querySelector('.story-image');
  if (imgEl) imgEl.classList.add('story-image--loading');
  setTimeout(function() {
    _storyIndex = next;
    renderStoryViewer();
  }, 150);
}

function nextStory() { switchStory(1); }

function prevStory() { switchStory(-1); }

// =====================================================
// Закрытие
// =====================================================

function closeStoryViewer() {
  clearTimeout(_storyTimer);
  const el = document.getElementById('storyViewerEl');
  if (el) {
    el.classList.add('closing');
    setTimeout(function() { goBack(); }, 250);
  } else {
    goBack();
  }
}

// =====================================================
// Просмотры (запись + список)
// =====================================================

function incrementStoryView(storyId) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  const story = _storyList[_storyIndex];
  if (!user || (story && story.user_id === user.id)) return;
  window.sb.from('story_views').upsert(
    { story_id: storyId, viewer_id: user.id },
    { onConflict: 'story_id,viewer_id' }
  ).then(function() {});
}

async function toggleStoryViewers(storyId) {
  const existing = document.querySelector('.story-viewers-panel');
  if (existing) { existing.remove(); _storyPaused = false; startStoryTimer(); return; }
  if (!storyId) return;
  _storyPaused = true;
  clearTimeout(_storyTimer);
  const el = document.getElementById('storyViewerEl');
  if (!el) return;
  el.insertAdjacentHTML('beforeend', '<div class="story-viewers-panel">' +
    '<div class="story-viewers-header"><span>Просмотры</span>' +
    '<button onclick="toggleStoryViewers()" class="story-viewers-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
    '<div class="story-viewers-list" id="storyViewersList"><div class="story-spinner"></div></div></div>');
  try {
    const { data } = await window.sb.from('story_views')
      .select('viewer_id, viewed_at, users(name, avatar_url)')
      .eq('story_id', storyId).order('viewed_at', { ascending: false }).limit(50);
    const list = document.getElementById('storyViewersList');
    if (!list) return;
    if (!data || !data.length) { list.innerHTML = '<div class="story-viewers-empty">Пока никто не смотрел</div>'; return; }
    list.innerHTML = data.map(function(v) {
      const u = v.users || {};
      const ava = u.avatar_url ? '<img src="' + window.escHtml(u.avatar_url) + '" alt="">' : window.escHtml((u.name || '?')[0]);
      return '<div class="story-viewer-row"><div class="story-viewer-ava">' + ava + '</div>' +
        '<div class="story-viewer-name">' + window.escHtml(u.name || 'Пользователь') + '</div>' +
        '<div class="story-viewer-time">' + storyTimeAgo(v.viewed_at) + '</div></div>';
    }).join('');
  } catch (err) {
    console.error('Story viewers error:', err);
    const list = document.getElementById('storyViewersList');
    if (list) list.innerHTML = '<div class="story-viewers-empty">Ошибка загрузки</div>';
  }
}

// =====================================================
// Удалить свою историю
// =====================================================

async function deleteMyStory(storyId) {
  try {
    const { error } = await window.sb
      .from('user_stories').delete().eq('id', storyId);
    if (error) throw error;
    window.showToast('История удалена');
    _storyList = _storyList.filter(function(s) { return s.id !== storyId; });
    if (!_storyList.length) {
      closeStoryViewer();
      return;
    }
    if (_storyIndex >= _storyList.length) _storyIndex = _storyList.length - 1;
    renderStoryViewer();
  } catch (err) {
    console.error('Story delete error:', err);
    window.showToast('Ошибка удаления');
  }
}

// =====================================================
// Время "Xч назад"
// =====================================================

function storyTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return mins + ' мин';
  const hrs = Math.floor(mins / 60);
  return hrs + 'ч назад';
}

// =====================================================
// EXPORTS
// =====================================================

window.initStoryViewer = initStoryViewer;
window.nextStory = nextStory;
window.prevStory = prevStory;
window.closeStoryViewer = closeStoryViewer;
window.deleteMyStory = deleteMyStory;
window.toggleStoryViewers = toggleStoryViewers;
