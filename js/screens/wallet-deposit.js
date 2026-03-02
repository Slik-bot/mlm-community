// ═══════════════════════════════════════
// WALLET DEPOSIT FORM
// Отделено от wallet.js (490 строк > 470 лимит)
// ═══════════════════════════════════════

const TON_PRICE_FALLBACK = 3.7;
const DEPOSIT_MIN_TF = 100;

const DEPOSIT_CURRENCIES = {
  TON: 'TON',
  'USDT TRC20': 'USDT_TRC20',
  'USDT ERC20': 'USDT_ERC20'
};

/* === SELECT METHOD === */

function selectDepositMethod(method) {
  walletState.depositMethod = method;

  const form = document.getElementById('walletDepositForm');
  if (form) form.classList.remove('hidden');

  const addrs = document.querySelectorAll('.wallet-deposit-modal .wallet-deposit-addr');
  addrs.forEach(function(addr) {
    const label = addr.querySelector('.wallet-deposit-addr-label');
    const name = label ? label.textContent.trim() : '';
    addr.classList.toggle('selected', name === method);
  });

  const methodEl = document.getElementById('depositSummaryMethod');
  if (methodEl) methodEl.textContent = method;

  updateDepositConvert();
}

/* === UPDATE CONVERT === */

function updateDepositConvert() {
  const inp = document.getElementById('depositAmountTF');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  const convertEl = document.getElementById('depositConvert');
  const summaryTf = document.getElementById('depositSummaryTF');

  if (amount < DEPOSIT_MIN_TF) {
    if (convertEl) convertEl.textContent = 'Минимум ' + DEPOSIT_MIN_TF + ' TF';
    if (summaryTf) summaryTf.textContent = '— TF';
    canSubmitDeposit();
    return;
  }

  const rate = walletState.rate || { usd: 0.01 };
  const method = walletState.depositMethod || '';
  const usdValue = amount * (rate.usd || 0.01);

  if (method === 'TON') {
    const tonAmount = (usdValue / TON_PRICE_FALLBACK).toFixed(4);
    if (convertEl) convertEl.textContent = 'Нужно отправить: ≈ ' + tonAmount + ' TON';
  } else {
    if (convertEl) convertEl.textContent = 'Нужно отправить: ≈ $' + usdValue.toFixed(2) + ' USDT';
  }

  if (summaryTf) summaryTf.textContent = amount.toLocaleString('ru-RU') + ' TF';
  canSubmitDeposit();
}

/* === RECEIPT HANDLING === */

function handleDepositReceiptSelect(file) {
  if (!file) return;

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    showToast('Файл слишком большой. Максимум 5 МБ');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('depositReceiptPreview');
    const img = document.getElementById('depositReceiptImg');
    if (preview) preview.classList.remove('hidden');
    if (img) img.src = e.target.result;

    const zone = document.getElementById('depositReceiptZone');
    if (zone) zone.classList.add('hidden');

    walletState.depositReceipt = file;
    canSubmitDeposit();
  };
  reader.readAsDataURL(file);
}

function removeDepositReceipt() {
  walletState.depositReceipt = null;

  const preview = document.getElementById('depositReceiptPreview');
  const img = document.getElementById('depositReceiptImg');
  const fileInput = document.getElementById('depositReceiptFile');
  const zone = document.getElementById('depositReceiptZone');

  if (preview) preview.classList.add('hidden');
  if (img) img.src = '';
  if (fileInput) fileInput.value = '';
  if (zone) zone.classList.remove('hidden');

  canSubmitDeposit();
}

/* === CAN SUBMIT CHECK === */

function canSubmitDeposit() {
  const inp = document.getElementById('depositAmountTF');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  const btn = document.getElementById('depositSubmitBtn');

  const ok = amount >= DEPOSIT_MIN_TF
    && walletState.depositReceipt
    && walletState.depositMethod;

  if (btn) btn.disabled = !ok;
  return ok;
}

/* === SUBMIT === */

async function submitDepositRequest() {
  if (!canSubmitDeposit()) return;

  const user = getCurrentUser();
  if (!user) return;

  const btn = document.getElementById('depositSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправляем...'; }

  try {
    const amount = parseFloat(document.getElementById('depositAmountTF').value) || 0;
    const method = walletState.depositMethod;
    const txHash = (document.getElementById('depositTxHash').value || '').trim();

    const uploadRes = await uploadDepositReceipt(user.id, walletState.depositReceipt);
    if (uploadRes.error) {
      showToast(uploadRes.error);
      if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
      return;
    }

    const result = await createDepositRequest(
      user.id, amount, method, uploadRes.url, txHash
    );

    if (result.success) {
      closeDepositModal();
      showSuccessModal('Заявка на пополнение принята! Срок: до 24 часов');
      resetDepositForm();
    } else {
      showToast('Ошибка: ' + (result.error || 'Попробуйте позже'));
    }
  } catch (err) {
    console.error('[submitDepositRequest]', err);
    showToast('Ошибка сети');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
}

/* === RESET FORM === */

function resetDepositForm() {
  walletState.depositMethod = null;
  walletState.depositReceipt = null;

  const form = document.getElementById('walletDepositForm');
  if (form) form.classList.add('hidden');

  const amtInp = document.getElementById('depositAmountTF');
  const hashInp = document.getElementById('depositTxHash');
  if (amtInp) amtInp.value = '';
  if (hashInp) hashInp.value = '';

  removeDepositReceipt();

  const addrs = document.querySelectorAll('.wallet-deposit-addr.selected');
  addrs.forEach(function(a) { a.classList.remove('selected'); });

  const convertEl = document.getElementById('depositConvert');
  if (convertEl) convertEl.textContent = 'Укажите сумму для расчёта';

  wtText('depositSummaryTF', '— TF');
  wtText('depositSummaryMethod', '—');
}

/* === BIND EVENTS === */

function bindDepositEvents() {
  const fileInp = document.getElementById('depositReceiptFile');
  if (fileInp) {
    fileInp.addEventListener('change', function(e) {
      handleDepositReceiptSelect(e.target.files[0]);
    });
  }

  const amtInp = document.getElementById('depositAmountTF');
  if (amtInp) amtInp.addEventListener('input', updateDepositConvert);

  const addrs = document.querySelectorAll('.wallet-deposit-modal .wallet-deposit-addr');
  addrs.forEach(function(addr) {
    addr.addEventListener('click', function(e) {
      if (e.target.closest('.wallet-copy-btn')) return;
      const label = addr.querySelector('.wallet-deposit-addr-label');
      if (label) selectDepositMethod(label.textContent.trim());
    });
  });
}

/* === WRAP openDepositModal to reset form === */

const _origOpenDeposit = window.openDepositModal;
window.openDepositModal = function() {
  _origOpenDeposit();
  resetDepositForm();
};

/* === EXPORTS === */

window.selectDepositMethod = selectDepositMethod;
window.removeDepositReceipt = removeDepositReceipt;
window.submitDepositRequest = submitDepositRequest;
window.bindDepositEvents = bindDepositEvents;
