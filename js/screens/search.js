// ═══════════════════════════════════════
// SEARCH SCREEN — js/screens/search.js
// Полноценный поиск по платформе
// ═══════════════════════════════════════

const SEARCH_TABS = ['users', 'companies', 'posts', 'forum', 'experts'];
const RECENT_KEY = 'trafiqo_recent_searches';
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

let _searchTab = 'users';
let _searchQuery = '';
let _debounceTimer = null;

const POPULAR_TAGS = [
  { name: 'MLM', icon: 'fire' },
  { name: 'Бизнес', icon: 'chart' },
  { name: 'Маркетинг', icon: 'trend' },
  { name: 'Инвестиции', icon: 'dollar' },
  { name: 'Наставничество', icon: 'users' },
  { name: 'Криптовалюта', icon: 'bolt' },
  { name: 'Стратегия', icon: 'target' }
];

const TAG_ICONS = {
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
};

const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

// ═══ AVATAR PLACEHOLDER HELPER ═══

function makeAvatarPlaceholder(letter, className) {
  const el = document.createElement('div');
  el.className = className || 'search-result__avatar';
  el.textContent = letter;
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:rgba(255,255,255,0.4)';
  return el;
}

// ═══ initSearch ═══

function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', onSearchInput);
  document.getElementById('searchClear').addEventListener('click', clearSearch);
  document.getElementById('searchCancel').addEventListener('click', function() { window.goBack(); });
  document.getElementById('searchTabs').addEventListener('click', onTabClick);
  renderPopular();
  loadRecent();
  showSection('searchHome');
  document.getElementById('searchTabs').classList.remove('visible');
  setTimeout(function() { input.focus(); }, 100);
}

// ═══ INPUT HANDLER WITH DEBOUNCE ═══

function onSearchInput() {
  const input = document.getElementById('searchInput');
  const query = input.value.trim();
  document.getElementById('searchClear').classList.toggle('visible', query.length > 0);
  if (_debounceTimer) clearTimeout(_debounceTimer);
  if (query.length < MIN_QUERY_LEN) {
    _searchQuery = '';
    showSection('searchHome');
    document.getElementById('searchTabs').classList.remove('visible');
    return;
  }
  _debounceTimer = setTimeout(function() {
    _searchQuery = query;
    executeSearch(query);
  }, DEBOUNCE_MS);
}

// ═══ EXECUTE SEARCH ═══

async function executeSearch(query) {
  showSection('searchSkeleton');
  document.getElementById('searchTabs').classList.add('visible');
  try {
    const result = await searchByTab(_searchTab, query);
    const data = result.data || [];
    updateTabCount(_searchTab, data.length);
    if (data.length === 0) {
      showSection('searchEmpty');
    } else {
      renderResults(_searchTab, data);
      showSection('searchResults');
    }
    addRecent(query);
  } catch (err) {
    console.error('executeSearch error:', err);
    showSection('searchEmpty');
  }
}

// ═══ SEARCH BY TAB ═══

function searchByTab(tab, query) {
  switch (tab) {
    case 'users': return window.searchUsers(query);
    case 'companies': return window.searchCompanies(query);
    case 'posts': return window.searchPosts(query);
    case 'forum': return window.searchForum(query);
    case 'experts': return window.searchExperts(query);
    default: return Promise.resolve({ data: [] });
  }
}

// ═══ TABS ═══

function onTabClick(e) {
  const tab = e.target.closest('.search-tab');
  if (!tab) return;
  const tabName = tab.dataset.tab;
  if (tabName === _searchTab) return;
  _searchTab = tabName;
  document.querySelectorAll('.search-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  if (_searchQuery.length >= MIN_QUERY_LEN) executeSearch(_searchQuery);
}

function updateTabCount(tab, count) {
  const tabEl = document.querySelector('.search-tab[data-tab="' + tab + '"]');
  if (!tabEl) return;
  let countEl = tabEl.querySelector('.search-tab__count');
  if (count > 0) {
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'search-tab__count';
      tabEl.appendChild(countEl);
    }
    countEl.textContent = count;
  } else if (countEl) {
    countEl.remove();
  }
}

// ═══ RENDER RESULTS ═══

function renderResults(tab, data) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const renderers = {
    users: renderUserItem, companies: renderCompanyItem,
    posts: renderPostItem, forum: renderForumItem, experts: renderExpertItem
  };
  const fn = renderers[tab];
  data.forEach(function(item, i) {
    const el = fn ? fn(item) : null;
    if (el) {
      el.style.animationDelay = (i * 30) + 'ms';
      fragment.appendChild(el);
    }
  });
  container.appendChild(fragment);
}

// ═══ RENDER: USER ═══

function renderUserItem(user) {
  const el = document.createElement('div');
  el.className = 'search-result';
  if (user.avatar_url) {
    const img = document.createElement('img');
    img.className = 'search-result__avatar';
    img.src = user.avatar_url;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.appendChild(makeAvatarPlaceholder((user.name || '?')[0]));
  }
  const body = document.createElement('div');
  body.className = 'search-result__body';
  const name = document.createElement('div');
  name.className = 'search-result__name';
  if (user.dna_type) {
    const badge = document.createElement('span');
    badge.className = 'search-result__badge';
    badge.style.backgroundColor = window.getDnaColor ? window.getDnaColor(user.dna_type) : '#8b5cf6';
    name.appendChild(badge);
  }
  name.appendChild(document.createTextNode(user.name || 'Без имени'));
  body.appendChild(name);
  const meta = document.createElement('div');
  meta.className = 'search-result__meta';
  meta.textContent = user.specialization || 'Уровень ' + (user.level || 1);
  body.appendChild(meta);
  el.appendChild(body);
  el.addEventListener('click', function() { window._viewProfileId = user.id; goTo('scrProfile'); });
  return el;
}

// ═══ RENDER: COMPANY ═══

function renderCompanyItem(co) {
  const el = document.createElement('div');
  el.className = 'search-result';
  const avatar = makeAvatarPlaceholder((co.name || '?')[0], 'search-result__avatar search-result__avatar--company');
  avatar.style.fontSize = '15px';
  avatar.style.fontWeight = '700';
  avatar.style.color = 'var(--primary)';
  el.appendChild(avatar);
  const body = document.createElement('div');
  body.className = 'search-result__body';
  const name = document.createElement('div');
  name.className = 'search-result__name';
  name.textContent = co.name || '';
  body.appendChild(name);
  const meta = document.createElement('div');
  meta.className = 'search-result__meta';
  meta.textContent = co.category || 'Компания';
  body.appendChild(meta);
  el.appendChild(body);
  if (co.rating) {
    const extra = document.createElement('div');
    extra.className = 'search-result__rating';
    extra.innerHTML = STAR_SVG;
    const rt = document.createElement('span');
    rt.textContent = co.rating.toFixed(1);
    extra.appendChild(rt);
    el.appendChild(extra);
  }
  el.addEventListener('click', function() {
    if (window.openCompanyCard) window.openCompanyCard(co.id);
  });
  return el;
}

// ═══ RENDER: POST ═══

function renderPostItem(post) {
  const el = document.createElement('div');
  el.className = 'search-result search-result--post';
  const body = document.createElement('div');
  body.className = 'search-result__body';
  const preview = document.createElement('div');
  preview.className = 'search-result__preview';
  preview.textContent = post.content || '';
  body.appendChild(preview);
  const meta = document.createElement('div');
  meta.className = 'search-result__meta';
  meta.textContent = formatSearchDate(post.created_at);
  body.appendChild(meta);
  el.appendChild(body);
  const extra = document.createElement('div');
  extra.className = 'search-result__extra';
  extra.textContent = (post.type || 'post');
  el.appendChild(extra);
  el.addEventListener('click', function() { goTo('scrFeed'); });
  return el;
}

// ═══ RENDER: FORUM TOPIC ═══

function renderForumItem(topic) {
  const el = document.createElement('div');
  el.className = 'search-result';
  const body = document.createElement('div');
  body.className = 'search-result__body';
  const name = document.createElement('div');
  name.className = 'search-result__name';
  name.textContent = topic.title || '';
  body.appendChild(name);
  const meta = document.createElement('div');
  meta.className = 'search-result__meta';
  const parts = [topic.category || 'Тема'];
  if (topic.replies_count) parts.push(topic.replies_count + ' ответов');
  if (topic.views_count) parts.push(topic.views_count + ' просм.');
  meta.textContent = parts.join(' · ');
  body.appendChild(meta);
  el.appendChild(body);
  el.addEventListener('click', function() {
    if (window.openTopic) window.openTopic(topic.id);
  });
  return el;
}

// ═══ RENDER: EXPERT ═══

function renderExpertItem(expert) {
  const el = document.createElement('div');
  el.className = 'search-result';
  el.appendChild(makeAvatarPlaceholder((expert.title || '?')[0]));
  const body = document.createElement('div');
  body.className = 'search-result__body';
  const name = document.createElement('div');
  name.className = 'search-result__name';
  name.textContent = expert.title || expert.specialization || '';
  body.appendChild(name);
  const meta = document.createElement('div');
  meta.className = 'search-result__meta';
  meta.textContent = expert.specialization || '';
  body.appendChild(meta);
  el.appendChild(body);
  if (expert.hourly_rate) {
    const extra = document.createElement('div');
    extra.className = 'search-result__extra';
    extra.textContent = (expert.hourly_rate / 100) + ' $';
    el.appendChild(extra);
  }
  el.addEventListener('click', function() {
    if (window.openExpert) window.openExpert(expert.id);
  });
  return el;
}

// ═══ RECENT SEARCHES ═══

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveRecentSearches(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function addRecent(query) {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LEN) return;
  let list = getRecentSearches().filter(function(q) { return q !== trimmed; });
  list.unshift(trimmed);
  if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
  saveRecentSearches(list);
}

function removeRecent(query) {
  const list = getRecentSearches().filter(function(q) { return q !== query; });
  saveRecentSearches(list);
  loadRecent();
}

function loadRecent() {
  const container = document.getElementById('searchRecent');
  if (!container) return;
  container.innerHTML = '';
  const list = getRecentSearches();
  if (list.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'search-recent-empty';
    empty.textContent = 'Нет недавних запросов';
    container.appendChild(empty);
    return;
  }
  list.forEach(function(q) {
    const chip = document.createElement('div');
    chip.className = 'search-recent-chip';
    const text = document.createElement('span');
    text.textContent = q;
    chip.appendChild(text);
    const remove = document.createElement('button');
    remove.className = 'search-recent-remove';
    remove.innerHTML = CLOSE_SVG;
    remove.addEventListener('click', function(e) {
      e.stopPropagation();
      removeRecent(q);
    });
    chip.appendChild(remove);
    chip.addEventListener('click', function() {
      document.getElementById('searchInput').value = q;
      onSearchInput();
    });
    container.appendChild(chip);
  });
}

// ═══ POPULAR TAGS ═══

function renderPopular() {
  const container = document.getElementById('searchPopular');
  if (!container) return;
  container.innerHTML = '';
  POPULAR_TAGS.forEach(function(tag) {
    const el = document.createElement('div');
    el.className = 'search-popular-tag';
    const icon = document.createElement('div');
    icon.className = 'search-popular-tag__icon';
    icon.innerHTML = TAG_ICONS[tag.icon] || TAG_ICONS.fire;
    el.appendChild(icon);
    const name = document.createElement('div');
    name.className = 'search-popular-tag__name';
    name.textContent = '#' + tag.name;
    el.appendChild(name);
    el.addEventListener('click', function() {
      document.getElementById('searchInput').value = tag.name;
      onSearchInput();
    });
    container.appendChild(el);
  });
}

// ═══ HELPERS ═══

function showSection(id) {
  const sections = ['searchHome', 'searchResults', 'searchSkeleton', 'searchEmpty'];
  sections.forEach(function(s) {
    const el = document.getElementById(s);
    if (el) el.hidden = (s !== id);
  });
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  _searchQuery = '';
  document.getElementById('searchClear').classList.remove('visible');
  document.getElementById('searchTabs').classList.remove('visible');
  showSection('searchHome');
  loadRecent();
  input.focus();
}

function formatSearchDate(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'только что';
  if (diff < 60) return diff + ' мин назад';
  if (diff < 1440) return Math.floor(diff / 60) + ' ч назад';
  if (diff < 10080) return Math.floor(diff / 1440) + ' д назад';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ═══ ЭКСПОРТ ═══

window.initSearch = initSearch;
