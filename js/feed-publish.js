// ═══════════════════════════════════════
// ПУБЛИКАЦИЯ ПОСТА
// Отделено от feed.js
// ═══════════════════════════════════════

var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
var MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
var MAX_POST_LENGTH = 5000;
var MAX_IMAGE_WIDTH = 1200;

// ===== ВАЛИДАЦИЯ =====

function validatePostContent(text) {
  var trimmed = text.trim();
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

    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;

        // Ресайз если шире MAX_IMAGE_WIDTH
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round((height * MAX_IMAGE_WIDTH) / width);
          width = MAX_IMAGE_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
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

// ===== ПУБЛИКАЦИЯ =====

async function doPublish(contentArg) {
  // Поддержка модалки и шаблона scrCreate
  var ta = document.getElementById('post-content') || document.getElementById('createTa');
  var btn = document.getElementById('publish-btn') || document.getElementById('pubBtn');
  var content = contentArg || (ta ? ta.value : '');
  var photo = typeof getPendingPhoto === 'function' ? getPendingPhoto() : null;

  // Валидация текста
  var textResult = validatePostContent(content);
  if (!textResult.ok && !photo) {
    window.showToast?.(textResult.error);
    if (ta) ta.focus();
    return;
  }
  var trimmed = textResult.ok ? textResult.text : '';

  // Валидация фото
  if (photo) {
    var imgResult = validateImage(photo);
    if (!imgResult.ok) {
      window.showToast?.(imgResult.error);
      return;
    }
  }

  // Нужен хотя бы текст или фото
  if (!trimmed && !photo) {
    window.showToast?.('Напишите что-нибудь!');
    return;
  }

  // Проверка авторизации
  if (typeof currentAuthUser === 'undefined' || !currentAuthUser) {
    window.showToast?.('Необходима авторизация');
    return;
  }

  // Состояние загрузки
  var originalText = '';
  if (btn) {
    originalText = btn.textContent;
    btn.disabled = true;
    var txtEl = btn.querySelector('.create-publish-text');
    var loadEl = btn.querySelector('.create-publish-loader');
    if (txtEl && loadEl) {
      txtEl.style.display = 'none';
      loadEl.style.display = 'inline-flex';
    } else {
      btn.textContent = 'Публикую...';
    }
  }

  try {
    var imageUrl = null;
    var imageUrls = [];

    // Множественные фото (feed-media.js)
    var selImages = typeof getSelectedImages === 'function' ? getSelectedImages() : [];
    if (selImages.length > 0) {
      try {
        imageUrls = await window.uploadSelectedImages(function(cur, tot) {
          var txtEl = btn ? btn.querySelector('.create-publish-text') : null;
          if (txtEl) txtEl.textContent = 'Загрузка ' + cur + '/' + tot + '...';
          else if (btn) btn.textContent = 'Загрузка ' + cur + '/' + tot + '...';
        });
        if (imageUrls.length) imageUrl = imageUrls[0];
      } catch (uploadErr) {
        console.error('[PUBLISH] Image upload failed:', uploadErr);
        window.showToast?.('Ошибка загрузки фото');
        return;
      }
    } else if (photo && typeof sbUploadImage === 'function') {
      // Одиночное фото (старый способ)
      var compressed = await compressImage(photo);
      imageUrl = await sbUploadImage(compressed);
      if (imageUrl) imageUrls = [imageUrl];
    }

    var isEdit = window._editingPostId;
    var result;

    if (isEdit) {
      var update = { content: trimmed };
      if (imageUrl) update.image_url = imageUrl;
      if (imageUrls.length) update.images = imageUrls;
      var resp = await sb.from('posts').update(update).eq('id', isEdit).select().single();
      if (resp.error) throw resp.error;
      result = resp.data;
      window._editingPostId = null;
    } else {
      var postType = window.currentPostType || 'post';
      var pollData = null;
      if (postType === 'poll' && window.currentPollInstance) {
        pollData = window.currentPollInstance.getData();
        if (!pollData) {
          window.showToast?.('Добавьте минимум 2 варианта ответа');
          return;
        }
      }
      result = await sbCreatePost(trimmed, postType, imageUrl, pollData, imageUrls);
    }

    if (!result) throw new Error('Не удалось создать пост');

    // Очистить форму
    if (ta) ta.value = '';
    if (typeof clearPendingPhoto === 'function') clearPendingPhoto();
    if (typeof clearSelectedImages === 'function') clearSelectedImages();

    // Закрыть модалку или вернуться в ленту
    var modal = document.querySelector('.create-modal');
    if (modal) {
      modal.classList.remove('create-modal--visible');
      setTimeout(function() { modal.remove(); }, 250);
    } else {
      goTo('scrFeed');
    }

    // Подождать анимацию закрытия
    await new Promise(function(r) { setTimeout(r, 300); });

    // Обновить ленту
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

  } catch (err) {
    console.error('Publish error:', err);

    // Понятное сообщение пользователю
    var message = 'Ошибка публикации';
    if (err && err.message) {
      if (err.message.includes('auth')) message = 'Необходима авторизация';
      else if (err.message.includes('permission')) message = 'Нет прав на создание поста';
      else if (err.message.includes('network') || err.message.includes('fetch')) message = 'Проблема с интернетом';
    }
    window.showToast?.(message);

  } finally {
    // Восстановить кнопку
    if (btn) {
      btn.disabled = false;
      var txtEl2 = btn.querySelector('.create-publish-text');
      var loadEl2 = btn.querySelector('.create-publish-loader');
      if (txtEl2 && loadEl2) {
        txtEl2.style.display = '';
        loadEl2.style.display = 'none';
      } else {
        btn.textContent = originalText || 'Опубликовать';
      }
    }
  }
}

// ЭКСПОРТЫ
window.doPublish = doPublish;
window.validatePostContent = validatePostContent;
window.validateImage = validateImage;
window.compressImage = compressImage;
