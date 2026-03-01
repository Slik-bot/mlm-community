// =====================================================
// STORY CREATE — Создание историй
// Отделено от stories.js
// Таблица: user_stories, Bucket: story-media
// =====================================================

const STORY_MAX_DAILY = 10;
const STORY_MAX_CAPTION = 200;
const STORY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STORY_MAX_SIZE = 5 * 1024 * 1024;

let _storyFile = null;

// =====================================================
// Инициализация экрана создания
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
// Выбор фото
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
// Превью выбранного фото
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
// Проверка дневного лимита
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
// Сжатие фото (stories: 1080x1920, quality 0.75)
// =====================================================

function storyCompressImage(file) {
  if (file.size < 300 * 1024) return Promise.resolve(file);
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > 1080) { h = Math.round((h * 1080) / w); w = 1080; }
        if (h > 1920) { w = Math.round((w * 1920) / h); h = 1920; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) { resolve(blob || file); }, 'image/jpeg', 0.75);
      };
      img.onerror = function() { resolve(file); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(file); };
    reader.readAsDataURL(file);
  });
}

// =====================================================
// Загрузка фото в Storage
// =====================================================

async function storyUploadImage(blob) {
  const user = window.getCurrentUser();
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
// Публикация истории
// =====================================================

async function publishStory() {
  const btn = document.getElementById('storyPublishBtn');
  if (!_storyFile || (btn && btn.disabled)) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Сжатие...'; }

  try {
    const user = window.getCurrentUser();
    if (!user) {
      if (window.showToast) window.showToast('Требуется авторизация');
      if (btn) { btn.disabled = false; btn.textContent = 'Опубликовать'; }
      return;
    }

    const [canPost, compressed] = await Promise.all([
      checkDailyLimit(),
      storyCompressImage(_storyFile)
    ]);

    if (!canPost) {
      if (window.showToast) window.showToast('Лимит историй на сегодня исчерпан');
      if (btn) { btn.disabled = false; btn.textContent = 'Опубликовать'; }
      return;
    }

    if (btn) btn.textContent = 'Загрузка...';
    const imageUrl = await storyUploadImage(compressed);

    if (btn) btn.textContent = 'Сохранение...';
    const caption = document.getElementById('storyCaptionInput');
    const captionText = caption ? caption.value.trim().substring(0, STORY_MAX_CAPTION) : '';

    const { error } = await window.sb.from('user_stories').insert({
      user_id: user.id,
      image_url: imageUrl,
      caption: captionText || null
    });
    if (error) throw error;

    if (window.showToast) window.showToast('История опубликована');
    _storyFile = null;
    setTimeout(function() {
      if (window.goBack) window.goBack();
      else if (window.goTo) window.goTo('scrFeed');
    }, 100);
  } catch (err) {
    console.error('Story publish error:', err);
    if (window.showToast) window.showToast('Ошибка публикации');
  } finally {
    const _btn = document.getElementById('storyPublishBtn');
    if (_btn) { _btn.disabled = false; _btn.textContent = 'Опубликовать'; }
  }
}

// =====================================================
// EXPORTS
// =====================================================

window.initStoryCreate = initStoryCreate;
window.storyPickPhoto = storyPickPhoto;
window.publishStory = publishStory;
