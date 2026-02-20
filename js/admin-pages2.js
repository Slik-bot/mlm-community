// ===== ADMIN PAGES 2 — Gamification =====

var _gamTab = 'quests';
var _questsCache = [], _achCache = [], _seasonsCache = [];

function renderGamification() {
  var tabs = 'quests:Квесты,achievements:Достижения,leaderboard:Лидерборд,seasons:Сезоны', h = '<div class="tabs">';
  tabs.split(',').forEach(function(s) { var p = s.split(':'); h += '<button class="tab' + (p[0] === _gamTab ? ' active' : '') + '" onclick="switchGamTab(\'' + p[0] + '\',this)">' + p[1] + '</button>'; });
  h += '</div><div id="contentArea"></div>';
  document.getElementById('pageContent').innerHTML = h;
  switchGamTab(_gamTab, document.querySelector('.tab.active'));
}
function switchGamTab(tab, btn) {
  _gamTab = tab;
  document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ({ quests: loadQuests, achievements: loadAchievements, leaderboard: loadLeaderboard, seasons: loadSeasons }[tab] || function(){})();
}

// ===== КВЕСТЫ =====
async function loadQuests() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('quest_templates').select('*').order('created_at', { ascending: false });
  _questsCache = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openQuestModal()">Создать квест</button></div>';
  if (!_questsCache.length) { area.innerHTML = h + '<div class="empty">Нет квестов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Описание</th><th>XP</th><th>ДНК</th><th>Действие</th><th>Кол-во</th><th>Активен</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  _questsCache.forEach(function(q) {
    var dna = q.dna_type ? '<span class="badge badge-' + (DC[q.dna_type] || 'purple') + '">' + (DN[q.dna_type] || q.dna_type) + '</span>' : '—';
    var act = q.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td><b>' + esc(q.title) + '</b></td><td>' + esc((q.description || '').substring(0, 40)) + '</td>' +
      '<td>' + (q.xp_reward || 0) + '</td><td>' + dna + '</td>' +
      '<td>' + esc(q.action_type || '—') + '</td><td>' + (q.action_count || 0) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openQuestModal(\'' + q.id + '\')">Ред.</button>' +
        '<button class="btn btn-' + (q.is_active ? 'ghost' : 'success') + ' btn-sm" onclick="togQuest(\'' + q.id + '\',' + q.is_active + ')">' + (q.is_active ? 'Деактив.' : 'Актив.') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delQuest(\'' + q.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function openQuestModal(id) {
  var q = {};
  if (id) { var r = await sb.from('quest_templates').select('*').eq('id', id).single(); q = r.data || {}; }
  var dnaOpts = '<option value="">Все</option><option value="strategist"' + (q.dna_type === 'strategist' ? ' selected' : '') + '>Стратег</option>' +
    '<option value="mentor"' + (q.dna_type === 'mentor' ? ' selected' : '') + '>Ментор</option>' +
    '<option value="communicator"' + (q.dna_type === 'communicator' ? ' selected' : '') + '>Коммуникатор</option>' +
    '<option value="analyst"' + (q.dna_type === 'analyst' ? ' selected' : '') + '>Аналитик</option>';
  var actOpts = '<option value="post"' + (q.action_type === 'post' ? ' selected' : '') + '>post</option>' +
    '<option value="like"' + (q.action_type === 'like' ? ' selected' : '') + '>like</option>' +
    '<option value="comment"' + (q.action_type === 'comment' ? ' selected' : '') + '>comment</option>' +
    '<option value="friend"' + (q.action_type === 'friend' ? ' selected' : '') + '>friend</option>' +
    '<option value="share"' + (q.action_type === 'share' ? ' selected' : '') + '>share</option>';
  var body = '<div class="fg"><div class="fl">Название</div><input class="field" id="qTitle" value="' + esc(q.title || '') + '"></div>' +
    '<div class="fg"><div class="fl">Описание</div><textarea class="field" id="qDesc">' + esc(q.description || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">XP награда</div><input type="number" class="field" id="qXp" value="' + (q.xp_reward || '') + '"></div>' +
    '<div class="fg"><div class="fl">ДНК-тип</div><select class="field" id="qDna">' + dnaOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Тип действия</div><select class="field" id="qAction">' + actOpts + '</select></div>' +
    '<div class="fg"><div class="fl">Кол-во действий</div><input type="number" class="field" id="qCount" value="' + (q.action_count || '') + '"></div>' +
    '<div class="fg"><div class="fl">Активен</div><select class="field" id="qActive"><option value="true"' + (q.is_active !== false ? ' selected' : '') + '>Да</option><option value="false"' + (q.is_active === false ? ' selected' : '') + '>Нет</option></select></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveQuest(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать квест' : 'Новый квест', body);
}

async function saveQuest(id) {
  var d = {
    title: document.getElementById('qTitle').value.trim(),
    description: document.getElementById('qDesc').value.trim(),
    xp_reward: parseInt(document.getElementById('qXp').value) || 0,
    dna_type: document.getElementById('qDna').value || null,
    action_type: document.getElementById('qAction').value,
    action_count: parseInt(document.getElementById('qCount').value) || 1,
    is_active: document.getElementById('qActive').value === 'true'
  };
  if (!d.title) { showToast('Введите название', 'err'); return; }
  var r = id ? await sb.from('quest_templates').update(d).eq('id', id) : await sb.from('quest_templates').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Квест обновлён' : 'Квест создан', 'ok');
  closeModal(); loadQuests();
}

async function togQuest(id, cur) {
  await sb.from('quest_templates').update({ is_active: !cur }).eq('id', id);
  showToast(!cur ? 'Активирован' : 'Деактивирован', 'ok'); loadQuests();
}
async function delQuest(id) {
  if (!confirm('Удалить квест?')) return;
  await sb.from('quest_templates').delete().eq('id', id);
  showToast('Квест удалён', 'ok'); loadQuests();
}

// ===== ДОСТИЖЕНИЯ =====
async function loadAchievements() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('achievements_catalog').select('*').order('created_at', { ascending: false });
  _achCache = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openAchModal()">Создать достижение</button></div>';
  if (!_achCache.length) { area.innerHTML = h + '<div class="empty">Нет достижений</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Иконка</th><th>Название</th><th>Описание</th><th>Категория</th><th>XP</th><th>Условие</th><th>Значение</th><th>Активно</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  _achCache.forEach(function(a) {
    var act = a.is_active !== false ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td style="font-size:20px">' + esc(a.icon || '—') + '</td><td><b>' + esc(a.title) + '</b></td>' +
      '<td>' + esc((a.description || '').substring(0, 40)) + '</td>' +
      '<td><span class="badge badge-purple">' + esc(a.category || '—') + '</span></td>' +
      '<td>' + (a.xp_reward || 0) + '</td><td>' + esc(a.condition_type || '—') + '</td>' +
      '<td>' + (a.condition_value || 0) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openAchModal(\'' + a.id + '\')">Ред.</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delAch(\'' + a.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function openAchModal(id) {
  var a = {};
  if (id) { var r = await sb.from('achievements_catalog').select('*').eq('id', id).single(); a = r.data || {}; }
  var catOpts = '<option value="social"' + (a.category === 'social' ? ' selected' : '') + '>social</option>' +
    '<option value="content"' + (a.category === 'content' ? ' selected' : '') + '>content</option>' +
    '<option value="trading"' + (a.category === 'trading' ? ' selected' : '') + '>trading</option>' +
    '<option value="special"' + (a.category === 'special' ? ' selected' : '') + '>special</option>';
  var body = '<div class="fg"><div class="fl">Ключ</div><input class="field" id="achKey" value="' + esc(a.key || '') + '"></div>' +
    '<div class="fg"><div class="fl">Название</div><input class="field" id="achTitle" value="' + esc(a.title || '') + '"></div>' +
    '<div class="fg"><div class="fl">Описание</div><textarea class="field" id="achDesc">' + esc(a.description || '') + '</textarea></div>' +
    '<div class="fg"><div class="fl">Иконка (emoji)</div><input class="field" id="achIcon" value="' + esc(a.icon || '') + '"></div>' +
    '<div class="fg"><div class="fl">Категория</div><select class="field" id="achCat">' + catOpts + '</select></div>' +
    '<div class="fg"><div class="fl">XP награда</div><input type="number" class="field" id="achXp" value="' + (a.xp_reward || '') + '"></div>' +
    '<div class="fg"><div class="fl">Тип условия</div><input class="field" id="achCondType" value="' + esc(a.condition_type || '') + '"></div>' +
    '<div class="fg"><div class="fl">Значение условия</div><input type="number" class="field" id="achCondVal" value="' + (a.condition_value || '') + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveAch(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать достижение' : 'Новое достижение', body);
}

async function saveAch(id) {
  var d = {
    key: document.getElementById('achKey').value.trim(),
    title: document.getElementById('achTitle').value.trim(),
    description: document.getElementById('achDesc').value.trim(),
    icon: document.getElementById('achIcon').value.trim() || null,
    category: document.getElementById('achCat').value,
    xp_reward: parseInt(document.getElementById('achXp').value) || 0,
    condition_type: document.getElementById('achCondType').value.trim() || null,
    condition_value: parseInt(document.getElementById('achCondVal').value) || null
  };
  if (!d.key || !d.title) { showToast('Введите ключ и название', 'err'); return; }
  var r = id ? await sb.from('achievements_catalog').update(d).eq('id', id) : await sb.from('achievements_catalog').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Достижение обновлено' : 'Достижение создано', 'ok');
  closeModal(); loadAchievements();
}

async function delAch(id) {
  if (!confirm('Удалить достижение?')) return;
  await sb.from('achievements_catalog').delete().eq('id', id);
  showToast('Достижение удалено', 'ok'); loadAchievements();
}

// ===== ЛИДЕРБОРД =====
async function loadLeaderboard() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('profiles').select('id, name, level, xp, streak')
    .order('xp', { ascending: false }).limit(20);
  var data = r.data || [];
  if (!data.length) { area.innerHTML = '<div class="empty">Нет данных</div>'; return; }
  var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>#</th><th>Имя</th><th>Уровень</th><th>XP</th><th>Стрик</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(u, i) {
    var medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    h += '<tr><td><b>' + medal + (i + 1) + '</b></td>' +
      '<td>' + esc(u.name || '—') + '</td>' +
      '<td>' + (LN[u.level] || '—') + '</td>' +
      '<td><b>' + (u.xp || 0) + '</b></td>' +
      '<td>' + (u.streak || 0) + ' дн.</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

// ===== СЕЗОНЫ =====
async function loadSeasons() {
  var area = document.getElementById('contentArea');
  area.innerHTML = 'Загрузка...';
  var r = await sb.from('seasons').select('*').order('created_at', { ascending: false });
  _seasonsCache = r.data || [];
  var h = '<div class="toolbar"><button class="btn btn-primary" onclick="openSeasonModal()">Создать сезон</button></div>';
  if (!_seasonsCache.length) { area.innerHTML = h + '<div class="empty">Нет сезонов</div>'; return; }
  h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>Название</th><th>Тема</th><th>Бейдж</th><th>Начало</th><th>Конец</th><th>Активен</th><th>Действия</th>' +
    '</tr></thead><tbody>';
  _seasonsCache.forEach(function(s) {
    var act = s.is_active ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-red">Нет</span>';
    h += '<tr><td><b>' + esc(s.title) + '</b></td><td>' + esc(s.theme || '—') + '</td>' +
      '<td style="font-size:20px">' + esc(s.badge_icon || '—') + '</td>' +
      '<td>' + fmtDate(s.starts_at) + '</td><td>' + fmtDate(s.ends_at) + '</td><td>' + act + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="openSeasonModal(\'' + s.id + '\')">Ред.</button>' +
        '<button class="btn btn-' + (s.is_active ? 'ghost' : 'success') + ' btn-sm" onclick="togSeason(\'' + s.id + '\',' + s.is_active + ')">' + (s.is_active ? 'Деактив.' : 'Актив.') + '</button>' +
        '<button class="btn btn-danger btn-sm" onclick="delSeason(\'' + s.id + '\')">Удалить</button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  area.innerHTML = h;
}

async function openSeasonModal(id) {
  var s = {};
  if (id) { var r = await sb.from('seasons').select('*').eq('id', id).single(); s = r.data || {}; }
  var startVal = s.starts_at ? s.starts_at.substring(0, 10) : '';
  var endVal = s.ends_at ? s.ends_at.substring(0, 10) : '';
  var body = '<div class="fg"><div class="fl">Название</div><input class="field" id="seaTitle" value="' + esc(s.title || '') + '"></div>' +
    '<div class="fg"><div class="fl">Тема</div><input class="field" id="seaTheme" value="' + esc(s.theme || '') + '"></div>' +
    '<div class="fg"><div class="fl">Бейдж (emoji)</div><input class="field" id="seaBadge" value="' + esc(s.badge_icon || '') + '"></div>' +
    '<div class="fg"><div class="fl">Начало</div><input type="date" class="field" id="seaStart" value="' + startVal + '"></div>' +
    '<div class="fg"><div class="fl">Конец</div><input type="date" class="field" id="seaEnd" value="' + endVal + '"></div>' +
    '<div class="fg"><div class="fl">Активен</div><select class="field" id="seaActive"><option value="true"' + (s.is_active ? ' selected' : '') + '>Да</option><option value="false"' + (!s.is_active ? ' selected' : '') + '>Нет</option></select></div>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="saveSeason(\'' + (id || '') + '\')">Сохранить</button></div>';
  openModal(id ? 'Редактировать сезон' : 'Новый сезон', body);
}

async function saveSeason(id) {
  var d = {
    title: document.getElementById('seaTitle').value.trim(),
    theme: document.getElementById('seaTheme').value.trim() || null,
    badge_icon: document.getElementById('seaBadge').value.trim() || null,
    starts_at: document.getElementById('seaStart').value || null,
    ends_at: document.getElementById('seaEnd').value || null,
    is_active: document.getElementById('seaActive').value === 'true'
  };
  if (!d.title) { showToast('Введите название', 'err'); return; }
  var r = id ? await sb.from('seasons').update(d).eq('id', id) : await sb.from('seasons').insert(d);
  if (r.error) { showToast(r.error.message, 'err'); return; }
  showToast(id ? 'Сезон обновлён' : 'Сезон создан', 'ok');
  closeModal(); loadSeasons();
}

async function togSeason(id, cur) {
  await sb.from('seasons').update({ is_active: !cur }).eq('id', id);
  showToast(!cur ? 'Активирован' : 'Деактивирован', 'ok'); loadSeasons();
}
async function delSeason(id) {
  if (!confirm('Удалить сезон?')) return;
  await sb.from('seasons').delete().eq('id', id);
  showToast('Сезон удалён', 'ok'); loadSeasons();
}
