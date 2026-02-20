// ===== ADMIN PAGES 4 — Settings =====

var _setTab = 'tariffs';

function renderSettings() {
  var tabs = 'tariffs:Тарифы,xp:XP и уровни,dna:ДНК-тест,faq:FAQ,reviews:Отзывы,banners:Баннеры,wisdom:Мудрость дня,integrations:Интеграции', h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { var p = s.split(':'); h += '<button class="tab' + (p[0] === _setTab ? ' active' : '') + '" onclick="switchSetTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchSetTab(_setTab, document.querySelector('.tab.active'));
}
function switchSetTab(tab, btn) {
  _setTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ tariffs: loadTariffs, xp: loadXpRules, dna: loadDnaQuestions, faq: loadFaqList, reviews: loadReviews, banners: loadBanners, wisdom: loadWisdom, integrations: loadIntegrations }[tab] || function(){})();
}

// ===== ТАРИФЫ =====
async function loadTariffs() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('app_settings').select('*').eq('key', 'tariffs').single();
  var cfg = (r.data && r.data.value) || {
    free: { monthly: 0, yearly: 0, posts_day: 3, stories: 1, tools: 0 },
    pro: { monthly: 499, yearly: 4990, posts_day: 10, stories: 5, tools: 5 },
    business: { monthly: 1499, yearly: 14990, posts_day: 50, stories: 20, tools: 50 }
  };
  var plans = ['free', 'pro', 'business'];
  var labels = { free: 'FREE', pro: 'PRO', business: 'BUSINESS' };
  var colors = { free: 'blue', pro: 'purple', business: 'gold' };
  var h = '<div class="stats-grid">';
  plans.forEach(function(p) {
    var c = cfg[p] || {};
    h += '<div class="stat-card" style="text-align:left;padding:16px">' +
      '<div style="margin-bottom:8px"><span class="badge badge-' + colors[p] + '">' + labels[p] + '</span></div>' +
      '<div class="fg"><div class="fl">Цена/мес</div><input type="number" class="field" id="tf_' + p + '_m" value="' + (c.monthly || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Цена/год</div><input type="number" class="field" id="tf_' + p + '_y" value="' + (c.yearly || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Посты/день</div><input type="number" class="field" id="tf_' + p + '_pd" value="' + (c.posts_day || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Сторис</div><input type="number" class="field" id="tf_' + p + '_st" value="' + (c.stories || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Инструменты</div><input type="number" class="field" id="tf_' + p + '_tl" value="' + (c.tools || 0) + '"></div>' +
    '</div>';
  });
  h += '</div><div style="margin-top:12px"><button class="btn btn-primary" onclick="saveTariffs()">Сохранить тарифы</button></div>';
  area.innerHTML = h;
}
async function saveTariffs() {
  var plans = ['free', 'pro', 'business'], val = {};
  plans.forEach(function(p) {
    val[p] = {
      monthly: parseInt(document.getElementById('tf_' + p + '_m').value) || 0,
      yearly: parseInt(document.getElementById('tf_' + p + '_y').value) || 0,
      posts_day: parseInt(document.getElementById('tf_' + p + '_pd').value) || 0,
      stories: parseInt(document.getElementById('tf_' + p + '_st').value) || 0,
      tools: parseInt(document.getElementById('tf_' + p + '_tl').value) || 0
    };
  });
  var r = await sb.from('app_settings').upsert({ key: 'tariffs', value: val, updated_at: new Date().toISOString() });
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast('Тарифы сохранены', 'ok');
}

// ===== XP И УРОВНИ =====
async function loadXpRules() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var xpR = await sb.from('app_settings').select('*').eq('key', 'xp_rules').single();
  var lvlR = await sb.from('app_settings').select('*').eq('key', 'levels').single();
  var xp = (xpR.data && xpR.data.value) || { post: 15, like: 5, comment: 10, share: 25, friend: 10 };
  var lvl = (lvlR.data && lvlR.data.value) || { pawn: 0, knight: 500, bishop: 1500, rook: 3000, queen: 5000, king: 10000 };
  var actions = ['post', 'like', 'comment', 'share', 'friend'];
  var levels = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  var lvlNames = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь', king: 'Король' };
  var h = '<div class="section-title">XP за действия</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>Действие</th><th>XP</th></tr></thead><tbody>';
  actions.forEach(function(a) {
    h += '<tr><td>' + a + '</td><td><input type="number" class="field" id="xr_' + a + '" value="' + (xp[a] || 0) + '" style="width:100px;margin:0"></td></tr>';
  });
  h += '</tbody></table></div>';
  h += '<div class="section-title" style="margin-top:16px">Уровни</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>Уровень</th><th>Мин. XP</th></tr></thead><tbody>';
  levels.forEach(function(l) {
    h += '<tr><td>' + (lvlNames[l] || l) + '</td><td><input type="number" class="field" id="lv_' + l + '" value="' + (lvl[l] || 0) + '" style="width:100px;margin:0"></td></tr>';
  });
  h += '</tbody></table></div>';
  h += '<div style="margin-top:12px"><button class="btn btn-primary" onclick="saveXpRules()">Сохранить</button></div>';
  area.innerHTML = h;
}
async function saveXpRules() {
  var actions = ['post', 'like', 'comment', 'share', 'friend'], xp = {};
  actions.forEach(function(a) { xp[a] = parseInt(document.getElementById('xr_' + a).value) || 0; });
  var levels = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'], lvl = {};
  levels.forEach(function(l) { lvl[l] = parseInt(document.getElementById('lv_' + l).value) || 0; });
  var now = new Date().toISOString();
  await sb.from('app_settings').upsert({ key: 'xp_rules', value: xp, updated_at: now });
  await sb.from('app_settings').upsert({ key: 'levels', value: lvl, updated_at: now });
  showToast('XP и уровни сохранены', 'ok');
}

// ===== ДНК-ТЕСТ =====
async function loadDnaQuestions() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('dna_questions').select('*').order('sort_order', { ascending: true });
  var data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет вопросов</div>'; return; }
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>#</th><th>Вопрос</th><th>Вариантов</th><th>Порядок</th><th>Активен</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(q, i) {
    var opts = Array.isArray(q.options) ? q.options.length : 0;
    var act = q.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + (i + 1) + '</td><td>' + esc((q.question_text || '').substring(0, 60)) + '</td>' +
      '<td>' + opts + '</td><td>' + (q.sort_order || 0) + '</td><td>' + act + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

// ===== FAQ =====
async function loadFaqList() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('faq').select('*').order('sort_order', { ascending: true });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openFaqModal()">Добавить вопрос</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет вопросов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>#</th><th>Вопрос</th><th>Ответ</th><th>Порядок</th><th>Активен</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(f, i) {
    var act = f.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + (i + 1) + '</td><td>' + esc((f.question || '').substring(0, 40)) + '</td>' +
      '<td>' + esc((f.answer || '').substring(0, 40)) + '</td><td>' + (f.sort_order || 0) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openFaqModal(\'' + f.id + '\')">Ред.</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delFaq(\'' + f.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
async function openFaqModal(id) {
  var f = {};
  if (id) { var r = await sb.from('faq').select('*').eq('id', id).single(); f = r.data || {}; }
  var body = '<div class="fg"><div class="fl">Вопрос</div><input class="field" id="faqQ" value="' + esc(f.question || '') + '"></div>' +
    '<div class="fg"><div class="fl">Ответ</div><textarea class="field" id="faqA" rows="4">' + esc(f.answer || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Порядок</div><input type="number" class="field" id="faqOrd" value="' + (f.sort_order || 0) + '"></div>' +
    '<div class="fg"><div class="fl">Активен</div><select class="field" id="faqAct"><option value="true"' + (f.is_active !== false ? ' selected' : '') + '>Да</option><option value="false"' + (f.is_active === false ? ' selected' : '') + '>Нет</option></select></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveFaq(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать FAQ' : 'Новый FAQ', body);
}
async function saveFaq(id) {
  var d = {
    question: document.getElementById('faqQ').value.trim(),
    answer: document.getElementById('faqA').value.trim(),
    sort_order: parseInt(document.getElementById('faqOrd').value) || 0,
    is_active: document.getElementById('faqAct').value === 'true'
  };
  if (!d.question) { showToast('Введите вопрос', 'err'); return; }
  var r = id ? await sb.from('faq').update(d).eq('id', id) : await sb.from('faq').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Обновлено' : 'Создано', 'ok'); closeModal(); loadFaqList();
}
async function delFaq(id) {
  if (!confirm('Удалить вопрос?')) return;
  await sb.from('faq').delete().eq('id', id);
  showToast('Удалено', 'ok'); loadFaqList();
}

// ===== ОТЗЫВЫ =====
async function loadReviews() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('reviews').select('*').order('sort_order', { ascending: true });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openReviewModal()">Добавить отзыв</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет отзывов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Имя</th><th>Роль</th><th>Звёзды</th><th>Текст</th><th>Тег</th><th>Порядок</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(rev) {
    h += '<tr><td><b>' + esc(rev.name) + '</b></td><td>' + esc(rev.role || '—') + '</td>' +
      '<td>' + '⭐'.repeat(rev.stars || 0) + '</td>' +
      '<td>' + esc((rev.short_text || '').substring(0, 40)) + '</td>' +
      '<td><span class="badge badge-blue">' + esc(rev.tag || '—') + '</span></td>' +
      '<td>' + (rev.sort_order || 0) + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openReviewModal(\'' + rev.id + '\')">Ред.</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delReview(\'' + rev.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
async function openReviewModal(id) {
  var rev = {};
  if (id) { var r = await sb.from('reviews').select('*').eq('id', id).single(); rev = r.data || {}; }
  var body = '<div class="fg"><div class="fl">Имя</div><input class="field" id="revName" value="' + esc(rev.name || '') + '"></div>' +
    '<div class="fg"><div class="fl">Роль</div><input class="field" id="revRole" value="' + esc(rev.role || '') + '"></div>' +
    '<div class="fg"><div class="fl">Звёзды (1-5)</div><input type="number" class="field" id="revStars" min="1" max="5" value="' + (rev.stars || 5) + '"></div>' +
    '<div class="fg"><div class="fl">Краткий текст</div><input class="field" id="revShort" value="' + esc(rev.short_text || '') + '"></div>' +
    '<div class="fg"><div class="fl">Полный текст</div><textarea class="field" id="revFull" rows="3">' + esc(rev.full_text || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Тег</div><input class="field" id="revTag" value="' + esc(rev.tag || '') + '"></div>' +
    '<div class="fg"><div class="fl">Инициалы аватара</div><input class="field" id="revInit" value="' + esc(rev.avatar_initials || '') + '"></div>' +
    '<div class="fg"><div class="fl">Цвет аватара</div><input class="field" id="revColor" value="' + esc(rev.avatar_color || '') + '"></div>' +
    '<div class="fg"><div class="fl">Порядок</div><input type="number" class="field" id="revOrd" value="' + (rev.sort_order || 0) + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveReview(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать отзыв' : 'Новый отзыв', body);
}
async function saveReview(id) {
  var d = {
    name: document.getElementById('revName').value.trim(),
    role: document.getElementById('revRole').value.trim(),
    stars: parseInt(document.getElementById('revStars').value) || 5,
    short_text: document.getElementById('revShort').value.trim(),
    full_text: document.getElementById('revFull').value.trim(),
    tag: document.getElementById('revTag').value.trim() || null,
    avatar_initials: document.getElementById('revInit').value.trim() || null,
    avatar_color: document.getElementById('revColor').value.trim() || null,
    sort_order: parseInt(document.getElementById('revOrd').value) || 0
  };
  if (!d.name) { showToast('Введите имя', 'err'); return; }
  var r = id ? await sb.from('reviews').update(d).eq('id', id) : await sb.from('reviews').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Отзыв обновлён' : 'Отзыв создан', 'ok'); closeModal(); loadReviews();
}
async function delReview(id) {
  if (!confirm('Удалить отзыв?')) return;
  await sb.from('reviews').delete().eq('id', id);
  showToast('Удалено', 'ok'); loadReviews();
}

// ===== БАННЕРЫ =====
async function loadBanners() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('banners').select('*').order('sort_order', { ascending: true });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openBannerModal()">Добавить баннер</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет баннеров</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Размещение</th><th>Порядок</th><th>Активен</th><th>Начало</th><th>Конец</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(b) {
    var act = b.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td><b>' + esc(b.title) + '</b></td><td><span class="badge badge-blue">' + esc(b.placement || '—') + '</span></td>' +
      '<td>' + (b.sort_order || 0) + '</td><td>' + act + '</td>' +
      '<td>' + fmtDate(b.starts_at) + '</td><td>' + fmtDate(b.ends_at) + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openBannerModal(\'' + b.id + '\')">Ред.</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delBanner(\'' + b.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
async function openBannerModal(id) {
  var b = {};
  if (id) { var r = await sb.from('banners').select('*').eq('id', id).single(); b = r.data || {}; }
  var startVal = b.starts_at ? b.starts_at.substring(0, 10) : '';
  var endVal = b.ends_at ? b.ends_at.substring(0, 10) : '';
  var plOpts = '<option value="feed"' + (b.placement === 'feed' ? ' selected' : '') + '>feed</option>' +
    '<option value="profile"' + (b.placement === 'profile' ? ' selected' : '') + '>profile</option>' +
    '<option value="companies"' + (b.placement === 'companies' ? ' selected' : '') + '>companies</option>';
  var body = '<div class="fg"><div class="fl">Название</div><input class="field" id="bnTitle" value="' + esc(b.title || '') + '"></div>' +
    '<div class="fg"><div class="fl">URL изображения</div><input class="field" id="bnImg" value="' + esc(b.image_url || '') + '"></div>' +
    '<div class="fg"><div class="fl">URL ссылки</div><input class="field" id="bnLink" value="' + esc(b.link_url || '') + '"></div>' +
    '<div class="fg"><div class="fl">Размещение</div><select class="field" id="bnPlace">' + plOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Порядок</div><input type="number" class="field" id="bnOrd" value="' + (b.sort_order || 0) + '"></div>' +
    '<div class="fg"><div class="fl">Активен</div><select class="field" id="bnAct"><option value="true"' + (b.is_active !== false ? ' selected' : '') + '>Да</option><option value="false"' + (b.is_active === false ? ' selected' : '') + '>Нет</option></select></div>' +
    '<div class="fg"><div class="fl">Начало</div><input type="date" class="field" id="bnStart" value="' + startVal + '"></div>' +
    '<div class="fg"><div class="fl">Конец</div><input type="date" class="field" id="bnEnd" value="' + endVal + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveBanner(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать баннер' : 'Новый баннер', body);
}
async function saveBanner(id) {
  var d = {
    title: document.getElementById('bnTitle').value.trim(),
    image_url: document.getElementById('bnImg').value.trim() || null,
    link_url: document.getElementById('bnLink').value.trim() || null,
    placement: document.getElementById('bnPlace').value,
    sort_order: parseInt(document.getElementById('bnOrd').value) || 0,
    is_active: document.getElementById('bnAct').value === 'true',
    starts_at: document.getElementById('bnStart').value || null,
    ends_at: document.getElementById('bnEnd').value || null
  };
  if (!d.title) { showToast('Введите название', 'err'); return; }
  var r = id ? await sb.from('banners').update(d).eq('id', id) : await sb.from('banners').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Баннер обновлён' : 'Баннер создан', 'ok'); closeModal(); loadBanners();
}
async function delBanner(id) {
  if (!confirm('Удалить баннер?')) return;
  await sb.from('banners').delete().eq('id', id);
  showToast('Удалено', 'ok'); loadBanners();
}

// ===== МУДРОСТЬ ДНЯ =====
async function loadWisdom() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('wisdom_cards').select('*').order('created_at', { ascending: false });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openWisdomModal()">Добавить карточку</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет карточек</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Текст</th><th>Автор</th><th>ДНК</th><th>Активна</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(w) {
    var dna = w.dna_type ? '<span class="badge badge-' + (DC[w.dna_type] || 'purple') + '">' + (DN[w.dna_type] || w.dna_type) + '</span>' : '—';
    var act = w.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + esc((w.text || '').substring(0, 50)) + '</td><td>' + esc(w.author || '—') + '</td>' +
      '<td>' + dna + '</td><td>' + act + '</td>' +
      '<td class="actions"><button class="btn btn-danger btn-sm" onclick="delWisdom(\'' + w.id + '\')">Удалить</button></td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
function openWisdomModal() {
  var dnaOpts = '<option value="">Все</option><option value="strategist">Стратег</option>' +
    '<option value="communicator">Коммуникатор</option><option value="creator">Креатор</option>' +
    '<option value="analyst">Аналитик</option>';
  var body = '<div class="fg"><div class="fl">Текст</div><textarea class="field" id="wisText" rows="3"></textarea></div>' +
    '<div class="fg"><div class="fl">Автор</div><input class="field" id="wisAuthor"></div>' +
    '<div class="fg"><div class="fl">ДНК-тип</div><select class="field" id="wisDna">' + dnaOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Активна</div><select class="field" id="wisAct"><option value="true" selected>Да</option><option value="false">Нет</option></select></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveWisdom()">Создать</button></div>';
  openModal('Новая карточка', body);
}
async function saveWisdom() {
  var d = {
    text: document.getElementById('wisText').value.trim(),
    author: document.getElementById('wisAuthor').value.trim() || null,
    dna_type: document.getElementById('wisDna').value || null,
    is_active: document.getElementById('wisAct').value === 'true'
  };
  if (!d.text) { showToast('Введите текст', 'err'); return; }
  var r = await sb.from('wisdom_cards').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast('Карточка создана', 'ok'); closeModal(); loadWisdom();
}
async function delWisdom(id) {
  if (!confirm('Удалить карточку?')) return;
  await sb.from('wisdom_cards').delete().eq('id', id);
  showToast('Удалено', 'ok'); loadWisdom();
}

// ===== ИНТЕГРАЦИИ =====
async function loadIntegrations() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('app_settings').select('*').eq('key', 'integrations').single();
  var cfg = (r.data && r.data.value) || {};
  var items = [
    { key: 'telegram_bot', name: 'Telegram Bot', icon: '🤖', field: 'Токен бота', placeholder: 'bot123456:ABC...' },
    { key: 'tribute', name: 'Tribute', icon: '💳', field: 'Channel ID', placeholder: 'channel_id' },
    { key: 'google_play', name: 'Google Play', icon: '📱', field: null },
    { key: 'app_store', name: 'App Store', icon: '🍎', field: null }
  ];
  var h = '<div class="stats-grid">';
  items.forEach(function(it) {
    var val = cfg[it.key] || {};
    var st = val.connected ? '<span class="badge badge-green">Подключено</span>' : '<span class="badge badge-red">Не подключено</span>';
    h += '<div class="stat-card" style="text-align:left;padding:16px">' +
      '<div style="font-size:24px;margin-bottom:8px">' + it.icon + ' ' + it.name + '</div>' +
      '<div style="margin-bottom:8px">' + st + '</div>';
    if (it.field) {
      h += '<div class="fg"><div class="fl">' + it.field + '</div><input class="field" id="int_' + it.key + '" value="' + esc(val.token || '') + '" placeholder="' + it.placeholder + '"></div>' +
        '<button class="btn btn-primary btn-sm" onclick="saveIntegration(\'' + it.key + '\')">Сохранить</button>';
    } else {
      h += '<div style="color:var(--text-dim);font-size:13px">Настройка через консоль разработчика</div>';
    }
    h += '</div>';
  });
  h += '</div>';
  area.innerHTML = h;
}
async function saveIntegration(key) {
  var r = await sb.from('app_settings').select('*').eq('key', 'integrations').single();
  var cfg = (r.data && r.data.value) || {};
  var token = document.getElementById('int_' + key).value.trim();
  cfg[key] = { token: token, connected: !!token };
  var res = await sb.from('app_settings').upsert({ key: 'integrations', value: cfg, updated_at: new Date().toISOString() });
  if (res.error) { showToast(res.error.message, 'err'); return; }
  showToast('Сохранено', 'ok'); loadIntegrations();
}
