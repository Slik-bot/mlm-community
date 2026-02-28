// ===== COMPANIES SCREENS — каталог компаний =====

let _compCategory = '';
let _compSort = 'popular';
let _compSearch = '';
let _companyId = null;

const COMP_SORT_LABELS = {
  popular: 'По популярности',
  rating: 'По рейтингу',
  newest: 'По новизне',
  name: 'По названию'
};

const STAR_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

const VERIFIED_BADGE = '<span class="comp-verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>';

// ═══ Helpers ═══

function compFmtNum(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function compPlural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function compYear(dateStr) {
  if (!dateStr) return '';
  return String(new Date(dateStr).getFullYear());
}

function compStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const op = i <= (rating || 0) ? '1' : '0.2';
    html += '<svg viewBox="0 0 24 24" fill="#fbbf24" width="12" height="12" style="opacity:' + op + '"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }
  return html;
}

function compSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ═══ Catalog: init ═══

function initCompanies() {
  _compCategory = '';
  _compSort = 'popular';
  _compSearch = '';
  compWireFilters();
  compWireSort();
  compWireSearch();
  compLoadList();
}

// ═══ Catalog: wire filters ═══

function compWireFilters() {
  const box = document.getElementById('compFilters');
  if (!box) return;
  box.querySelectorAll('.comp-flt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      box.querySelectorAll('.comp-flt').forEach(function(b) { b.classList.remove('on'); });
      btn.classList.add('on');
      _compCategory = btn.getAttribute('data-category') || '';
      compLoadList();
    });
  });
}

// ═══ Catalog: wire sort ═══

function compWireSort() {
  const sortBtn = document.querySelector('#scrCompanies .comp-sort-btn');
  if (!sortBtn) return;
  sortBtn.querySelectorAll('.pop-item').forEach(function(item) {
    item.addEventListener('click', function() {
      _compSort = item.getAttribute('data-sort') || 'popular';
      compSetText('compSortLabel', COMP_SORT_LABELS[_compSort] || 'По популярности');
      compLoadList();
    });
  });
}

// ═══ Catalog: wire search ═══

function compWireSearch() {
  const btn = document.getElementById('compSearchBtn');
  const bar = document.getElementById('compSearchBar');
  const inp = document.getElementById('compSearchInp');
  if (!btn || !bar || !inp) return;

  btn.addEventListener('click', function() {
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) {
      setTimeout(function() { inp.focus(); }, 100);
    } else {
      inp.value = '';
      if (_compSearch) { _compSearch = ''; compLoadList(); }
    }
  });

  let debounce = null;
  inp.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(function() {
      _compSearch = inp.value.trim();
      compLoadList();
    }, 300);
  });
}

// ═══ Catalog: load & render list ═══

async function compLoadList() {
  const listEl = document.getElementById('compList');
  const loadEl = document.getElementById('compLoading');
  const emptyEl = document.getElementById('compEmpty');
  if (!listEl) return;

  if (loadEl) loadEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  const opts = { sort: _compSort, limit: 30 };
  if (_compCategory) opts.category = _compCategory;
  if (_compSearch) opts.search = _compSearch;

  const result = await window.loadCompanies(opts);
  if (loadEl) loadEl.classList.add('hidden');

  const items = result.data || [];
  const n = items.length;
  compSetText('compCount', n + ' ' + compPlural(n, 'компания', 'компании', 'компаний'));

  if (!n) { if (emptyEl) emptyEl.classList.remove('hidden'); return; }
  listEl.innerHTML = items.map(compRenderCard).join('');
}

// ═══ Catalog: render single card ═══

function compRenderCard(c) {
  const esc = window.escHtml;
  const verified = c.is_verified ? VERIFIED_BADGE : '';
  const cat = esc(c.category || '');
  const city = c.city ? ' · ' + esc(c.city) : '';
  const rating = c.rating ? parseFloat(c.rating).toFixed(1) : '0.0';
  const year = compYear(c.created_at);
  const logo = c.logo_url
    ? '<img src="' + esc(c.logo_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>';
  const tags = c.meta && c.meta.tags
    ? '<div class="comp-tags">' + c.meta.tags.map(function(t) { return '<span class="comp-tag">' + esc(t) + '</span>'; }).join('') + '</div>'
    : '';

  return '<div class="comp-card" onclick="openCompanyCard(\'' + c.id + '\')">' +
    '<div class="comp-card-top">' +
      '<div class="comp-logo">' + logo + '</div>' +
      '<div class="comp-card-info">' +
        '<div class="comp-name">' + esc(c.name) + ' ' + verified + '</div>' +
        '<div class="comp-cat">' + cat + city + '</div>' +
      '</div>' +
      '<div class="comp-rating">' + STAR_SVG + '<span>' + rating + '</span></div>' +
    '</div>' +
    '<div class="comp-desc">' + esc(c.description || '') + '</div>' +
    '<div class="comp-stats">' +
      '<div class="comp-stat"><span class="comp-stat-num">' + compFmtNum(c.members_count) + '</span><span class="comp-stat-label">партнёров</span></div>' +
      '<div class="comp-stat"><span class="comp-stat-num">' + (c.reviews_count || 0) + '</span><span class="comp-stat-label">отзывов</span></div>' +
      '<div class="comp-stat"><span class="comp-stat-num">' + year + '</span><span class="comp-stat-label">на платформе</span></div>' +
    '</div>' + tags +
  '</div>';
}

// ═══ Company Card: open ═══

function openCompanyCard(companyId) {
  _companyId = companyId;
  goTo('scrCompanyCard');
}

// ═══════════════════════════════════════
// КАРТОЧКА КОМПАНИИ — см. companies-card.js
// ═══════════════════════════════════════

// ═══ Exports ═══

window.compFmtNum = compFmtNum;
window.compPlural = compPlural;
window.compYear = compYear;
window.compStars = compStars;
window.compSetText = compSetText;
window.initCompanies = initCompanies;
window.openCompanyCard = openCompanyCard;
