// ═══════════════════════════════════════
// ADMIN TASKS — Управление заданиями (A6)
// 3 вкладки: Платформенные / Рекламные / Бизнес
// ═══════════════════════════════════════

let _tasksTab = 'platform';
let _tasksCache = [];
let _taskFilter = { status: '', dna: '', action: '' };
let _adFilter = '';
let _bizFilter = '';

const ACTION_TYPES = {
  subscribe: 'Подписка', like: 'Лайк', comment: 'Комментарий',
  repost: 'Репост', review: 'Отзыв', screenshot: 'Скриншот',
  register: 'Регистрация', other: 'Другое'
};

const TASK_LEVELS = {
  pawn: 'Пешка', knight: 'Конь', bishop: 'Слон',
  rook: 'Ладья', queen: 'Ферзь', king: 'Король'
};

const TASK_STATUS = {
  active: { label: 'Активно', badge: 'badge-green' },
  paused: { label: 'Пауза', badge: 'badge-gold' },
  archived: { label: 'Архив', badge: 'badge-red' }
};

// ===== РЕНДЕР СТРАНИЦЫ =====
function renderTasks() {
  const tabs = [['platform', 'Платформенные'], ['ad', 'Рекламные'], ['business', 'Бизнес']];
  let h = '<div class="tabs">';
  tabs.forEach(function(t) {
    h += '<button class="tab' + (t[0] === _tasksTab ? ' active' : '') +
      '" onclick="switchTasksTab(\'' + t[0] + '\',this)">' + t[1] + '</button>';
  });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchTasksTab(_tasksTab, document.querySelector('.tab.active'));
}

function switchTasksTab(tab, btn) {
  _tasksTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) {
    t.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  const handlers = {
    platform: loadPlatformTasks,
    ad: loadAdTasks,
    business: loadBusinessTasks
  };
  (handlers[tab] || function() {})();
}

// ═══════════════════════════════════════
// ВКЛАДКА 1 — ПЛАТФОРМЕННЫЕ ЗАДАНИЯ
// ═══════════════════════════════════════

async function loadPlatformTasks() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  try {
    let q = sb.from('tasks').select('*')
      .eq('source', 'platform')
      .order('created_at', { ascending: false });
    if (_taskFilter.status) q = q.eq('status', _taskFilter.status);
    if (_taskFilter.dna && _taskFilter.dna !== 'all') q = q.eq('dna_type', _taskFilter.dna);
    if (_taskFilter.action) q = q.eq('action_type', _taskFilter.action);
    const r = await q;
    if (r.error) throw r.error;
    _tasksCache = r.data || [];
    renderPlatformList();
  } catch (err) {
    console.error('loadPlatformTasks error:', err);
    area.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки заданий', 'err');
  }
}

function renderPlatformList() {
  const area = document.getElementById('contentArea');
  let h = buildPlatformFilters();
  h += '<div class="toolbar"><button class="btn btn-primary" onclick="openTaskModal()">' +
    'Создать задание</button></div>';
  if (!_tasksCache.length) {
    area.innerHTML = h + '<div class="empty">Нет заданий</div>';
    return;
  }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Тип</th><th>XP</th><th>ДНК</th>' +
    '<th>Уровень</th><th>Статус</th><th>Выполн.</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  _tasksCache.forEach(function(t) {
    h += buildPlatformRow(t);
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

function buildPlatformRow(t) {
  const dna = t.dna_type && t.dna_type !== 'all'
    ? '<span class="badge badge-' + (DC[t.dna_type] || 'purple') + '">' +
      (DN[t.dna_type] || t.dna_type) + '</span>'
    : 'Все';
  const level = TASK_LEVELS[t.min_level] || '—';
  const st = TASK_STATUS[t.status] || { label: t.status, badge: 'badge-purple' };
  const compl = (t.current_completions || 0) +
    (t.max_completions ? '/' + t.max_completions : '/&#8734;');
  const toggleLabel = t.status === 'active' ? 'Пауза' : 'Актив.';
  return '<tr><td><b>' + esc(t.title) + '</b></td>' +
    '<td>' + esc(ACTION_TYPES[t.action_type] || t.action_type || '—') + '</td>' +
    '<td>' + (t.xp_reward || 0) + '</td>' +
    '<td>' + dna + '</td>' +
    '<td>' + esc(level) + '</td>' +
    '<td><span class="badge ' + st.badge + '">' + st.label + '</span></td>' +
    '<td>' + compl + '</td>' +
    '<td class="actions">' +
      '<button class="btn btn-ghost btn-sm" onclick="openTaskModal(\'' + t.id + '\')">Ред.</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="toggleTaskStatus(\'' + t.id + '\',\'' +
        t.status + '\')">' + toggleLabel + '</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteTask(\'' + t.id + '\')">Удалить</button>' +
    '</td></tr>';
}

function buildPlatformFilters() {
  let h = '<div class="toolbar" style="gap:8px;flex-wrap:wrap">';
  h += '<select class="field field-select" onchange="_taskFilter.status=this.value;loadPlatformTasks()">' +
    '<option value="">Все статусы</option>';
  Object.keys(TASK_STATUS).forEach(function(s) {
    h += '<option value="' + s + '"' + (_taskFilter.status === s ? ' selected' : '') +
      '>' + TASK_STATUS[s].label + '</option>';
  });
  h += '</select>';
  h += '<select class="field field-select" onchange="_taskFilter.dna=this.value;loadPlatformTasks()">' +
    '<option value="">Все ДНК</option>';
  ['strategist', 'communicator', 'creator', 'analyst'].forEach(function(d) {
    h += '<option value="' + d + '"' + (_taskFilter.dna === d ? ' selected' : '') +
      '>' + (DN[d] || d) + '</option>';
  });
  h += '</select>';
  h += '<select class="field field-select" onchange="_taskFilter.action=this.value;loadPlatformTasks()">' +
    '<option value="">Все типы</option>';
  Object.keys(ACTION_TYPES).forEach(function(a) {
    h += '<option value="' + a + '"' + (_taskFilter.action === a ? ' selected' : '') +
      '>' + ACTION_TYPES[a] + '</option>';
  });
  h += '</select></div>';
  return h;
}

// ===== ФОРМА СОЗДАНИЯ / РЕДАКТИРОВАНИЯ =====

async function openTaskModal(id) {
  let t = {};
  if (id) {
    try {
      const r = await sb.from('tasks').select('*').eq('id', id).single();
      if (r.error) throw r.error;
      t = r.data || {};
    } catch (err) {
      console.error('openTaskModal error:', err);
      showToast('Ошибка загрузки задания', 'err');
      return;
    }
  }
  openModal(id ? 'Редактировать задание' : 'Новое задание', buildTaskForm(t, id));
}

function buildTaskFormSelects(t) {
  let actOpts = '';
  Object.keys(ACTION_TYPES).forEach(function(a) {
    actOpts += '<option value="' + a + '"' +
      (t.action_type === a ? ' selected' : '') + '>' + ACTION_TYPES[a] + '</option>';
  });
  let lvlOpts = '';
  Object.keys(TASK_LEVELS).forEach(function(l) {
    lvlOpts += '<option value="' + l + '"' +
      (t.min_level === l ? ' selected' : '') + '>' + TASK_LEVELS[l] + '</option>';
  });
  let dnaOpts = '<option value="all"' +
    (!t.dna_type || t.dna_type === 'all' ? ' selected' : '') + '>Все</option>';
  ['strategist', 'communicator', 'creator', 'analyst'].forEach(function(d) {
    dnaOpts += '<option value="' + d + '"' +
      (t.dna_type === d ? ' selected' : '') + '>' + (DN[d] || d) + '</option>';
  });
  let statusOpts = '';
  Object.keys(TASK_STATUS).forEach(function(s) {
    statusOpts += '<option value="' + s + '"' +
      ((t.status || 'active') === s ? ' selected' : '') + '>' + TASK_STATUS[s].label + '</option>';
  });
  return { actOpts: actOpts, lvlOpts: lvlOpts, dnaOpts: dnaOpts, statusOpts: statusOpts };
}

function buildTaskForm(t, id) {
  const sel = buildTaskFormSelects(t);
  const scrSel = '<option value="false"' + (!t.requires_screenshot ? ' selected' : '') +
    '>Нет</option><option value="true"' + (t.requires_screenshot ? ' selected' : '') + '>Да</option>';
  return '<div class="fg"><div class="fl">Название *</div>' +
    '<input class="field" id="tTitle" value="' + esc(t.title || '') + '"></div>' +
    '<div class="fg"><div class="fl">Описание *</div>' +
    '<textarea class="field" id="tDesc" rows="3">' + esc(t.description || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Пример (URL)</div>' +
    '<input class="field" id="tExample" value="' + esc(t.example_url || '') + '" placeholder="https://..."></div>' +
    '<div class="fg"><div class="fl">Тип действия</div>' +
    '<select class="field" id="tAction">' + sel.actOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Награда XP *</div>' +
    '<input type="number" class="field" id="tXp" value="' + (t.xp_reward || '') + '" min="1"></div>' +
    '<div class="fg"><div class="fl">Мин. уровень</div>' +
    '<select class="field" id="tLevel">' + sel.lvlOpts + '</select></div>' +
    '<div class="fg"><div class="fl">ДНК-тип</div>' +
    '<select class="field" id="tDna">' + sel.dnaOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Таймер (мин, 0 = без)</div>' +
    '<input type="number" class="field" id="tTimer" value="' + (t.timer_minutes || 0) + '" min="0"></div>' +
    '<div class="fg"><div class="fl">Требуется скриншот</div>' +
    '<select class="field" id="tScr">' + scrSel + '</select></div>' +
    '<div class="fg"><div class="fl">Макс. выполнений (0 = безлимит)</div>' +
    '<input type="number" class="field" id="tMaxC" value="' + (t.max_completions || 0) + '" min="0"></div>' +
    '<div class="fg"><div class="fl">Статус</div>' +
    '<select class="field" id="tStatus">' + sel.statusOpts + '</select></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveTask(\'' +
    (id || '') + '\')">Сохранить</button></div>';
}

async function saveTask(id) {
  const title = document.getElementById('tTitle').value.trim();
  const description = document.getElementById('tDesc').value.trim();
  const xpReward = parseInt(document.getElementById('tXp').value) || 0;
  if (!title) { showToast('Введите название', 'err'); return; }
  if (!description) { showToast('Введите описание', 'err'); return; }
  if (xpReward < 1) { showToast('XP награда должна быть > 0', 'err'); return; }
  const d = {
    title: title, description: description,
    example_url: document.getElementById('tExample').value.trim() || null,
    action_type: document.getElementById('tAction').value,
    xp_reward: xpReward,
    min_level: document.getElementById('tLevel').value,
    dna_type: document.getElementById('tDna').value,
    timer_minutes: parseInt(document.getElementById('tTimer').value) || 0,
    requires_screenshot: document.getElementById('tScr').value === 'true',
    max_completions: parseInt(document.getElementById('tMaxC').value) || 0,
    status: document.getElementById('tStatus').value,
    source: 'platform',
    updated_at: new Date().toISOString()
  };
  if (!id) d.created_by = adminProfile.id;
  try {
    const r = id
      ? await sb.from('tasks').update(d).eq('id', id)
      : await sb.from('tasks').insert(d);
    if (r.error) throw r.error;
    showToast(id ? 'Задание обновлено' : 'Задание создано', 'ok');
    closeModal();
    loadPlatformTasks();
  } catch (err) {
    console.error('saveTask error:', err);
    showToast('Ошибка сохранения', 'err');
  }
}

async function toggleTaskStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  try {
    const r = await sb.from('tasks').update({
      status: newStatus, updated_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast(newStatus === 'active' ? 'Задание активировано' : 'Задание на паузе', 'ok');
    loadPlatformTasks();
  } catch (err) {
    console.error('toggleTaskStatus error:', err);
    showToast('Ошибка', 'err');
  }
}

async function deleteTask(id) {
  if (!confirm('Удалить задание? Это действие необратимо.')) return;
  try {
    const r = await sb.from('tasks').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Задание удалено', 'ok');
    loadPlatformTasks();
  } catch (err) {
    console.error('deleteTask error:', err);
    showToast('Ошибка удаления', 'err');
  }
}

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
