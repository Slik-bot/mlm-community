// ===== ADMIN PAGES — Companies & Shop =====

// ===== КОМПАНИИ =====
var _compTab = 'companies';
function renderCompanies() {
  var tabs = 'companies:Компании,applications:Заявки,experts:Эксперты', h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { var p = s.split(':'); h += '<button class="tab' + (p[0] === _compTab ? ' active' : '') + '" onclick="switchCompTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchCompTab(_compTab, document.querySelector('.tab.active'));
}
function switchCompTab(tab, btn) {
  _compTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ companies: loadCompanies, applications: loadApplications, experts: loadExperts }[tab] || function(){})();
}

async function loadCompanies() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('companies').select('*').order('created_at', { ascending: false });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openCompanyModal()">Добавить компанию</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет компаний</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Категория</th><th>Рейтинг</th><th>Участников</th><th>Страна</th><th>Лет</th><th>Верифиц.</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(c) {
    var ver = c.is_verified ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.category || '—') + '</td>' +
      '<td>' + (c.rating || 0) + '</td><td>' + (c.members_count || 0) + '</td>' +
      '<td>' + esc(c.country || '—') + '</td><td>' + (c.years || '—') + '</td><td>' + ver + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openCompanyModal(\'' + c.id + '\')">Ред.</button>' +
        '<button class="btn btn-' + (c.is_verified ? 'ghost' : 'success') + ' btn-sm" onclick="verifyCompany(\'' + c.id + '\',' + !c.is_verified + ')">' + (c.is_verified ? 'Снять' : 'Верифик.') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteCompany(\'' + c.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function openCompanyModal(id) {
  var c = {};
  if (id) { var r = await sb.from('companies').select('*').eq('id', id).single(); c = r.data || {}; }
  var body = '<div class="fg"><div class="fl">Название</div><input class="field" id="cmpName" value="' + esc(c.name || '') + '"></div>' +
    '<div class="fg"><div class="fl">Описание</div><textarea class="field" id="cmpDesc">' + esc(c.description || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Категория</div><input class="field" id="cmpCat" value="' + esc(c.category || '') + '"></div>' +
    '<div class="fg"><div class="fl">Страна</div><input class="field" id="cmpCountry" value="' + esc(c.country || '') + '"></div>' +
    '<div class="fg"><div class="fl">Лет на рынке</div><input type="number" class="field" id="cmpYears" value="' + (c.years || '') + '"></div>' +
    '<div class="fg"><div class="fl">URL логотипа</div><input class="field" id="cmpLogo" value="' + esc(c.logo_url || '') + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveCompany(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать компанию' : 'Новая компания', body);
}

async function saveCompany(id) {
  var d = {
    name: document.getElementById('cmpName').value.trim(),
    description: document.getElementById('cmpDesc').value.trim(),
    category: document.getElementById('cmpCat').value.trim(),
    country: document.getElementById('cmpCountry').value.trim(),
    years: parseInt(document.getElementById('cmpYears').value) || null,
    logo_url: document.getElementById('cmpLogo').value.trim() || null
  };
  if (!d.name) { showToast('Введите название', 'err'); return; }
  var r = id ? await sb.from('companies').update(d).eq('id', id) : await sb.from('companies').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Компания обновлена' : 'Компания создана', 'ok');
  closeModal(); loadCompanies();
}

async function verifyCompany(id, val) {
  var u = { is_verified: val };
  if (val) u.verified_at = new Date().toISOString();
  await sb.from('companies').update(u).eq('id', id);
  showToast(val ? 'Верифицирована' : 'Верификация снята', 'ok');
  loadCompanies();
}

async function deleteCompany(id) {
  if (!confirm('Удалить компанию?')) return;
  await sb.from('companies').delete().eq('id', id);
  showToast('Компания удалена', 'ok');
  loadCompanies();
}

// ===== ЗАЯВКИ =====
async function loadApplications() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('applications').select('*, profiles(name), companies(name)')
    .order('created_at', { ascending: false });
  var data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет заявок</div>'; return; }
  var sm = { pending: 'badge-gold', accepted: 'badge-green', rejected: 'badge-red' };
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>Компания</th><th>Сообщение</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(a) {
    var usr = a.profiles ? a.profiles.name : '—', cmp = a.companies ? a.companies.name : '—';
    var badge = sm[a.status] || 'badge-purple';
    var acts = a.status === 'pending'
      ? '<button class="btn btn-success btn-sm" onclick="handleApp(\'' + a.id + '\',\'accepted\')">Принять</button>' +
        '<button class="btn btn-danger btn-sm" onclick="handleApp(\'' + a.id + '\',\'rejected\')">Отклонить</button>'
      : '';
    h += '<tr><td>' + esc(usr) + '</td><td>' + esc(cmp) + '</td>' +
      '<td>' + esc((a.message || '').substring(0, 60)) + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(a.status) + '</span></td>' +
      '<td>' + fmtDate(a.created_at) + '</td><td class="actions">' + acts + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function handleApp(id, status) {
  await sb.from('applications').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
  showToast(status === 'accepted' ? 'Заявка принята' : 'Заявка отклонена', 'ok');
  loadApplications();
}

// ===== ЭКСПЕРТЫ =====
async function loadExperts() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('experts').select('*, profiles(name), companies(name)')
    .order('created_at', { ascending: false });
  var data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет экспертов</div>'; return; }
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>Компания</th><th>Специальность</th><th>Теги</th><th>Верифиц.</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(e) {
    var usr = e.profiles ? e.profiles.name : '—', cmp = e.companies ? e.companies.name : '—';
    var tags = (e.tags || []).join(', ') || '—';
    var ver = e.is_verified ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + esc(usr) + '</td><td>' + esc(cmp) + '</td>' +
      '<td>' + esc(e.specialty || '—') + '</td><td>' + esc(tags) + '</td>' +
      '<td>' + ver + '</td><td>' + fmtDate(e.created_at) + '</td>' +
      '<td class="actions"><button class="btn btn-' + (e.is_verified ? 'ghost' : 'success') + ' btn-sm" onclick="toggleExpertVer(\'' + e.id + '\',' + !e.is_verified + ')">' + (e.is_verified ? 'Снять' : 'Верифик.') + '</button></td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function toggleExpertVer(id, val) {
  await sb.from('experts').update({ is_verified: val }).eq('id', id);
  showToast(val ? 'Эксперт верифицирован' : 'Верификация снята', 'ok');
  loadExperts();
}


// ===== МАГАЗИН =====
var _shopTab = 'tools';
function renderShop() {
  var tabs = 'tools:Инструменты,categories:Категории,promos:Промокоды,purchases:Покупки', h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { var p = s.split(':'); h += '<button class="tab' + (p[0] === _shopTab ? ' active' : '') + '" onclick="switchShopTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchShopTab(_shopTab, document.querySelector('.tab.active'));
}
function switchShopTab(tab, btn) {
  _shopTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ tools: loadTools, categories: loadToolCats, promos: loadPromos, purchases: loadPurchases }[tab] || function(){})();
}

// ===== ИНСТРУМЕНТЫ =====
async function loadTools() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('tools').select('*, tool_categories(name)').order('created_at', { ascending: false });
  if (r.error) r = await sb.from('tools').select('*').order('created_at', { ascending: false });
  var data = r.data || [];
  if (data.length) {
    var ids = data.map(function(t) { return t.author_id; }).filter(Boolean);
    ids = ids.filter(function(v, i, a) { return a.indexOf(v) === i; });
    if (ids.length) {
      var pr = await sb.from('profiles').select('id, name').in('id', ids);
      var nm = {}; (pr.data || []).forEach(function(p) { nm[p.id] = p.name; });
      data.forEach(function(t) { t._author = nm[t.author_id] || '—'; });
    }
  }
  if (!data.length) { area.innerHTML = '<div class="empty">Нет инструментов</div>'; return; }
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Автор</th><th>Категория</th><th>Цена</th><th>Скач.</th><th>Рейтинг</th><th>Статус</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(t) {
    var cat = t.tool_categories ? t.tool_categories.name : '—';
    var price = t.is_free ? '<span class="badge badge-green">Free</span>' : (t.price || 0) + ' ₽';
    var st = (t.is_featured ? '<span class="badge badge-gold">Featured</span> ' : '') +
      (t.is_active !== false ? '<span class="badge badge-green">Акт</span>' : '<span class="badge badge-red">Скрыт</span>');
    h += '<tr><td><b>' + esc(t.title) + '</b></td><td>' + esc(t._author || '—') + '</td>' +
      '<td>' + esc(cat) + '</td><td>' + price + '</td>' +
      '<td>' + (t.downloads_count || 0) + '</td><td>' + (t.rating || 0) + '</td><td>' + st + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="togFeatured(\'' + t.id + '\',' + !!t.is_featured + ')">' + (t.is_featured ? 'Unfeatured' : 'Featured') + '</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="togToolActive(\'' + t.id + '\',' + (t.is_active !== false) + ')">' + (t.is_active !== false ? 'Скрыть' : 'Показать') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delTool(\'' + t.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function togFeatured(id, cur) {
  await sb.from('tools').update({ is_featured: !cur }).eq('id', id);
  showToast(!cur ? 'Добавлен в Featured' : 'Убран из Featured', 'ok'); loadTools();
}
async function togToolActive(id, cur) {
  await sb.from('tools').update({ is_active: !cur }).eq('id', id);
  showToast(cur ? 'Скрыт' : 'Показан', 'ok'); loadTools();
}
async function delTool(id) {
  if (!confirm('Удалить инструмент?')) return;
  await sb.from('tools').delete().eq('id', id);
  showToast('Удалён', 'ok'); loadTools();
}

// ===== КАТЕГОРИИ =====
async function loadToolCats() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('tool_categories').select('*').order('sort_order', { ascending: true });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openCatModal()">Добавить категорию</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет категорий</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Иконка</th><th>Название</th><th>Порядок</th><th>Активна</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(c) {
    var act = c.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + esc(c.icon || '—') + '</td><td><b>' + esc(c.name) + '</b></td>' +
      '<td>' + (c.sort_order || 0) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openCatModal(\'' + c.id + '\')">Ред.</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delCat(\'' + c.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function openCatModal(id) {
  var c = {};
  if (id) { var r = await sb.from('tool_categories').select('*').eq('id', id).single(); c = r.data || {}; }
  var body = '<div class="fg"><div class="fl">Название</div><input class="field" id="catName" value="' + esc(c.name || '') + '"></div>' +
    '<div class="fg"><div class="fl">Иконка</div><input class="field" id="catIcon" value="' + esc(c.icon || '') + '"></div>' +
    '<div class="fg"><div class="fl">Порядок</div><input type="number" class="field" id="catOrder" value="' + (c.sort_order || 0) + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveCat(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать категорию' : 'Новая категория', body);
}

async function saveCat(id) {
  var d = { name: document.getElementById('catName').value.trim(), icon: document.getElementById('catIcon').value.trim(), sort_order: parseInt(document.getElementById('catOrder').value) || 0 };
  if (!d.name) { showToast('Введите название', 'err'); return; }
  var r = id ? await sb.from('tool_categories').update(d).eq('id', id) : await sb.from('tool_categories').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Обновлена' : 'Создана', 'ok');
  closeModal(); loadToolCats();
}

async function delCat(id) {
  if (!confirm('Удалить категорию?')) return;
  await sb.from('tool_categories').delete().eq('id', id);
  showToast('Удалена', 'ok'); loadToolCats();
}

// ===== ПРОМОКОДЫ =====
async function loadPromos() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('promo_codes').select('*').order('created_at', { ascending: false });
  var data = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openPromoModal()">Создать промокод</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет промокодов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Код</th><th>Скидка</th><th>Исп./Макс</th><th>Применяется</th><th>Истекает</th><th>Активен</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(p) {
    var act = p.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td><b>' + esc(p.code) + '</b></td><td>' + (p.discount_percent || 0) + '%</td>' +
      '<td>' + (p.used_count || 0) + '/' + (p.max_uses || '∞') + '</td>' +
      '<td>' + esc(p.applies_to || '—') + '</td><td>' + fmtDate(p.expires_at) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="togPromo(\'' + p.id + '\',' + p.is_active + ')">' + (p.is_active ? 'Деактив.' : 'Актив.') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delPromo(\'' + p.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

function openPromoModal() {
  var body = '<div class="fg"><div class="fl">Код</div><input class="field" id="pmCode"></div>' +
    '<div class="fg"><div class="fl">Скидка %</div><input type="number" class="field" id="pmDisc" min="1" max="100"></div>' +
    '<div class="fg"><div class="fl">Макс. использований</div><input type="number" class="field" id="pmMax"></div>' +
    '<div class="fg"><div class="fl">Применяется к</div><input class="field" id="pmApplies" placeholder="tool / all"></div>' +
    '<div class="fg"><div class="fl">Истекает</div><input type="date" class="field" id="pmExp"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="savePromo()">Создать</button></div>';
  openModal('Новый промокод', body);
}

async function savePromo() {
  var d = {
    code: document.getElementById('pmCode').value.trim().toUpperCase(),
    discount_percent: parseInt(document.getElementById('pmDisc').value) || 0,
    max_uses: parseInt(document.getElementById('pmMax').value) || null,
    applies_to: document.getElementById('pmApplies').value.trim() || null,
    expires_at: document.getElementById('pmExp').value || null,
    is_active: true
  };
  if (!d.code || !d.discount_percent) { showToast('Заполните код и скидку', 'err'); return; }
  var r = await sb.from('promo_codes').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast('Промокод создан', 'ok'); closeModal(); loadPromos();
}

async function togPromo(id, cur) {
  await sb.from('promo_codes').update({ is_active: !cur }).eq('id', id);
  showToast(!cur ? 'Активирован' : 'Деактивирован', 'ok'); loadPromos();
}

async function delPromo(id) {
  if (!confirm('Удалить промокод?')) return;
  await sb.from('promo_codes').delete().eq('id', id);
  showToast('Удалён', 'ok'); loadPromos();
}

// ===== ПОКУПКИ =====
async function loadPurchases() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('purchases').select('*, profiles(name), tools(title)')
    .order('created_at', { ascending: false });
  var data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет покупок</div>'; return; }
  var sm = { completed: 'badge-green', pending: 'badge-gold', refunded: 'badge-red' };
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Покупатель</th><th>Инструмент</th><th>Сумма</th><th>Метод</th><th>Промокод</th><th>Статус</th><th>Дата</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(p) {
    var usr = p.profiles ? p.profiles.name : '—', tool = p.tools ? p.tools.title : '—';
    var badge = sm[p.status] || 'badge-purple';
    h += '<tr><td>' + esc(usr) + '</td><td>' + esc(tool) + '</td>' +
      '<td>' + (p.amount || 0) + ' ₽</td><td>' + esc(p.payment_method || '—') + '</td>' +
      '<td>' + esc(p.promo_code || '—') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(p.status || '—') + '</span></td>' +
      '<td>' + fmtDate(p.created_at) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
