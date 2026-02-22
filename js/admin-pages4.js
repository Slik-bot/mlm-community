// ===== ADMIN PAGES 4 — Settings =====

let _setTab = 'tariffs';

function renderSettings() {
  const tabs = 'tariffs:Тарифы,xp:XP и уровни,dna:ДНК-тест,reviews:Отзывы,integrations:Интеграции';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _setTab ? ' active' : '') + '" onclick="switchSetTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchSetTab(_setTab, document.querySelector('.tab.active'));
}
function switchSetTab(tab, btn) {
  _setTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ tariffs: loadTariffs, xp: loadXpRules, dna: loadDnaQuestions, reviews: loadReviews, integrations: loadIntegrations }[tab] || function(){})();
}

// ===== ТАРИФЫ =====
async function loadTariffs() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('app_settings').select('*').eq('key', 'tariffs').single();
  const cfg = (r.data && r.data.value) || {
    free: { monthly: 0, yearly: 0, posts_day: 3, cases: 1, tools: 0 },
    pro: { monthly: 499, yearly: 4990, posts_day: 10, cases: 5, tools: 5 },
    business: { monthly: 1499, yearly: 14990, posts_day: 50, cases: 20, tools: 50 }
  };
  const plans = ['free', 'pro', 'business'];
  const labels = { free: 'FREE', pro: 'PRO', business: 'BUSINESS' };
  const colors = { free: 'blue', pro: 'purple', business: 'gold' };
  let h = '<div class="stats-grid">';
  plans.forEach(function(p) {
    const c = cfg[p] || {};
    h += '<div class="stat-card" style="text-align:left;padding:16px">' +
      '<div style="margin-bottom:8px"><span class="badge badge-' + colors[p] + '">' + labels[p] + '</span></div>' +
      '<div class="fg"><div class="fl">Цена/мес</div><input type="number" class="field" id="tf_' + p + '_m" value="' + (c.monthly || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Цена/год</div><input type="number" class="field" id="tf_' + p + '_y" value="' + (c.yearly || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Посты/день</div><input type="number" class="field" id="tf_' + p + '_pd" value="' + (c.posts_day || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Кейсы</div><input type="number" class="field" id="tf_' + p + '_st" value="' + (c.cases || 0) + '"></div>' +
      '<div class="fg"><div class="fl">Инструменты</div><input type="number" class="field" id="tf_' + p + '_tl" value="' + (c.tools || 0) + '"></div>' +
    '</div>';
  });
  h += '</div><div style="margin-top:12px"><button class="btn btn-primary" onclick="saveTariffs()">Сохранить тарифы</button></div>';
  area.innerHTML = h;
}
async function saveTariffs() {
  const plans = ['free', 'pro', 'business'];
  const val = {};
  plans.forEach(function(p) {
    val[p] = {
      monthly: parseInt(document.getElementById('tf_' + p + '_m').value) || 0,
      yearly: parseInt(document.getElementById('tf_' + p + '_y').value) || 0,
      posts_day: parseInt(document.getElementById('tf_' + p + '_pd').value) || 0,
      cases: parseInt(document.getElementById('tf_' + p + '_st').value) || 0,
      tools: parseInt(document.getElementById('tf_' + p + '_tl').value) || 0
    };
  });
  const r = await sb.from('app_settings').upsert({ key: 'tariffs', value: val, updated_at: new Date().toISOString() });
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast('Тарифы сохранены', 'ok');
}

// ===== XP И УРОВНИ =====
async function loadXpRules() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const xpR = await sb.from('app_settings').select('*').eq('key', 'xp_rules').single();
  const lvlR = await sb.from('app_settings').select('*').eq('key', 'levels').single();
  const xp = (xpR.data && xpR.data.value) || { post: 15, like: 5, comment: 10, share: 25, friend: 10 };
  const lvl = (lvlR.data && lvlR.data.value) || { pawn: 0, knight: 500, bishop: 1500, rook: 3000, queen: 5000, king: 10000 };
  const actions = ['post', 'like', 'comment', 'share', 'friend'];
  const levels = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  const lvlNames = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь', king: 'Король' };
  let h = '<div class="section-title">XP за действия</div>' +
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
  const actions = ['post', 'like', 'comment', 'share', 'friend'];
  const xp = {};
  actions.forEach(function(a) { xp[a] = parseInt(document.getElementById('xr_' + a).value) || 0; });
  const levels = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  const lvl = {};
  levels.forEach(function(l) { lvl[l] = parseInt(document.getElementById('lv_' + l).value) || 0; });
  const now = new Date().toISOString();
  await sb.from('app_settings').upsert({ key: 'xp_rules', value: xp, updated_at: now });
  await sb.from('app_settings').upsert({ key: 'levels', value: lvl, updated_at: now });
  showToast('XP и уровни сохранены', 'ok');
}

// ===== ДНК-ТЕСТ =====
async function loadDnaQuestions() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('dna_questions').select('*').order('sort_order', { ascending: true });
  const data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет вопросов</div>'; return; }
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>#</th><th>Вопрос</th><th>Вариантов</th><th>Порядок</th><th>Активен</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(q, i) {
    const opts = Array.isArray(q.options) ? q.options.length : 0;
    const act = q.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + (i + 1) + '</td><td>' + esc((q.question_text || '').substring(0, 60)) + '</td>' +
      '<td>' + opts + '</td><td>' + (q.sort_order || 0) + '</td><td>' + act + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

// ===== ОТЗЫВЫ =====
async function loadReviews() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('reviews').select('*').order('sort_order', { ascending: true });
  const data = r.data || [];
  let h = '<div class="toolbar"><button class="btn btn-primary" onclick="openReviewModal()">Добавить отзыв</button></div>';
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
  let rev = {};
  if (id) { const r = await sb.from('reviews').select('*').eq('id', id).single(); rev = r.data || {}; }
  const body = '<div class="fg"><div class="fl">Имя</div><input class="field" id="revName" value="' + esc(rev.name || '') + '"></div>' +
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
  const d = {
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
  const r = id ? await sb.from('reviews').update(d).eq('id', id) : await sb.from('reviews').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Отзыв обновлён' : 'Отзыв создан', 'ok'); closeModal(); loadReviews();
}
async function delReview(id) {
  if (!confirm('Удалить отзыв?')) return;
  await sb.from('reviews').delete().eq('id', id);
  showToast('Удалено', 'ok'); loadReviews();
}

// ===== ИНТЕГРАЦИИ =====
async function loadIntegrations() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('app_settings').select('*').eq('key', 'integrations').single();
  const cfg = (r.data && r.data.value) || {};
  const items = [
    { key: 'telegram_bot', name: 'Telegram Bot', icon: '🤖', field: 'Токен бота', placeholder: 'bot123456:ABC...' },
    { key: 'tribute', name: 'Tribute', icon: '💳', field: 'Channel ID', placeholder: 'channel_id' },
    { key: 'google_play', name: 'Google Play', icon: '📱', field: null },
    { key: 'app_store', name: 'App Store', icon: '🍎', field: null }
  ];
  let h = '<div class="stats-grid">';
  items.forEach(function(it) {
    const val = cfg[it.key] || {};
    const st = val.connected ? '<span class="badge badge-green">Подключено</span>' : '<span class="badge badge-red">Не подключено</span>';
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
  const r = await sb.from('app_settings').select('*').eq('key', 'integrations').single();
  const cfg = (r.data && r.data.value) || {};
  const token = document.getElementById('int_' + key).value.trim();
  cfg[key] = { token: token, connected: !!token };
  const res = await sb.from('app_settings').upsert({ key: 'integrations', value: cfg, updated_at: new Date().toISOString() });
  if (res.error) { showToast(res.error.message, 'err'); return; }
  showToast('Сохранено', 'ok'); loadIntegrations();
}
