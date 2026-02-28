// ═══════════════════════════════════════
// ADMIN MODERATION — Модерация контента (A5)
// Вынесено из admin-data.js + admin-core.js
// + расширенный функционал
// ═══════════════════════════════════════

// ===== ПЕРЕМЕННЫЕ =====
let _contentTab = 'posts';
let _modTab = 'expert_card';
let _modCache = [];
let _reportsCache = [];
let _reportsFilter = '';

// ===== SLA КОНФИГУРАЦИЯ =====
const SLA_HOURS = {
  expert_card: 24, case: 48, product: 48, webinar: 72,
  report_fraud: 24, report_deal: 24, report_other: 72
};

const MOD_TABS = [
  { key: 'expert_card', label: 'Эксперты', sla: 24 },
  { key: 'case', label: 'Кейсы', sla: 48 },
  { key: 'product', label: 'Товары', sla: 48 },
  { key: 'webinar', label: 'Вебинары', sla: 72 },
  { key: 'report', label: 'Жалобы', sla: null }
];

function calculateSLA(itemType) {
  return SLA_HOURS[itemType] || 72;
}

function getSLAStatus(submittedAt, slaHours) {
  if (!submittedAt) return 'ok';
  const elapsed = (Date.now() - new Date(submittedAt).getTime()) / 3600000;
  if (elapsed >= slaHours) return 'overdue';
  if (elapsed >= slaHours * 0.5) return 'warning';
  return 'ok';
}

function slaLabel(status) {
  if (status === 'overdue') return '<span class="badge badge-red">Просрочен</span>';
  if (status === 'warning') return '<span class="badge badge-gold">Скоро</span>';
  return '<span class="badge badge-green">В норме</span>';
}

// ═══════════════════════════════════════
// РЕНДЕР СЕКЦИИ КОНТЕНТА (из admin-core.js)
// ═══════════════════════════════════════

function renderContent() {
  const tabs = 'posts:Посты,comments:Комменты,cases:Кейсы,taskReview:Задания,reports:Жалобы,moderation:Модерация';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) {
    const p = s.split(':');
    h += '<button class="tab' + (p[0] === _contentTab ? ' active' : '') +
      '" onclick="switchContentTab(\'' + p[0] + '\',this)">' + p[1] + '</button>';
  });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchContentTab(_contentTab, document.querySelector('.tab.active'));
}

function switchContentTab(tab, btn) {
  _contentTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) {
    t.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  if (tab === 'moderation') { renderModQueue(_modTab); return; }
  if (tab === 'reports') { loadReports(''); return; }
  if (tab === 'taskReview') { loadTaskReview(''); return; }
  const fn = { posts: loadPosts, comments: loadComments, cases: loadCases }[tab];
  if (fn) fn(1);
}

// ═══════════════════════════════════════
// ПАГИНАЦИЯ КОНТЕНТА (из admin-data.js)
// ═══════════════════════════════════════

function contentPagination(total, cur, fn) {
  const tp = Math.ceil(total / PER_PAGE);
  if (tp <= 1) return '<span class="page-info">' + total + ' всего</span>';
  let h = '<div class="pagination">';
  h += '<button' + (cur <= 1 ? ' disabled' : '') +
    ' onclick="' + fn + '(' + (cur - 1) + ')">&laquo;</button>';
  let s = Math.max(1, cur - 2);
  let e = Math.min(tp, s + 4);
  s = Math.max(1, e - 4);
  for (let i = s; i <= e; i++) {
    h += '<button' + (i === cur ? ' class="active"' : '') +
      ' onclick="' + fn + '(' + i + ')">' + i + '</button>';
  }
  h += '<button' + (cur >= tp ? ' disabled' : '') +
    ' onclick="' + fn + '(' + (cur + 1) + ')">&raquo;</button>';
  h += '<span class="page-info">' + total + ' всего</span></div>';
  return h;
}

// ═══════════════════════════════════════
// МОДЕРАЦИЯ: ОЧЕРЕДЬ С ВКЛАДКАМИ (A5)
// ═══════════════════════════════════════

function renderModQueue(type) {
  _modTab = type || 'expert_card';
  const area = document.getElementById('contentArea');
  let h = '<div class="tabs tabs-sub">';
  MOD_TABS.forEach(function(t) {
    h += '<button class="tab' + (t.key === _modTab ? ' active' : '') +
      '" onclick="renderModQueue(\'' + t.key + '\')">' + esc(t.label) + '</button>';
  });
  h += '</div><div id="modQueueArea">Загрузка...</div>';
  area.innerHTML = h;
  if (_modTab === 'report') {
    loadReportsQueue();
  } else {
    loadModQueue(_modTab);
  }
}

async function loadModQueue(type) {
  try {
    const area = document.getElementById('modQueueArea');
    if (!area) return;
    area.innerHTML = 'Загрузка...';
    const r = await sb.from('moderation_queue').select('*')
      .eq('item_type', type)
      .in('status', ['pending', 'revision'])
      .order('submitted_at', { ascending: true })
      .limit(50);
    if (r.error) throw r.error;
    _modCache = r.data || [];
    const slaH = calculateSLA(type);
    if (!_modCache.length) {
      area.innerHTML = '<div class="empty">Очередь пуста</div>';
      return;
    }
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>ID</th><th>Автор</th><th>Статус</th><th>SLA</th><th>В очереди</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    _modCache.forEach(function(item) {
      const sla = getSLAStatus(item.submitted_at, slaH);
      const elapsed = item.submitted_at
        ? Math.round((Date.now() - new Date(item.submitted_at).getTime()) / 3600000)
        : 0;
      const cid = item.id ? String(item.id).substring(0, 8) + '…' : '—';
      h += '<tr><td>' + cid + '</td>' +
        '<td>' + esc(item.author_id ? String(item.author_id).substring(0, 8) : '—') + '</td>' +
        '<td><span class="badge badge-gold">' + esc(item.status) + '</span></td>' +
        '<td>' + slaLabel(sla) + '</td>' +
        '<td>' + elapsed + 'ч</td>' +
        '<td class="actions">' + modActions(item.id) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadModQueue error:', err);
    const area = document.getElementById('modQueueArea');
    if (area) area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки очереди', 'err');
  }
}

function modActions(id) {
  return '<button class="btn btn-success btn-sm" onclick="approveModItem(\'' + id + '\')">Одобрить</button>' +
    '<button class="btn btn-danger btn-sm" onclick="rejectModItem(\'' + id + '\')">Отклонить</button>' +
    '<button class="btn btn-sm" onclick="requestRevision(\'' + id + '\')">Правки</button>';
}

// ═══════════════════════════════════════
// ЖАЛОБЫ (из admin-data.js)
// ═══════════════════════════════════════

async function loadReports(statusFilter) {
  try {
    _reportsFilter = statusFilter || '';
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    let q = sb.from('reports').select('*, users!reports_reporter_id_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(50);
    if (_reportsFilter) q = q.eq('status', _reportsFilter);
    let r = await q;
    if (r.error) {
      q = sb.from('reports').select('*, users(name)', { count: 'exact' })
        .order('created_at', { ascending: false }).limit(50);
      if (_reportsFilter) q = q.eq('status', _reportsFilter);
      r = await q;
    }
    _reportsCache = r.data || [];
    renderReportsTable(_reportsCache);
  } catch (err) {
    console.error('loadReports error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки жалоб</div>';
    showToast('Ошибка загрузки жалоб', 'err');
  }
}

function renderReportsTable(data) {
  const area = document.getElementById('contentArea');
  const fh = '<div class="toolbar"><select class="field field-select" onchange="loadReports(this.value)">' +
    '<option value="">Все статусы</option>' +
    '<option value="pending"' + (_reportsFilter === 'pending' ? ' selected' : '') + '>Pending</option>' +
    '<option value="resolved"' + (_reportsFilter === 'resolved' ? ' selected' : '') + '>Resolved</option>' +
    '<option value="dismissed"' + (_reportsFilter === 'dismissed' ? ' selected' : '') + '>Dismissed</option>' +
    '</select></div>';
  if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет жалоб</div>'; return; }
  const badgeMap = { pending: 'badge-gold', resolved: 'badge-green', dismissed: 'badge-red' };
  let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>От кого</th><th>Тип</th><th>Причина</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(rep) {
    const reporter = rep.users ? rep.users.name : '—';
    const badge = badgeMap[rep.status] || 'badge-purple';
    const acts = rep.status === 'pending'
      ? '<button class="btn btn-success btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'resolved\')">Решить</button>' +
        '<button class="btn btn-danger btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'dismissed\')">Отклонить</button>'
      : '';
    h += '<tr><td>' + esc(reporter) + '</td>' +
      '<td><span class="badge badge-blue">' + esc(rep.target_type || '—') + '</span></td>' +
      '<td>' + esc(rep.reason_category || '—') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(rep.status || '—') + '</span></td>' +
      '<td>' + fmtDate(rep.created_at) + '</td>' +
      '<td class="actions">' + acts + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

// ═══════════════════════════════════════
// ЖАЛОБЫ В МОДЕРАЦИИ (sub-tab «Жалобы»)
// ═══════════════════════════════════════

async function loadReportsQueue() {
  try {
    const area = document.getElementById('modQueueArea');
    if (!area) return;
    area.innerHTML = 'Загрузка...';
    const r = await sb.from('reports').select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }).limit(50);
    if (r.error) throw r.error;
    const data = r.data || [];
    if (!data.length) { area.innerHTML = '<div class="empty">Нет жалоб в очереди</div>'; return; }
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Тип</th><th>Причина</th><th>SLA</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(rep) {
      const slaKey = (rep.reason_category === 'fraud' || rep.reason_category === 'deal')
        ? 'report_' + rep.reason_category : 'report_other';
      const sla = getSLAStatus(rep.created_at, calculateSLA(slaKey));
      h += '<tr><td><span class="badge badge-blue">' + esc(rep.target_type || '—') + '</span></td>' +
        '<td>' + esc(rep.reason_category || '—') + '</td>' +
        '<td>' + slaLabel(sla) + '</td>' +
        '<td>' + fmtDate(rep.created_at) + '</td>' +
        '<td class="actions">' +
        '<button class="btn btn-success btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'resolved\')">Решить</button>' +
        '<button class="btn btn-danger btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'dismissed\')">Отклонить</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadReportsQueue error:', err);
    const area = document.getElementById('modQueueArea');
    if (area) area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки жалоб', 'err');
  }
}

// ═══════════════════════════════════════
// RESOLVE / APPROVE / REJECT (из admin-data.js + расширено)
// ═══════════════════════════════════════

async function resolveReport(id, action) {
  try {
    const r = await sb.from('reports').update({
      status: action,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast(action === 'resolved' ? 'Жалоба решена' : 'Жалоба отклонена', 'ok');
    if (_contentTab === 'moderation') { loadReportsQueue(); } else { loadReports(_reportsFilter); }
  } catch (err) {
    console.error('resolveReport error:', err);
    showToast('Ошибка', 'err');
  }
}

async function approveModItem(id) {
  try {
    const r = await sb.from('moderation_queue').update({
      status: 'approved',
      moderator_id: adminUser.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('approve_content', 'moderation', id);
    showToast('Контент одобрен', 'ok');
    loadModQueue(_modTab);
  } catch (err) {
    console.error('approveModItem error:', err);
    showToast('Ошибка', 'err');
  }
}

async function rejectModItem(id) {
  try {
    const reason = prompt('Причина отклонения:');
    if (!reason) return;
    const r = await sb.from('moderation_queue').update({
      status: 'rejected',
      moderator_id: adminUser.id,
      rejection_reason: reason,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('reject_content', 'moderation', id);
    showToast('Контент отклонён', 'ok');
    loadModQueue(_modTab);
  } catch (err) {
    console.error('rejectModItem error:', err);
    showToast('Ошибка', 'err');
  }
}

async function requestRevision(id) {
  try {
    const note = prompt('Что нужно исправить:');
    if (!note) return;
    const r = await sb.from('moderation_queue').update({
      status: 'revision',
      moderator_id: adminUser.id,
      revision_note: note,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('request_revision', 'moderation', id);
    showToast('Запрошены правки', 'ok');
    loadModQueue(_modTab);
  } catch (err) {
    console.error('requestRevision error:', err);
    showToast('Ошибка', 'err');
  }
}


// loadModeration заменена на renderModQueue с sub-tabs + SLA
function loadModeration() { renderModQueue(_modTab); }

// ═══════════════════════════════════════
// СТАТИСТИКА МОДЕРАЦИИ (A5)
// ═══════════════════════════════════════

async function renderModStats() {
  try {
    const r = await sb.from('moderation_queue').select('item_type, status')
      .in('status', ['pending', 'revision']);
    if (r.error) throw r.error;
    const data = r.data || [];
    const counts = {};
    data.forEach(function(item) {
      const t = item.item_type || 'other';
      counts[t] = (counts[t] || 0) + 1;
    });
    let h = '<div class="mod-stats">';
    h += '<div class="stat-card"><div class="stat-val">' + data.length +
      '</div><div class="stat-lbl">В очереди</div></div>';
    MOD_TABS.forEach(function(t) {
      if (t.key !== 'report') {
        h += '<div class="stat-card"><div class="stat-val">' + (counts[t.key] || 0) +
          '</div><div class="stat-lbl">' + esc(t.label) + '</div></div>';
      }
    });
    h += '</div>';
    return h;
  } catch (err) {
    console.error('renderModStats error:', err);
    return '<div class="empty">Ошибка статистики</div>';
  }
}

// ═══════════════════════════════════════
// ЭКСПОРТЫ
// ═══════════════════════════════════════
window.renderContent = renderContent;
window.switchContentTab = switchContentTab;
window.contentPagination = contentPagination;
window.loadReports = loadReports;
window.resolveReport = resolveReport;
window.loadModeration = loadModeration;
window.approveModItem = approveModItem;
window.rejectModItem = rejectModItem;
window.renderModQueue = renderModQueue;
window.loadModQueue = loadModQueue;
window.loadReportsQueue = loadReportsQueue;
window.requestRevision = requestRevision;
window.calculateSLA = calculateSLA;
window.getSLAStatus = getSLAStatus;
window.renderModStats = renderModStats;
