// =====================================================
// STORIES — Создание + Просмотр (Instagram-like)
// Таблица: user_stories, Bucket: story-media
// =====================================================

const STORY_DURATION = 5000;
const STORY_MAX_DAILY = 10;
const STORY_MAX_CAPTION = 200;
const STORY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STORY_MAX_SIZE = 5 * 1024 * 1024;

let _storyFile = null;
let _storyTimer = null;
let _storyList = [];
let _storyIndex = 0;
let _storyPaused = false;

// =====================================================
// CREATE — Инициализация экрана создания
// =====================================================

function initStoryCreate() {
  _storyFile = null;
  const preview = document.getElementById('storyPreviewZone');
  const placeholder = document.getElementById('storyPlaceholder');
  const btn = document.getElementById('storyPublishBtn');
  const caption = document.getElementById('storyCaptionInput');
  const counter = document.getElementById('storyCaptionCounter');
  const limitMsg = document.getElementById('storyLimitMsg');
  const fileInput = document.getElementById('storyFileInput');

  if (placeholder) placeholder.classList.remove('hidden');
  if (preview) preview.classList.remove('has-photo');
  const oldImg = preview ? preview.querySelector('.story-preview-img') : null;
  if (oldImg) oldImg.remove();
  if (btn) btn.disabled = true;
  if (caption) caption.value = '';
  if (counter) { counter.textContent = '0 / 200'; counter.classList.remove('warn'); }
  if (limitMsg) limitMsg.classList.remove('visible');

  if (caption) {
    caption.oninput = function() {
      const len = caption.value.length;
      if (counter) {
        counter.textContent = len + ' / ' + STORY_MAX_CAPTION;
        counter.classList.toggle('warn', len > 180);
      }
    };
  }

  if (fileInput) {
    fileInput.value = '';
    fileInput.onchange = function() {
      if (fileInput.files && fileInput.files[0]) {
        storyPreviewPhoto(fileInput.files[0]);
      }
    };
  }

  checkDailyLimit();
}

// =====================================================
// CREATE — Выбор фото
// =====================================================

function storyPickPhoto(source) {
  const input = document.getElementById('storyFileInput');
  if (!input) return;
  if (source === 'camera') {
    input.setAttribute('capture', 'environment');
  } else {
    input.removeAttribute('capture');
  }
  input.click();
}

// =====================================================
// CREATE — Превью выбранного фото
// =====================================================

function storyPreviewPhoto(file) {
  if (!file) return;
  if (STORY_ALLOWED_TYPES.indexOf(file.type) === -1) {
    window.showToast('Только JPEG, PNG, WEBP');
    return;
  }
  if (file.size > STORY_MAX_SIZE) {
    window.showToast('Фото не больше 5 МБ');
    return;
  }

  _storyFile = file;
  const preview = document.getElementById('storyPreviewZone');
  const placeholder = document.getElementById('storyPlaceholder');
  const btn = document.getElementById('storyPublishBtn');
  if (!preview) return;

  if (placeholder) placeholder.classList.add('hidden');
  preview.classList.add('has-photo');

  const oldImg = preview.querySelector('.story-preview-img');
  if (oldImg) oldImg.remove();

  const img = document.createElement('img');
  img.className = 'story-preview-img';
  img.src = URL.createObjectURL(file);
  preview.appendChild(img);

  if (btn) btn.disabled = false;
}

// =====================================================
// CREATE — Проверка дневного лимита
// =====================================================

async function checkDailyLimit() {
  try {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!user) return false;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await window.sb
      .from('user_stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (error) throw error;
    const limitMsg = document.getElementById('storyLimitMsg');
    const btn = document.getElementById('storyPublishBtn');
    if (count >= STORY_MAX_DAILY) {
      if (limitMsg) limitMsg.classList.add('visible');
      if (btn) btn.disabled = true;
      return false;
    }
    return true;
  } catch (err) {
    console.error('Story limit check error:', err);
    return true;
  }
}

// =====================================================
// CREATE — Загрузка фото в Storage
// =====================================================

async function storyUploadImage(file) {
  const user = window.getCurrentUser();
  const compress = window.compressImage || function(f) { return Promise.resolve(f); };
  var _t;
  const blob = await Promise.race([
    compress(file),
    new Promise(function(resolve) { _t = setTimeout(function() { resolve(file); }, 10000); })
  ]);
  clearTimeout(_t);
  const mimeType = blob.type || 'image/jpeg';
  const extMap = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };
  const ext = extMap[mimeType] || 'jpg';
  const name = user.id + '/' + Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext;

  const { data, error } = await window.sb.storage
    .from('story-media').upload(name, blob, { contentType: mimeType });
  if (error) throw error;

  const { data: urlData } = window.sb.storage
    .from('story-media').getPublicUrl(data.path);
  return urlData.publicUrl;
}

// =====================================================
// CREATE — Публикация истории
// =====================================================

async function publishStory() {
  const btn = document.getElementById('storyPublishBtn');
  if (!_storyFile || (btn && btn.disabled)) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Загрузка...'; }

  try {
    const canPost = await checkDailyLimit();
    if (!canPost) {
      if (window.showToast) try { window.showToast('Лимит историй на сегодня исчерпан'); } catch(e) {}
      if (btn) { btn.disabled = false; btn.textContent = 'Опубликовать'; }
      return;
    }

    const user = window.getCurrentUser();
    if (!user) {
      if (window.showToast) try { window.showToast('Требуется авторизация'); } catch(e) {}
      if (btn) { btn.disabled = false; btn.textContent = 'Опубликовать'; }
      return;
    }

    const caption = document.getElementById('storyCaptionInput');
    const captionText = caption ? caption.value.trim().substring(0, STORY_MAX_CAPTION) : '';

    const imageUrl = await storyUploadImage(_storyFile);

    const { error } = await window.sb.from('user_stories').insert({
      user_id: user.id,
      image_url: imageUrl,
      caption: captionText || null
    });
    if (error) throw error;

    if (window.showToast) try { window.showToast('История опубликована'); } catch(e) {}
    _storyFile = null;
    setTimeout(function() {
      if (window.goBack) window.goBack();
      else if (window.goTo) window.goTo('scrFeed');
    }, 100);
  } catch (err) {
    console.error('Story publish error:', err);
    if (window.showToast) try { window.showToast('Ошибка публикации'); } catch(e) {}
  } finally {
    var _btn = document.getElementById('storyPublishBtn');
    if (_btn) { _btn.disabled = false; _btn.textContent = 'Опубликовать'; }
  }
}

// =====================================================
// VIEWER — Инициализация просмотра
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
// VIEWER — Загрузка историй пользователя из БД
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
// VIEWER — Рендер полноэкранного viewer
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
    '<div class="story-image-wrap"><img class="story-image" src="' + window.escHtml(story.image_url) + '" alt=""></div>' +
    captionHtml +
    '<div class="story-tap-left" onclick="prevStory()"></div>' +
    '<div class="story-tap-right" onclick="nextStory()"></div>' +
    deleteHtml +
  '</div>';
}

function renderStoryViewer() {
  const root = document.getElementById('storyViewerRoot');
  if (!root) return;
  const story = _storyList[_storyIndex];
  if (!story) return;
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  const isOwn = user && story.user_id === user.id;
  const profile = window._storyViewProfile || {};
  root.innerHTML = buildStoryViewerHtml(story, profile, isOwn, _storyList.length);
  startStoryTimer();
  incrementStoryView(story.id);
}

// =====================================================
// VIEWER — Таймер прогресс-бара (5 сек)
// =====================================================

function startStoryTimer() {
  clearTimeout(_storyTimer);
  _storyPaused = false;
  _storyTimer = setTimeout(function() {
    if (_storyPaused) return;
    nextStory();
  }, STORY_DURATION);
}

// =====================================================
// VIEWER — Навигация: вперёд / назад
// =====================================================

function nextStory() {
  clearTimeout(_storyTimer);
  if (_storyIndex < _storyList.length - 1) {
    _storyIndex++;
    renderStoryViewer();
  } else {
    closeStoryViewer();
  }
}

function prevStory() {
  clearTimeout(_storyTimer);
  if (_storyIndex > 0) {
    _storyIndex--;
    renderStoryViewer();
  } else {
    startStoryTimer();
  }
}

// =====================================================
// VIEWER — Закрытие
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
// VIEWER — Инкремент просмотров
// =====================================================

function incrementStoryView(storyId) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  const story = _storyList[_storyIndex];
  if (user && story && story.user_id === user.id) return;

  window.sb.rpc('increment_story_views', { story_id: storyId }).catch(function() {
    window.sb.from('user_stories')
      .update({ views_count: (story ? story.views_count || 0 : 0) + 1 })
      .eq('id', storyId)
      .then(function() {});
  });
}

// =====================================================
// DELETE — Удалить свою историю
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
// UTIL — Время "Xч назад"
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

window.initStoryCreate = initStoryCreate;
window.initStoryViewer = initStoryViewer;
window.storyPickPhoto = storyPickPhoto;
window.publishStory = publishStory;
window.nextStory = nextStory;
window.prevStory = prevStory;
window.closeStoryViewer = closeStoryViewer;
window.deleteMyStory = deleteMyStory;
