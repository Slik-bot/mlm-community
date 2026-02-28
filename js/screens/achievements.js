// ===== ACHIEVEMENTS SCREEN =====

const ACHIEVEMENT_TEMPLATES = [
  { type: 'streak', id: 'streak_3', title: 'Пламя зажжено', desc: '3 дня подряд', icon: 'fire', xp: 100 },
  { type: 'streak', id: 'streak_7', title: 'Недельный марафон', desc: '7 дней подряд', icon: 'fire', xp: 300 },
  { type: 'streak', id: 'streak_30', title: 'Месяц огня', desc: '30 дней подряд', icon: 'fire', xp: 1000 },
  { type: 'task', id: 'tasks_10', title: 'Первые шаги', desc: '10 заданий выполнено', icon: 'bolt', xp: 200 },
  { type: 'task', id: 'tasks_50', title: 'Трудоголик', desc: '50 заданий', icon: 'bolt', xp: 500 },
  { type: 'task', id: 'tasks_100', title: 'Мастер заданий', desc: '100 заданий', icon: 'bolt', xp: 1000 },
  { type: 'deal', id: 'deals_1', title: 'Первая сделка', desc: 'Завершить 1 сделку', icon: 'deal', xp: 300 },
  { type: 'deal', id: 'deals_10', title: 'Дельцовик', desc: '10 сделок', icon: 'deal', xp: 800 },
  { type: 'social', id: 'referrals_5', title: 'Нетворкер', desc: '5 рефералов', icon: 'people', xp: 500 },
  { type: 'social', id: 'friends_10', title: 'Душа компании', desc: '10 друзей', icon: 'people', xp: 400 },
];

const ACH_ICONS = {
  streak: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" width="32" height="32"><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/><path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" width="32" height="32"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  deal: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5" width="32" height="32"><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></svg>',
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" width="32" height="32"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
};

function getAchIcon(type) {
  return ACH_ICONS[type] || ACH_ICONS.task;
}

// ===== initAchievements =====

async function initAchievements() {
  const user = window.getCurrentUser();
  if (!user) { window.goTo('scrLanding'); return; }

  try {
    const { data, error } = await window.sb
      .from('achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;

    const unlocked = new Map();
    (data || []).forEach(function(a) {
      unlocked.set(a.achievement_type, a);
    });

    renderAchSummary(unlocked);
    renderAchGrid(ACHIEVEMENT_TEMPLATES, unlocked, 'all');
    setupAchFilters(unlocked);
  } catch (err) {
    console.error('Achievements load error:', err);
    window.showToast('Ошибка загрузки достижений');
  }
}

// ===== renderAchSummary =====

function renderAchSummary(unlocked) {
  const total = ACHIEVEMENT_TEMPLATES.length;
  const count = unlocked.size;

  const countEl = document.getElementById('achCount');
  if (countEl) countEl.textContent = count + ' из ' + total;

  const fill = document.getElementById('achProgressFill');
  if (fill) fill.style.width = (total > 0 ? Math.round(count / total * 100) : 0) + '%';

  let totalXp = 0;
  unlocked.forEach(function(a) { totalXp += (a.xp_reward || 0); });

  const xpEl = document.getElementById('achTotalXp');
  if (xpEl) xpEl.textContent = '+' + totalXp.toLocaleString('ru-RU') + ' XP';
}

// ===== renderAchGrid =====

function renderAchGrid(templates, unlocked, filter) {
  const grid = document.getElementById('achGrid');
  const empty = document.getElementById('achEmpty');
  if (!grid) return;

  const filtered = filter === 'all'
    ? templates
    : templates.filter(function(t) { return t.type === filter; });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  grid.innerHTML = filtered.map(function(tpl, i) {
    return renderAchCard(tpl, unlocked.get(tpl.id), i);
  }).join('');
}

// ===== renderAchCard =====

function renderAchCard(tpl, unlock, index) {
  const locked = !unlock;
  const cls = 'ach-card' + (locked ? ' ach-locked' : '');
  const delay = (index * 0.06) + 's';
  const esc = window.escHtml;
  const dateText = unlock
    ? new Date(unlock.unlocked_at).toLocaleDateString('ru-RU')
    : 'Заблокировано';

  return '<div class="' + cls + '" style="animation-delay:' + delay + '">'
    + '<div class="ach-card-icon">' + getAchIcon(tpl.type) + '</div>'
    + '<div class="ach-card-title">' + esc(tpl.title) + '</div>'
    + '<div class="ach-card-desc">' + esc(tpl.desc) + '</div>'
    + '<div class="ach-card-xp">+' + tpl.xp + ' XP</div>'
    + '<div class="ach-card-date">' + esc(dateText) + '</div>'
    + '</div>';
}

// ===== setupAchFilters =====

function setupAchFilters(unlocked) {
  const container = document.getElementById('achFilters');
  if (!container) return;

  container.addEventListener('click', function(e) {
    const tab = e.target.closest('.ach-filter-tab');
    if (!tab) return;

    container.querySelectorAll('.ach-filter-tab').forEach(function(t) {
      t.classList.remove('ach-active');
    });
    tab.classList.add('ach-active');

    renderAchGrid(ACHIEVEMENT_TEMPLATES, unlocked, tab.dataset.filter || 'all');
  });
}

// ===== Экспорт =====

window.initAchievements = initAchievements;
