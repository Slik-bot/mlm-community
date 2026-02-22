// ===== WALLET SCREEN — баланс, транзакции, вывод =====

let walletBalance = 0;

const TX_TYPES = {
  deposit: { label: 'Пополнение', sign: '+', color: 'var(--green)' },
  withdrawal: { label: 'Вывод', sign: '-', color: 'var(--red)' },
  purchase: { label: 'Покупка', sign: '-', color: 'var(--red)' },
  reward: { label: 'Награда', sign: '+', color: 'var(--green)' },
  referral: { label: 'Реферал', sign: '+', color: 'var(--green)' },
  deal_income: { label: 'Доход от сделки', sign: '+', color: 'var(--green)' },
  deal_payment: { label: 'Оплата сделки', sign: '-', color: 'var(--red)' },
  fee: { label: 'Комиссия', sign: '-', color: 'var(--red)' }
};

// ===== INIT =====

async function initWallet() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }
  await loadWalletBalance(user.id);
  await loadTransactions(user.id);
}

async function loadWalletBalance(userId) {
  const result = await window.sb.from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  walletBalance = (result.data && result.data.balance) ? result.data.balance : 0;
  const balEl = document.getElementById('walletBalance');
  if (balEl) {
    balEl.textContent = (walletBalance / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' руб.';
  }
}

async function loadTransactions(userId) {
  const result = await window.sb.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  const txList = result.data || [];
  renderTransactions(txList);
}

function renderTransactions(txList) {
  const listEl = document.getElementById('walletTxList');
  const emptyEl = document.getElementById('walletEmpty');
  if (!listEl) return;

  if (!txList.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = txList.map(function(tx) {
    const info = TX_TYPES[tx.type] || { label: tx.type || 'Операция', sign: '', color: 'var(--text-muted)' };
    const amount = tx.amount ? (tx.amount / 100) : 0;
    const amountStr = info.sign + amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const date = tx.created_at ? formatTxDate(tx.created_at) : '';
    const desc = tx.description || info.label;
    const isPlus = info.sign === '+';

    return '<div class="wallet-tx-item glass-card">' +
      '<div class="wallet-tx-left">' +
        '<div class="wallet-tx-icon" style="color:' + info.color + '">' +
          (isPlus
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>'
          ) +
        '</div>' +
        '<div class="wallet-tx-info">' +
          '<div class="wallet-tx-desc">' + walletEsc(desc) + '</div>' +
          '<div class="wallet-tx-date">' + date + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wallet-tx-amount' + (isPlus ? ' wallet-tx-amount--plus' : ' wallet-tx-amount--minus') + '">' +
        amountStr + ' P' +
      '</div>' +
    '</div>';
  }).join('');
}

function formatTxDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function walletEsc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== WITHDRAW MODAL =====

function openWithdrawModal() {
  const overlay = document.getElementById('walletModalOverlay');
  if (overlay) overlay.classList.remove('hidden');
  const amountInp = document.getElementById('withdrawAmount');
  const detailsInp = document.getElementById('withdrawDetails');
  if (amountInp) amountInp.value = '';
  if (detailsInp) detailsInp.value = '';
}

function closeWithdrawModal() {
  const overlay = document.getElementById('walletModalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

async function submitWithdrawal() {
  const user = getCurrentUser();
  if (!user) { showToast('Войдите в аккаунт'); return; }

  const amountInp = document.getElementById('withdrawAmount');
  const detailsInp = document.getElementById('withdrawDetails');
  const amount = parseFloat(amountInp ? amountInp.value : 0);
  const details = (detailsInp ? detailsInp.value : '').trim();

  if (!amount || amount <= 0) { showToast('Введите сумму'); return; }
  if (!details) { showToast('Укажите реквизиты'); return; }

  const amountCents = Math.round(amount * 100);
  if (amountCents > walletBalance) {
    showToast('Недостаточно средств');
    return;
  }

  const btn = document.getElementById('withdrawBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  const result = await window.sb.from('withdrawals').insert({
    user_id: user.id,
    amount: amountCents,
    details: details,
    status: 'pending'
  });

  if (result.error) {
    showToast('Ошибка отправки заявки');
    if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
    return;
  }

  showToast('Заявка на вывод отправлена');
  closeWithdrawModal();
  if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
}

// ===== EXPORTS =====

window.initWallet = initWallet;
window.openWithdrawModal = openWithdrawModal;
window.closeWithdrawModal = closeWithdrawModal;
window.submitWithdrawal = submitWithdrawal;
