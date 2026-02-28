// ===== COMPANIES SCREENS — каталог, карточка компании =====

let _compCategory = '';
let _compSort = 'popular';
let _compSearch = '';
let _companyId = null;
let _ccIsMember = false;
let _ccJoining = false;

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

// ═══ Company Card: init ═══

async function initCompanyCard() {
  if (!_companyId) { goBack(); return; }

  const result = await window.loadCompanyDetail(_companyId);
  if (result.error || !result.data) {
    if (window.showToast) showToast('Компания не найдена');
    goBack();
    return;
  }

  ccRenderHero(result.data);
  ccWireTabs();
  ccWireJoin();
  ccWireShare(result.data);
  ccWireReviewBtn();

  const [membersRes, reviewsRes, membershipRes] = await Promise.all([
    window.loadCompanyMembers(_companyId, 20),
    window.loadCompanyReviews(_companyId, 20),
    window.checkMembership(_companyId)
  ]);

  ccRenderMembers(membersRes.data || []);
  ccRenderReviews(reviewsRes.data || []);
  ccUpdateJoinBtn(membershipRes.member, membershipRes.role);
}

// ═══ Company Card: render hero ═══

function ccRenderHero(c) {
  const esc = window.escHtml;
  const logoEl = document.getElementById('ccLogo');
  if (logoEl && c.logo_url) {
    logoEl.innerHTML = '<img src="' + esc(c.logo_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px">';
  }
  compSetText('ccName', c.name || '');
  const verEl = document.getElementById('ccVerified');
  if (verEl) verEl.classList.toggle('hidden', !c.is_verified);
  compSetText('ccCategory', c.category || '');
  ccRenderMeta(c);
}

function ccRenderMeta(c) {
  const esc = window.escHtml;
  const cityEl = document.getElementById('ccCity');
  const dotEl = document.getElementById('ccCityDot');
  if (cityEl && c.city) {
    cityEl.textContent = c.city;
    if (dotEl) dotEl.style.display = '';
  }
  compSetText('ccRating', c.rating ? parseFloat(c.rating).toFixed(1) : '0.0');
  const rcEl = document.getElementById('ccRatingCount');
  if (rcEl) {
    const n = c.reviews_count || 0;
    rcEl.textContent = '(' + n + ' ' + compPlural(n, 'отзыв', 'отзыва', 'отзывов') + ')';
  }
  compSetText('ccMembers', compFmtNum(c.members_count));
  compSetText('ccReviewsNum', String(c.reviews_count || 0));
  compSetText('ccSince', compYear(c.created_at));
  compSetText('ccDesc', c.description || '');

  if (c.website) {
    const sec = document.getElementById('ccWebsiteSection');
    const link = document.getElementById('ccWebsite');
    const txt = document.getElementById('ccWebsiteText');
    if (sec) sec.classList.remove('hidden');
    if (link) link.href = c.website;
    if (txt) txt.textContent = c.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  if (c.meta && c.meta.tags && c.meta.tags.length) {
    const tagsEl = document.getElementById('ccTags');
    if (tagsEl) {
      tagsEl.classList.remove('hidden');
      tagsEl.innerHTML = c.meta.tags.map(function(t) {
        return '<span class="comp-tag">' + esc(t) + '</span>';
      }).join('');
    }
  }
}

// ═══ Company Card: render members ═══

function ccRenderMembers(members) {
  const listEl = document.getElementById('ccMembersList');
  const emptyEl = document.getElementById('ccMembersEmpty');
  if (!listEl) return;

  if (!members.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = members.map(function(m) {
    const u = m.user || {};
    const esc = window.escHtml;
    const ava = u.avatar_url
      ? '<img src="' + esc(u.avatar_url) + '" alt="">'
      : '<span>' + esc((u.name || '?')[0]) + '</span>';
    const dna = u.dna_type ? ' cc-member-' + u.dna_type : '';
    return '<div class="cc-member">' +
      '<div class="cc-member-ava' + dna + '">' + ava + '</div>' +
      '<div class="cc-member-info">' +
        '<div class="cc-member-name">' + esc(u.name || 'Участник') + '</div>' +
        '<div class="cc-member-level">' + esc(u.level || '') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ═══ Company Card: render reviews ═══

function ccRenderReviews(reviews) {
  const listEl = document.getElementById('ccReviewsList');
  const emptyEl = document.getElementById('ccReviewsEmpty');
  const writeBtn = document.getElementById('ccWriteReviewBtn');
  if (!listEl) return;

  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (writeBtn && user) writeBtn.classList.remove('hidden');

  if (!reviews.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = reviews.map(function(r) {
    const u = r.reviewer || {};
    const esc = window.escHtml;
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '';
    return '<div class="cc-review">' +
      '<div class="cc-review-top">' +
        '<span class="cc-review-name">' + esc(u.name || 'Участник') + '</span>' +
        '<span class="cc-review-date">' + date + '</span>' +
      '</div>' +
      '<div class="cc-review-stars">' + compStars(r.rating) + '</div>' +
      '<div class="cc-review-text">' + esc(r.content || '') + '</div>' +
    '</div>';
  }).join('');
}

// ═══ Company Card: tabs ═══

function ccWireTabs() {
  const box = document.getElementById('ccTabs');
  if (!box) return;
  box.querySelectorAll('.cc-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      box.querySelectorAll('.cc-tab').forEach(function(t) { t.classList.remove('on'); });
      tab.classList.add('on');
      const name = tab.getAttribute('data-tab');
      const panels = { members: 'ccPanelMembers', reviews: 'ccPanelReviews' };
      Object.keys(panels).forEach(function(k) {
        const el = document.getElementById(panels[k]);
        if (el) el.classList.toggle('hidden', k !== name);
      });
    });
  });
}

// ═══ Company Card: join / leave ═══

function ccWireJoin() {
  const btn = document.getElementById('ccJoinBtn');
  if (btn) btn.addEventListener('click', ccToggleJoin);
}

function ccUpdateJoinBtn(isMember, role) {
  _ccIsMember = isMember;
  const btn = document.getElementById('ccJoinBtn');
  const txt = document.getElementById('ccJoinText');
  if (!btn || !txt) return;
  if (isMember) {
    txt.textContent = role === 'admin' ? 'Вы администратор' : 'Вы участник';
    btn.classList.add('cc-joined');
  } else {
    txt.textContent = 'Вступить';
    btn.classList.remove('cc-joined');
  }
}

async function ccToggleJoin() {
  if (_ccJoining || !_companyId) return;
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }

  _ccJoining = true;
  const btn = document.getElementById('ccJoinBtn');
  if (btn) btn.disabled = true;

  if (_ccIsMember) {
    const res = await window.leaveCompany(_companyId);
    if (!res.error) {
      ccUpdateJoinBtn(false, null);
      if (window.showToast) showToast('Вы вышли из компании');
    }
  } else {
    const res = await window.joinCompany(_companyId);
    if (!res.error) {
      ccUpdateJoinBtn(true, 'member');
      if (window.showToast) showToast('Вы вступили!');
    } else {
      if (window.showToast) showToast(res.error.message || 'Ошибка');
    }
  }

  if (btn) btn.disabled = false;
  _ccJoining = false;
}

// ═══ Company Card: share ═══

function ccWireShare(company) {
  const btn = document.getElementById('ccShareBtn');
  if (!btn || !company) return;
  btn.addEventListener('click', function() {
    if (navigator.share) {
      navigator.share({ title: company.name, text: company.description || '' });
    } else if (window.showToast) {
      showToast('Поделиться пока недоступно');
    }
  });
}

// ═══ Company Card: write review ═══

function ccWireReviewBtn() {
  const btn = document.getElementById('ccWriteReviewBtn');
  if (!btn) return;
  btn.addEventListener('click', ccShowReviewForm);
}

function ccShowReviewForm() {
  const existing = document.getElementById('ccReviewForm');
  if (existing) { existing.remove(); return; }
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }

  const form = document.createElement('div');
  form.id = 'ccReviewForm';
  form.className = 'cc-review-form';
  form.innerHTML =
    '<div class="cc-rf-stars" id="ccRfStars">' +
      '<span class="cc-rf-star" data-v="1">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="2">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="3">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="4">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="5">&#9733;</span>' +
    '</div>' +
    '<textarea class="cc-rf-text" id="ccRfText" placeholder="Ваш отзыв..." rows="3"></textarea>' +
    '<button class="cc-rf-submit" id="ccRfSubmit">Отправить</button>';

  const panel = document.getElementById('ccPanelReviews');
  const writeBtn = document.getElementById('ccWriteReviewBtn');
  if (panel && writeBtn) panel.insertBefore(form, writeBtn);

  let selectedRating = 0;
  form.querySelectorAll('.cc-rf-star').forEach(function(star) {
    star.addEventListener('click', function() {
      selectedRating = parseInt(star.getAttribute('data-v'));
      ccUpdateFormStars(selectedRating);
    });
  });

  document.getElementById('ccRfSubmit').addEventListener('click', async function() {
    const text = document.getElementById('ccRfText').value.trim();
    if (!selectedRating) { if (window.showToast) showToast('Поставьте оценку'); return; }
    if (!text) { if (window.showToast) showToast('Напишите отзыв'); return; }

    this.disabled = true;
    this.textContent = 'Отправка...';
    const res = await window.addCompanyReview(_companyId, selectedRating, text);
    if (!res.error) {
      if (window.showToast) showToast('Отзыв отправлен!');
      form.remove();
      const revRes = await window.loadCompanyReviews(_companyId, 20);
      ccRenderReviews(revRes.data || []);
    } else {
      if (window.showToast) showToast(res.error.message || 'Ошибка');
      this.disabled = false;
      this.textContent = 'Отправить';
    }
  });
}

function ccUpdateFormStars(rating) {
  document.querySelectorAll('#ccRfStars .cc-rf-star').forEach(function(s) {
    const v = parseInt(s.getAttribute('data-v'));
    s.style.color = v <= rating ? '#fbbf24' : 'rgba(255,255,255,.15)';
  });
}

// ═══ Exports ═══

window.initCompanies = initCompanies;
window.initCompanyCard = initCompanyCard;
window.openCompanyCard = openCompanyCard;
