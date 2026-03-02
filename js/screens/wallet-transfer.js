// ═══════════════════════════════════════
// WALLET TRANSFER — логика переводов
// Отделено от wallet.js
// ═══════════════════════════════════════

/* === STATE === */

let transferFeePercent = 5;
let transferDebounce = null;

/* === OPEN / CLOSE === */

function openTransferModal() {
  const modal = document.querySelector('.wallet-transfer-modal');
  const backdrop = document.querySelector('.wallet-modal-backdrop');

  const search = document.getElementById('transferSearch');
  const results = document.getElementById('transferSearchResults');
  const recipient = document.getElementById('transferRecipient');
  const amount = document.getElementById('transferAmount');
  const btn = document.getElementById('transferSubmit');

  if (search) search.value = '';
  if (results) { results.innerHTML = ''; results.classList.remove('active'); }
  if (recipient) recipient.classList.remove('active');
  if (amount) amount.value = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Перевести'; }

  window.walletState.transferRecipient = null;
  updateTransferFee();

  if (modal) modal.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
}

function closeTransferModal() {
  const modal = document.querySelector('.wallet-transfer-modal');
  const backdrop = document.querySelector('.wallet-modal-backdrop');
  if (modal) modal.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

/* === SEARCH USERS === */

function searchTransferUser(query) {
  clearTimeout(transferDebounce);
  const results = document.getElementById('transferSearchResults');
  if (!results) return;

  if (!query || query.length < 2) {
    results.innerHTML = '';
    results.classList.remove('active');
    return;
  }

  transferDebounce = setTimeout(async function() {
    try {
      const { data, error } = await window.sb
        .from('users')
        .select('id,name,avatar_url')
        .ilike('name', '%' + query + '%')
        .limit(5);

      if (error) throw error;
      renderTransferResults(data || []);
    } catch (err) {
      console.error('[searchTransferUser]', err);
      results.innerHTML = '<div class="wallet-search-item"><span class="wallet-search-item-name">Ошибка поиска</span></div>';
      results.classList.add('active');
    }
  }, 300);
}

/* === RENDER SEARCH RESULTS === */

function renderTransferResults(users) {
  const container = document.getElementById('transferSearchResults');
  if (!container) return;

  if (!users.length) {
    container.innerHTML = '<div class="wallet-search-item"><span class="wallet-search-item-name">Пользователь не найден</span></div>';
    container.classList.add('active');
    return;
  }

  const esc = window.escW || function(s) { return s || ''; };
  let html = '';
  users.forEach(function(u) {
    const avatar = u.avatar_url || '';
    html += '<div class="wallet-search-item" onclick="selectTransferRecipient(' + JSON.stringify(JSON.stringify(u)) + ')">' +
      '<img class="wallet-search-item-avatar" src="' + esc(avatar) + '" alt="" onerror="this.style.display=\'none\'">' +
      '<span class="wallet-search-item-name">' + esc(u.name) + '</span>' +
    '</div>';
  });

  container.innerHTML = html;
  container.classList.add('active');
}

/* === SELECT RECIPIENT === */

function selectTransferRecipient(userJson) {
  const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
  window.walletState.transferRecipient = user;

  const block = document.getElementById('transferRecipient');
  const avatar = document.getElementById('transferRecipientAvatar');
  const name = document.getElementById('transferRecipientName');
  const results = document.getElementById('transferSearchResults');

  if (avatar) avatar.src = user.avatar_url || '';
  if (name) name.textContent = user.name || '';
  if (block) block.classList.add('active');
  if (results) { results.innerHTML = ''; results.classList.remove('active'); }

  checkTransferReady();
}

/* === UPDATE FEE === */

function updateTransferFee() {
  const inp = document.getElementById('transferAmount');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  const fee = Math.ceil(amount * transferFeePercent / 100);
  const total = amount + fee;
  const c = window.convertTf ? window.convertTf(amount, window.walletState.rate) : { usd: 0 };

  const convEl = document.getElementById('transferConvert');
  const feeEl = document.getElementById('transferFee');
  const totalEl = document.getElementById('transferTotal');

  if (convEl) convEl.textContent = '≈ $' + c.usd.toFixed(2);
  if (feeEl) feeEl.textContent = 'Комиссия: ' + transferFeePercent + '% (' + fee + ' TF)';
  if (totalEl) totalEl.textContent = 'Итого спишется: ' + total + ' TF';

  checkTransferReady();
}

/* === CHECK READY === */

function checkTransferReady() {
  const btn = document.getElementById('transferSubmit');
  const inp = document.getElementById('transferAmount');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  if (btn) btn.disabled = !window.walletState.transferRecipient || amount <= 0;
}

/* === SUBMIT TRANSFER === */

async function submitTransfer() {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) return;

  const recipient = window.walletState.transferRecipient;
  const inp = document.getElementById('transferAmount');
  const amount = parseFloat(inp ? inp.value : 0) || 0;

  if (!recipient) { showToast('Выберите получателя'); return; }
  if (amount < 100) { showToast('Минимум 100 TF'); return; }
  if (amount > window.walletState.balance) { showToast('Недостаточно средств'); return; }

  const btn = document.getElementById('transferSubmit');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  try {
    const result = await window.createTransfer(user.id, recipient.id, amount);

    if (result.success) {
      closeTransferModal();
      if (window.showSuccessModal) window.showSuccessModal('Переведено ' + amount + ' TF');
      const wd = await window.getWalletData(user.id);
      window.walletState.balance = wd.balance_tf;
      if (window.renderHero) window.renderHero(wd, window.walletState.rate);
    } else {
      showToast('Ошибка: ' + (result.error || 'Неизвестная'));
    }
  } catch (err) {
    console.error('[submitTransfer]', err);
    showToast('Ошибка сети');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Перевести'; }
}

/* === LOAD FEE FROM SETTINGS === */

async function loadTransferFee() {
  try {
    const { data } = await window.sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'transfer_fee')
      .maybeSingle();

    if (data && data.value) transferFeePercent = Number(data.value) || 5;
  } catch (err) {
    console.error('[loadTransferFee]', err);
  }
}

/* === BIND EVENTS === */

function bindTransferEvents() {
  loadTransferFee();

  const search = document.getElementById('transferSearch');
  if (search) search.addEventListener('input', function() { searchTransferUser(search.value); });

  const amount = document.getElementById('transferAmount');
  if (amount) amount.addEventListener('input', updateTransferFee);

  const maxBtn = document.getElementById('transferMaxBtn');
  if (maxBtn) {
    maxBtn.addEventListener('click', function() {
      const inp = document.getElementById('transferAmount');
      if (inp) { inp.value = window.walletState.balance; updateTransferFee(); }
    });
  }

  const submitBtn = document.getElementById('transferSubmit');
  if (submitBtn) submitBtn.addEventListener('click', submitTransfer);
}

/* === EXPORTS === */

window.openTransferModal = openTransferModal;
window.closeTransferModal = closeTransferModal;
window.selectTransferRecipient = selectTransferRecipient;
window.submitTransfer = submitTransfer;
window.bindTransferEvents = bindTransferEvents;
