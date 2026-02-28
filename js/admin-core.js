// ===== ADMIN CORE — Auth, Navigation, Dashboard, Users =====

const SB_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTUxNTUsImV4cCI6MjA4MzQzMTE1NX0.Wyhhvdy-EnzazbFywr5Nk3d0F3JknWVXz1Sgvz3x67g';
const sb = supabase.createClient(SB_URL, SB_KEY);

let adminUser = null;
let adminProfile = null;
let currentPage = 'dashboard';

const DN = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
const DC = { strategist: 'blue', communicator: 'green', creator: 'gold', analyst: 'purple' };
const LN = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь' };

const TITLES = { dashboard:'Дашборд', users:'Пользователи', content:'Контент', companies:'Компании', shop:'Магазин', gamification:'Геймификация', finance:'Финансы', settings:'Настройки' };

const ROLE_ACCESS = {
  super_admin: ['dashboard','users','content','companies','shop','gamification','finance','settings'],
  admin: ['dashboard','users','content','companies','shop','gamification','finance'],
  moderator: ['dashboard','content'],
  analyst: ['dashboard']
};

// ===== AUTH =====
function validateAdminCreds() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Введите email и пароль'; return null; }
  return { email: email, pass: pass, errEl: errEl };
}

async function adminLogin() {
  const creds = validateAdminCreds();
  if (!creds) return;
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Вход...'; btn.disabled = true;
  try {
    const signIn = await sb.auth.signInWithPassword({ email: creds.email, password: creds.pass });
    if (signIn.error) {
      creds.errEl.textContent = 'Неверный email или пароль';
      btn.textContent = 'Войти'; btn.disabled = false; return;
    }
    const adminCheck = await sb.from('admin_users')
      .select('id, name, role, is_active').eq('email', creds.email).maybeSingle();
    if (!adminCheck.data || !adminCheck.data.is_active) {
      await sb.auth.signOut();
      creds.errEl.textContent = 'Нет прав администратора';
      btn.textContent = 'Войти'; btn.disabled = false; return;
    }
    adminUser = signIn.data.user;
    adminProfile = adminCheck.data;
    localStorage.setItem('adminUser', JSON.stringify({
      id: adminCheck.data.id, name: adminCheck.data.name, role: adminCheck.data.role
    }));
    initApp();
  } catch (err) {
    console.error('adminLogin error:', err);
    creds.errEl.textContent = 'Ошибка входа. Попробуйте позже';
    btn.textContent = 'Войти'; btn.disabled = false;
  }
}
async function checkSession() {
  try {
    const sess = await sb.auth.getSession();
    if (!sess.data || !sess.data.session) return;

    const email = sess.data.session.user.email;
    const adminCheck = await sb
      .from('admin_users')
      .select('id, name, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!adminCheck.data || !adminCheck.data.is_active) {
      await sb.auth.signOut();
      return;
    }

    adminUser = sess.data.session.user;
    adminProfile = adminCheck.data;
    localStorage.setItem('adminUser', JSON.stringify({
      id: adminCheck.data.id,
      name: adminCheck.data.name,
      role: adminCheck.data.role
    }));
    initApp();
  } catch (err) {
    console.error('checkSession error:', err);
  }
}
function adminLogout() { sb.auth.signOut().then(function() { location.reload(); }); }
function initApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  document.getElementById('sbEmail').textContent = adminProfile.email || '';
  document.getElementById('adminName').textContent = adminProfile.name || adminProfile.email || '';
  applyRoleAccess(adminProfile.role);
  showPage('dashboard');
}

// ===== NAVIGATION =====
function applyRoleAccess(role) {
  const allowed = ROLE_ACCESS[role] || [];
  document.querySelectorAll('.sb-item[data-page]').forEach(function(el) {
    el.style.display = allowed.includes(el.dataset.page) ? '' : 'none';
  });
}

function checkAccess(section) {
  const role = adminProfile ? adminProfile.role : null;
  if (!role) return false;
  return (ROLE_ACCESS[role] || []).includes(section);
}

function showPage(page) {
  if (!checkAccess(page)) { showToast('Нет доступа', 'err'); return; }
  currentPage = page;
  document.getElementById('pageTitle').textContent = TITLES[page] || page;

  document.querySelectorAll('.sb-item[data-page]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl.classList.contains('open')) toggleSidebar();

  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'users': renderUsers(); break;
    case 'content': renderContent(); break;
    case 'companies': renderCompanies(); break;
    case 'shop': renderShop(); break;
    case 'gamification': renderGamification(); break;
    case 'finance': renderFinance(); break;
    case 'settings': renderSettings(); break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sbOverlay').classList.toggle('show');
}

// ===== DASHBOARD =====
async function loadDashboardStats() {
  return Promise.all([
    sb.from('vw_public_profiles').select('id', { count: 'exact', head: true }),
    sb.from('posts').select('id', { count: 'exact', head: true }),
    sb.from('comments').select('id', { count: 'exact', head: true }),
    sb.from('companies').select('id', { count: 'exact', head: true }),
    sb.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active')
  ]);
}

function renderDashboardCards(counts) {
  const cards = [
    { icon: '\ud83d\udc65', val: counts[0].count || 0, label: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438', color: 'purple' },
    { icon: '\ud83d\udcdd', val: counts[1].count || 0, label: '\u041f\u043e\u0441\u0442\u044b', color: 'green' },
    { icon: '\ud83d\udcac', val: counts[2].count || 0, label: '\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438', color: 'blue' },
    { icon: '\ud83c\udfe2', val: counts[3].count || 0, label: '\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u0438', color: 'gold' },
    { icon: '\u26a0\ufe0f', val: counts[4].count || 0, label: '\u0416\u0430\u043b\u043e\u0431\u044b', color: 'red' },
    { icon: '\ud83d\udc8e', val: counts[5].count || 0, label: '\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0438', color: 'green' }
  ];
  document.getElementById('dashStats').innerHTML = cards.map(function(c) {
    return '<div class="stat-card"><div class="stat-icon">' + c.icon + '</div><div class="stat-val ' + c.color + '">' + c.val + '</div><div class="stat-label">' + c.label + '</div></div>';
  }).join('');
}

async function renderDashboardTables() {
  const reps = await sb.from('reports').select('*')
    .eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
  const rd = reps.data || [];
  document.getElementById('dashReports').innerHTML = !rd.length
    ? '<div class="empty">Нет активных жалоб</div>'
    : '<div class="table-wrap"><table class="data-table"><thead><tr><th>Тип</th><th>Причина</th><th>Дата</th></tr></thead><tbody>' +
      rd.map(function(r) {
        return '<tr><td><span class="badge badge-red">' + esc(r.target_type) + '</span></td><td>' + esc(r.reason_category || '—') + '</td><td>' + fmtDate(r.created_at) + '</td></tr>';
      }).join('') + '</tbody></table></div>';

  const users = await sb.from('vw_public_profiles').select('name, dna_type, level, created_at')
    .order('created_at', { ascending: false }).limit(5);
  const ud = users.data || [];
  document.getElementById('dashUsers').innerHTML = !ud.length
    ? '<div class="empty">Нет пользователей</div>'
    : '<div class="table-wrap"><table class="data-table"><thead><tr><th>Имя</th><th>ДНК</th><th>Уровень</th><th>Дата</th></tr></thead><tbody>' +
      ud.map(function(u) {
        const dna = u.dna_type ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>' : '—';
        return '<tr><td>' + esc(u.name || '—') + '</td><td>' + dna + '</td><td>' + (LN[u.level] || u.level || '—') + '</td><td>' + fmtDate(u.created_at) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
}

async function renderDashboard() {
  const el = document.getElementById('pageContent');
  el.innerHTML =
    '<div class="stats-grid" id="dashStats"></div>' +
    '<div class="section-title">Последние жалобы</div>' +
    '<div id="dashReports"></div>' +
    '<div class="section-title">Новые пользователи</div>' +
    '<div id="dashUsers"></div>';
  try {
    const counts = await loadDashboardStats();
    renderDashboardCards(counts);
    await renderDashboardTables();
  } catch (err) {
    console.error('renderDashboard error:', err);
    showToast('Ошибка загрузки дашборда', 'err');
  }
}

// ===== USERS =====
let _usersTab = 'list', _usersPage = 1, _usersSearch = '', _usersDna = '', _usersPlan = '';
let _usersCache = [], _usersTotal = 0, _searchTimer = null;

function renderUsers() {
  const tabs = 'list:Список,verification:Верификация';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _usersTab ? ' active' : '') + '" onclick="switchUsersTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchUsersTab(_usersTab, document.querySelector('.tab.active'));
}
function switchUsersTab(tab, btn) {
  _usersTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ list: renderUsersList, verification: loadVerification }[tab] || function(){})();
}
async function renderUsersList() {
  const el = document.getElementById('contentArea');
  el.innerHTML =
    '<div class="toolbar">' +
      '<input type="text" class="field field-search" placeholder="Поиск по имени..." value="' + esc(_usersSearch) + '" oninput="_usersSearch=this.value;_usersPage=1;debounceUsers()">' +
      '<select class="field field-select" onchange="_usersDna=this.value;_usersPage=1;loadUsersTable()">' +
        '<option value="">Все ДНК</option>' +
        '<option value="strategist"' + (_usersDna === 'strategist' ? ' selected' : '') + '>Стратег</option>' +
        '<option value="communicator"' + (_usersDna === 'communicator' ? ' selected' : '') + '>Коммуникатор</option>' +
        '<option value="creator"' + (_usersDna === 'creator' ? ' selected' : '') + '>Креатор</option>' +
        '<option value="analyst"' + (_usersDna === 'analyst' ? ' selected' : '') + '>Аналитик</option>' +
      '</select>' +
      '<select class="field field-select" onchange="_usersPlan=this.value;_usersPage=1;loadUsersTable()">' +
        '<option value="">Все планы</option>' +
        '<option value="free"' + (_usersPlan === 'free' ? ' selected' : '') + '>FREE</option>' +
        '<option value="pro"' + (_usersPlan === 'pro' ? ' selected' : '') + '>PRO</option>' +
        '<option value="business"' + (_usersPlan === 'business' ? ' selected' : '') + '>BUSINESS</option>' +
      '</select>' +
    '</div>' +
    '<div id="usersTableWrap">Загрузка...</div>' +
    '<div id="usersPagination"></div>';
  loadUsersTable();
}

function debounceUsers() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(loadUsersTable, 300);
}

async function fetchUsersData() {
  const result = await loadUsers(_usersPage, _usersSearch, _usersDna, _usersPlan);
  _usersCache = result.data;
  _usersTotal = result.count;
}

function renderUsersRows() {
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th></th><th>Имя</th><th>Email</th><th>ДНК</th><th>Уровень</th><th>XP</th><th>План</th><th>Статус</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  _usersCache.forEach(function(u) {
    const avatar = u.avatar_url
      ? '<img class="avatar-sm" src="' + esc(u.avatar_url) + '" alt="">'
      : '<div class="avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--text-dim)">\ud83d\udc64</div>';
    const dna = u.dna_type
      ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>' : '—';
    const planBadge = u.tariff === 'business' ? 'badge-gold' : u.tariff === 'pro' ? 'badge-purple' : 'badge-blue';
    const st = u.is_banned ? '<span class="badge badge-red">Бан</span>'
      : u.is_verified ? '<span class="badge badge-green">✓</span>' : '<span class="badge badge-purple">Акт</span>';
    h += '<tr><td>' + avatar + '</td><td><b>' + esc(u.name || '—') + '</b></td><td>' + esc(u.email || '—') + '</td>' +
      '<td>' + dna + '</td><td>' + (LN[u.level] || '—') + '</td><td>' + (u.xp_total || 0) + '</td>' +
      '<td><span class="badge ' + planBadge + '">' + (u.tariff || 'free').toUpperCase() + '</span></td>' +
      '<td>' + st + '</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewUser(\'' + u.id + '\')">Подробнее</button></td></tr>';
  });
  h += '</tbody></table></div>';
  document.getElementById('usersTableWrap').innerHTML = h;
}

function renderUsersPagination() {
  const perPage = 20;
  const totalPages = Math.ceil(_usersTotal / perPage);
  if (totalPages <= 1) {
    document.getElementById('usersPagination').innerHTML = '<span class="page-info">' + _usersTotal + ' всего</span>';
    return;
  }
  let pg = '<div class="pagination">';
  pg += '<button' + (_usersPage <= 1 ? ' disabled' : '') + ' onclick="_usersPage--;loadUsersTable()">&laquo;</button>';
  const start = Math.max(1, _usersPage - 2);
  const end = Math.min(totalPages, start + 4);
  const start2 = Math.max(1, end - 4);
  for (let i = start2; i <= end; i++) {
    pg += '<button' + (i === _usersPage ? ' class="active"' : '') + ' onclick="_usersPage=' + i + ';loadUsersTable()">' + i + '</button>';
  }
  pg += '<button' + (_usersPage >= totalPages ? ' disabled' : '') + ' onclick="_usersPage++;loadUsersTable()">&raquo;</button>';
  pg += '<span class="page-info">' + _usersTotal + ' всего</span></div>';
  document.getElementById('usersPagination').innerHTML = pg;
}

async function loadUsersTable() {
  try {
    await fetchUsersData();
    if (!_usersCache.length) {
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

function viewUser(id) {
  const u = _usersCache.find(function(x) { return x.id === id; });
  if (!u) return;

  const body =
    '<div class="info-row"><div class="info-label">Email</div><div>' + esc(u.email || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">ДНК</div><div>' + (DN[u.dna_type] || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Уровень</div><div>' + (LN[u.level] || '—') + ' (' + (u.xp_total || 0) + ' XP)</div></div>' +
    '<div class="info-row"><div class="info-label">План</div><div>' + (u.tariff || 'free').toUpperCase() + '</div></div>' +
    '<div class="info-row"><div class="info-label">Город</div><div>' + esc(u.city || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Стрик</div><div>' + (u.streak_days || 0) + ' дн.</div></div>' +
    '<div class="info-row"><div class="info-label">Регистрация</div><div>' + fmtDate(u.created_at) + '</div></div>' +
    '<div class="modal-actions">' +
      '<button class="btn ' + (u.is_verified ? 'btn-ghost' : 'btn-success') + '" onclick="toggleVerify(\'' + u.id + '\',' + !u.is_verified + ')">' +
        (u.is_verified ? 'Снять верификацию' : 'Верифицировать') +
      '</button>' +
      '<button class="btn ' + (u.is_banned ? 'btn-success' : 'btn-danger') + '" onclick="toggleBan(\'' + u.id + '\',' + !u.is_banned + ')">' +
        (u.is_banned ? 'Разбанить' : 'Забанить') +
      '</button>' +
    '</div>' +
    '<div style="margin-top:16px">' +
      '<div class="fl">Коррекция XP</div>' +
      '<div style="display:flex;gap:8px">' +
        '<input type="number" class="field" id="xpAmount" placeholder="±XP" style="margin:0;flex:1">' +
        '<button class="btn btn-primary" onclick="doAdjustXp(\'' + u.id + '\')">Применить</button>' +
      '</div>' +
    '</div>';

  openModal(u.name || u.email || 'Пользователь', body);
}
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

// ===== CONTENT =====
let _contentTab = 'posts';
function renderContent() {
  const tabs = 'posts:Посты,comments:Комментарии,cases:Кейсы,taskReview:Задания,reports:Жалобы,moderation:Модерация';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _contentTab ? ' active' : '') + '" onclick="switchContentTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchContentTab(_contentTab, document.querySelector('.tab.active'));
}
function switchContentTab(tab, btn) {
  _contentTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  const fn = { posts: loadPosts, comments: loadComments, cases: loadCases, taskReview: loadTaskReview, reports: loadReports, moderation: loadModeration }[tab];
  if (fn) fn(tab === 'reports' || tab === 'moderation' || tab === 'taskReview' ? '' : 1);
}

// ===== PLACEHOLDERS =====
function showPlaceholder(text) {
  document.getElementById('pageContent').innerHTML = '<div class="placeholder"><span>🚧</span><p>' + esc(text) + '</p></div>';
}

// ===== MODAL =====
function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOv').classList.add('show');
}
function closeModal() { document.getElementById('modalOv').classList.remove('show'); }

// ===== TOAST — см. js/utils/format.js =====

// ===== UTILITIES =====
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('ru') : '—'; }
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

// ===== INIT =====
document.getElementById('loginEmail').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });
document.getElementById('loginPass').addEventListener('keydown', function(e) { if (e.key === 'Enter') adminLogin(); });
checkSession();
