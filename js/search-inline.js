// ═══════════════════════════════════════
// INLINE SEARCH — поиск поверх ленты
// Отдельный модуль, не зависит от search.js
// ═══════════════════════════════════════

const INLINE_DEBOUNCE = 300;
const INLINE_MIN_QUERY = 2;

let _inlineTimer = null;
let _inlineInit = false;

// ═══ OPEN ═══

function openInlineSearch() {
  const hdr = document.querySelector('#scrFeed .hdr');
  if (!hdr) return;
  if (!_inlineInit) {
    const input = document.getElementById('inlineSearchInput');
    if (input) input.addEventListener('input', onInlineInput);
    const bg = document.getElementById('inlineSearchBackdrop');
    if (bg) bg.addEventListener('click', closeInlineSearch);
    _inlineInit = true;
  }
  hdr.classList.add('hdr--searching');
  const bg = document.getElementById('inlineSearchBackdrop');
  if (bg) bg.classList.add('visible');
  const input = document.getElementById('inlineSearchInput');
  if (input) {
    input.value = '';
    setTimeout(function() { input.focus(); }, 50);
  }
}

// ═══ CLOSE ═══

function closeInlineSearch() {
  const hdr = document.querySelector('#scrFeed .hdr');
  if (!hdr) return;
  hdr.classList.remove('hdr--searching');
  const bg = document.getElementById('inlineSearchBackdrop');
  if (bg) bg.classList.remove('visible');
  const drop = document.getElementById('inlineSearchDrop');
  if (drop) {
    drop.classList.remove('visible');
    drop.innerHTML = '';
  }
  const input = document.getElementById('inlineSearchInput');
  if (input) input.value = '';
  if (_inlineTimer) clearTimeout(_inlineTimer);
}

// ═══ INPUT HANDLER ═══

function onInlineInput() {
  const input = document.getElementById('inlineSearchInput');
  if (!input) return;
  const query = input.value.trim();
  if (_inlineTimer) clearTimeout(_inlineTimer);
  if (query.length < INLINE_MIN_QUERY) {
    const drop = document.getElementById('inlineSearchDrop');
    if (drop) {
      drop.classList.remove('visible');
      drop.innerHTML = '';
    }
    return;
  }
  _inlineTimer = setTimeout(function() {
    executeInlineSearch(query);
  }, INLINE_DEBOUNCE);
}

// ═══ EXECUTE ═══

async function executeInlineSearch(query) {
  const drop = document.getElementById('inlineSearchDrop');
  if (!drop) return;
  try {
    const result = await window.searchUsers(query);
    const data = result.data || [];
    if (data.length === 0) {
      drop.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'inline-search-empty';
      empty.textContent = 'Никого не найдено';
      drop.appendChild(empty);
    } else {
      renderInlineResults(drop, data);
    }
    drop.classList.add('visible');
  } catch (err) {
    console.error('Inline search:', err);
  }
}

// ═══ RENDER ═══

function renderInlineResults(container, users) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  users.forEach(function(user) {
    frag.appendChild(renderInlineCard(user));
  });
  container.appendChild(frag);
}

function renderInlineCard(user) {
  const card = document.createElement('div');
  card.className = 'inline-search-card';
  if (user.avatar_url) {
    const img = document.createElement('img');
    img.className = 'inline-search-avatar';
    img.src = user.avatar_url;
    img.alt = '';
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'inline-search-avatar inline-search-avatar--ph';
    ph.textContent = (user.name || '?')[0];
    card.appendChild(ph);
  }
  const body = document.createElement('div');
  body.className = 'inline-search-body';
  const name = document.createElement('div');
  name.className = 'inline-search-name';
  name.textContent = user.name || 'Без имени';
  body.appendChild(name);
  const meta = document.createElement('div');
  meta.className = 'inline-search-meta';
  meta.textContent = user.specialization || ('Уровень ' + (user.level || 1));
  body.appendChild(meta);
  card.appendChild(body);
  if (user.dna_type) {
    const dot = document.createElement('div');
    dot.className = 'inline-search-dna inline-search-dna--' + user.dna_type;
    card.appendChild(dot);
  }
  card.addEventListener('click', function() {
    closeInlineSearch();
    window._viewProfileId = user.id;
    goTo('scrProfile');
  });
  return card;
}

// ═══ ЭКСПОРТ ═══

window.openInlineSearch = openInlineSearch;
window.closeInlineSearch = closeInlineSearch;
