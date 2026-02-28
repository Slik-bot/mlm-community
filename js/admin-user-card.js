// ═══════════════════════════════════════
// ADMIN USER CARD — Карточка пользователя (A3)
// 8 вкладок + система Strikes
// ═══════════════════════════════════════

let _cardUser = null;
let _cardTab = 'profile';

// ===== ОТКРЫТИЕ КАРТОЧКИ =====
async function openUserCard(userId) {
  try {
    let user = _usersCache
      ? _usersCache.find(function(u) { return u.id === userId; })
      : null;
    if (!user) {
      const r = await sb.from('users').select('*').eq('id', userId).single();
      if (r.error) throw r.error;
      user = r.data;
    }
    _cardUser = user;
    _cardTab = 'profile';
    renderCardModal(user);
  } catch (err) {
    console.error('openUserCard error:', err);
    showToast('Ошибка загрузки пользователя', 'err');
  }
}

// ===== РЕНДЕР МОДАЛКИ =====
function renderCardModal(u) {
  const dna = u.dna_type
    ? '<span class="badge badge-' + (DC[u.dna_type] || 'purple') + '">' + (DN[u.dna_type] || u.dna_type) + '</span>'
    : '';
  const avatar = u.avatar_url
    ? '<img class="avatar-sm" src="' + esc(u.avatar_url) + '">'
    : '<div class="avatar-sm avatar-placeholder">&#128100;</div>';
  const verif = u.is_verified
    ? '<span class="badge badge-green">Верифицирован</span>'
    : '<span class="badge badge-gold">Не верифицирован</span>';

  let h = '<div class="user-card-header">' + avatar +
    '<div><b>' + esc(u.name || '—') + '</b>' +
    (u.telegram_id ? ' <span class="user-card-dates">@' + esc(u.telegram_id) + '</span>' : '') +
    '<div class="user-card-meta">' + dna +
    '<span class="badge badge-purple">' + (LN[u.level] || '—') + '</span>' +
    '<span class="badge badge-blue">' + (u.tariff || 'free').toUpperCase() + '</span>' + verif +
    '</div></div></div>' +
    '<div class="user-card-dates">Рег: ' + fmtDate(u.created_at) +
    ' | Вход: ' + fmtDate(u.last_active_at) + '</div>';

  const TABS = [['profile', 'Профиль'], ['finance', 'Финансы'], ['tasks', 'Задания'], ['deals', 'Сделки'],
    ['referrals', 'Рефералы'], ['moderation', 'Модерация'], ['socials', 'Соцсети'], ['log', 'Лог']];
  h += '<div class="tabs tabs-card">';
  TABS.forEach(function(t) {
    h += '<button class="tab card-tab' + (t[0] === 'profile' ? ' active' : '') +
      '" onclick="switchCardTab(\'' + t[0] + '\',this)">' + t[1] + '</button>';
  });
  h += '</div><div id="cardTabContent">Загрузка...</div>';

  openModal(u.name || u.email || 'Пользователь', h);
  switchCardTab('profile', document.querySelector('.card-tab.active'));
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
function switchCardTab(tab, btn) {
  _cardTab = tab;
  document.querySelectorAll('.card-tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  const fn = {
    profile: renderTabProfile, finance: renderTabFinance, tasks: renderTabTasks,
    deals: renderTabDeals, referrals: renderTabReferrals, moderation: renderTabModeration,
    socials: renderTabSocials, log: renderTabLog
  }[tab];
  if (fn) fn();
}

// ===== ХЕЛПЕР ТАБЛИЦЫ =====
function buildCardTable(headers, rows) {
  if (!rows.length) return '<div class="empty">Нет данных</div>';
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>';
  headers.forEach(function(th) { h += '<th>' + th + '</th>'; });
  h += '</tr></thead><tbody>';
  rows.forEach(function(row) {
    h += '<tr>';
    row.forEach(function(td) { h += '<td>' + td + '</td>'; });
    h += '</tr>';
  });
  return h + '</tbody></table></div>';
}

// ===== ВКЛАДКА: ПРОФИЛЬ =====
function renderTabProfile() {
  const u = _cardUser;
  if (!u) return;
  const el = document.getElementById('cardTabContent');
  const fields = [
    ['Email', esc(u.email || '—')], ['Telegram', esc(u.telegram_id || '—')],
    ['ДНК-тип', DN[u.dna_type] || '—'], ['Уровень', LN[u.level] || '—'],
    ['XP', String(u.xp_total || 0)], ['Стрик', (u.streak_days || 0) + ' дн.'],
    ['Баланс', String(u.balance || 0) + ' коп.'], ['Тариф', (u.tariff || 'free').toUpperCase()],
    ['Верификация', u.is_verified ? 'Да' : 'Нет'], ['Регистрация', fmtDate(u.created_at)]
  ];
  let h = '';
  fields.forEach(function(f) {
    h += '<div class="info-row"><div class="info-label">' + f[0] + '</div><div>' + f[1] + '</div></div>';
  });
  h += '<div class="modal-actions">' +
    '<button class="btn ' + (u.is_banned ? 'btn-success' : 'btn-danger') + ' btn-sm" ' +
      'onclick="toggleBan(\'' + u.id + '\',' + !u.is_banned + ')">' +
      (u.is_banned ? 'Разбанить' : 'Забанить') + '</button>' +
    '<button class="btn ' + (u.is_verified ? 'btn-ghost' : 'btn-success') + ' btn-sm" ' +
      'onclick="toggleVerify(\'' + u.id + '\',' + !u.is_verified + ')">' +
      (u.is_verified ? 'Снять верификацию' : 'Верифицировать') + '</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="openStrikeModal(\'' + u.id + '\')">Strike</button>' +
    '</div>' +
    '<div class="fl">Коррекция XP</div>' +
      '<div class="xp-adjust">' +
        '<input type="number" class="field" id="xpAmount" placeholder="±XP">' +
        '<button class="btn btn-primary btn-sm" onclick="doAdjustXp(\'' + u.id + '\')">Применить</button>' +
      '</div>';
  el.innerHTML = h;
}

// ===== ВКЛАДКА: ФИНАНСЫ =====
async function renderTabFinance() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('transactions').select('*').eq('user_id', _cardUser.id)
      .order('created_at', { ascending: false }).limit(50);
    if (r.error) throw r.error;
    const data = r.data || [];
    const info = '<div style="margin-bottom:8px"><b>Баланс:</b> ' + (_cardUser.balance || 0) +
      ' коп. | <b>XP:</b> ' + (_cardUser.xp_total || 0) + '</div>';
    const rows = data.map(function(t) {
      return [fmtDate(t.created_at), esc(t.type || '—'), String(t.amount || 0), esc(t.description || '—')];
    });
    el.innerHTML = info + buildCardTable(['Дата', 'Тип', 'Сумма', 'Описание'], rows);
  } catch (err) {
    console.error('renderTabFinance error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: ЗАДАНИЯ =====
async function renderTabTasks() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('task_completions').select('*, tasks(title)')
      .eq('user_id', _cardUser.id).order('completed_at', { ascending: false }).limit(50);
    if (r.error) throw r.error;
    const data = r.data || [];
    const rows = data.map(function(t) {
      return [esc(t.tasks ? t.tasks.title : '—'), esc(t.status || '—'), fmtDate(t.completed_at), String(t.xp_earned || 0)];
    });
    el.innerHTML = buildCardTable(['Задание', 'Статус', 'Дата', 'XP'], rows);
  } catch (err) {
    console.error('renderTabTasks error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: СДЕЛКИ =====
async function renderTabDeals() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const id = _cardUser.id;
    const r = await sb.from('deals').select('*')
      .or('client_id.eq.' + id + ',executor_id.eq.' + id)
      .order('created_at', { ascending: false }).limit(30);
    if (r.error) throw r.error;
    const rows = (r.data || []).map(function(d) {
      const role = d.client_id === id ? 'Клиент' : 'Исполнитель';
      return [esc(d.title || '—'), role, String(d.amount || 0), esc(d.status || '—'), fmtDate(d.created_at)];
    });
    el.innerHTML = buildCardTable(['Сделка', 'Роль', 'Сумма', 'Статус', 'Дата'], rows);
  } catch (err) {
    console.error('renderTabDeals error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: РЕФЕРАЛЫ =====
async function renderTabReferrals() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('referrals').select('*')
      .eq('referrer_id', _cardUser.id).order('created_at', { ascending: false });
    if (r.error) throw r.error;
    const data = r.data || [];
    const info = '<div style="margin-bottom:8px"><b>Реф. код:</b> ' +
      esc(_cardUser.referral_code || '—') + '</div>';
    const rows = data.map(function(ref) {
      const refId = ref.referred_id ? String(ref.referred_id).substring(0, 8) + '…' : '—';
      return [refId, fmtDate(ref.created_at), esc(ref.status || '—'), String(ref.bonus_xp || 0)];
    });
    el.innerHTML = info + buildCardTable(['Приглашённый', 'Дата', 'Статус', 'XP бонус'], rows);
  } catch (err) {
    console.error('renderTabReferrals error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: МОДЕРАЦИЯ =====
async function renderTabModeration() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const id = _cardUser.id;
    const [stk, repOn, repBy] = await Promise.all([
      sb.from('strikes').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('reports').select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(20),
      sb.from('reports').select('*').eq('reporter_id', id).order('created_at', { ascending: false }).limit(20)
    ]);
    const sRows = (stk.data || []).map(function(s) {
      return [esc(s.type || '—'), esc(s.reason || '—'), fmtDate(s.created_at), fmtDate(s.expires_at)];
    });
    const onRows = (repOn.data || []).map(function(r) {
      return [esc(r.target_type || '—'), esc(r.reason_category || '—'), esc(r.status || '—'), fmtDate(r.created_at)];
    });
    const byRows = (repBy.data || []).map(function(r) {
      return [esc(r.target_type || '—'), esc(r.reason_category || '—'), esc(r.status || '—'), fmtDate(r.created_at)];
    });
    el.innerHTML = '<div class="section-title">Strikes</div>' +
      buildCardTable(['Тип', 'Причина', 'Дата', 'Истекает'], sRows) +
      '<div class="section-title" style="margin-top:12px">Жалобы НА пользователя</div>' +
      buildCardTable(['Тип', 'Причина', 'Статус', 'Дата'], onRows) +
      '<div class="section-title" style="margin-top:12px">Жалобы ОТ пользователя</div>' +
      buildCardTable(['Тип', 'Причина', 'Статус', 'Дата'], byRows);
  } catch (err) {
    console.error('renderTabModeration error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: СОЦСЕТИ =====
async function renderTabSocials() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('social_links').select('*').eq('user_id', _cardUser.id);
    if (r.error) throw r.error;
    const rows = (r.data || []).map(function(s) {
      return [esc(s.platform || '—'), esc(s.url || '—'), s.is_verified ? 'Да' : 'Нет'];
    });
    el.innerHTML = buildCardTable(['Платформа', 'Ссылка', 'Подтверждено'], rows);
  } catch (err) {
    console.error('renderTabSocials error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ВКЛАДКА: ЛОГ =====
async function renderTabLog() {
  const el = document.getElementById('cardTabContent');
  el.innerHTML = 'Загрузка...';
  try {
    const r = await sb.from('admin_audit_log').select('*').eq('target_id', _cardUser.id)
      .order('created_at', { ascending: false }).limit(100);
    if (r.error) throw r.error;
    const rows = (r.data || []).map(function(l) {
      const adminId = l.admin_id ? String(l.admin_id).substring(0, 8) + '…' : '—';
      return [fmtDate(l.created_at), esc(l.action || '—'), adminId, esc(l.details || '—')];
    });
    el.innerHTML = buildCardTable(['Дата', 'Действие', 'Админ', 'Детали'], rows);
  } catch (err) {
    console.error('renderTabLog error:', err);
    el.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== STRIKE МОДАЛКА =====
function openStrikeModal(userId) {
  const h = '<div class="strike-form">' +
    '<label class="fl">Тип</label>' +
    '<select class="field" id="strikeType">' +
      '<option value="warning">Предупреждение</option>' +
      '<option value="restrict_24h">Ограничение 24ч</option>' +
      '<option value="restrict_7d">Ограничение 7д</option>' +
      '<option value="ban">Перманентный бан</option>' +
    '</select>' +
    '<label class="fl">Причина (обязательно)</label>' +
    '<textarea class="field" id="strikeReason" rows="3" placeholder="Причина страйка"></textarea>' +
    '<label class="fl">URL доказательства</label>' +
    '<input type="url" class="field" id="strikeEvidence" placeholder="https://...">' +
    '<button class="btn btn-danger" onclick="submitStrike(\'' + userId + '\')">Выдать Strike</button>' +
    '</div>';
  openModal('Strike', h);
}

function calculateExpiry(type) {
  if (type === 'restrict_24h') return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  if (type === 'restrict_7d') return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  return null;
}

async function submitStrike(userId) {
  try {
    const type = document.getElementById('strikeType').value;
    const reason = document.getElementById('strikeReason').value.trim();
    const evidence = document.getElementById('strikeEvidence').value.trim();
    if (!reason) { showToast('Укажите причину', 'err'); return; }
    const r = await sb.from('strikes').insert({
      user_id: userId, type: type, reason: reason,
      evidence_url: evidence || null,
      issued_by: adminProfile ? adminProfile.id : null,
      expires_at: calculateExpiry(type)
    });
    if (r.error) throw r.error;
    if (type === 'ban') await updateProfile(userId, { is_banned: true });
    await logAdminAction('strike_' + type, 'user', userId, { reason: reason });
    showToast('Strike выдан', 'ok');
    closeModal();
    if (_cardUser && _cardUser.id === userId) openUserCard(userId);
  } catch (err) {
    console.error('submitStrike error:', err);
    showToast('Ошибка выдачи Strike', 'err');
  }
}

// ═══════════════════════════════════════
// ЭКСПОРТЫ
// ═══════════════════════════════════════
window.openUserCard = openUserCard;
window.switchCardTab = switchCardTab;
window.openStrikeModal = openStrikeModal;
window.submitStrike = submitStrike;
