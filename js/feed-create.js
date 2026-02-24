// =======================================
// СОЗДАНИЕ ПОСТА (UI-ФЛОУ)
// Отделено от feed.js
// =======================================

let fabOpen = false;
function toggleFab() {
  fabOpen = !fabOpen;
  document.getElementById('fabBtn').classList.toggle('open', fabOpen);
  document.getElementById('fabMenu').classList.toggle('show', fabOpen);
  document.getElementById('dimOverlay').classList.toggle('show', fabOpen);
}
function closeFab() { if (fabOpen) toggleFab(); }
function closeDim() { closeFab(); closePopovers(); }

let _photoInited = false;
let currentPostType = 'post';
let currentPollInstance = null;

function openCreate(type) {
  closeFab();
  currentPostType = type || 'post';

  // Удалить старую модалку если есть
  const old = document.querySelector('.create-modal');
  if (old) old.remove();

  // Данные автора
  const profile = (typeof currentProfile !== 'undefined') ? currentProfile : null;
  const name = (profile && profile.name) ? profile.name : 'Участник';
  const avatarUrl = (profile && profile.avatar_url) ? profile.avatar_url : '';
  const avaHtml = avatarUrl
    ? '<img class="create-avatar" src="' + avatarUrl + '" alt="">'
    : '<div class="create-avatar create-avatar--empty">' + (typeof escHtml === 'function' ? escHtml(name[0]) : name[0]) + '</div>';
  const maxLen = (typeof MAX_POST_LENGTH !== 'undefined') ? MAX_POST_LENGTH : 5000;

  // Создать премиум модалку
  const modal = document.createElement('div');
  modal.className = 'create-modal';
  modal.innerHTML =
    '<div class="create-overlay"></div>' +
    '<div class="create-container">' +
      '<div class="create-header">' +
        '<button class="create-back-btn" aria-label="Назад">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" stroke-width="2"/></svg>' +
        '</button>' +
        '<h2>Создать пост</h2>' +
        '<button class="create-close-btn" aria-label="Закрыть">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="create-modal-author">' +
        avaHtml +
        '<div class="create-author-info">' +
          '<div class="create-author-name">' + (typeof escHtml === 'function' ? escHtml(name) : name) + '</div>' +
          '<div class="create-author-meta">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' +
            ' Публичный пост' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="create-editor">' +
        '<textarea id="post-content" class="create-textarea" placeholder="О чём думаете? Поделитесь с сообществом..." maxlength="' + maxLen + '" rows="6"></textarea>' +
        '<div class="create-counter"><span class="create-counter-current">0</span> / ' + maxLen + '</div>' +
      '</div>' +
      '<div class="create-preview" style="display:none"></div>' +
      '<div class="type-extra-content"></div>' +
      '<div class="create-tools">' +
        '<div class="create-tools-left">' +
          '<button class="create-tool-btn" data-type="image" title="Фото">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2"/></svg>' +
          '</button>' +
          '<button class="create-tool-btn" disabled title="Видео (скоро)">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/></svg>' +
          '</button>' +
          '<button class="create-tool-btn" data-type="poll" title="Опрос">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="create-footer">' +
        '<button class="create-publish" id="publish-btn" disabled>' +
          '<span class="create-publish-text">Опубликовать</span>' +
          '<span class="create-publish-loader" style="display:none">' +
            '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24"><circle class="spinner-path" cx="12" cy="12" r="10" fill="none" stroke-width="3"/></svg>' +
          '</span>' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);

  // Анимация появления
  requestAnimationFrame(function() { modal.classList.add('create-modal--visible'); });

  setupCreateModal(modal);
}

function setupCreateMedia(modal) {
  const photoBtn = modal.querySelector('[data-type="image"]');
  if (photoBtn) {
    photoBtn.addEventListener('click', function() {
      if (typeof window.openImagePicker === 'function') {
        window.openImagePicker();
      } else {
        console.error('[CREATE] openImagePicker not found');
        window.showToast?.('Загрузка фото недоступна');
      }
    });
  }

  const pollBtn = modal.querySelector('[data-type="poll"]');
  if (pollBtn) {
    pollBtn.addEventListener('click', function() {
      if (currentPollInstance) {
        currentPollInstance.destroy();
        currentPollInstance = null;
        currentPostType = 'post';
        pollBtn.classList.remove('active');
        return;
      }
      const pollContainer = modal.querySelector('.type-extra-content');
      if (pollContainer && window.createPoll) {
        currentPostType = 'poll';
        currentPollInstance = window.createPoll(pollContainer);
        pollBtn.classList.add('active');
      }
    });
  }
}

function setupCreateTextarea(modal, publishBtn) {
  const textarea = modal.querySelector('.create-textarea');
  const counter = modal.querySelector('.create-counter-current');
  const maxLen = (typeof MAX_POST_LENGTH !== 'undefined') ? MAX_POST_LENGTH : 5000;

  setTimeout(function() { if (textarea) textarea.focus(); }, 250);

  if (textarea) {
    textarea.addEventListener('input', function() {
      const len = textarea.value.length;
      if (counter) {
        counter.textContent = len;
        counter.classList.toggle('create-counter-warning', len > maxLen - 200);
        counter.classList.toggle('create-counter-danger', len > maxLen - 50);
      }
      if (publishBtn) publishBtn.disabled = (len === 0);
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
    });
  }
}

function setupCreateActions(modal, closeModal) {
  const closeBtn = modal.querySelector('.create-close-btn');
  const backBtn = modal.querySelector('.create-back-btn');
  const overlay = modal.querySelector('.create-overlay');
  const container = modal.querySelector('.create-container');
  const textarea = modal.querySelector('.create-textarea');
  const publishBtn = modal.querySelector('#publish-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backBtn) backBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  const header = modal.querySelector('.create-header');
  if (header && container && typeof window.addDragDismiss === 'function') {
    window.addDragDismiss(header, {
      moveTarget: container,
      fadeTarget: overlay,
      threshold: 100,
      onDismiss: function() { closeModal(); }
    });
  }

  function escHandler(e) { if (e.key === 'Escape') closeModal(); }
  document.addEventListener('keydown', escHandler);
  modal._escHandler = escHandler;

  if (publishBtn) {
    publishBtn.addEventListener('click', async function() {
      const content = textarea ? textarea.value.trim() : '';
      if (!content) {
        window.showToast?.('Напишите что-нибудь!');
        if (textarea) textarea.focus();
        return;
      }
      await window.doPublish(content);
    });
  }
}

function setupCreateModal(modal) {
  const publishBtn = modal.querySelector('#publish-btn');

  function closeModal() {
    if (currentPollInstance) { currentPollInstance.destroy(); currentPollInstance = null; }
    if (typeof window.clearSelectedImages === 'function') window.clearSelectedImages();
    const header = modal.querySelector('.create-header');
    if (header && typeof window.removeDragDismiss === 'function') {
      window.removeDragDismiss(header);
    }
    modal.classList.remove('create-modal--visible');
    setTimeout(function() { modal.remove(); }, 250);
    if (modal._escHandler) document.removeEventListener('keydown', modal._escHandler);
  }

  setupCreateMedia(modal);
  setupCreateTextarea(modal, publishBtn);
  setupCreateActions(modal, closeModal);
}

// ===== PHOTO UPLOAD =====
let _pendingPhoto = null;

function initPhotoButton() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.id = 'photoFileInput';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Фото не больше 5 МБ'); fileInput.value = ''; return; }
    _pendingPhoto = file;
    showPhotoPreview(file);
    fileInput.value = '';
  });

  const toolbarBtns = document.querySelectorAll('#scrCreate .tb-btn');
  if (toolbarBtns[0]) {
    toolbarBtns[0].addEventListener('click', function(e) {
      e.preventDefault();
      fileInput.click();
    });
  }
}

function showPhotoPreview(file) {
  removePhotoPreview();
  const reader = new FileReader();
  reader.onload = function(e) {
    const wrap = document.createElement('div');
    wrap.id = 'photoPreview';
    wrap.style.cssText = 'position:relative;margin:8px 14px;';
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.cssText = 'width:100%;border-radius:10px;max-height:200px;object-fit:cover;';
    wrap.appendChild(img);
    const del = document.createElement('div');
    del.textContent = '✕';
    del.style.cssText = 'position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;';
    del.onclick = function() { _pendingPhoto = null; removePhotoPreview(); };
    wrap.appendChild(del);
    const ta = document.getElementById('createTa');
    if (ta) ta.parentNode.insertBefore(wrap, ta.nextSibling);
  };
  reader.readAsDataURL(file);
}

function removePhotoPreview() {
  const old = document.getElementById('photoPreview');
  if (old) old.remove();
}

window.getPendingPhoto = function() { return _pendingPhoto; };
window.clearPendingPhoto = function() { _pendingPhoto = null; removePhotoPreview(); };

function checkPublish() {
  const ta = document.getElementById('createTa');
  const btn = document.getElementById('pubBtn');
  const count = document.getElementById('createCount');
  if (!ta || !btn) return;
  let text = ta.value;
  const maxLen = (typeof MAX_POST_LENGTH !== 'undefined') ? MAX_POST_LENGTH : 5000;
  if (text.length > maxLen) {
    ta.value = text.substring(0, maxLen);
    text = ta.value;
  }
  const hasText = text.trim().length > 0;
  const hasPhoto = typeof getPendingPhoto === 'function' && getPendingPhoto();
  btn.className = (hasText || hasPhoto) ? btn.className.replace('off', 'on') : btn.className.replace('on', 'off');
  if (count) {
    count.textContent = text.length + ' / ' + maxLen;
    if (text.length > maxLen - 50) { count.className = 'tb-count red'; }
    else if (text.length > maxLen - 500) { count.className = 'tb-count orange'; }
    else if (text.length > 0) { count.className = 'tb-count green'; }
    else { count.className = 'tb-count dim'; }
  }
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
}

// ЭКСПОРТЫ
window.setupCreateMedia = setupCreateMedia;
window.setupCreateTextarea = setupCreateTextarea;
window.setupCreateActions = setupCreateActions;
