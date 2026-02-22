// ===== TASKS SCREENS — список заданий, детали задания =====

let currentTask = null;
let allTasks = [];
let taskTab = 'all';
let taskDnaFilter = 'all';
let taskScreenshotUrl = null;
let taskDailyDone = 0;

const COMPLETE_TASK_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/complete-task';

const TASK_TYPES = {
  platform: { label: 'Платформа', color: '#8b5cf6' },
  ad:       { label: 'Реклама',   color: '#f59e0b' },
  business: { label: 'Бизнес',    color: '#22c55e' }
};

function getTaskTypeIcon(type) {
  const c = (TASK_TYPES[type] || TASK_TYPES.platform).color;
  if (type === 'ad') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" width="24" height="24"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>';
  }
  if (type === 'business') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 8v8M8 12h8"/></svg>';
}

function getTaskTypeColor(type) {
  return (TASK_TYPES[type] || TASK_TYPES.platform).color;
}

function getTodayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isCompletedToday(task) {
  if (!task.completions || !window.currentUser) return false;
  const todayStart = getTodayStart();
  return task.completions.some(function(c) {
    return c.user_id === window.currentUser.id && c.status === 'approved';
  });
}

// ===== TASKS LIST =====

function initTasks() {
  taskTab = 'all';
  taskDnaFilter = 'all';
  updateTaskTabUI();
  updateDnaFilterUI();

  const xpBadge = document.getElementById('tasksXpBadge');
  if (xpBadge && window.currentUser) {
    xpBadge.textContent = (window.currentUser.xp_total || 0) + ' XP';
  }

  loadTasks();
  loadDailyProgress();
}

async function loadTasks() {
  const result = await window.sb.from('tasks')
    .select('*, completions:task_completions(id, status, user_id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  allTasks = result.data || [];
  renderTaskList(applyTaskFilters());
}

function applyTaskFilters() {
  let filtered = allTasks;

  if (taskTab !== 'all') {
    filtered = filtered.filter(function(t) { return t.type === taskTab; });
  }

  if (taskDnaFilter !== 'all') {
    filtered = filtered.filter(function(t) {
      if (!t.dna_types || !t.dna_types.length) return true;
      return t.dna_types.indexOf(taskDnaFilter) !== -1;
    });
  }

  return filtered;
}

function renderTaskList(tasks) {
  const list = document.getElementById('tasksList');
  const empty = document.getElementById('tasksEmpty');
  if (!list) return;

  if (!tasks.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = tasks.map(function(t) {
    const typeColor = getTaskTypeColor(t.type);
    const typeIcon = getTaskTypeIcon(t.type);
    const done = isCompletedToday(t);
    const doneClass = done ? ' task-card--done' : '';
    const doneBadge = done ? '<span class="task-done-badge">Выполнено</span>' : '';
    const moneyBadge = t.reward_money ? '<span class="task-money-badge">' + t.reward_money + ' P</span>' : '';

    return '<div class="task-card glass-card' + doneClass + '" onclick="openTask(\'' + t.id + '\')">' +
      '<div class="task-type-icon" style="background:' + typeColor + '22">' + typeIcon + '</div>' +
      '<div class="task-card-body">' +
        '<div class="task-card-title">' + escHtml(t.title) + '</div>' +
        '<div class="task-card-desc">' + escHtml(t.description || '') + '</div>' +
        '<div class="task-rewards">' +
          '<span class="task-xp-badge">+' + (t.reward_xp || 0) + ' XP</span>' +
          moneyBadge + doneBadge +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function switchTaskTab(tab) {
  taskTab = tab;
  updateTaskTabUI();
  renderTaskList(applyTaskFilters());
}

function updateTaskTabUI() {
  const btns = document.querySelectorAll('#tasksTabs .task-tab');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === taskTab);
  });
}

function filterTasksByDna(dna) {
  taskDnaFilter = dna;
  updateDnaFilterUI();
  renderTaskList(applyTaskFilters());
}

function updateDnaFilterUI() {
  const btns = document.querySelectorAll('#tasksDnaFilter .dna-filter-btn');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-dna') === taskDnaFilter);
  });
}

async function loadDailyProgress() {
  if (!window.currentUser) return;
  const result = await window.sb.from('task_completions')
    .select('id')
    .eq('user_id', window.currentUser.id)
    .gte('taken_at', getTodayStart())
    .eq('status', 'approved');

  taskDailyDone = (result.data || []).length;
  const max = 10;
  const pct = Math.min(taskDailyDone / max * 100, 100);
  const fill = document.getElementById('dailyFill');
  const count = document.getElementById('dailyCount');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = taskDailyDone + ' / ' + max;
}

function openTask(taskId) {
  currentTask = allTasks.find(function(t) { return t.id === taskId; });
  taskScreenshotUrl = null;
  if (currentTask) goTo('scrTaskDetail');
}

// ===== TASK DETAIL =====

function initTaskDetail() {
  if (!currentTask) { goBack(); return; }

  const typeColor = getTaskTypeColor(currentTask.type);
  const typeLabel = (TASK_TYPES[currentTask.type] || TASK_TYPES.platform).label;

  const iconEl = document.getElementById('tdTypeIcon');
  if (iconEl) {
    iconEl.innerHTML = getTaskTypeIcon(currentTask.type);
    iconEl.style.background = typeColor + '22';
  }

  const labelEl = document.getElementById('tdTypeLabel');
  if (labelEl) labelEl.textContent = typeLabel;

  const titleEl = document.getElementById('tdTitle');
  if (titleEl) titleEl.textContent = currentTask.title;

  const descEl = document.getElementById('tdDesc');
  if (descEl) descEl.textContent = currentTask.description || '';

  const xpEl = document.getElementById('tdXp');
  if (xpEl) xpEl.textContent = '+' + (currentTask.reward_xp || 0) + ' XP';

  const moneyRow = document.getElementById('tdMoneyRow');
  const moneyEl = document.getElementById('tdMoney');
  if (currentTask.reward_money && currentTask.reward_money > 0) {
    if (moneyRow) moneyRow.classList.remove('hidden');
    if (moneyEl) moneyEl.textContent = currentTask.reward_money + ' P';
  } else {
    if (moneyRow) moneyRow.classList.add('hidden');
  }

  const screenshotWrap = document.getElementById('tdScreenshotWrap');
  if (currentTask.requires_screenshot) {
    if (screenshotWrap) screenshotWrap.classList.remove('hidden');
  } else {
    if (screenshotWrap) screenshotWrap.classList.add('hidden');
  }

  const preview = document.getElementById('tdScreenshotPreview');
  const placeholder = document.getElementById('tdScreenshotPlaceholder');
  if (preview) { preview.classList.add('hidden'); preview.src = ''; }
  if (placeholder) placeholder.classList.remove('hidden');

  const reqEl = document.getElementById('tdRequirements');
  if (reqEl) {
    const reqs = [];
    if (currentTask.dna_types && currentTask.dna_types.length) {
      reqs.push('<div class="td-req-item">ДНК: ' + currentTask.dna_types.join(', ') + '</div>');
    }
    reqEl.innerHTML = reqs.join('');
  }

  const done = isCompletedToday(currentTask);
  const statusEl = document.getElementById('tdStatus');
  const btn = document.getElementById('tdActionBtn');
  if (done) {
    if (statusEl) { statusEl.classList.remove('hidden'); statusEl.textContent = 'Уже выполнено сегодня'; statusEl.className = 'td-status td-status--done'; }
    if (btn) { btn.disabled = true; btn.textContent = 'Выполнено'; }
  } else {
    if (statusEl) statusEl.classList.add('hidden');
    if (btn) { btn.disabled = false; btn.textContent = 'Выполнить задание'; }
  }
}

function taskPickScreenshot() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = async function() {
    const file = inp.files[0];
    if (!file || !window.currentUser || !currentTask) return;

    const path = 'task-screenshots/' + window.currentUser.id + '/' + currentTask.id + '.jpg';
    await window.sb.storage.from('uploads').upload(path, file, { upsert: true });
    const urlData = window.sb.storage.from('uploads').getPublicUrl(path);
    taskScreenshotUrl = urlData.data.publicUrl;

    const preview = document.getElementById('tdScreenshotPreview');
    const placeholder = document.getElementById('tdScreenshotPlaceholder');
    if (preview) { preview.src = taskScreenshotUrl; preview.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');
  };
  inp.click();
}

async function taskComplete() {
  if (!currentTask || !window.currentUser) return;

  if (currentTask.requires_screenshot && !taskScreenshotUrl) {
    if (window.showToast) showToast('Загрузите скриншот');
    return;
  }

  const btn = document.getElementById('tdActionBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  const sessionResult = await window.sb.auth.getSession();
  const token = sessionResult.data.session ? sessionResult.data.session.access_token : '';

  try {
    const resp = await fetch(COMPLETE_TASK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        task_id: currentTask.id,
        screenshot_url: taskScreenshotUrl || null
      })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      if (window.showToast) showToast('+' + (data.xp_awarded || currentTask.reward_xp || 0) + ' XP!');
      goBack();
    } else {
      if (window.showToast) showToast(data.error || 'Ошибка выполнения');
      if (btn) { btn.disabled = false; btn.textContent = 'Выполнить задание'; }
    }
  } catch (e) {
    if (window.showToast) showToast('Ошибка сети');
    if (btn) { btn.disabled = false; btn.textContent = 'Выполнить задание'; }
  }
}

// ===== EXPORTS =====
window.initTasks = initTasks;
window.initTaskDetail = initTaskDetail;
window.switchTaskTab = switchTaskTab;
window.filterTasksByDna = filterTasksByDna;
window.openTask = openTask;
window.taskComplete = taskComplete;
window.taskPickScreenshot = taskPickScreenshot;
