// ===== ADMIN PAGES 3 — Finance =====

let _finTab = 'subscriptions';
let _subFilter = '', _subPage = 1, _txPage = 1;

function renderFinance() {
  const tabs = 'subscriptions:Подписки,transactions:Транзакции,withdrawals:Выводы,referrals:Рефералы,channels:Платёжные каналы';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _finTab ? ' active' : '') + '" onclick="switchFinTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchFinTab(_finTab, document.querySelector('.tab.active'));
}
function switchFinTab(tab, btn) {
  _finTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ subscriptions: loadSubscriptions, transactions: loadTransactions, withdrawals: loadWithdrawals, referrals: loadReferrals, channels: loadPayChannels }[tab] || function(){})();
}

// ===== ПОДПИСКИ =====
async function loadSubscriptions() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  let q = sb.from('subscriptions').select('*, users(name)', { count: 'exact' })
    .order('created_at', { ascending: false }).range((_subPage - 1) * PER_PAGE, _subPage * PER_PAGE - 1);
  if (_subFilter) q = q.eq('status', _subFilter);
  const r = await q;
  const data = r.data || [], total = r.count || 0;
  const sm = { active: 'badge-green', cancelled: 'badge-red', expired: 'badge-gold' };
  const fh = '<div class="toolbar"><select class="field field-select" onchange="_subFilter=this.value;_subPage=1;loadSubscriptions()">' +
    '<option value="">Все статусы</option>' +
    '<option value="active"' + (_subFilter === 'active' ? ' selected' : '') + '>Active</option>' +
    '<option value="cancelled"' + (_subFilter === 'cancelled' ? ' selected' : '') + '>Cancelled</option>' +
    '<option value="expired"' + (_subFilter === 'expired' ? ' selected' : '') + '>Expired</option>' +
    '</select></div>';
  if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет подписок</div>'; return; }
  let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>План</th><th>Период</th><th>Цена</th><th>Статус</th><th>Метод</th><th>Начало</th><th>Истекает</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(s) {
    const usr = s.users ? s.users.name : '—';
    const badge = sm[s.status] || 'badge-purple';
    const planBadge = s.tariff === 'business' ? 'badge-gold' : 'badge-purple';
    const acts = s.status === 'active' ? '<button class="btn btn-danger btn-sm" onclick="cancelSub(\'' + s.id + '\')">Отменить</button>' : '';
    h += '<tr><td>' + esc(usr) + '</td><td><span class="badge ' + planBadge + '">' + esc((s.tariff || '').toUpperCase()) + '</span></td>' +
      '<td>' + esc(s.period || '—') + '</td><td>' + (s.price || 0) + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(s.status || '—') + '</span></td>' +
      '<td>' + esc(s.payment_method || '—') + '</td>' +
      '<td>' + fmtDate(s.started_at) + '</td><td>' + fmtDate(s.expires_at) + '</td>' +
      '<td class="actions">' + acts + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h + contentPagination(total, _subPage, 'loadSubPage');
}
function loadSubPage(p) { _subPage = p; loadSubscriptions(); }
async function cancelSub(id) {
  if (!confirm('Отменить подписку?')) return;
  await sb.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id);
  showToast('Подписка отменена', 'ok'); loadSubscriptions();
}

// ===== ТРАНЗАКЦИИ =====
async function loadTransactions() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('transactions').select('*, users(name)', { count: 'exact' })
    .order('created_at', { ascending: false }).range((_txPage - 1) * PER_PAGE, _txPage * PER_PAGE - 1);
  const data = r.data || [], total = r.count || 0;
  if (!data.length) { area.innerHTML = '<div class="empty">Нет транзакций</div>'; return; }
  const sm = { completed: 'badge-green', pending: 'badge-gold', failed: 'badge-red' };
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>Тип</th><th>Сумма</th><th>Валюта</th><th>Статус</th><th>Описание</th><th>Дата</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(t) {
    const usr = t.users ? t.users.name : '—';
    const badge = sm[t.status] || 'badge-purple';
    h += '<tr><td>' + esc(usr) + '</td><td><span class="badge badge-blue">' + esc(t.type || '—') + '</span></td>' +
      '<td><b>' + (t.amount || 0) + '</b></td><td>' + esc(t.currency || '—') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(t.status || '—') + '</span></td>' +
      '<td>' + esc((t.description || '').substring(0, 40)) + '</td>' +
      '<td>' + fmtDate(t.created_at) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h + contentPagination(total, _txPage, 'loadTxPage');
}
function loadTxPage(p) { _txPage = p; loadTransactions(); }

// ═══════════════════════════════════════
// ВЫВОДЫ / ВЫПЛАТЫ — см. admin-withdrawals.js
// ═══════════════════════════════════════

// ===== РЕФЕРАЛЫ =====
async function loadReferrals() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('referrals').select('*').order('created_at', { ascending: false });
  const data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет рефералов</div>'; return; }
  let ids = [];
  data.forEach(function(ref) { if (ref.referrer_id) ids.push(ref.referrer_id); if (ref.referred_id) ids.push(ref.referred_id); });
  ids = ids.filter(function(v, i, a) { return a.indexOf(v) === i; });
  const nm = {};
  if (ids.length) { const pr = await sb.from('vw_public_profiles').select('id, name').in('id', ids); (pr.data || []).forEach(function(p) { nm[p.id] = p.name; }); }
  const sm = { active: 'badge-green', pending: 'badge-gold', expired: 'badge-red' };
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Реферер</th><th>Приглашённый</th><th>Статус</th><th>Комиссия %</th><th>Заработано</th><th>Дата</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(ref) {
    const badge = sm[ref.status] || 'badge-purple';
    h += '<tr><td>' + esc(nm[ref.referrer_id] || '—') + '</td><td>' + esc(nm[ref.referred_id] || '—') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(ref.status || '—') + '</span></td>' +
      '<td>' + (ref.commission_percent || 0) + '%</td><td><b>' + (ref.total_earned || 0) + '</b></td>' +
      '<td>' + fmtDate(ref.created_at) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

// ===== ПЛАТЁЖНЫЕ КАНАЛЫ =====
async function loadPayChannels() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('platform_settings').select('*').eq('key', 'payment_channels').single();
  const cfg = (r.data && r.data.value) || {};
  const channels = [
    { key: 'telegram_stars', name: 'Telegram Stars', icon: '⭐' },
    { key: 'tribute', name: 'Tribute', icon: '💳' },
    { key: 'google_play', name: 'Google Play Billing', icon: '🤖' },
    { key: 'app_store', name: 'App Store IAP', icon: '🍎' }
  ];
  let h = '<div class="stats-grid">';
  channels.forEach(function(ch) {
    const val = cfg[ch.key] || {};
    const st = val.enabled ? '<span class="badge badge-green">Подключено</span>' : '<span class="badge badge-red">Не подключено</span>';
    h += '<div class="stat-card" style="text-align:left;padding:16px">' +
      '<div style="font-size:24px;margin-bottom:8px">' + ch.icon + ' ' + ch.name + '</div>' +
      '<div style="margin-bottom:8px">' + st + '</div>' +
      '<div class="fg"><div class="fl">Настройка</div><input class="field" id="ch_' + ch.key + '" value="' + esc(val.config || '') + '" placeholder="ID / token"></div>' +
      '<label style="display:flex;gap:6px;align-items:center;margin:8px 0"><input type="checkbox" id="ch_' + ch.key + '_on"' + (val.enabled ? ' checked' : '') + '> Активен</label>' +
    '</div>';
  });
  h += '</div><div style="margin-top:12px"><button class="btn btn-primary" onclick="savePayChannels()">Сохранить каналы</button></div>';
  area.innerHTML = h;
}
async function savePayChannels() {
  const keys = ['telegram_stars', 'tribute', 'google_play', 'app_store'];
  const val = {};
  keys.forEach(function(k) {
    val[k] = { config: document.getElementById('ch_' + k).value.trim(), enabled: document.getElementById('ch_' + k + '_on').checked };
  });
  const r = await sb.from('platform_settings').upsert({ key: 'payment_channels', value: val, updated_at: new Date().toISOString() });
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast('Каналы сохранены', 'ok');
}
