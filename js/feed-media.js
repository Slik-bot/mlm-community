// =======================================
// МЕДИА ДЛЯ ПОСТОВ — ЗАГРУЗКА ФОТО
// Выбор, сжатие, превью, загрузка
// =======================================

let selectedImages = [];
const MAX_IMAGES = 10;
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Открыть выбор файлов
function openImagePicker() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.addEventListener('change', function(e) {
      let files = Array.from(e.target.files);
      if (!files.length) return;

      // Лимит количества
      const remaining = MAX_IMAGES - selectedImages.length;
      if (files.length > remaining) {
        window.showToast?.('Максимум ' + MAX_IMAGES + ' фото');
        files = files.slice(0, remaining);
      }
      if (!files.length) return;

      // Валидация каждого файла
      for (let i = 0; i < files.length; i++) {
        if (ALLOWED_TYPES.indexOf(files[i].type) === -1) {
          window.showToast?.('Только JPEG, PNG, WEBP');
          return;
        }
        if (files[i].size > MAX_IMAGE_FILE_SIZE) {
          window.showToast?.('Файл слишком большой (макс 10MB)');
          return;
        }
      }

      processImages(files);
    });

    input.click();
  } catch (err) {
    console.error('[MEDIA] openImagePicker error:', err);
    window.showToast?.('Ошибка открытия выбора файлов');
  }
}

// Обработать выбранные изображения
async function processImages(files) {
  try {
    const container = document.querySelector('.create-preview');
    if (!container) {
      console.error('[MEDIA] .create-preview not found');
      return;
    }

    container.style.display = 'grid';
    container.innerHTML = '<div class="preview-loading">Обработка...</div>';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressMediaImage(file);
        const preview = await readAsDataURL(compressed);
        selectedImages.push({
          file: compressed,
          preview: preview,
          name: file.name,
          size: compressed.size
        });
      } catch (processErr) {
        console.error('[MEDIA] Failed to process:', file.name, processErr);
        window.showToast?.('Ошибка обработки ' + file.name);
      }
    }

    renderImagePreviews();
    updatePublishButton();
  } catch (err) {
    console.error('[MEDIA] processImages error:', err);
    window.showToast?.('Ошибка обработки изображений');
  }
}

// Сжатие через canvas (1920px, 85%)
function compressMediaImage(file) {
  return new Promise(function(resolve, reject) {
    // Пропустить маленькие файлы
    if (file.size < 300 * 1024) { resolve(file); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const MAX_DIM = 1920;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        canvas.toBlob(function(blob) {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function() { reject(new Error('Image load failed')); };
      img.src = e.target.result;
    };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

// Прочитать файл как DataURL
function readAsDataURL(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function() { reject(new Error('Read failed')); };
    reader.readAsDataURL(file);
  });
}

// Отрисовать превью
function renderImagePreviews() {
  const container = document.querySelector('.create-preview');
  if (!container) return;

  if (!selectedImages.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'grid';
  let html = '';
  for (let i = 0; i < selectedImages.length; i++) {
    const img = selectedImages[i];
    const sizeKB = Math.round(img.size / 1024);
    html +=
      '<div class="preview-item">' +
        '<img src="' + img.preview + '" alt="">' +
        '<button class="preview-remove" data-index="' + i + '" aria-label="Удалить">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/>' +
          '</svg>' +
        '</button>' +
        '<div class="preview-info">' + sizeKB + 'KB</div>' +
      '</div>';
  }
  container.innerHTML = html;

  // Обработчики удаления
  container.querySelectorAll('.preview-remove').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      selectedImages.splice(idx, 1);
      renderImagePreviews();
      updatePublishButton();
    });
  });
}

// Обновить состояние кнопки публикации
function updatePublishButton() {
  const btn = document.querySelector('#publish-btn');
  const ta = document.querySelector('#post-content');
  if (!btn) return;
  const hasText = ta && ta.value.trim().length > 0;
  const hasImages = selectedImages.length > 0;
  btn.disabled = !(hasText || hasImages);
}

// Загрузить все изображения в Supabase
async function uploadSelectedImages(onProgress) {
  if (!selectedImages.length) return [];

  if (typeof sbUploadImage !== 'function') {
    throw new Error('sbUploadImage not available');
  }

  const urls = [];
  for (let i = 0; i < selectedImages.length; i++) {
    if (onProgress) onProgress(i + 1, selectedImages.length);
    const url = await sbUploadImage(selectedImages[i].file);
    if (!url) throw new Error('Upload failed for image ' + (i + 1));
    urls.push(url);
  }

  return urls;
}

// Очистить выбранные изображения
function clearSelectedImages() {
  selectedImages = [];
  renderImagePreviews();
}

// Получить выбранные изображения
function getSelectedImages() {
  return selectedImages;
}

// ЭКСПОРТЫ
window.openImagePicker = openImagePicker;
window.uploadSelectedImages = uploadSelectedImages;
window.clearSelectedImages = clearSelectedImages;
window.getSelectedImages = getSelectedImages;
