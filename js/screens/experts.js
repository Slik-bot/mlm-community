// ===== EXPERTS SCREENS — каталог, детали, стать экспертом =====

let currentExpert = null;
let allExperts = [];
let expertsSpec = 'all';
let expertsSearchQuery = '';
let expertsSortMethod = 'rating';

const EXPERT_SPECS = {
  marketing: 'Маркетинг',
  sales:     'Продажи',
  finance:   'Финансы',
  hr:        'HR',
  it:        'IT',
  legal:     'Право',
  other:     'Другое'
};

function getSpecLabel(spec) {
  return EXPERT_SPECS[spec] || spec;
}

function renderExpertStars(rating) {
  const full = Math.round(rating || 0);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const opacity = i <= full ? '1' : '0.2';
    html += '<svg viewBox="0 0 24 24" fill="#f59e0b" width="14" height="14" style="opacity:' + opacity + '"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }
  return html;
}

function formatRate(kopecks) {
  if (!kopecks) return '0 руб/час';
  return Math.floor(kopecks / 100).toLocaleString('ru-RU') + ' руб/час';
}

// ===== EXPERTS LIST =====

function initExperts() {
  expertsSpec = 'all';
  expertsSearchQuery = '';
  expertsSortMethod = 'rating';
  const searchInp = document.getElementById('expertsSearch');
  if (searchInp) searchInp.value = '';
  const sortSel = document.getElementById('expertsSortSelect');
  if (sortSel) sortSel.value = 'rating';
  updateSpecPillsUI();
  loadExperts();
}

async function loadExperts() {
  const result = await window.sb.from('expert_cards')
    .select('*, user:vw_public_profiles(id, name, avatar_url, dna_type, bio)')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  allExperts = result.data || [];
  renderExpertsList(applyExpertsFilters());
}

function applyExpertsFilters() {
  let filtered = allExperts;

  if (expertsSpec !== 'all') {
    filtered = filtered.filter(function(e) { return e.title === expertsSpec; });
  }

  if (expertsSearchQuery) {
    filtered = filtered.filter(function(e) {
      const name = (e.user && e.user.name || '').toLowerCase();
      const spec = getSpecLabel(e.title).toLowerCase();
      return name.indexOf(expertsSearchQuery) !== -1 || spec.indexOf(expertsSearchQuery) !== -1;
    });
  }

  const sorted = filtered.slice();
  if (expertsSortMethod === 'price_asc') {
    sorted.sort(function(a, b) { return (a.hourly_rate || 0) - (b.hourly_rate || 0); });
  } else if (expertsSortMethod === 'price_desc') {
    sorted.sort(function(a, b) { return (b.hourly_rate || 0) - (a.hourly_rate || 0); });
  } else if (expertsSortMethod === 'sessions') {
    sorted.sort(function(a, b) { return (b.orders_completed || 0) - (a.orders_completed || 0); });
  } else {
    sorted.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
  }

  return sorted;
}

function renderExpertsList(experts) {
  const list = document.getElementById('expertsList');
  const empty = document.getElementById('expertsEmpty');
  if (!list) return;

  if (!experts.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = experts.map(function(e) {
    const user = e.user || {};
    return '<div class="expert-card glass-card" onclick="openExpert(\'' + e.id + '\')">' +
      '<img class="expert-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<div class="expert-info">' +
        '<div class="expert-name">' + escHtml(user.name || 'Эксперт') + '</div>' +
        '<div class="expert-spec">' + getSpecLabel(e.title) + '</div>' +
        '<div class="expert-rating">' +
          '<span class="expert-stars">' + renderExpertStars(e.rating) + '</span>' +
          '<span>' + (e.rating || 0).toFixed(1) + '</span>' +
          '<span class="expert-sessions-count">' + (e.orders_completed || 0) + ' сессий</span>' +
        '</div>' +
        '<div class="expert-rate">' + formatRate(e.hourly_rate) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function expertsFilterSpec(spec) {
  expertsSpec = spec;
  updateSpecPillsUI();
  renderExpertsList(applyExpertsFilters());
}

function updateSpecPillsUI() {
  const btns = document.querySelectorAll('#expertsSpecs .spec-pill');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-spec') === expertsSpec);
  });
}

function expertsFilterSearch(query) {
  expertsSearchQuery = query.toLowerCase().trim();
  renderExpertsList(applyExpertsFilters());
}

function expertsSort(method) {
  expertsSortMethod = method;
  renderExpertsList(applyExpertsFilters());
}

function openExpert(expertId) {
  currentExpert = allExperts.find(function(e) { return e.id === expertId; });
  if (currentExpert) goTo('scrExpertDetail');
}

// ===== EXPERT DETAIL =====

function initExpertDetail() {
  if (!currentExpert) { goBack(); return; }

  const user = currentExpert.user || {};

  const avatarEl = document.getElementById('edAvatar');
  if (avatarEl) avatarEl.src = user.avatar_url || 'assets/default-avatar.svg';

  const nameEl = document.getElementById('edName');
  if (nameEl) nameEl.textContent = user.name || 'Эксперт';

  const specEl = document.getElementById('edSpec');
  if (specEl) specEl.textContent = getSpecLabel(currentExpert.title);

  const starsEl = document.getElementById('edStars');
  if (starsEl) starsEl.innerHTML = renderExpertStars(currentExpert.rating);

  const ratingEl = document.getElementById('edRating');
  if (ratingEl) ratingEl.textContent = (currentExpert.rating || 0).toFixed(1);

  const sessionsEl = document.getElementById('edSessions');
  if (sessionsEl) sessionsEl.textContent = (currentExpert.orders_completed || 0) + ' сессий';

  const rateEl = document.getElementById('edRate');
  if (rateEl) rateEl.textContent = formatRate(currentExpert.hourly_rate);

  const bioEl = document.getElementById('edBio');
  if (bioEl) bioEl.textContent = currentExpert.description || user.bio || '';

  const skillsEl = document.getElementById('edSkills');
  if (skillsEl) {
    const skills = currentExpert.skills || [];
    skillsEl.innerHTML = skills.map(function(s) {
      return '<span class="skill-pill">' + escHtml(s) + '</span>';
    }).join('');
  }

  loadExpertReviews();
}

async function loadExpertReviews() {
  const result = await window.sb.from('reviews')
    .select('*, author:users(name, avatar_url)')
    .eq('target_type', 'expert')
    .eq('target_id', currentExpert.id)
    .order('created_at', { ascending: false })
    .limit(10);

  renderExpertReviews(result.data || []);
}

function renderExpertReviews(reviews) {
  const el = document.getElementById('edReviews');
  if (!el) return;

  if (!reviews.length) {
    el.innerHTML = '<div class="reviews-empty">Пока нет отзывов</div>';
    return;
  }

  el.innerHTML = reviews.map(function(r) {
    const author = r.author || {};
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '';
    return '<div class="review-card glass-card">' +
      '<div class="review-header">' +
        '<img class="review-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<span class="review-name">' + escHtml(author.name || 'Участник') + '</span>' +
        '<span class="review-date">' + date + '</span>' +
      '</div>' +
      '<div class="review-stars">' + renderExpertStars(r.rating) + '</div>' +
      '<div class="review-text">' + escHtml(r.text) + '</div>' +
    '</div>';
  }).join('');
}

async function expertBook() {
  if (!currentExpert || !window.currentUser) return;

  const btn = document.getElementById('edBookBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  await window.sb.from('mentorships').insert({
    mentor_id: currentExpert.id,
    mentee_id: window.currentUser.id,
    status: 'pending',
    price: currentExpert.hourly_rate
  });

  if (window.showToast) showToast('Заявка отправлена! Эксперт свяжется с вами');
  if (btn) { btn.disabled = false; btn.textContent = 'Записаться на консультацию'; }
}

// ===== BECOME EXPERT =====

function initBecomeExpert() {
  const spec = document.getElementById('beSpec');
  const bio = document.getElementById('beBio');
  const skills = document.getElementById('beSkills');
  const rate = document.getElementById('beRate');
  if (spec) spec.value = 'marketing';
  if (bio) bio.value = '';
  if (skills) skills.value = '';
  if (rate) rate.value = '';
}

async function expertRegister() {
  const spec = document.getElementById('beSpec');
  const bio = document.getElementById('beBio');
  const skills = document.getElementById('beSkills');
  const rate = document.getElementById('beRate');

  const bioVal = bio ? bio.value.trim() : '';
  const rateVal = rate ? parseInt(rate.value) : 0;
  const skillsArr = skills ? skills.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

  if (!bioVal) {
    if (window.showToast) showToast('Заполните поле "О себе"');
    return;
  }
  if (!rateVal || rateVal < 500) {
    if (window.showToast) showToast('Минимальная ставка — 500 руб');
    return;
  }
  if (!window.currentUser) return;

  await window.sb.from('expert_cards').insert({
    user_id: window.currentUser.id,
    title: spec ? spec.value : 'other',
    description: bioVal,
    skills: skillsArr,
    hourly_rate: rateVal * 100,
    is_active: false
  });

  if (window.showToast) showToast('Заявка на модерацию отправлена!');
  goBack();
}

// ===== EXPORTS =====
window.initExperts = initExperts;
window.initExpertDetail = initExpertDetail;
window.initBecomeExpert = initBecomeExpert;
window.expertsFilterSpec = expertsFilterSpec;
window.expertsFilterSearch = expertsFilterSearch;
window.expertsSort = expertsSort;
window.openExpert = openExpert;
window.expertBook = expertBook;
window.expertRegister = expertRegister;
