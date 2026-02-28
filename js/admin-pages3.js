// ===== ADMIN PAGES 3 — Finance Dashboard =====

let _finPeriod = 'month', _finTab = 'transactions';
let _subFilter = '', _subPage = 1;
let _txFilter = '', _txDateFrom = '', _txDateTo = '', _txUser = '', _txPage = 1;

const INCOME_TYPES = ['subscription', 'deal_commission', 'purchase', 'ad_revenue', 'contest_entry'];
const EXPENSE_TYPES = ['task_reward', 'referral_bonus', 'contest_prize', 'withdrawal'];
const INC_LBL = {
  subscription: 'Подписки PRO / BUSINESS / ACADEMY',
  deal_commission: 'Комиссия сделок',
  purchase: 'Магазин',
  ad_revenue: 'Рекламные задания',
  contest_entry: 'Конкурсы'
};
const EXP_LBL = {
  task_reward: 'Платформенные задания',
  referral_bonus: 'Реферальные бонусы',
  contest_prize: 'Призовые (конкурсы)',
  withdrawal: 'Выводы пользователей'
};
const TX_LBL = {
  '': 'Все типы', subscription: 'Подписка', deal_commission: 'Комиссия',
  purchase: 'Покупка', ad_revenue: 'Реклама', contest_entry: 'Конкурс',
  task_reward: 'Задание', referral_bonus: 'Реферал', contest_prize: 'Приз',
  withdrawal: 'Вывод', deposit: 'Пополнение'
};

function fmtMoney(v) { return (v / 100).toLocaleString('ru-RU') + ' \u20BD'; }

function getPeriodStart() {
  const d = new Date();
  if (_finPeriod === 'day') { d.setHours(0, 0, 0, 0); return d.toISOString(); }
  if (_finPeriod === 'week') { d.setDate(d.getDate() - 7); return d.toISOString(); }
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ===== MAIN RENDER =====
function renderFinance() {
  const pc = document.getElementById('pageContent');
  const periods = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц']];
  let h = '<div class="tabs">';
  periods.forEach(function(p) {
    h += '<button class="tab' + (p[0] === _finPeriod ? ' active' : '') +
      '" onclick="setFinPeriod(\'' + p[0] + '\')">' + p[1] + '</button>';
  });
  h += '</div>';
  h += '<div class="stats-grid">' +
    '<div class="stat-card"><div class="stat-lbl">Баланс платформы</div>' +
      '<div class="stat-val purple" id="finBal">\u2014</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">Доход</div>' +
      '<div class="stat-val green" id="finInc">\u2014</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">Расход</div>' +
      '<div class="stat-val red" id="finExp">\u2014</div></div>' +
    '<div class="stat-card"><div class="stat-lbl">Чистая прибыль</div>' +
      '<div class="stat-val blue" id="finNet">\u2014</div></div></div>';
  h += '<div class="stats-grid fin-breaks">' +
    '<div class="stat-card fin-break-card"><div class="stat-lbl">Разбивка дохода</div>' +
      '<div id="incList">Загрузка...</div></div>' +
    '<div class="stat-card fin-break-card"><div class="stat-lbl">Разбивка расхода</div>' +
      '<div id="expList">Загрузка...</div></div></div>';
  const ftabs = [['transactions', 'Транзакции'], ['subscriptions', 'Подписки'],
    ['referrals', 'Рефералы'], ['channels', 'Каналы']];
  h += '<div class="tabs" id="finTabs">';
  ftabs.forEach(function(t) {
    h += '<button class="tab' + (t[0] === _finTab ? ' active' : '') +
      '" onclick="switchFinTab(\'' + t[0] + '\',this)">' + t[1] + '</button>';
  });
  h += '</div><div id="contentArea"></div>';
  pc.innerHTML = h;
  loadFinanceData();
  switchFinTab(_finTab, document.querySelector('#finTabs .tab.active'));
}

function setFinPeriod(p) { _finPeriod = p; renderFinance(); }

function switchFinTab(tab, btn) {
  _finTab = tab;
  document.querySelectorAll('#finTabs .tab').forEach(function(t) {
    t.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  const map = {
    transactions: loadTransactions, subscriptions: loadSubscriptions,
    referrals: loadReferrals, channels: loadPayChannels
  };
  (map[tab] || function() {})();
}

// ===== DASHBOARD DATA =====
async function loadFinanceData() {
  try {
    const start = getPeriodStart();
    const now = new Date().toISOString();
    const [balR, incR, expR] = await Promise.all([
      sb.from('users').select('balance'),
      sb.from('transactions').select('type, amount')
        .in('type', INCOME_TYPES).gte('created_at', start).lte('created_at', now),
      sb.from('transactions').select('type, amount')
        .in('type', EXPENSE_TYPES).gte('created_at', start).lte('created_at', now)
    ]);
    const bal = (balR.data || []).reduce(function(s, u) {
      return s + (u.balance || 0);
    }, 0);
    const incData = incR.data || [];
    const expData = expR.data || [];
    const inc = incData.reduce(function(s, t) { return s + (t.amount || 0); }, 0);
    const exp = expData.reduce(function(s, t) { return s + (t.amount || 0); }, 0);
    document.getElementById('finBal').textContent = fmtMoney(bal);
    document.getElementById('finInc').textContent = fmtMoney(inc);
    document.getElementById('finExp').textContent = fmtMoney(exp);
    document.getElementById('finNet').textContent = fmtMoney(inc - exp);
    renderBreakdowns(incData, expData);
  } catch (err) {
    console.error('Finance load error:', err);
    showToast('Ошибка загрузки финансов', 'err');
  }
}

function renderBreakdowns(incData, expData) {
  const incG = {}, expG = {};
  incData.forEach(function(t) { incG[t.type] = (incG[t.type] || 0) + (t.amount || 0); });
  expData.forEach(function(t) { expG[t.type] = (expG[t.type] || 0) + (t.amount || 0); });
  let iH = '<table class="data-table"><tbody>';
  Object.keys(INC_LBL).forEach(function(k) {
    iH += '<tr><td>' + INC_LBL[k] + '</td><td class="ta-r"><b>' +
      fmtMoney(incG[k] || 0) + '</b></td></tr>';
  });
  iH += '</tbody></table>';
  let eH = '<table class="data-table"><tbody>';
  Object.keys(EXP_LBL).forEach(function(k) {
    eH += '<tr><td>' + EXP_LBL[k] + '</td><td class="ta-r"><b>' +
      fmtMoney(expG[k] || 0) + '</b></td></tr>';
  });
  eH += '</tbody></table>';
  document.getElementById('incList').innerHTML = iH;
  document.getElementById('expList').innerHTML = eH;
}

// ===== ТРАНЗАКЦИИ (с фильтрами, CSV) =====
function buildTxFilters() {
  let h = '<div class="toolbar">';
  h += '<select class="field field-select" onchange="_txFilter=this.value;_txPage=1;loadTransactions()">';
  Object.keys(TX_LBL).forEach(function(k) {
    h += '<option value="' + k + '"' + (k === _txFilter ? ' selected' : '') +
      '>' + TX_LBL[k] + '</option>';
  });
  h += '</select>';
  h += '<input type="date" class="field" value="' + _txDateFrom +
    '" onchange="_txDateFrom=this.value;_txPage=1;loadTransactions()" title="Дата от">';
  h += '<input type="date" class="field" value="' + _txDateTo +
    '" onchange="_txDateTo=this.value;_txPage=1;loadTransactions()" title="Дата до">';
  h += '<input type="text" class="field field-search" value="' + esc(_txUser) +
    '" onchange="_txUser=this.value;_txPage=1;loadTransactions()" placeholder="Имя юзера">';
  h += '<button class="btn btn-ghost btn-sm" onclick="exportTxCsv()">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' +
    '</svg> CSV</button></div>';
  return h;
}

async function loadTransactions() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    const fH = buildTxFilters();
    let q = sb.from('transactions').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_txPage - 1) * PER_PAGE, _txPage * PER_PAGE - 1);
    if (_txFilter) q = q.eq('type', _txFilter);
    if (_txDateFrom) q = q.gte('created_at', _txDateFrom + 'T00:00:00');
    if (_txDateTo) q = q.lte('created_at', _txDateTo + 'T23:59:59');
    const r = await q;
    let data = r.data || [];
    const total = r.count || 0;
    if (_txUser) {
      const s = _txUser.toLowerCase();
      data = data.filter(function(t) {
        return t.users && t.users.name && t.users.name.toLowerCase().includes(s);
      });
    }
    if (!data.length) {
      area.innerHTML = fH + '<div class="empty">Нет транзакций</div>';
      return;
    }
    let h = fH + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>ID</th><th>Дата</th><th>Тип</th><th>Юзер</th><th>Сумма</th>' +
      '<th>Описание</th></tr></thead><tbody>';
    data.forEach(function(t) {
      const usr = t.users ? t.users.name : '\u2014';
      const isInc = INCOME_TYPES.includes(t.type) || t.type === 'deposit';
      const cls = isInc ? 'badge-green' : 'badge-red';
      const sign = isInc ? '+' : '\u2212';
      h += '<tr><td>' + esc(String(t.id).substring(0, 8)) + '</td>' +
        '<td>' + fmtDate(t.created_at) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(TX_LBL[t.type] || t.type) + '</span></td>' +
        '<td>' + esc(usr) + '</td>' +
        '<td><span class="badge ' + cls + '">' + sign + fmtMoney(t.amount || 0) +
        '</span></td>' +
        '<td>' + esc((t.description || '').substring(0, 40)) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h + contentPagination(total, _txPage, 'loadTxPage');
  } catch (err) {
    console.error('Transactions load error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

function loadTxPage(p) { _txPage = p; loadTransactions(); }

// ===== ЭКСПОРТ CSV =====
async function exportTxCsv() {
  try {
    let q = sb.from('transactions').select('*, users(name)')
      .order('created_at', { ascending: false });
    if (_txFilter) q = q.eq('type', _txFilter);
    if (_txDateFrom) q = q.gte('created_at', _txDateFrom + 'T00:00:00');
    if (_txDateTo) q = q.lte('created_at', _txDateTo + 'T23:59:59');
    const r = await q;
    const data = r.data || [];
    if (!data.length) { showToast('Нет данных для экспорта', 'err'); return; }
    let csv = 'ID,Дата,Тип,Пользователь,Сумма (\u20BD),Описание\n';
    data.forEach(function(t) {
      const name = t.users ? t.users.name.replace(/"/g, '""') : '';
      const desc = (t.description || '').replace(/"/g, '""');
      csv += '"' + t.id + '","' + fmtDate(t.created_at) + '","' + (t.type || '') +
        '","' + name + '",' + (t.amount / 100) + ',"' + desc + '"\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions_' + new Date().toISOString().substring(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV экспортирован', 'ok');
  } catch (err) {
    console.error('CSV export error:', err);
    showToast('Ошибка экспорта', 'err');
  }
}

// ═══════════════════════════════════════
// ВЫВОДЫ / ВЫПЛАТЫ — см. admin-withdrawals.js
// ═══════════════════════════════════════

// ===== ПОДПИСКИ =====
async function loadSubscriptions() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    let q = sb.from('subscriptions').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_subPage - 1) * PER_PAGE, _subPage * PER_PAGE - 1);
    if (_subFilter) q = q.eq('status', _subFilter);
    const r = await q;
    const data = r.data || [], total = r.count || 0;
    const sm = { active: 'badge-green', cancelled: 'badge-red', expired: 'badge-gold' };
    let fh = '<div class="toolbar"><select class="field field-select" ' +
      'onchange="_subFilter=this.value;_subPage=1;loadSubscriptions()">' +
      '<option value="">Все статусы</option>' +
      '<option value="active"' + (_subFilter === 'active' ? ' selected' : '') + '>Active</option>' +
      '<option value="cancelled"' + (_subFilter === 'cancelled' ? ' selected' : '') + '>Cancelled</option>' +
      '<option value="expired"' + (_subFilter === 'expired' ? ' selected' : '') + '>Expired</option>' +
      '</select></div>';
    if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет подписок</div>'; return; }
    let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Пользователь</th><th>План</th><th>Период</th><th>Цена</th><th>Статус</th>' +
      '<th>Метод</th><th>Начало</th><th>Истекает</th><th>Действия</th></tr></thead><tbody>';
    data.forEach(function(s) {
      const usr = s.users ? s.users.name : '\u2014';
      const badge = sm[s.status] || 'badge-purple';
      const planBadge = s.tariff === 'business' ? 'badge-gold' : 'badge-purple';
      const acts = s.status === 'active'
        ? '<button class="btn btn-danger btn-sm" onclick="cancelSub(\'' + s.id + '\')">Отменить</button>'
        : '';
      h += '<tr><td>' + esc(usr) + '</td>' +
        '<td><span class="badge ' + planBadge + '">' + esc((s.tariff || '').toUpperCase()) + '</span></td>' +
        '<td>' + esc(s.period || '\u2014') + '</td><td>' + (s.price || 0) + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(s.status || '\u2014') + '</span></td>' +
        '<td>' + esc(s.payment_method || '\u2014') + '</td>' +
        '<td>' + fmtDate(s.started_at) + '</td><td>' + fmtDate(s.expires_at) + '</td>' +
        '<td class="actions">' + acts + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h + contentPagination(total, _subPage, 'loadSubPage');
  } catch (err) {
    console.error('Subscriptions load error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

function loadSubPage(p) { _subPage = p; loadSubscriptions(); }

async function cancelSub(id) {
  if (!confirm('Отменить подписку?')) return;
  try {
    await sb.from('subscriptions').update({
      status: 'cancelled', cancelled_at: new Date().toISOString()
    }).eq('id', id);
    showToast('Подписка отменена', 'ok');
    loadSubscriptions();
  } catch (err) {
    console.error('Cancel sub error:', err);
    showToast('Ошибка отмены', 'err');
  }
}

// ===== РЕФЕРАЛЫ =====
async function loadReferrals() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('referrals').select('*').order('created_at', { ascending: false });
    const data = r.data || [];
    if (!data.length) { area.innerHTML = '<div class="empty">Нет рефералов</div>'; return; }
    let ids = [];
    data.forEach(function(ref) {
      if (ref.referrer_id) ids.push(ref.referrer_id);
      if (ref.referred_id) ids.push(ref.referred_id);
    });
    ids = ids.filter(function(v, i, a) { return a.indexOf(v) === i; });
    const nm = {};
    if (ids.length) {
      const pr = await sb.from('vw_public_profiles').select('id, name').in('id', ids);
      (pr.data || []).forEach(function(p) { nm[p.id] = p.name; });
    }
    const sm = { active: 'badge-green', pending: 'badge-gold', expired: 'badge-red' };
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Реферер</th><th>Приглашённый</th><th>Статус</th>' +
      '<th>Комиссия %</th><th>Заработано</th><th>Дата</th></tr></thead><tbody>';
    data.forEach(function(ref) {
      const badge = sm[ref.status] || 'badge-purple';
      h += '<tr><td>' + esc(nm[ref.referrer_id] || '\u2014') + '</td>' +
        '<td>' + esc(nm[ref.referred_id] || '\u2014') + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(ref.status || '\u2014') + '</span></td>' +
        '<td>' + (ref.commission_percent || 0) + '%</td>' +
        '<td><b>' + fmtMoney(ref.total_earned || 0) + '</b></td>' +
        '<td>' + fmtDate(ref.created_at) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('Referrals load error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ПЛАТЁЖНЫЕ КАНАЛЫ =====
async function loadPayChannels() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('platform_settings').select('*')
      .eq('key', 'payment_channels').single();
    const cfg = (r.data && r.data.value) || {};
    const channels = [
      { key: 'telegram_stars', name: 'Telegram Stars',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
      { key: 'tribute', name: 'Tribute',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
      { key: 'google_play', name: 'Google Play Billing',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' },
      { key: 'app_store', name: 'App Store IAP',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>' }
    ];
    let h = '<div class="stats-grid">';
    channels.forEach(function(ch) {
      const val = cfg[ch.key] || {};
      const st = val.enabled
        ? '<span class="badge badge-green">Подключено</span>'
        : '<span class="badge badge-red">Не подключено</span>';
      h += '<div class="stat-card fin-break-card">' +
        '<div class="stat-lbl">' + ch.icon + ' ' + ch.name + '</div>' +
        '<div>' + st + '</div>' +
        '<div class="fg"><div class="fl">Настройка</div>' +
        '<input class="field" id="ch_' + ch.key + '" value="' +
        esc(val.config || '') + '" placeholder="ID / token"></div>' +
        '<label class="ch-toggle"><input type="checkbox" id="ch_' + ch.key + '_on"' +
        (val.enabled ? ' checked' : '') + '> Активен</label></div>';
    });
    h += '</div><div class="toolbar"><button class="btn btn-primary" ' +
      'onclick="savePayChannels()">Сохранить каналы</button></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('Pay channels load error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

async function savePayChannels() {
  const keys = ['telegram_stars', 'tribute', 'google_play', 'app_store'];
  const val = {};
  keys.forEach(function(k) {
    val[k] = {
      config: document.getElementById('ch_' + k).value.trim(),
      enabled: document.getElementById('ch_' + k + '_on').checked
    };
  });
  try {
    const r = await sb.from('platform_settings').upsert({
      key: 'payment_channels', value: val, updated_at: new Date().toISOString()
    });
    if (r.error) throw r.error;
    showToast('Каналы сохранены', 'ok');
  } catch (err) {
    console.error('Save channels error:', err);
    showToast('Ошибка сохранения', 'err');
  }
}
