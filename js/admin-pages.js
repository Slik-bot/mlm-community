// ===== ADMIN PAGES — Companies & Shop =====

// ===== КОМПАНИИ =====
let _compTab = 'companies';
function renderCompanies() {
  const tabs = 'companies:Компании,responses:Заявки,experts:Эксперты';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _compTab ? ' active' : '') + '" onclick="switchCompTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchCompTab(_compTab, document.querySelector('.tab.active'));
}
function switchCompTab(tab, btn) {
  _compTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ companies: loadCompanies, responses: loadResponses, experts: loadAdminExperts }[tab] || function(){})();
}

async function loadCompanies() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('companies').select('*').order('created_at', { ascending: false });
  const data = r.data || [];
  let h = '<div class="toolbar"><button class="btn btn-primary" onclick="openCompanyModal()">Добавить компанию</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет компаний</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Категория</th><th>Рейтинг</th><th>Участников</th><th>Страна</th><th>Лет</th><th>Верифиц.</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(c) {
    const ver = c.is_verified ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
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
  let c = {};
  if (id) { const r = await sb.from('companies').select('*').eq('id', id).single(); c = r.data || {}; }
  const body = '<div class="fg"><div class="fl">Название</div><input class="field" id="cmpName" value="' + esc(c.name || '') + '"></div>' +
    '<div class="fg"><div class="fl">Описание</div><textarea class="field" id="cmpDesc">' + esc(c.description || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Категория</div><input class="field" id="cmpCat" value="' + esc(c.category || '') + '"></div>' +
    '<div class="fg"><div class="fl">Страна</div><input class="field" id="cmpCountry" value="' + esc(c.country || '') + '"></div>' +
    '<div class="fg"><div class="fl">Лет на рынке</div><input type="number" class="field" id="cmpYears" value="' + (c.years || '') + '"></div>' +
    '<div class="fg"><div class="fl">URL логотипа</div><input class="field" id="cmpLogo" value="' + esc(c.logo_url || '') + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveCompany(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать компанию' : 'Новая компания', body);
}

async function saveCompany(id) {
  const d = {
    name: document.getElementById('cmpName').value.trim(),
    description: document.getElementById('cmpDesc').value.trim(),
    category: document.getElementById('cmpCat').value.trim(),
    country: document.getElementById('cmpCountry').value.trim(),
    years: parseInt(document.getElementById('cmpYears').value) || null,
    logo_url: document.getElementById('cmpLogo').value.trim() || null
  };
  if (!d.name) { showToast('Введите название', 'err'); return; }
  const r = id ? await sb.from('companies').update(d).eq('id', id) : await sb.from('companies').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Компания обновлена' : 'Компания создана', 'ok');
  closeModal(); loadCompanies();
}

async function verifyCompany(id, val) {
  const u = { is_verified: val };
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

// ===== ЗАЯВКИ (order_responses) =====
async function loadResponses() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('order_responses').select('*, users(name), orders(title)')
    .order('created_at', { ascending: false });
  const data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет заявок</div>'; return; }
  const sm = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-red' };
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>Компания</th><th>Сообщение</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(a) {
    const usr = a.users ? a.users.name : '—', cmp = a.orders ? a.orders.title : '—';
    const badge = sm[a.status] || 'badge-purple';
    const acts = a.status === 'pending'
      ? '<button class="btn btn-success btn-sm" onclick="handleApp(\'' + a.id + '\',\'approved\')">Принять</button>' +
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
  await sb.from('order_responses').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
  showToast(status === 'approved' ? 'Заявка принята' : 'Заявка отклонена', 'ok');
  loadResponses();
}

// ===== ЭКСПЕРТЫ (expert_cards) =====
async function loadAdminExperts() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('expert_cards').select('*, users(name, avatar_url, company_id), companies(name)')
    .order('created_at', { ascending: false });
  const data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет экспертов</div>'; return; }
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Пользователь</th><th>Компания</th><th>Специальность</th><th>Теги</th><th>Верифиц.</th><th>Дата</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(e) {
    const usr = e.users ? e.users.name : '—', cmp = e.companies ? e.companies.name : '—';
    const tags = (e.tags || []).join(', ') || '—';
    const isApproved = e.moderation_status === 'approved';
    const ver = isApproved ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td>' + esc(usr) + '</td><td>' + esc(cmp) + '</td>' +
      '<td>' + esc(e.specialty || '—') + '</td><td>' + esc(tags) + '</td>' +
      '<td>' + ver + '</td><td>' + fmtDate(e.created_at) + '</td>' +
      '<td class="actions"><button class="btn btn-' + (isApproved ? 'ghost' : 'success') + ' btn-sm" onclick="toggleExpertVer(\'' + e.id + '\',' + !isApproved + ')">' + (isApproved ? 'Снять' : 'Верифик.') + '</button></td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function toggleExpertVer(id, val) {
  await sb.from('expert_cards').update({ moderation_status: val ? 'approved' : 'rejected' }).eq('id', id);
  showToast(val ? 'Эксперт верифицирован' : 'Верификация снята', 'ok');
  loadAdminExperts();
}


// ===== МАГАЗИН =====
let _shopTab = 'tools';
function renderShop() {
  const tabs = 'tools:Инструменты,categories:Категории,promos:Промокоды,purchases:Покупки';
  let h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { const p = s.split(':'); h += '<button class="tab' + (p[0] === _shopTab ? ' active' : '') + '" onclick="switchShopTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
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
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  let r = await sb.from('products').select('*, tool_categories(name)').order('created_at', { ascending: false });
  if (r.error) r = await sb.from('products').select('*').order('created_at', { ascending: false });
  let data = r.data || [];
  if (data.length) {
    let ids = data.map(function(t) { return t.author_id; }).filter(Boolean);
    ids = ids.filter(function(v, i, a) { return a.indexOf(v) === i; });
    if (ids.length) {
      const pr = await sb.from('users').select('id, name').in('id', ids);
      const nm = {}; (pr.data || []).forEach(function(p) { nm[p.id] = p.name; });
      data.forEach(function(t) { t._author = nm[t.author_id] || '—'; });
    }
  }
  if (!data.length) { area.innerHTML = '<div class="empty">Нет инструментов</div>'; return; }
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Автор</th><th>Категория</th><th>Цена</th><th>Скач.</th><th>Рейтинг</th><th>Статус</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(t) {
    const cat = t.tool_categories ? t.tool_categories.name : '—';
    const price = t.is_free ? '<span class="badge badge-green">Free</span>' : (t.price || 0) + ' ₽';
    const st = t.is_active !== false ? '<span class="badge badge-green">Акт</span>' : '<span class="badge badge-red">Скрыт</span>';
    h += '<tr><td><b>' + esc(t.title) + '</b></td><td>' + esc(t._author || '—') + '</td>' +
      '<td>' + esc(cat) + '</td><td>' + price + '</td>' +
      '<td>' + (t.downloads_count || 0) + '</td><td>' + (t.rating || 0) + '</td><td>' + st + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="togToolActive(\'' + t.id + '\',' + (t.is_active !== false) + ')">' + (t.is_active !== false ? 'Скрыть' : 'Показать') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delTool(\'' + t.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function togToolActive(id, cur) {
  await sb.from('products').update({ is_active: !cur }).eq('id', id);
  showToast(cur ? 'Скрыт' : 'Показан', 'ok'); loadTools();
}
async function delTool(id) {
  if (!confirm('Удалить инструмент?')) return;
  await sb.from('products').delete().eq('id', id);
  showToast('Удалён', 'ok'); loadTools();
}

// ===== КАТЕГОРИИ =====
async function loadToolCats() {
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('tool_categories').select('*').order('sort_order', { ascending: true });
  const data = r.data || [];
  let h = '<div class="toolbar"><button class="btn btn-primary" onclick="openCatModal()">Добавить категорию</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет категорий</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Иконка</th><th>Название</th><th>Порядок</th><th>Активна</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(c) {
    const act = c.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
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
  let c = {};
  if (id) { const r = await sb.from('tool_categories').select('*').eq('id', id).single(); c = r.data || {}; }
  const body = '<div class="fg"><div class="fl">Название</div><input class="field" id="catName" value="' + esc(c.name || '') + '"></div>' +
    '<div class="fg"><div class="fl">Иконка</div><input class="field" id="catIcon" value="' + esc(c.icon || '') + '"></div>' +
    '<div class="fg"><div class="fl">Порядок</div><input type="number" class="field" id="catOrder" value="' + (c.sort_order || 0) + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveCat(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать категорию' : 'Новая категория', body);
}

async function saveCat(id) {
  const d = { name: document.getElementById('catName').value.trim(), icon: document.getElementById('catIcon').value.trim(), sort_order: parseInt(document.getElementById('catOrder').value) || 0 };
  if (!d.name) { showToast('Введите название', 'err'); return; }
  const r = id ? await sb.from('tool_categories').update(d).eq('id', id) : await sb.from('tool_categories').insert(d);
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
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('promo_codes').select('*').order('created_at', { ascending: false });
  const data = r.data || [];
  let h = '<div class="toolbar"><button class="btn btn-primary" onclick="openPromoModal()">Создать промокод</button></div>';
  if (!data.length) { area.innerHTML = h + '<div class="empty">Нет промокодов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Код</th><th>Скидка</th><th>Исп./Макс</th><th>Применяется</th><th>Истекает</th><th>Активен</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(p) {
    const act = p.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
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
  const body = '<div class="fg"><div class="fl">Код</div><input class="field" id="pmCode"></div>' +
    '<div class="fg"><div class="fl">Скидка %</div><input type="number" class="field" id="pmDisc" min="1" max="100"></div>' +
    '<div class="fg"><div class="fl">Макс. использований</div><input type="number" class="field" id="pmMax"></div>' +
    '<div class="fg"><div class="fl">Применяется к</div><input class="field" id="pmApplies" placeholder="tool / all"></div>' +
    '<div class="fg"><div class="fl">Истекает</div><input type="date" class="field" id="pmExp"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="savePromo()">Создать</button></div>';
  openModal('Новый промокод', body);
}

async function savePromo() {
  const d = {
    code: document.getElementById('pmCode').value.trim().toUpperCase(),
    discount_percent: parseInt(document.getElementById('pmDisc').value) || 0,
    max_uses: parseInt(document.getElementById('pmMax').value) || null,
    applies_to: document.getElementById('pmApplies').value.trim() || null,
    expires_at: document.getElementById('pmExp').value || null,
    is_active: true
  };
  if (!d.code || !d.discount_percent) { showToast('Заполните код и скидку', 'err'); return; }
  const r = await sb.from('promo_codes').insert(d);
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
  const area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  const r = await sb.from('purchases').select('*, users(name), products(title)')
    .order('created_at', { ascending: false });
  const data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет покупок</div>'; return; }
  const sm = { completed: 'badge-green', pending: 'badge-gold', refunded: 'badge-red' };
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Покупатель</th><th>Инструмент</th><th>Сумма</th><th>Метод</th><th>Промокод</th><th>Статус</th><th>Дата</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(p) {
    const usr = p.users ? p.users.name : '—', tool = p.products ? p.products.title : '—';
    const badge = sm[p.status] || 'badge-purple';
    h += '<tr><td>' + esc(usr) + '</td><td>' + esc(tool) + '</td>' +
      '<td>' + (p.amount || 0) + ' ₽</td><td>' + esc(p.payment_method || '—') + '</td>' +
      '<td>' + esc(p.promo_code || '—') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(p.status || '—') + '</span></td>' +
      '<td>' + fmtDate(p.created_at) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}
