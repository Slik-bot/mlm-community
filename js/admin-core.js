// ===== ADMIN CORE — Auth, Navigation, Dashboard, Users =====

const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let adminUser = null;
let adminProfile = null;
let currentPage = 'dashboard';

const DN = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
const DC = { strategist: 'blue', communicator: 'green', creator: 'gold', analyst: 'purple' };
const LN = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь' };

const TITLES = { dashboard:'Дашборд', users:'Пользователи', content:'Контент', companies:'Компании', shop:'Магазин', gamification:'Геймификация', tasks:'Задания', finance:'Финансы', settings:'Настройки' };

const ROLE_ACCESS = {
  super_admin: ['dashboard','users','content','companies','shop','gamification','tasks','finance','settings'],
  admin: ['dashboard','users','content','companies','shop','gamification','tasks','finance'],
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
    case 'tasks': renderTasks(); break;
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

// ═══════════════════════════════════════
// ПОЛЬЗОВАТЕЛИ — см. admin-users.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// КОНТЕНТ/МОДЕРАЦИЯ — см. admin-moderation.js
// ═══════════════════════════════════════

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
