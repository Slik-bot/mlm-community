// ═══════════════════════════════════════
// ADMIN USERS — Список пользователей (A2)
// Вынесено из admin-core.js + расширенные фильтры
// Карточка юзера (A3) — см. admin-user-card.js
// ═══════════════════════════════════════

let _usersTab = 'list', _usersPage = 1, _usersSearch = '';
let _usersDna = '', _usersPlan = '', _usersLevel = '', _usersStatus = '', _usersVerif = '';
let _usersCache = [], _usersFiltered = [], _usersTotal = 0, _searchTimer = null;
const _selectedUsers = new Set();

// ===== РЕНДЕР СЕКЦИИ =====
function renderUsers() {
  const tabs = [['list', 'Список'], ['verification', 'Верификация']];
  let h = '<div class="tabs">';
  tabs.forEach(function(t) {
    h += '<button class="tab' + (t[0] === _usersTab ? ' active' : '') +
      '" onclick="switchUsersTab(\'' + t[0] + '\',this)">' + t[1] + '</button>';
  });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchUsersTab(_usersTab, document.querySelector('.tab.active'));
}
function switchUsersTab(tab, btn) {
  _usersTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ list: renderUsersList, verification: loadVerification }[tab] || function() {})();
}

// ===== ХЕЛПЕР SELECT =====
function buildSelect(opts, val, onChange) {
  let h = '<select class="field field-select" onchange="' + onChange + '">';
  opts.forEach(function(o) {
    h += '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>';
  });
  return h + '</select>';
}

// ===== СПИСОК С ФИЛЬТРАМИ =====
async function renderUsersList() {
  const el = document.getElementById('contentArea');
  const dnaOpts = [['','Все ДНК'],['strategist','Стратег'],['communicator','Коммуникатор'],['creator','Креатор'],['analyst','Аналитик']];
  const planOpts = [['','Все тарифы'],['free','FREE'],['pro','PRO'],['business','BUSINESS'],['academy','ACADEMY']];
  const levelOpts = [['','Все уровни'],['pawn','Пешка'],['knight','Конь'],['bishop','Слон'],['rook','Ладья'],['queen','Ферзь'],['king','Король']];
  const statusOpts = [['','Все статусы'],['active','Активные'],['banned','Забаненные'],['inactive_7d','Неактивные 7д']];
  const verifOpts = [['','Верификация'],['verified','Верифиц.'],['pending','Ожидание'],['rejected','Отклонён.']];
  let h = '<div class="toolbar">' +
    '<input type="text" class="field field-search" placeholder="Поиск..." ' +
      'value="' + esc(_usersSearch) + '" oninput="_usersSearch=this.value;_usersPage=1;debounceUsers()">' +
    buildSelect(dnaOpts, _usersDna, '_usersDna=this.value;_usersPage=1;loadUsersTable()') +
    buildSelect(planOpts, _usersPlan, '_usersPlan=this.value;_usersPage=1;loadUsersTable()') +
    buildSelect(levelOpts, _usersLevel, '_usersLevel=this.value;applyFiltersAndRender()') +
    buildSelect(statusOpts, _usersStatus, '_usersStatus=this.value;applyFiltersAndRender()') +
    buildSelect(verifOpts, _usersVerif, '_usersVerif=this.value;applyFiltersAndRender()') +
    '</div>' +
    '<div id="bulkBar" class="toolbar bulk-bar" style="display:none">' +
      '<span id="bulkCount">0 выбрано</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="bulkAction(\'push\')">Push</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="bulkAction(\'xp\')">+XP</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="bulkAction(\'tariff\')">Тариф</button>' +
      '<button class="btn btn-primary btn-sm" onclick="exportUsersCSV()">CSV</button>' +
    '</div>' +
    '<div id="usersTableWrap">Загрузка...</div><div id="usersPagination"></div>';
  el.innerHTML = h;
  loadUsersTable();
}
function debounceUsers() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(loadUsersTable, 400);
}

// ===== ЗАГРУЗКА И ФИЛЬТРАЦИЯ =====
async function fetchUsersData() {
  const result = await loadUsers(_usersPage, _usersSearch, _usersDna, _usersPlan);
  _usersCache = result.data;
  _usersTotal = result.count;
}
function applyClientFilters() {
  let list = _usersCache.slice();
  if (_usersLevel) {
    list = list.filter(function(u) { return u.level === _usersLevel; });
  }
  if (_usersStatus === 'banned') {
    list = list.filter(function(u) { return u.is_banned; });
  } else if (_usersStatus === 'active') {
    list = list.filter(function(u) { return !u.is_banned; });
  } else if (_usersStatus === 'inactive_7d') {
    const week = Date.now() - 7 * 24 * 3600 * 1000;
    list = list.filter(function(u) {
      return !u.last_active_at || new Date(u.last_active_at).getTime() < week;
    });
  }
  if (_usersVerif === 'verified') {
    list = list.filter(function(u) { return u.is_verified; });
  } else if (_usersVerif === 'pending') {
    list = list.filter(function(u) { return !u.is_verified && u.verification_status === 'pending'; });
  } else if (_usersVerif === 'rejected') {
    list = list.filter(function(u) { return u.verification_status === 'rejected'; });
  }
  _usersFiltered = list;
}
function applyFiltersAndRender() {
  applyClientFilters();
  if (!_usersFiltered.length) {
    document.getElementById('usersTableWrap').innerHTML = '<div class="empty">Пользователи не найдены</div>';
    document.getElementById('usersPagination').innerHTML = '';
    return;
  }
  renderUsersRows();
  renderUsersPagination();
}

// ===== РЕНДЕР ТАБЛИЦЫ =====
function renderUsersRows() {
  const data = _usersFiltered;
  const allChecked = data.length > 0 && data.every(function(u) { return _selectedUsers.has(u.id); });
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th><input type="checkbox" onchange="selectAllUsers(this.checked)"' + (allChecked ? ' checked' : '') + '></th>' +
    '<th></th><th>Имя</th><th>Email</th><th>ДНК</th><th>Уровень</th><th>XP</th><th>Тариф</th><th>Статус</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(u) {
    const avatar = u.avatar_url
      ? '<img class="avatar-sm" src="' + esc(u.avatar_url) + '" alt="">'
      : '<div class="avatar-sm avatar-placeholder">&#128100;</div>';
    const dna = u.dna_type
      ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>' : '—';
    const planBdg = u.tariff === 'business' ? 'badge-gold' : u.tariff === 'pro' ? 'badge-purple' : 'badge-blue';
    const st = u.is_banned ? '<span class="badge badge-red">Бан</span>'
      : u.is_verified ? '<span class="badge badge-green">✓</span>' : '<span class="badge badge-purple">Акт</span>';
    const chk = _selectedUsers.has(u.id) ? ' checked' : '';
    h += '<tr>' +
      '<td><input type="checkbox" onchange="toggleUserCheckbox(\'' + u.id + '\')"' + chk + '></td>' +
      '<td>' + avatar + '</td><td><b>' + esc(u.name || '—') + '</b></td><td>' + esc(u.email || '—') + '</td>' +
      '<td>' + dna + '</td><td>' + (LN[u.level] || '—') + '</td><td>' + (u.xp_total || 0) + '</td>' +
      '<td><span class="badge ' + planBdg + '">' + (u.tariff || 'free').toUpperCase() + '</span></td>' +
      '<td>' + st + '</td>' +
      '<td class="actions"><button class="btn btn-ghost btn-sm" onclick="openUserCard(\'' + u.id + '\')">Подробнее</button></td></tr>';
  });
  h += '</tbody></table></div>';
  document.getElementById('usersTableWrap').innerHTML = h;
}
function renderUsersPagination() {
  const perPage = 20, totalPages = Math.ceil(_usersTotal / perPage);
  if (totalPages <= 1) {
    document.getElementById('usersPagination').innerHTML = '<span class="page-info">' + _usersTotal + ' всего</span>';
    return;
  }
  let pg = '<div class="pagination">';
  pg += '<button' + (_usersPage <= 1 ? ' disabled' : '') + ' onclick="_usersPage--;loadUsersTable()">&laquo;</button>';
  const end = Math.min(totalPages, Math.max(1, _usersPage - 2) + 4);
  const start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) {
    pg += '<button' + (i === _usersPage ? ' class="active"' : '') + ' onclick="_usersPage=' + i + ';loadUsersTable()">' + i + '</button>';
  }
  pg += '<button' + (_usersPage >= totalPages ? ' disabled' : '') + ' onclick="_usersPage++;loadUsersTable()">&raquo;</button>';
  pg += '<span class="page-info">' + _usersTotal + ' всего</span></div>';
  document.getElementById('usersPagination').innerHTML = pg;
}
async function loadUsersTable() {
  try {
    await fetchUsersData();
    applyClientFilters();
    if (!_usersFiltered.length) {
      document.getElementById('usersTableWrap').innerHTML = '<div class="empty">Пользователи не найдены</div>';
      document.getElementById('usersPagination').innerHTML = '';
      return;
    }
    renderUsersRows();
    renderUsersPagination();
  } catch (err) {
    console.error('loadUsersTable error:', err);
    document.getElementById('usersTableWrap').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки пользователей', 'err');
  }
}

// ═══════════════════════════════════════
// КАРТОЧКА ЮЗЕРА — см. admin-user-card.js
// ═══════════════════════════════════════

// ===== ЭКШЕНЫ =====
async function toggleBan(id, ban) {
  try {
    await updateProfile(id, { is_banned: ban });
    await logAdminAction(ban ? 'ban_user' : 'unban_user', 'user', id);
    showToast(ban ? 'Забанен' : 'Разбанен', ban ? 'warn' : 'ok');
    closeModal(); loadUsersTable();
  } catch (err) {
    console.error('toggleBan error:', err);
    showToast('Ошибка', 'err');
  }
}
async function toggleVerify(id, verify) {
  try {
    await updateProfile(id, { is_verified: verify });
    await logAdminAction('verify_user', 'user', id, { verified: verify });
    showToast(verify ? 'Верифицирован' : 'Верификация снята', 'ok');
    closeModal(); loadUsersTable();
  } catch (err) {
    console.error('toggleVerify error:', err);
    showToast('Ошибка', 'err');
  }
}
async function doAdjustXp(id) {
  try {
    const amount = parseInt(document.getElementById('xpAmount').value);
    if (!amount || isNaN(amount)) { showToast('Введите число', 'err'); return; }
    await logXpChange(id, amount);
    await logAdminAction('change_xp', 'user', id, { amount: amount });
    showToast('XP ' + (amount > 0 ? '+' : '') + amount, 'ok');
    closeModal(); loadUsersTable();
  } catch (err) {
    console.error('doAdjustXp error:', err);
    showToast('Ошибка коррекции XP', 'err');
  }
}

// ===== МАССОВЫЕ ДЕЙСТВИЯ =====
function toggleUserCheckbox(id) {
  if (_selectedUsers.has(id)) _selectedUsers.delete(id);
  else _selectedUsers.add(id);
  updateBulkBar();
}
function selectAllUsers(checked) {
  _selectedUsers.clear();
  if (checked) _usersFiltered.forEach(function(u) { _selectedUsers.add(u.id); });
  renderUsersRows();
  updateBulkBar();
}
function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (!bar) return;
  bar.style.display = _selectedUsers.size > 0 ? 'flex' : 'none';
  const el = document.getElementById('bulkCount');
  if (el) el.textContent = _selectedUsers.size + ' выбрано';
}
async function bulkAction(action) {
  const ids = Array.from(_selectedUsers);
  if (!ids.length) { showToast('Выберите пользователей', 'err'); return; }
  try {
    if (action === 'push') {
      const msg = prompt('Текст push-уведомления:');
      if (!msg) return;
      for (const id of ids) {
        await sb.from('notifications').insert({ user_id: id, type: 'admin', title: 'Уведомление', body: msg });
      }
      showToast('Push отправлен: ' + ids.length, 'ok');
    } else if (action === 'xp') {
      const xp = parseInt(prompt('Количество XP (±):'));
      if (!xp || isNaN(xp)) return;
      for (const id of ids) { await logXpChange(id, xp); }
      showToast('XP ' + (xp > 0 ? '+' : '') + xp + ' → ' + ids.length, 'ok');
    } else if (action === 'tariff') {
      const t = prompt('Тариф (free/pro/business):');
      if (!['free', 'pro', 'business'].includes(t)) { showToast('Неверный тариф', 'err'); return; }
      for (const id of ids) { await updateProfile(id, { tariff: t }); }
      showToast('Тариф обновлён: ' + ids.length, 'ok');
    }
    await logAdminAction('bulk_' + action, 'users', null, { count: ids.length });
    _selectedUsers.clear();
    loadUsersTable();
  } catch (err) {
    console.error('bulkAction error:', err);
    showToast('Ошибка массового действия', 'err');
  }
}

// ===== ЭКСПОРТ CSV =====
function exportUsersCSV() {
  const data = _usersFiltered;
  if (!data.length) { showToast('Нет данных для экспорта', 'err'); return; }
  const cols = ['ID','Имя','Email','Telegram','ДНК','Уровень','Тариф','Баланс','XP','Стрик','Верификация','Дата рег.'];
  let csv = cols.join(';') + '\n';
  data.forEach(function(u) {
    csv += [u.id, u.name||'', u.email||'', u.telegram_id||'', u.dna_type||'', u.level||'',
      (u.tariff||'free').toUpperCase(), u.balance||0, u.xp_total||0, u.streak_days||0,
      u.is_verified ? 'Да' : 'Нет', fmtDate(u.created_at)].join(';') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trafiqo_users_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV скачан', 'ok');
}

// ═══════════════════════════════════════
// ЭКСПОРТЫ
// ═══════════════════════════════════════
window.renderUsers = renderUsers; window.switchUsersTab = switchUsersTab;
window.toggleBan = toggleBan;
window.toggleVerify = toggleVerify; window.doAdjustXp = doAdjustXp;
window.toggleUserCheckbox = toggleUserCheckbox; window.selectAllUsers = selectAllUsers;
window.bulkAction = bulkAction; window.exportUsersCSV = exportUsersCSV;
