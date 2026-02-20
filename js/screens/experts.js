// ===== EXPERTS SCREENS — каталог, детали, стать экспертом =====

var currentExpert = null;
var allExperts = [];
var expertsSpec = 'all';
var expertsSearchQuery = '';
var expertsSortMethod = 'rating';

var EXPERT_SPECS = {
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderStars(rating) {
  var full = Math.round(rating || 0);
  var html = '';
  for (var i = 1; i <= 5; i++) {
    var opacity = i <= full ? '1' : '0.2';
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
  var searchInp = document.getElementById('expertsSearch');
  if (searchInp) searchInp.value = '';
  var sortSel = document.getElementById('expertsSortSelect');
  if (sortSel) sortSel.value = 'rating';
  updateSpecPillsUI();
  loadExperts();
}

async function loadExperts() {
  var result = await window.sb.from('mentors')
    .select('*, user:users(id, name, avatar_url, dna_type, bio)')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  allExperts = result.data || [];
  renderExpertsList(applyExpertsFilters());
}

function applyExpertsFilters() {
  var filtered = allExperts;

  if (expertsSpec !== 'all') {
    filtered = filtered.filter(function(e) { return e.specialization === expertsSpec; });
  }

  if (expertsSearchQuery) {
    filtered = filtered.filter(function(e) {
      var name = (e.user && e.user.name || '').toLowerCase();
      var spec = getSpecLabel(e.specialization).toLowerCase();
      return name.indexOf(expertsSearchQuery) !== -1 || spec.indexOf(expertsSearchQuery) !== -1;
    });
  }

  var sorted = filtered.slice();
  if (expertsSortMethod === 'price_asc') {
    sorted.sort(function(a, b) { return (a.hourly_rate || 0) - (b.hourly_rate || 0); });
  } else if (expertsSortMethod === 'price_desc') {
    sorted.sort(function(a, b) { return (b.hourly_rate || 0) - (a.hourly_rate || 0); });
  } else if (expertsSortMethod === 'sessions') {
    sorted.sort(function(a, b) { return (b.sessions_count || 0) - (a.sessions_count || 0); });
  } else {
    sorted.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
  }

  return sorted;
}

function renderExpertsList(experts) {
  var list = document.getElementById('expertsList');
  var empty = document.getElementById('expertsEmpty');
  if (!list) return;

  if (!experts.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = experts.map(function(e) {
    var user = e.user || {};
    return '<div class="expert-card glass-card" onclick="openExpert(\'' + e.id + '\')">' +
      '<img class="expert-avatar" src="' + (user.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
      '<div class="expert-info">' +
        '<div class="expert-name">' + escapeHtml(user.name || 'Эксперт') + '</div>' +
        '<div class="expert-spec">' + getSpecLabel(e.specialization) + '</div>' +
        '<div class="expert-rating">' +
          '<span class="expert-stars">' + renderStars(e.rating) + '</span>' +
          '<span>' + (e.rating || 0).toFixed(1) + '</span>' +
          '<span class="expert-sessions-count">' + (e.sessions_count || 0) + ' сессий</span>' +
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
  var btns = document.querySelectorAll('#expertsSpecs .spec-pill');
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

  var user = currentExpert.user || {};

  var avatarEl = document.getElementById('edAvatar');
  if (avatarEl) avatarEl.src = user.avatar_url || 'assets/default-avatar.svg';

  var nameEl = document.getElementById('edName');
  if (nameEl) nameEl.textContent = user.name || 'Эксперт';

  var specEl = document.getElementById('edSpec');
  if (specEl) specEl.textContent = getSpecLabel(currentExpert.specialization);

  var starsEl = document.getElementById('edStars');
  if (starsEl) starsEl.innerHTML = renderStars(currentExpert.rating);

  var ratingEl = document.getElementById('edRating');
  if (ratingEl) ratingEl.textContent = (currentExpert.rating || 0).toFixed(1);

  var sessionsEl = document.getElementById('edSessions');
  if (sessionsEl) sessionsEl.textContent = (currentExpert.sessions_count || 0) + ' сессий';

  var rateEl = document.getElementById('edRate');
  if (rateEl) rateEl.textContent = formatRate(currentExpert.hourly_rate);

  var bioEl = document.getElementById('edBio');
  if (bioEl) bioEl.textContent = currentExpert.bio || user.bio || '';

  var skillsEl = document.getElementById('edSkills');
  if (skillsEl) {
    var skills = currentExpert.skills || [];
    skillsEl.innerHTML = skills.map(function(s) {
      return '<span class="skill-pill">' + escapeHtml(s) + '</span>';
    }).join('');
  }

  loadExpertReviews();
}

async function loadExpertReviews() {
  var result = await window.sb.from('reviews')
    .select('*, author:users(name, avatar_url)')
    .eq('target_type', 'mentor')
    .eq('target_id', currentExpert.id)
    .order('created_at', { ascending: false })
    .limit(10);

  renderExpertReviews(result.data || []);
}

function renderExpertReviews(reviews) {
  var el = document.getElementById('edReviews');
  if (!el) return;

  if (!reviews.length) {
    el.innerHTML = '<div class="reviews-empty">Пока нет отзывов</div>';
    return;
  }

  el.innerHTML = reviews.map(function(r) {
    var author = r.author || {};
    var date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '';
    return '<div class="review-card glass-card">' +
      '<div class="review-header">' +
        '<img class="review-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<span class="review-name">' + escapeHtml(author.name || 'Участник') + '</span>' +
        '<span class="review-date">' + date + '</span>' +
      '</div>' +
      '<div class="review-stars">' + renderStars(r.rating) + '</div>' +
      '<div class="review-text">' + escapeHtml(r.text) + '</div>' +
    '</div>';
  }).join('');
}

async function expertBook() {
  if (!currentExpert || !window.currentUser) return;

  var btn = document.getElementById('edBookBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  await window.sb.from('mentor_sessions').insert({
    mentor_id: currentExpert.id,
    client_id: window.currentUser.id,
    status: 'pending',
    rate: currentExpert.hourly_rate
  });

  if (window.showToast) showToast('Заявка отправлена! Эксперт свяжется с вами');
  if (btn) { btn.disabled = false; btn.textContent = 'Записаться на консультацию'; }
}

// ===== BECOME EXPERT =====

function initBecomeExpert() {
  var spec = document.getElementById('beSpec');
  var bio = document.getElementById('beBio');
  var skills = document.getElementById('beSkills');
  var rate = document.getElementById('beRate');
  if (spec) spec.value = 'marketing';
  if (bio) bio.value = '';
  if (skills) skills.value = '';
  if (rate) rate.value = '';
}

async function expertRegister() {
  var spec = document.getElementById('beSpec');
  var bio = document.getElementById('beBio');
  var skills = document.getElementById('beSkills');
  var rate = document.getElementById('beRate');

  var bioVal = bio ? bio.value.trim() : '';
  var rateVal = rate ? parseInt(rate.value) : 0;
  var skillsArr = skills ? skills.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

  if (!bioVal) {
    if (window.showToast) showToast('Заполните поле "О себе"');
    return;
  }
  if (!rateVal || rateVal < 500) {
    if (window.showToast) showToast('Минимальная ставка — 500 руб');
    return;
  }
  if (!window.currentUser) return;

  await window.sb.from('mentors').insert({
    user_id: window.currentUser.id,
    specialization: spec ? spec.value : 'other',
    bio: bioVal,
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
