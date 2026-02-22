// ===== VERIFICATION SCREEN — загрузка документов =====

let verifPassportFile = null;
let verifSelfieFile = null;

const VERIF_STATUSES = {
  pending: { label: 'На рассмотрении', desc: 'Ваша заявка обрабатывается', color: 'var(--orange)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
  approved: { label: 'Подтверждена', desc: 'Ваша личность верифицирована', color: 'var(--green)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
  rejected: { label: 'Отклонена', desc: 'Попробуйте загрузить документы заново', color: 'var(--red)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' }
};

// ===== INIT =====

async function initVerification() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  verifPassportFile = null;
  verifSelfieFile = null;
  resetUploadPreviews();

  const existing = await checkExistingRequest(user.id);
  const statusEl = document.getElementById('verifStatus');
  const formEl = document.getElementById('verifForm');

  if (existing && existing.status !== 'rejected') {
    showVerifStatus(existing.status);
    if (statusEl) statusEl.classList.remove('hidden');
    if (formEl) formEl.classList.add('hidden');
  } else {
    if (statusEl) statusEl.classList.add('hidden');
    if (formEl) formEl.classList.remove('hidden');
  }
}

async function checkExistingRequest(userId) {
  const result = await window.sb.from('verification_requests')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  return (result.data && result.data.length > 0) ? result.data[0] : null;
}

function showVerifStatus(status) {
  const info = VERIF_STATUSES[status] || VERIF_STATUSES.pending;
  const iconEl = document.getElementById('verifStatusIcon');
  const labelEl = document.getElementById('verifStatusLabel');
  const descEl = document.getElementById('verifStatusDesc');
  const statusEl = document.getElementById('verifStatus');

  if (iconEl) { iconEl.innerHTML = info.icon; iconEl.style.color = info.color; }
  if (labelEl) { labelEl.textContent = info.label; labelEl.style.color = info.color; }
  if (descEl) descEl.textContent = info.desc;
  if (statusEl) statusEl.style.borderColor = info.color;
}

function resetUploadPreviews() {
  const ppPreview = document.getElementById('verifPassportPreview');
  const ppIcon = document.getElementById('verifPassportIcon');
  const sfPreview = document.getElementById('verifSelfiePreview');
  const sfIcon = document.getElementById('verifSelfieIcon');
  if (ppPreview) { ppPreview.classList.add('hidden'); ppPreview.src = ''; }
  if (ppIcon) ppIcon.classList.remove('hidden');
  if (sfPreview) { sfPreview.classList.add('hidden'); sfPreview.src = ''; }
  if (sfIcon) sfIcon.classList.remove('hidden');
}

// ===== FILE PICKERS =====

function pickPassport() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function() {
    if (!inp.files || !inp.files[0]) return;
    verifPassportFile = inp.files[0];
    previewFile(verifPassportFile, 'verifPassportPreview', 'verifPassportIcon');
  };
  inp.click();
}

function pickSelfie() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function() {
    if (!inp.files || !inp.files[0]) return;
    verifSelfieFile = inp.files[0];
    previewFile(verifSelfieFile, 'verifSelfiePreview', 'verifSelfieIcon');
  };
  inp.click();
}

function previewFile(file, previewId, iconId) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById(previewId);
    const icon = document.getElementById(iconId);
    if (preview) { preview.src = e.target.result; preview.classList.remove('hidden'); }
    if (icon) icon.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// ===== SUBMIT =====

async function submitVerification() {
  const user = getCurrentUser();
  if (!user) { showToast('Войдите в аккаунт'); return; }
  if (!verifPassportFile) { showToast('Загрузите фото паспорта'); return; }
  if (!verifSelfieFile) { showToast('Загрузите селфи'); return; }

  const btn = document.getElementById('verifSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Загрузка...'; }

  try {
    const ts = Date.now();
    const passportPath = 'verification-docs/' + user.id + '/passport-' + ts + '.jpg';
    const selfiePath = 'verification-docs/' + user.id + '/selfie-' + ts + '.jpg';

    const passUpload = await window.sb.storage.from('uploads').upload(passportPath, verifPassportFile, { upsert: true });
    if (passUpload.error) throw passUpload.error;

    const selfieUpload = await window.sb.storage.from('uploads').upload(selfiePath, verifSelfieFile, { upsert: true });
    if (selfieUpload.error) throw selfieUpload.error;

    const passUrl = window.sb.storage.from('uploads').getPublicUrl(passportPath).data.publicUrl;
    const selfieUrl = window.sb.storage.from('uploads').getPublicUrl(selfiePath).data.publicUrl;

    const result = await window.sb.from('verification_requests').insert({
      user_id: user.id,
      passport_url: passUrl,
      selfie_url: selfieUrl,
      status: 'pending'
    });

    if (result.error) throw result.error;

    showToast('Заявка отправлена');
    showVerifStatus('pending');
    const statusEl = document.getElementById('verifStatus');
    const formEl = document.getElementById('verifForm');
    if (statusEl) statusEl.classList.remove('hidden');
    if (formEl) formEl.classList.add('hidden');
  } catch (e) {
    console.error('Verification error:', e);
    showToast('Ошибка отправки');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Отправить на проверку'; }
}

// ===== EXPORTS =====

window.initVerification = initVerification;
window.pickPassport = pickPassport;
window.pickSelfie = pickSelfie;
window.submitVerification = submitVerification;
