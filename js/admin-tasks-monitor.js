// ═══════════════════════════════════════
// ADMIN TASKS — Мониторинг (рекламные + бизнес)
// Отделено от admin-tasks.js
// ═══════════════════════════════════════

let _adFilter = '';
let _bizFilter = '';

// ═══════════════════════════════════════
// ВКЛАДКА 2 — РЕКЛАМНЫЕ ЗАДАНИЯ
// ═══════════════════════════════════════

async function loadAdTasks() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    let q = sb.from('tasks').select('*, companies(name)')
      .eq('source', 'ad')
      .order('created_at', { ascending: false });
    if (_adFilter) q = q.eq('status', _adFilter);
    const r = await q;
    if (r.error) throw r.error;
    renderAdList(r.data || []);
  } catch (err) {
    console.error('loadAdTasks error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки рекламных заданий', 'err');
  }
}

function renderAdList(data) {
  const area = document.getElementById('contentArea');
  let h = '<div class="toolbar"><select class="field field-select" onchange="_adFilter=this.value;loadAdTasks()">' +
    '<option value="">Все</option>' +
    '<option value="paused"' + (_adFilter === 'paused' ? ' selected' : '') + '>На модерации</option>' +
    '<option value="active"' + (_adFilter === 'active' ? ' selected' : '') + '>Одобренные</option>' +
    '<option value="archived"' + (_adFilter === 'archived' ? ' selected' : '') + '>Отклонённые</option>' +
    '</select></div>';
  if (!data.length) {
    area.innerHTML = h + '<div class="empty">Нет рекламных заданий</div>';
    return;
  }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Компания</th><th>Название</th><th>Тип</th><th>XP</th>' +
    '<th>Статус</th><th>Выполн.</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(t) { h += buildAdRow(t); });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

function buildAdRow(t) {
  const company = t.companies ? t.companies.name : '—';
  const st = TASK_STATUS[t.status] || { label: t.status, badge: 'badge-purple' };
  const compl = (t.current_completions || 0) +
    (t.max_completions ? '/' + t.max_completions : '/&#8734;');
  const acts = t.status === 'paused'
    ? '<button class="btn btn-ghost btn-sm" onclick="viewAdTask(\'' + t.id + '\')">Просмотр</button>' +
      '<button class="btn btn-success btn-sm" onclick="approveAdTask(\'' + t.id + '\')">Одобрить</button>' +
      '<button class="btn btn-danger btn-sm" onclick="rejectAdTask(\'' + t.id + '\')">Отклонить</button>'
    : '<button class="btn btn-ghost btn-sm" onclick="viewAdTask(\'' + t.id + '\')">Просмотр</button>';
  return '<tr><td>' + esc(company) + '</td><td><b>' + esc(t.title) + '</b></td>' +
    '<td>' + esc(ACTION_TYPES[t.action_type] || t.action_type || '—') + '</td>' +
    '<td>' + (t.xp_reward || 0) + '</td>' +
    '<td><span class="badge ' + st.badge + '">' + st.label + '</span></td>' +
    '<td>' + compl + '</td>' +
    '<td class="actions">' + acts + '</td></tr>';
}

async function viewAdTask(id) {
  try {
    const r = await sb.from('tasks').select('*, companies(name)').eq('id', id).single();
    if (r.error) throw r.error;
    const t = r.data;
    let body = '<div class="info-row"><div class="info-label">Компания</div><div>' +
      esc(t.companies ? t.companies.name : '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Название</div><div>' + esc(t.title) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Описание</div><div>' + esc(t.description || '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Тип</div><div>' +
      esc(ACTION_TYPES[t.action_type] || t.action_type) + '</div></div>' +
      '<div class="info-row"><div class="info-label">XP награда</div><div>' + (t.xp_reward || 0) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Макс. выполнений</div><div>' +
      (t.max_completions || '&#8734;') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Статус</div><div>' +
      esc((TASK_STATUS[t.status] || {}).label || t.status) + '</div></div>';
    if (t.example_url) {
      body += '<div class="info-row"><div class="info-label">Пример</div><div>' +
        '<a href="' + esc(t.example_url) + '" target="_blank" rel="noopener">Ссылка</a></div></div>';
    }
    if (t.status === 'paused') {
      body += '<div class="modal-actions">' +
        '<button class="btn btn-success" onclick="approveAdTask(\'' + t.id + '\');closeModal()">Одобрить</button>' +
        '<button class="btn btn-danger" onclick="rejectAdTask(\'' + t.id + '\');closeModal()">Отклонить</button>' +
        '</div>';
    }
    openModal('Рекламное задание', body);
  } catch (err) {
    console.error('viewAdTask error:', err);
    showToast('Ошибка загрузки', 'err');
  }
}

async function approveAdTask(id) {
  try {
    const r = await sb.from('tasks').update({
      status: 'active', updated_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast('Рекламное задание одобрено', 'ok');
    loadAdTasks();
  } catch (err) {
    console.error('approveAdTask error:', err);
    showToast('Ошибка', 'err');
  }
}

async function rejectAdTask(id) {
  try {
    const r = await sb.from('tasks').update({
      status: 'archived', updated_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast('Рекламное задание отклонено', 'ok');
    loadAdTasks();
  } catch (err) {
    console.error('rejectAdTask error:', err);
    showToast('Ошибка', 'err');
  }
}

// ═══════════════════════════════════════
// ВКЛАДКА 3 — БИЗНЕС ЗАДАНИЯ
// ═══════════════════════════════════════

async function loadBusinessTasks() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    let q = sb.from('tasks').select('*, companies(name)')
      .eq('source', 'business')
      .order('created_at', { ascending: false });
    if (_bizFilter) q = q.eq('status', _bizFilter);
    const r = await q;
    if (r.error) throw r.error;
    renderBusinessList(r.data || []);
  } catch (err) {
    console.error('loadBusinessTasks error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки бизнес заданий', 'err');
  }
}

function renderBusinessList(data) {
  const area = document.getElementById('contentArea');
  let h = '<div class="toolbar"><select class="field field-select" onchange="_bizFilter=this.value;loadBusinessTasks()">' +
    '<option value="">Все</option>' +
    '<option value="active"' + (_bizFilter === 'active' ? ' selected' : '') + '>Активные</option>' +
    '<option value="paused"' + (_bizFilter === 'paused' ? ' selected' : '') + '>Споры</option>' +
    '<option value="archived"' + (_bizFilter === 'archived' ? ' selected' : '') + '>Завершённые</option>' +
    '</select></div>';
  if (!data.length) {
    area.innerHTML = h + '<div class="empty">Нет бизнес заданий</div>';
    return;
  }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Компания</th><th>Название</th><th>Тип</th><th>XP</th>' +
    '<th>Статус</th><th>Выполн.</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(t) { h += buildBizRow(t); });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

function buildBizRow(t) {
  const company = t.companies ? t.companies.name : '—';
  const st = TASK_STATUS[t.status] || { label: t.status, badge: 'badge-purple' };
  const compl = (t.current_completions || 0) +
    (t.max_completions ? '/' + t.max_completions : '/&#8734;');
  return '<tr><td>' + esc(company) + '</td><td><b>' + esc(t.title) + '</b></td>' +
    '<td>' + esc(ACTION_TYPES[t.action_type] || t.action_type || '—') + '</td>' +
    '<td>' + (t.xp_reward || 0) + '</td>' +
    '<td><span class="badge ' + st.badge + '">' + st.label + '</span></td>' +
    '<td>' + compl + '</td>' +
    '<td>' + fmtDate(t.created_at) + '</td>' +
    '<td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewBizTask(\'' +
    t.id + '\')">Просмотр</button></td></tr>';
}

async function viewBizTask(id) {
  try {
    const r = await sb.from('tasks').select('*, companies(name)').eq('id', id).single();
    if (r.error) throw r.error;
    const t = r.data;
    const stats = await sb.from('task_completions').select('status').eq('task_id', id);
    const cArr = stats.data || [];
    const approved = cArr.filter(function(c) { return c.status === 'approved'; }).length;
    const pending = cArr.filter(function(c) { return c.status === 'pending'; }).length;
    const rejected = cArr.filter(function(c) { return c.status === 'rejected'; }).length;
    let body = '<div class="info-row"><div class="info-label">Компания</div><div>' +
      esc(t.companies ? t.companies.name : '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Название</div><div>' + esc(t.title) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Описание</div><div>' + esc(t.description || '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Тип</div><div>' +
      esc(ACTION_TYPES[t.action_type] || t.action_type) + '</div></div>' +
      '<div class="info-row"><div class="info-label">XP / Выполнений</div><div>' +
      (t.xp_reward || 0) + ' XP / ' + (t.current_completions || 0) +
      (t.max_completions ? '/' + t.max_completions : '/&#8734;') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Статистика</div><div>' +
      '<span class="badge badge-green">Принято: ' + approved + '</span> ' +
      '<span class="badge badge-gold">Ожидает: ' + pending + '</span> ' +
      '<span class="badge badge-red">Отклонено: ' + rejected + '</span></div></div>' +
      '<div class="info-row"><div class="info-label">Создано</div><div>' +
      fmtDate(t.created_at) + '</div></div>';
    openModal('Бизнес задание', body);
  } catch (err) {
    console.error('viewBizTask error:', err);
    showToast('Ошибка загрузки', 'err');
  }
}
