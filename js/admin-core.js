// ===== ADMIN CORE — Auth, Navigation, Dashboard, Users =====

var SB_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co';
var SB_KEY = 'sb_publishable_OBX-vskypeogQyJlViaqpQ_9kI1mDY4';
var sb = supabase.createClient(SB_URL, SB_KEY);

var adminUser = null;
var adminProfile = null;
var currentPage = 'dashboard';

var DN = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
var DC = { strategist: 'blue', communicator: 'green', creator: 'gold', analyst: 'purple' };
var LN = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь' };

var TITLES = { dashboard:'Дашборд', users:'Пользователи', content:'Контент', companies:'Компании', shop:'Магазин', gamification:'Геймификация', finance:'Финансы', settings:'Настройки' };

// ===== AUTH =====
async function adminLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;
  var errEl = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');

  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Введите email и пароль'; return; }

  btn.textContent = 'Вход...';
  btn.disabled = true;

  try {
    var result = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (result.error) {
      errEl.textContent = result.error.message;
      btn.textContent = 'Войти';
      btn.disabled = false;
      return;
    }

    adminUser = result.data.user;
    var pr = await sb.from('profiles').select('*').eq('id', adminUser.id).single();

    if (!pr.data || !pr.data.is_admin) {
      errEl.textContent = 'Нет прав администратора';
      btn.textContent = 'Войти';
      btn.disabled = false;
      await sb.auth.signOut();
      return;
    }

    adminProfile = pr.data;
    initApp();
  } catch (err) {
    console.error('adminLogin error:', err);
    errEl.textContent = 'Ошибка входа. Попробуйте позже';
    btn.textContent = 'Войти';
    btn.disabled = false;
  }
}
async function checkSession() {
  try {
    var sess = await sb.auth.getSession();
    if (!sess.data.session) return;

    adminUser = sess.data.session.user;
    var pr = await sb.from('profiles').select('*').eq('id', adminUser.id).single();

    if (pr.data && pr.data.is_admin) {
      adminProfile = pr.data;
      initApp();
    } else {
      sb.auth.signOut();
    }
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
  showPage('dashboard');
}

// ===== NAVIGATION =====
function showPage(page) {
  currentPage = page;
  document.getElementById('pageTitle').textContent = TITLES[page] || page;

  document.querySelectorAll('.sb-item[data-page]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });

  var sidebarEl = document.getElementById('sidebar');
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
async function renderDashboard() {
  var el = document.getElementById('pageContent');
  el.innerHTML =
    '<div class="stats-grid" id="dashStats"></div>' +
    '<div class="section-title">Последние жалобы</div>' +
    '<div id="dashReports"></div>' +
    '<div class="section-title">Новые пользователи</div>' +
    '<div id="dashUsers"></div>';

  try {
    var counts = await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }),
      sb.from('posts').select('id', { count: 'exact', head: true }),
      sb.from('post_comments').select('id', { count: 'exact', head: true }),
      sb.from('companies').select('id', { count: 'exact', head: true }),
      sb.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('stories').select('id', { count: 'exact', head: true }),
      sb.from('tools').select('id', { count: 'exact', head: true })
    ]);

    var cards = [
      { icon: '👥', val: counts[0].count || 0, label: 'Пользователи', color: 'purple' },
      { icon: '📝', val: counts[1].count || 0, label: 'Посты', color: 'green' },
      { icon: '💬', val: counts[2].count || 0, label: 'Комментарии', color: 'blue' },
      { icon: '🏢', val: counts[3].count || 0, label: 'Компании', color: 'gold' },
      { icon: '⚠️', val: counts[4].count || 0, label: 'Жалобы', color: 'red' },
      { icon: '💎', val: counts[5].count || 0, label: 'Подписки', color: 'green' },
      { icon: '📱', val: counts[6].count || 0, label: 'Сторис', color: 'blue' },
      { icon: '🧰', val: counts[7].count || 0, label: 'Инструменты', color: 'purple' }
    ];

    document.getElementById('dashStats').innerHTML = cards.map(function(c) {
      return '<div class="stat-card">' +
        '<div class="stat-icon">' + c.icon + '</div>' +
        '<div class="stat-val ' + c.color + '">' + c.val + '</div>' +
        '<div class="stat-label">' + c.label + '</div>' +
      '</div>';
    }).join('');

    // Последние жалобы
    var reps = await sb.from('reports').select('*')
      .eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
    var rd = reps.data || [];

    document.getElementById('dashReports').innerHTML = !rd.length
      ? '<div class="empty">Нет активных жалоб</div>'
      : '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Тип</th><th>Причина</th><th>Дата</th>' +
        '</tr></thead><tbody>' +
        rd.map(function(r) {
          return '<tr>' +
            '<td><span class="badge badge-red">' + esc(r.target_type) + '</span></td>' +
            '<td>' + esc(r.reason || '—') + '</td>' +
            '<td>' + fmtDate(r.created_at) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';

    // Новые пользователи
    var users = await sb.from('profiles').select('name, email, dna_type, plan, created_at')
      .order('created_at', { ascending: false }).limit(5);
    var ud = users.data || [];

    document.getElementById('dashUsers').innerHTML = !ud.length
      ? '<div class="empty">Нет пользователей</div>'
      : '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Имя</th><th>Email</th><th>ДНК</th><th>План</th><th>Дата</th>' +
        '</tr></thead><tbody>' +
        ud.map(function(u) {
          var dna = u.dna_type
            ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>'
            : '—';
          var planBadge = u.plan === 'business' ? 'badge-gold' : u.plan === 'pro' ? 'badge-purple' : 'badge-blue';
          return '<tr>' +
            '<td>' + esc(u.name || '—') + '</td>' +
            '<td>' + esc(u.email || '—') + '</td>' +
            '<td>' + dna + '</td>' +
            '<td><span class="badge ' + planBadge + '">' + (u.plan || 'free').toUpperCase() + '</span></td>' +
            '<td>' + fmtDate(u.created_at) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
  } catch (err) {
    console.error('renderDashboard error:', err);
    showToast('Ошибка загрузки дашборда', 'err');
  }
}

// ===== USERS =====
var _usersPage = 1, _usersSearch = '', _usersDna = '', _usersPlan = '';
var _usersCache = [], _usersTotal = 0, _searchTimer = null;

async function renderUsers() {
  var el = document.getElementById('pageContent');
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

async function loadUsersTable() {
  try {
    var result = await loadUsers(_usersPage, _usersSearch, _usersDna, _usersPlan);
    _usersCache = result.data;
    _usersTotal = result.count;

    if (!_usersCache.length) {
      document.getElementById('usersTableWrap').innerHTML = '<div class="empty">Пользователи не найдены</div>';
      document.getElementById('usersPagination').innerHTML = '';
      return;
    }

    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th></th><th>Имя</th><th>Email</th><th>ДНК</th><th>Уровень</th><th>XP</th><th>План</th><th>Статус</th><th>Действия</th>' +
      '</tr></thead><tbody>';

    _usersCache.forEach(function(u) {
      var avatar = u.avatar_url
        ? '<img class="avatar-sm" src="' + esc(u.avatar_url) + '" alt="">'
        : '<div class="avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--text-dim)">👤</div>';

      var dna = u.dna_type
        ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>'
        : '—';

      var planBadge = u.plan === 'business' ? 'badge-gold' : u.plan === 'pro' ? 'badge-purple' : 'badge-blue';

      var st = u.is_banned
        ? '<span class="badge badge-red">Бан</span>'
        : u.is_verified
          ? '<span class="badge badge-green">✓</span>'
          : '<span class="badge badge-purple">Акт</span>';

      h += '<tr>' +
        '<td>' + avatar + '</td>' +
        '<td><b>' + esc(u.name || '—') + '</b></td>' +
        '<td>' + esc(u.email || '—') + '</td>' +
        '<td>' + dna + '</td>' +
        '<td>' + (LN[u.level] || '—') + '</td>' +
        '<td>' + (u.xp || 0) + '</td>' +
        '<td><span class="badge ' + planBadge + '">' + (u.plan || 'free').toUpperCase() + '</span></td>' +
        '<td>' + st + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="viewUser(\'' + u.id + '\')">Подробнее</button>' +
        '</td>' +
      '</tr>';
    });

    h += '</tbody></table></div>';
    document.getElementById('usersTableWrap').innerHTML = h;

    // Pagination
    var perPage = 20;
    var totalPages = Math.ceil(_usersTotal / perPage);

    if (totalPages <= 1) {
      document.getElementById('usersPagination').innerHTML = '<span class="page-info">' + _usersTotal + ' всего</span>';
      return;
    }

    var pg = '<div class="pagination">';
    pg += '<button' + (_usersPage <= 1 ? ' disabled' : '') + ' onclick="_usersPage--;loadUsersTable()">&laquo;</button>';

    var start = Math.max(1, _usersPage - 2);
    var end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (var i = start; i <= end; i++) {
      pg += '<button' + (i === _usersPage ? ' class="active"' : '') + ' onclick="_usersPage=' + i + ';loadUsersTable()">' + i + '</button>';
    }

    pg += '<button' + (_usersPage >= totalPages ? ' disabled' : '') + ' onclick="_usersPage++;loadUsersTable()">&raquo;</button>';
    pg += '<span class="page-info">' + _usersTotal + ' всего</span>';
    pg += '</div>';
    document.getElementById('usersPagination').innerHTML = pg;
  } catch (err) {
    console.error('loadUsersTable error:', err);
    document.getElementById('usersTableWrap').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки пользователей', 'err');
  }
}

function viewUser(id) {
  var u = _usersCache.find(function(x) { return x.id === id; });
  if (!u) return;

  var body =
    '<div class="info-row"><div class="info-label">Email</div><div>' + esc(u.email || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">ДНК</div><div>' + (DN[u.dna_type] || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Уровень</div><div>' + (LN[u.level] || '—') + ' (' + (u.xp || 0) + ' XP)</div></div>' +
    '<div class="info-row"><div class="info-label">Карма</div><div>' + (u.karma || 0) + '</div></div>' +
    '<div class="info-row"><div class="info-label">План</div><div>' + (u.plan || 'free').toUpperCase() + '</div></div>' +
    '<div class="info-row"><div class="info-label">Город</div><div>' + esc(u.city || '—') + '</div></div>' +
    '<div class="info-row"><div class="info-label">Стрик</div><div>' + (u.streak || 0) + ' дн.</div></div>' +
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
    showToast(verify ? 'Верифицирован' : 'Верификация снята', 'ok');
    closeModal(); loadUsersTable();
  } catch (err) {
    console.error('toggleVerify error:', err);
    showToast('Ошибка', 'err');
  }
}
async function doAdjustXp(id) {
  try {
    var amount = parseInt(document.getElementById('xpAmount').value);
    if (!amount || isNaN(amount)) { showToast('Введите число', 'err'); return; }
    await logXpChange(id, amount);
    showToast('XP ' + (amount > 0 ? '+' : '') + amount, 'ok');
    closeModal(); loadUsersTable();
  } catch (err) {
    console.error('doAdjustXp error:', err);
    showToast('Ошибка коррекции XP', 'err');
  }
}

// ===== CONTENT =====
var _contentTab = 'posts';
function renderContent() {
  var tabs = 'posts:Посты,comments:Комментарии,stories:Сторис,reports:Жалобы', h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { var p = s.split(':'); h += '<button class="tab' + (p[0] === _contentTab ? ' active' : '') + '" onclick="switchContentTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchContentTab(_contentTab, document.querySelector('.tab.active'));
}
function switchContentTab(tab, btn) {
  _contentTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var fn = { posts: loadPosts, comments: loadComments, stories: loadStories, reports: loadReports }[tab];
  if (fn) fn(tab === 'reports' ? '' : 1);
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

// ===== TOAST =====
var _toastTimer = null;
function showToast(msg, type) {
  var el = document.getElementById('toastEl');
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = 'toast show toast-' + (type || 'ok');
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, 3000);
}

// ===== UTILITIES =====
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('ru') : '—'; }
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

// ===== INIT =====
document.getElementById('loginEmail').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });
document.getElementById('loginPass').addEventListener('keydown', function(e) { if (e.key === 'Enter') adminLogin(); });
checkSession();
