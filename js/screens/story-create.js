// =====================================================
// STORY CREATE — Создание историй (Telegram-like)
// Таблица: user_stories, Bucket: story-media
// =====================================================

const STORY_MAX_DAILY = 10;
const STORY_MAX_CAPTION = 200;
const STORY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STORY_MAX_SIZE = 5 * 1024 * 1024;

let _storyFile = null;
let _storyPickerOpen = false;

// =====================================================
// Инициализация — сразу открыть выбор фото
// =====================================================

function initStoryCreate() {
  _storyFile = null;
  const fileInput = document.getElementById('storyFileInput');
  const btn = document.getElementById('storyPublishBtn');
  const caption = document.getElementById('storyCaptionInput');
  const counter = document.getElementById('storyCaptionCount');
  const preview = document.getElementById('storyPreview');
  const previewImg = document.getElementById('storyPreviewImg');
  const limitMsg = document.getElementById('storyLimitMsg');

  if (btn) { btn.disabled = true; btn.textContent = 'Опубликовать'; }
  if (caption) caption.value = '';
  if (counter) counter.textContent = '0/200';
  if (preview) preview.classList.remove('has-photo');
  if (previewImg) previewImg.src = '';
  if (limitMsg) limitMsg.classList.remove('visible');

  if (caption) {
    caption.oninput = function() {
      const len = caption.value.length;
      if (counter) counter.textContent = len + '/' + STORY_MAX_CAPTION;
    };
  }

  if (fileInput) {
    fileInput.value = '';
    fileInput.onchange = handleStoryFileChange;
  }

  if (preview && fileInput) {
    preview.onclick = function() {
      if (!_storyFile) return;
      fileInput.value = '';
      fileInput.click();
    };
  }

  hideEmptyState();
  checkDailyLimit();
  triggerFilePicker();
}

// =====================================================
// Триггер выбора файла
// =====================================================

function triggerFilePicker() {
  const fileInput = document.getElementById('storyFileInput');
  if (!fileInput) return;
  _storyPickerOpen = true;
  setTimeout(function() { fileInput.click(); }, 100);
}

function showEmptyState() {
  const empty = document.getElementById('storyEmptyState');
  if (empty) empty.classList.add('visible');
}

function hideEmptyState() {
  const empty = document.getElementById('storyEmptyState');
  if (empty) empty.classList.remove('visible');
}

// =====================================================
// Обработка выбора файла
// =====================================================

function handleStoryFileChange() {
  _storyPickerOpen = false;
  const fileInput = document.getElementById('storyFileInput');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showEmptyState();
    return;
  }
  hideEmptyState();
  storyPreviewPhoto(fileInput.files[0]);
}

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
  const preview = document.getElementById('storyPreview');
  const previewImg = document.getElementById('storyPreviewImg');
  const btn = document.getElementById('storyPublishBtn');

  if (previewImg) previewImg.src = URL.createObjectURL(file);
  if (preview) preview.classList.add('has-photo');
  if (btn) btn.disabled = false;
}

// =====================================================
// Закрытие экрана создания
// =====================================================

function closeStoryCreate() {
  _storyFile = null;
  _storyPickerOpen = false;
  if (window.goBack) window.goBack();
  else if (window.goTo) window.goTo('scrFeed');
}

// =====================================================
// Проверка дневного лимита
// =====================================================

async function checkDailyLimit() {
  try {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!user) return false;
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count, error } = await window.sb
      .from('user_stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (error) throw error;
    if (count >= STORY_MAX_DAILY) {
      const limitMsg = document.getElementById('storyLimitMsg');
      const btn = document.getElementById('storyPublishBtn');
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
// Сжатие фото (1080x1920, quality 0.75)
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
        canvas.toBlob(function(blob) {
          resolve(blob || file);
        }, 'image/jpeg', 0.75);
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
  if (!user) throw new Error('Требуется авторизация');
  const mimeType = blob.type || 'image/jpeg';
  const extMap = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/jpeg': 'jpg'
  };
  const ext = extMap[mimeType] || 'jpg';
  const name = user.id + '/' + Date.now() + '-' +
    Math.random().toString(36).substring(2, 8) + '.' + ext;
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
      resetPublishBtn();
      return;
    }

    const [canPost, compressed] = await Promise.all([
      checkDailyLimit(),
      storyCompressImage(_storyFile)
    ]);

    if (!canPost) {
      if (window.showToast) window.showToast('Лимит историй исчерпан');
      resetPublishBtn();
      return;
    }

    if (btn) btn.textContent = 'Загрузка...';
    const imageUrl = await storyUploadImage(compressed);

    if (btn) btn.textContent = 'Сохранение...';
    const caption = document.getElementById('storyCaptionInput');
    const captionText = caption
      ? caption.value.trim().substring(0, STORY_MAX_CAPTION) : '';

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
    const msg = err.message || 'Неизвестная ошибка';
    if (window.showToast) window.showToast('Ошибка: ' + msg);
    resetPublishBtn();
  }
}

function resetPublishBtn() {
  const btn = document.getElementById('storyPublishBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'Опубликовать'; }
}

// =====================================================
// EXPORTS
// =====================================================

window.initStoryCreate = initStoryCreate;
window.closeStoryCreate = closeStoryCreate;
window.publishStory = publishStory;
window.triggerFilePicker = triggerFilePicker;
