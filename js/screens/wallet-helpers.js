// ═══════════════════════════════════════
// WALLET HELPERS — константы, группировка, рендер карточек
// Отделено от wallet.js
// ═══════════════════════════════════════

/* === TX TYPE MAP === */

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

/* === ESCAPE HTML === */

function escW(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* === BUILD DATE GROUPS === */

function buildDateGroups(txList) {
  const now = new Date();
  const todayKey = now.toDateString();
  const yesterdayKey = new Date(now - 86400000).toDateString();
  const map = new Map();

  txList.forEach(function(tx) {
    const d = tx.created_at ? new Date(tx.created_at) : now;
    const key = d.toDateString();
    const label = key === todayKey ? 'Сегодня' : key === yesterdayKey ? 'Вчера' : d.toLocaleDateString('ru-RU');
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

/* === EXPORTS === */

window.TX_TYPES = TX_TYPES;
window.buildDateGroups = buildDateGroups;
window.buildTxCard = buildTxCard;
window.escW = escW;
