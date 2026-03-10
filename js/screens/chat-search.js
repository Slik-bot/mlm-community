// ════════════════════════════════════════
// CHAT SEARCH — Поиск в диалоге
// ════════════════════════════════════════

let _results = [];
let _current = 0;
let _searchTimer = null;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function initChatSearch() {
  const btn = document.getElementById('chatSearchBtn');
  const closeBtn = document.getElementById('chatSearchClose');
  const input = document.getElementById('chatSearchInput');
  const prevBtn = document.getElementById('chatSearchPrev');
  const nextBtn = document.getElementById('chatSearchNext');
  if (!btn || !input) return;

  btn.onclick = toggleSearch;
  closeBtn.onclick = closeSearch;
  prevBtn.onclick = () => navigate(-1);
  nextBtn.onclick = () => navigate(1);
  input.oninput = () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => doSearch(input.value), 300);
  };
}

function toggleSearch() {
  const panel = document.getElementById('chatSearch');
  if (!panel) return;
  const open = panel.classList.toggle('visible');
  if (open) {
    document.getElementById('chatSearchInput')?.focus();
  } else {
    clearSearch();
  }
}

function closeSearch() {
  const panel = document.getElementById('chatSearch');
  if (!panel) return;
  panel.classList.remove('visible');
  const input = document.getElementById('chatSearchInput');
  if (input) input.value = '';
  clearSearch();
}

function doSearch(query) {
  const q = (query || '').trim().toLowerCase();
  clearHighlights();
  _results = [];
  _current = 0;
  if (q.length < 2) { updateCount(); return; }

  const bubbles = document.querySelectorAll('#chatMessages .bbl-text');
  bubbles.forEach(el => {
    if (el.textContent.toLowerCase().includes(q)) {
      highlight(el, q);
      const msg = el.closest('.msg');
      if (msg) _results.push(msg);
    }
  });
  updateCount();
  if (_results.length > 0) navigate(0);
}

function highlight(el, query) {
  const text = el.textContent;
  el.dataset.origText = text;
  const lower = text.toLowerCase();
  const parts = [];
  let idx = 0;
  let pos = lower.indexOf(query, idx);
  while (pos !== -1) {
    if (pos > idx) parts.push(escapeHtml(text.slice(idx, pos)));
    const match = text.slice(pos, pos + query.length);
    parts.push('<mark>' + escapeHtml(match) + '</mark>');
    idx = pos + query.length;
    pos = lower.indexOf(query, idx);
  }
  if (idx < text.length) parts.push(escapeHtml(text.slice(idx)));
  el.innerHTML = parts.join('');
}

function clearHighlights() {
  const marked = document.querySelectorAll('#chatMessages .bbl-text[data-orig-text]');
  marked.forEach(el => {
    el.textContent = el.dataset.origText;
    delete el.dataset.origText;
  });
}

function navigate(dir) {
  if (_results.length === 0) return;
  const prev = _results[_current];
  if (prev) {
    const m = prev.querySelector('mark.mark-current');
    if (m) m.classList.remove('mark-current');
  }
  _current = (_current + dir + _results.length) % _results.length;
  const cur = _results[_current];
  const firstMark = cur?.querySelector('mark');
  if (firstMark) firstMark.classList.add('mark-current');
  cur?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateCount();
}

function updateCount() {
  const el = document.getElementById('chatSearchCount');
  if (!el) return;
  if (_results.length === 0) {
    el.textContent = '';
    return;
  }
  el.textContent = (_current + 1) + ' / ' + _results.length;
}

function clearSearch() {
  clearHighlights();
  _results = [];
  _current = 0;
  updateCount();
}

window.initChatSearch = initChatSearch;
window.closeSearch = closeSearch;
