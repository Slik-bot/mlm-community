// ═══════════════════════════════════════
// WALLET SCREEN — баланс, конвертер, транзакции, вывод
// API: js/api/wallet.js | HTML: templates/wallet.html
// ═══════════════════════════════════════

/* === CONSTANTS === */

const TX_TYPES = {
  referral:     { label: 'Реферальный бонус', color: 'in' },
  task:         { label: 'За задание',        color: 'in' },
  reward:       { label: 'Награда',           color: 'in' },
  bonus:        { label: 'Бонус платформы',   color: 'in' },
  deposit:      { label: 'Пополнение',        color: 'in' },
  transfer_in:  { label: 'Перевод получен',   color: 'in' },
  deal_income:  { label: 'Доход от сделки',   color: 'in' },
  withdrawal:   { label: 'Вывод средств',     color: 'out' },
  purchase:     { label: 'Покупка',           color: 'out' },
  subscription: { label: 'Подписка',          color: 'out' },
  transfer_out: { label: 'Перевод отправлен', color: 'out' },
  deal_payment: { label: 'Оплата сделки',     color: 'out' },
  fee:          { label: 'Комиссия',          color: 'out' }
};

const TX_PAGE = 20;

/* === STATE === */

let walletState = {
  balance: 0, rate: { usd: 0.01 }, txFilter: 'all',
  txOffset: 0, txHasMore: true, loading: false,
  transferRecipient: null, balanceHidden: false, lastData: null
};

/* === INIT === */

async function initWallet() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  const skel = document.getElementById('walletSkeletons');
  const list = document.getElementById('walletTxList');
  if (skel) skel.classList.remove('hidden');
  if (list) list.innerHTML = '';

  Object.assign(walletState, { balance: 0, rate: { usd: 0.01 }, txFilter: 'all',
    txOffset: 0, txHasMore: true, loading: false, transferRecipient: null });

  try {
    const [wd, rate, txRes] = await Promise.all([
      getWalletData(user.id),
      getTfRate(),
      getTransactions(user.id, 'all', TX_PAGE, 0)
    ]);

    walletState.balance = wd.balance_tf;
    walletState.rate = rate;
    walletState.txHasMore = txRes.hasMore;

    renderHero(wd, rate);
    renderTransactions(txRes.data, false);
  } catch (err) {
    console.error('[initWallet]', err);
    showToast('Ошибка загрузки');
  }

  if (skel) skel.classList.add('hidden');
  bindWalletEvents();
}

/* === RENDER HERO === */

function renderHero(data, rate) {
  walletState.lastData = data;
  if (walletState.balanceHidden) return;
  const balEl = document.getElementById('walletBalanceTF');
  if (balEl) animateCounter(balEl, 0, data.balance_tf, 800);

  const c = convertTf(data.balance_tf, rate);
  wtText('walletBalanceUSD', '$' + c.usd.toFixed(2));
  wtText('walletBalanceRUB', c.rub.toLocaleString('ru-RU') + ' ₽');
  wtText('walletBalanceUSDT', c.usdt.toFixed(2) + ' USDT');

  wtText('walletMonthIn', data.received_month.toLocaleString('ru-RU') + ' TF');
  wtText('walletMonthOut', data.withdrawn_month.toLocaleString('ru-RU') + ' TF');

  const rateEl = document.getElementById('walletConverterRate');
  if (rateEl) {
    rateEl.textContent = 'Курс: 1 TF = $' + (rate.usd || 0.01).toFixed(2) + ' · обновлено только что';
  }
}

/* === HELPER — set textContent by id === */

function wtText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* === ANIMATE COUNTER === */

function animateCounter(el, from, to, duration) {
  const start = performance.now();
  const diff = to - from;

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const progress = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + diff * progress).toLocaleString('ru-RU');
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* === RENDER TRANSACTIONS === */

function renderTransactions(txList, append) {
  const container = document.getElementById('walletTxList');
  if (!container) return;
  if (!append) container.innerHTML = '';

  if (!txList || !txList.length) {
    if (!append && !container.children.length) {
      container.innerHTML =
        '<div class="wallet-history-date" style="text-align:center;padding:32px 0">' +
        'Операций пока нет</div>';
    }
    return;
  }

  const groups = buildDateGroups(txList);
  let html = '';

  groups.forEach(function(g) {
    html += '<div class="wallet-history-date">' + escW(g.label) + '</div>';
    g.items.forEach(function(tx) { html += buildTxCard(tx); });
  });

  container.insertAdjacentHTML('beforeend', html);
}

/* === BUILD DATE GROUPS === */

function buildDateGroups(txList) {
  const now = new Date();
  const todayKey = now.toLocaleDateString('ru-RU');
  const yesterdayKey = new Date(now - 86400000).toLocaleDateString('ru-RU');
  const map = new Map();

  txList.forEach(function(tx) {
    const d = tx.created_at ? new Date(tx.created_at) : now;
    const key = d.toLocaleDateString('ru-RU');
    const label = key === todayKey ? 'Сегодня' : key === yesterdayKey ? 'Вчера' : key;
    if (!map.has(key)) map.set(key, { label: label, items: [] });
    map.get(key).items.push(tx);
  });

  return Array.from(map.values());
}

/* === BUILD TX CARD === */

function buildTxCard(tx) {
  const isIn = tx.amount > 0;
  const info = TX_TYPES[tx.type] || {
    label: tx.type || 'Операция',
    color: isIn ? 'in' : 'out'
  };
  const abs = Math.abs(tx.amount || 0) / 100;
  const sign = isIn ? '+' : '−';
  const cls = isIn ? 'in' : 'out';
  const desc = tx.description || info.label;

  const time = tx.created_at
    ? new Date(tx.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '';

  const iconSvg = isIn
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';

  return '<div class="wallet-tx-card">' +
    '<div class="wallet-tx-icon wallet-tx-icon--' + cls + '">' + iconSvg + '</div>' +
    '<div class="wallet-tx-info">' +
      '<div class="wallet-tx-desc">' + escW(desc) + '</div>' +
      '<div class="wallet-tx-date">' + time + '</div>' +
    '</div>' +
    '<div class="wallet-tx-amount wallet-tx-amount--' + cls + '">' +
      sign + abs.toLocaleString('ru-RU') + ' TF' +
    '</div>' +
  '</div>';
}

/* === ESCAPE HTML === */

function escW(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* === BIND EVENTS === */

function bindWalletEvents() {
  const tabs = document.querySelectorAll('.wallet-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      const f = tab.getAttribute('data-filter');
      const mapped = f === 'in' ? 'income' : f === 'out' ? 'outcome' : 'all';
      tabs.forEach(function(t) { t.classList.remove('wallet-tab--active'); });
      tab.classList.add('wallet-tab--active');
      filterTransactions(mapped);
    });
  });

  const convInp = document.getElementById('walletConverterInput');
  if (convInp) convInp.addEventListener('input', updateConverter);

  const maxBtn = document.getElementById('withdrawMaxBtn');
  if (maxBtn) {
    maxBtn.addEventListener('click', function() {
      const inp = document.getElementById('withdrawAmount');
      if (inp) { inp.value = walletState.balance; updateWithdrawConvert(); }
    });
  }

  const wdAmount = document.getElementById('withdrawAmount');
  if (wdAmount) wdAmount.addEventListener('input', updateWithdrawConvert);

  const submitBtn = document.getElementById('withdrawSubmitBtn');
  if (submitBtn) submitBtn.addEventListener('click', submitWithdrawal);

  const overlay = document.getElementById('walletWithdrawOverlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeWithdrawModal();
    });
  }

  const backdrop = document.querySelector('.wallet-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', function() {
      closeDepositModal();
      if (window.closeTransferModal) window.closeTransferModal();
    });
  }

  if (window.bindTransferEvents) window.bindTransferEvents();
  if (window.bindDepositEvents) window.bindDepositEvents();

  setupTxSentinel();
}

/* === FILTER TRANSACTIONS === */

async function filterTransactions(filter) {
  const user = getCurrentUser();
  if (!user) return;

  walletState.txFilter = filter;
  walletState.txOffset = 0;
  walletState.txHasMore = true;

  try {
    const res = await getTransactions(user.id, filter, TX_PAGE, 0);
    walletState.txHasMore = res.hasMore;
    renderTransactions(res.data, false);
  } catch (err) {
    console.error('[filterTransactions]', err);
  }

  setupTxSentinel();
}

/* === LOAD MORE (infinite scroll) === */

async function loadMoreTransactions() {
  if (walletState.loading || !walletState.txHasMore) return;
  const user = getCurrentUser();
  if (!user) return;

  walletState.loading = true;
  walletState.txOffset += TX_PAGE;

  try {
    const res = await getTransactions(
      user.id, walletState.txFilter, TX_PAGE, walletState.txOffset
    );
    walletState.txHasMore = res.hasMore;
    renderTransactions(res.data, true);
  } catch (err) {
    console.error('[loadMoreTransactions]', err);
  }

  walletState.loading = false;
}

/* === TX SENTINEL (IntersectionObserver) === */

let walletObserver = null;

function setupTxSentinel() {
  if (walletObserver) { walletObserver.disconnect(); walletObserver = null; }

  const container = document.getElementById('walletTxList');
  if (!container) return;

  let sentinel = document.getElementById('walletTxSentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'walletTxSentinel';
    sentinel.style.height = '1px';
    container.parentNode.insertBefore(sentinel, container.nextSibling);
  }

  walletObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && walletState.txHasMore && !walletState.loading) {
      loadMoreTransactions();
    }
  }, { rootMargin: '200px' });

  walletObserver.observe(sentinel);
}

/* === CONVERTER === */

function updateConverter() {
  const inp = document.getElementById('walletConverterInput');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  const c = convertTf(amount, walletState.rate);

  wtText('convertUSD', '$' + c.usd.toFixed(2));
  wtText('convertUSDT', c.usdt.toFixed(2));
  wtText('convertRUB', c.rub.toLocaleString('ru-RU') + ' ₽');
}

/* === WITHDRAW MODAL === */

function openWithdrawModal() {
  const overlay = document.getElementById('walletWithdrawOverlay');
  if (overlay) overlay.classList.add('active');

  wtText('withdrawAvailable', walletState.balance.toLocaleString('ru-RU'));

  const amtInp = document.getElementById('withdrawAmount');
  const adrInp = document.getElementById('withdrawAddress');
  if (amtInp) amtInp.value = '';
  if (adrInp) adrInp.value = '';

  const radios = document.querySelectorAll('input[name="withdrawMethod"]');
  radios.forEach(function(r) { r.checked = false; });

  wtText('withdrawConvert', '≈ $0 · 0 ₽ · 0 USDT');

  const btn = document.getElementById('withdrawSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Подать заявку'; }
}

function closeWithdrawModal() {
  const overlay = document.getElementById('walletWithdrawOverlay');
  if (overlay) overlay.classList.remove('active');
}

/* === WITHDRAW — live convert === */

function updateWithdrawConvert() {
  const inp = document.getElementById('withdrawAmount');
  const amount = parseFloat(inp ? inp.value : 0) || 0;
  const c = convertTf(amount, walletState.rate);

  const text = '≈ $' + c.usd.toFixed(2) + ' · ' +
    c.rub.toLocaleString('ru-RU') + ' ₽ · ' +
    c.usdt.toFixed(2) + ' USDT';

  wtText('withdrawConvert', text);

  const btn = document.getElementById('withdrawSubmitBtn');
  if (btn) btn.disabled = amount <= 0;
}

/* === SUBMIT WITHDRAWAL === */

async function submitWithdrawal() {
  const user = getCurrentUser();
  if (!user) return;

  const amtInp = document.getElementById('withdrawAmount');
  const adrInp = document.getElementById('withdrawAddress');
  const amount = parseFloat(amtInp ? amtInp.value : 0) || 0;
  const address = (adrInp ? adrInp.value : '').trim();

  const radio = document.querySelector('input[name="withdrawMethod"]:checked');
  const method = radio ? radio.value : '';

  if (amount < 1000) { showToast('Минимум 1 000 TF'); return; }
  if (!method) { showToast('Выберите метод вывода'); return; }
  if (!address) { showToast('Укажите адрес кошелька'); return; }

  const btn = document.getElementById('withdrawSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  try {
    const result = await createWithdrawal(user.id, amount, method, address);

    if (result.success) {
      showToast('Заявка принята! Срок: 72 часа');
      closeWithdrawModal();
      const wd = await getWalletData(user.id);
      walletState.balance = wd.balance_tf;
      renderHero(wd, walletState.rate);
    } else {
      showToast(result.error || 'Ошибка вывода');
    }
  } catch (err) {
    console.error('[submitWithdrawal]', err);
    showToast('Ошибка сети');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Подать заявку'; }
}

/* === DEPOSIT MODAL === */

function openDepositModal() {
  const modal = document.querySelector('.wallet-deposit-modal');
  const backdrop = document.querySelector('.wallet-modal-backdrop');
  if (modal) modal.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
}

function closeDepositModal() {
  const modal = document.querySelector('.wallet-deposit-modal');
  const backdrop = document.querySelector('.wallet-modal-backdrop');
  if (modal) modal.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

/* === COPY ADDRESS === */

function copyAddress(address, btnEl) {
  navigator.clipboard.writeText(address).then(function() {
    showToast('Адрес скопирован');
    if (!btnEl) return;
    const origSvg = btnEl.innerHTML;
    btnEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>';
    setTimeout(function() { btnEl.innerHTML = origSvg; }, 2000);
  }).catch(function() {
    showToast('Не удалось скопировать');
  });
}

/* === SUCCESS MODAL === */

function showSuccessModal(message) {
  const modal = document.querySelector('.wallet-success-modal');
  const msgEl = document.getElementById('successMessage');
  if (msgEl) msgEl.textContent = message;
  if (modal) modal.classList.add('active');
  setTimeout(closeSuccessModal, 3000);
}

function closeSuccessModal() {
  const modal = document.querySelector('.wallet-success-modal');
  if (modal) modal.classList.remove('active');
}

/* === TOGGLE BALANCE VISIBILITY === */

function toggleWalletBalance() {
  walletState.balanceHidden = !walletState.balanceHidden;
  const toggle = document.querySelector('.wallet-hero-toggle');
  const unit = document.querySelector('.wallet-hero-balance-unit');
  if (walletState.balanceHidden) {
    wtText('walletBalanceTF', '••••••');
    wtText('walletBalanceUSD', '••••'); wtText('walletBalanceRUB', '••••');
    wtText('walletBalanceUSDT', '••••');
    wtText('walletMonthIn', '•••• TF'); wtText('walletMonthOut', '•••• TF');
    if (unit) unit.style.opacity = '0';
    if (toggle) toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    if (unit) unit.style.opacity = '1';
    if (toggle) toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    if (walletState.lastData) renderHero(walletState.lastData, walletState.rate);
  }
}

/* === STUBS === */

function openWalletSettings() { showToast('Настройки кошелька — скоро'); }

/* === EXPORTS === */

Object.assign(window, {
  initWallet, walletState, openWithdrawModal, closeWithdrawModal, submitWithdrawal,
  openDepositModal, closeDepositModal, openWalletSettings, copyAddress,
  showSuccessModal, closeSuccessModal, escW, renderHero, toggleWalletBalance
});
