// ═══════════════════════════════════════
// ПУБЛИКАЦИЯ ПОСТА
// Отделено от feed.js
// ═══════════════════════════════════════

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_POST_LENGTH = 5000;
const MAX_IMAGE_WIDTH = 1200;

// ===== ВАЛИДАЦИЯ =====

function validatePostContent(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Напишите что-нибудь!' };
  if (trimmed.length > MAX_POST_LENGTH) return { ok: false, error: 'Максимум ' + MAX_POST_LENGTH + ' символов' };
  return { ok: true, text: trimmed };
}

function validateImage(file) {
  if (!file) return { ok: true, file: null };
  if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
    return { ok: false, error: 'Только JPEG, PNG, WEBP' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: 'Фото не больше 5 МБ' };
  }
  return { ok: true, file: file };
}

// ===== СЖАТИЕ ФОТО =====

function compressImage(file) {
  return new Promise(function(resolve) {
    // Пропускаем маленькие файлы (<500KB)
    if (file.size < 500 * 1024) { resolve(file); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Ресайз если шире MAX_IMAGE_WIDTH
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round((height * MAX_IMAGE_WIDTH) / width);
          width = MAX_IMAGE_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(function(blob) {
          resolve(blob || file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function() { resolve(file); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(file); };
    reader.readAsDataURL(file);
  });
}

// ===== ПУБЛИКАЦИЯ — ПОДФУНКЦИИ =====

function validatePostData(contentArg) {
  const ta = document.getElementById('post-content') || document.getElementById('createTa');
  const btn = document.getElementById('publish-btn') || document.getElementById('pubBtn');
  const content = contentArg || (ta ? ta.value : '');
  const photo = typeof getPendingPhoto === 'function' ? getPendingPhoto() : null;

  const textResult = validatePostContent(content);
  if (!textResult.ok && !photo) {
    window.showToast?.(textResult.error);
    if (ta) ta.focus();
    return null;
  }
  const trimmed = textResult.ok ? textResult.text : '';

  if (photo) {
    const imgResult = validateImage(photo);
    if (!imgResult.ok) {
      window.showToast?.(imgResult.error);
      return null;
    }
  }

  if (!trimmed && !photo) {
    window.showToast?.('Напишите что-нибудь!');
    return null;
  }

  if (!getCurrentUser()) {
    window.showToast?.('Необходима авторизация');
    return null;
  }

  return { ta: ta, btn: btn, trimmed: trimmed, photo: photo };
}

function setPublishLoading(btn) {
  if (!btn) return '';
  const originalText = btn.textContent;
  btn.disabled = true;
  const txtEl = btn.querySelector('.create-publish-text');
  const loadEl = btn.querySelector('.create-publish-loader');
  if (txtEl && loadEl) {
    txtEl.style.display = 'none';
    loadEl.style.display = 'inline-flex';
  } else {
    btn.textContent = 'Публикую...';
  }
  return originalText;
}

async function uploadPostMedia(photo, btn) {
  let imageUrl = null;
  let imageUrls = [];

  const selImages = typeof getSelectedImages === 'function' ? getSelectedImages() : [];
  if (selImages.length > 0) {
    try {
      imageUrls = await window.uploadSelectedImages(function(cur, tot) {
        const txtEl = btn ? btn.querySelector('.create-publish-text') : null;
        if (txtEl) txtEl.textContent = 'Загрузка ' + cur + '/' + tot + '...';
        else if (btn) btn.textContent = 'Загрузка ' + cur + '/' + tot + '...';
      });
      if (imageUrls.length) imageUrl = imageUrls[0];
    } catch (uploadErr) {
      console.error('[PUBLISH] Image upload failed:', uploadErr);
      window.showToast?.('Ошибка загрузки фото');
      return null;
    }
  } else if (photo && typeof sbUploadImage === 'function') {
    const compressed = await compressImage(photo);
    imageUrl = await sbUploadImage(compressed);
    if (imageUrl) imageUrls = [imageUrl];
  }

  return { imageUrl: imageUrl, imageUrls: imageUrls };
}

async function savePostToDb(trimmed, imageUrl, imageUrls) {
  const isEdit = window._editingPostId;

  if (isEdit) {
    const update = { content: trimmed };
    if (imageUrl) update.image_url = imageUrl;
    if (imageUrls.length) update.images = imageUrls;
    const resp = await sb.from('posts').update(update).eq('id', isEdit).select().single();
    if (resp.error) throw resp.error;
    window._editingPostId = null;
    return { result: resp.data, isEdit: true };
  }

  const postType = window.currentPostType || 'post';
  let pollData = null;
  if (postType === 'poll' && window.currentPollInstance) {
    pollData = window.currentPollInstance.getData();
    if (!pollData) {
      window.showToast?.('Добавьте минимум 2 варианта ответа');
      return null;
    }
  }
  const result = await sbCreatePost(trimmed, postType, imageUrl, pollData, imageUrls);
  if (!result) throw new Error('Не удалось создать пост');
  return { result: result, isEdit: false };
}

async function notifyAfterPublish(ta, isEdit) {
  if (ta) ta.value = '';
  if (typeof clearPendingPhoto === 'function') clearPendingPhoto();
  if (typeof clearSelectedImages === 'function') clearSelectedImages();

  const modal = document.querySelector('.create-modal');
  if (modal) {
    modal.classList.remove('create-modal--visible');
    setTimeout(function() { modal.remove(); }, 250);
  } else {
    goTo('scrFeed');
  }

  await new Promise(function(r) { setTimeout(r, 300); });

  if (typeof window.loadFeed === 'function') {
    try {
      await window.loadFeed();
    } catch (feedErr) {
      console.error('Failed to reload feed:', feedErr);
      location.reload();
    }
  } else {
    console.error('window.loadFeed not found, reloading page');
    location.reload();
  }

  window.showToast?.(isEdit ? 'Пост обновлён!' : 'Пост опубликован! +15 XP');
}

function handlePublishError(err) {
  console.error('Publish error:', err);
  let message = 'Ошибка публикации';
  if (err && err.message) {
    if (err.message.includes('auth')) message = 'Необходима авторизация';
    else if (err.message.includes('permission')) message = 'Нет прав на создание поста';
    else if (err.message.includes('network') || err.message.includes('fetch')) message = 'Проблема с интернетом';
  }
  window.showToast?.(message);
}

function resetPublishButton(btn, originalText) {
  if (!btn) return;
  btn.disabled = false;
  const txtEl = btn.querySelector('.create-publish-text');
  const loadEl = btn.querySelector('.create-publish-loader');
  if (txtEl && loadEl) {
    txtEl.style.display = '';
    loadEl.style.display = 'none';
  } else {
    btn.textContent = originalText || 'Опубликовать';
  }
}

// ===== ПУБЛИКАЦИЯ — ОРКЕСТРАТОР =====

async function doPublish(contentArg) {
  const data = validatePostData(contentArg);
  if (!data) return;

  const originalText = setPublishLoading(data.btn);

  try {
    const media = await uploadPostMedia(data.photo, data.btn);
    if (!media) return;

    const saved = await savePostToDb(data.trimmed, media.imageUrl, media.imageUrls);
    if (!saved) return;

    await notifyAfterPublish(data.ta, saved.isEdit);
  } catch (err) {
    handlePublishError(err);
  } finally {
    resetPublishButton(data.btn, originalText);
  }
}

// ЭКСПОРТЫ
window.doPublish = doPublish;
window.validatePostContent = validatePostContent;
window.validateImage = validateImage;
window.compressImage = compressImage;
window.validatePostData = validatePostData;
window.uploadPostMedia = uploadPostMedia;
window.savePostToDb = savePostToDb;
window.notifyAfterPublish = notifyAfterPublish;
