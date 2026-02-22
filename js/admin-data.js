// ===== ADMIN DATA — загрузка и CRUD =====

var PER_PAGE = 20;


// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====

async function loadUsers(page, search, dna, plan) {
  try {
    var query = sb.from('users').select('*', { count: 'exact' });

    if (search) query = query.ilike('name', '%' + search + '%');
    if (dna) query = query.eq('dna_type', dna);
    if (plan) query = query.eq('plan', plan);

    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    var result = await query;
    if (result.error) throw result.error;
    return { data: result.data || [], count: result.count || 0 };
  } catch (err) {
    console.error('loadUsers error:', err);
    showToast('Ошибка загрузки пользователей', 'err');
    return { data: [], count: 0 };
  }
}


// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ =====

async function updateProfile(userId, fields) {
  try {
    var result = await sb.from('users').update(fields).eq('id', userId);
    if (result.error) {
      showToast(result.error.message, 'err');
    }
    return result;
  } catch (err) {
    console.error('updateProfile error:', err);
    showToast('Ошибка обновления профиля', 'err');
    return { error: err };
  }
}


// ===== КОРРЕКЦИЯ XP =====

async function logXpChange(userId, amount) {
  try {
    // Логируем изменение
    await sb.from('transactions').insert({
      user_id: userId,
      amount: amount,
      action_type: 'admin_adjust',
      type: 'xp_conversion',
      balance_after: 0,
      xp_after: 0
    });

    // Получаем текущий XP
    var p = await sb.from('users').select('xp_total').eq('id', userId).single();
    if (!p.data) return;

    var newXp = Math.max(0, (p.data.xp_total || 0) + amount);

    // Определяем уровень
    var level = 'pawn';
    if (newXp >= 15000) level = 'queen';
    else if (newXp >= 5000) level = 'rook';
    else if (newXp >= 2000) level = 'bishop';
    else if (newXp >= 500) level = 'knight';

    // Обновляем профиль
    await sb.from('users').update({ xp_total: newXp, level: level }).eq('id', userId);
  } catch (err) {
    console.error('logXpChange error:', err);
    showToast('Ошибка коррекции XP', 'err');
  }
}


// ===== КОНТЕНТ: ПОСТЫ =====
var _postsPage = 1;

async function loadPosts(page) {
  try {
    _postsPage = page || 1;
    var area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    var r = await sb.from('posts').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_postsPage - 1) * PER_PAGE, _postsPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    var data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет постов</div>'; return; }
    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Текст</th><th>Тип</th><th>Лайки</th><th>Коммент.</th><th>Просм.</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(p) {
      var author = p.users ? p.users.name : '—';
      var txt = (p.content || '').substring(0, 50);
      var vis = p.is_published !== false;
      h += '<tr><td>' + esc(author) + '</td><td>' + esc(txt) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(p.post_type || '—') + '</span></td>' +
        '<td>' + (p.likes_count || 0) + '</td><td>' + (p.comments_count || 0) + '</td>' +
        '<td>' + (p.views_count || 0) + '</td><td>' + fmtDate(p.created_at) + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="togglePublish(\'' + p.id + '\',' + vis + ')">' + (vis ? 'Скрыть' : 'Показать') + '</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deletePost(\'' + p.id + '\')">Удалить</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h + contentPagination(total, _postsPage, 'loadPosts');
  } catch (err) {
    console.error('loadPosts error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки постов</div>';
    showToast('Ошибка загрузки постов', 'err');
  }
}

async function togglePublish(id, cur) {
  try {
    var r = await sb.from('posts').update({ is_published: !cur }).eq('id', id);
    if (r.error) throw r.error;
    showToast(cur ? 'Пост скрыт' : 'Пост опубликован', 'ok');
    loadPosts(_postsPage);
  } catch (err) {
    console.error('togglePublish error:', err);
    showToast('Ошибка', 'err');
  }
}

async function deletePost(id) {
  try {
    if (!confirm('Удалить пост?')) return;
    var r = await sb.from('posts').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Пост удалён', 'ok');
    loadPosts(_postsPage);
  } catch (err) {
    console.error('deletePost error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ===== КОНТЕНТ: КОММЕНТАРИИ =====
var _commentsPage = 1;

async function loadComments(page) {
  try {
    _commentsPage = page || 1;
    var area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    var r = await sb.from('comments').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_commentsPage - 1) * PER_PAGE, _commentsPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    var data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет комментариев</div>'; return; }
    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Текст</th><th>Пост</th><th>Лайки</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(c) {
      var author = c.users ? c.users.name : '—';
      var txt = (c.content || '').substring(0, 80);
      var pid = c.post_id ? String(c.post_id).substring(0, 8) + '…' : '—';
      h += '<tr><td>' + esc(author) + '</td><td>' + esc(txt) + '</td>' +
        '<td><span class="badge badge-purple">' + pid + '</span></td>' +
        '<td>' + (c.likes_count || 0) + '</td><td>' + fmtDate(c.created_at) + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-danger btn-sm" onclick="deleteComment(\'' + c.id + '\')">Удалить</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h + contentPagination(total, _commentsPage, 'loadComments');
  } catch (err) {
    console.error('loadComments error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки комментариев', 'err');
  }
}

async function deleteComment(id) {
  try {
    if (!confirm('Удалить комментарий?')) return;
    var r = await sb.from('comments').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Комментарий удалён', 'ok');
    loadComments(_commentsPage);
  } catch (err) {
    console.error('deleteComment error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ===== КОНТЕНТ: КЕЙСЫ =====
var _casesPage = 1;

async function loadCases(page) {
  try {
    _casesPage = page || 1;
    var area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    var r = await sb.from('posts').select('*, users(name)', { count: 'exact' })
      .eq('post_type', 'case')
      .order('created_at', { ascending: false })
      .range((_casesPage - 1) * PER_PAGE, _casesPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    var data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет кейсов</div>'; return; }
    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Тип</th><th>Текст</th><th>Просм.</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(s) {
      var author = s.users ? s.users.name : '—';
      var txt = (s.content || '').substring(0, 50);
      h += '<tr><td>' + esc(author) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(s.post_type || '—') + '</span></td>' +
        '<td>' + esc(txt) + '</td><td>' + (s.views_count || 0) + '</td>' +
        '<td>' + fmtDate(s.created_at) + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-danger btn-sm" onclick="deleteCase(\'' + s.id + '\')">Удалить</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h + contentPagination(total, _casesPage, 'loadCases');
  } catch (err) {
    console.error('loadCases error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки кейсов', 'err');
  }
}

async function deleteCase(id) {
  try {
    if (!confirm('Удалить кейс?')) return;
    var r = await sb.from('posts').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Кейс удалён', 'ok');
    loadCases(_casesPage);
  } catch (err) {
    console.error('deleteCase error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ===== КОНТЕНТ: ЖАЛОБЫ =====
var _reportsFilter = '';

async function loadReports(statusFilter) {
  try {
    _reportsFilter = statusFilter || '';
    var area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    var q = sb.from('reports').select('*, users!reports_reporter_id_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(50);
    if (_reportsFilter) q = q.eq('status', _reportsFilter);
    var r = await q;
    if (r.error) {
      q = sb.from('reports').select('*, users(name)', { count: 'exact' })
        .order('created_at', { ascending: false }).limit(50);
      if (_reportsFilter) q = q.eq('status', _reportsFilter);
      r = await q;
    }
    var data = r.data || [];
    var fh = '<div class="toolbar"><select class="field field-select" onchange="loadReports(this.value)">' +
      '<option value="">Все статусы</option>' +
      '<option value="pending"' + (_reportsFilter === 'pending' ? ' selected' : '') + '>Pending</option>' +
      '<option value="resolved"' + (_reportsFilter === 'resolved' ? ' selected' : '') + '>Resolved</option>' +
      '<option value="dismissed"' + (_reportsFilter === 'dismissed' ? ' selected' : '') + '>Dismissed</option>' +
      '</select></div>';
    if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет жалоб</div>'; return; }
    var badgeMap = { pending: 'badge-gold', resolved: 'badge-green', dismissed: 'badge-red' };
    var h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>От кого</th><th>Тип цели</th><th>Причина</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(rep) {
      var reporter = rep.users ? rep.users.name : '—';
      var badge = badgeMap[rep.status] || 'badge-purple';
      var acts = rep.status === 'pending'
        ? '<button class="btn btn-success btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'resolved\')">Решить</button>' +
          '<button class="btn btn-danger btn-sm" onclick="resolveReport(\'' + rep.id + '\',\'dismissed\')">Отклонить</button>'
        : '';
      h += '<tr><td>' + esc(reporter) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(rep.target_type || '—') + '</span></td>' +
        '<td>' + esc(rep.reason || '—') + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(rep.status || '—') + '</span></td>' +
        '<td>' + fmtDate(rep.created_at) + '</td>' +
        '<td class="actions">' + acts + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadReports error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки жалоб</div>';
    showToast('Ошибка загрузки жалоб', 'err');
  }
}

async function resolveReport(id, action) {
  try {
    var r = await sb.from('reports').update({
      status: action, resolved_by: adminUser.id, resolved_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast(action === 'resolved' ? 'Жалоба решена' : 'Жалоба отклонена', 'ok');
    loadReports(_reportsFilter);
  } catch (err) {
    console.error('resolveReport error:', err);
    showToast('Ошибка', 'err');
  }
}


// ===== ПАГИНАЦИЯ КОНТЕНТА =====
function contentPagination(total, cur, fn) {
  var tp = Math.ceil(total / PER_PAGE);
  if (tp <= 1) return '<span class="page-info">' + total + ' всего</span>';
  var h = '<div class="pagination">';
  h += '<button' + (cur <= 1 ? ' disabled' : '') + ' onclick="' + fn + '(' + (cur - 1) + ')">&laquo;</button>';
  var s = Math.max(1, cur - 2), e = Math.min(tp, s + 4);
  s = Math.max(1, e - 4);
  for (var i = s; i <= e; i++) {
    h += '<button' + (i === cur ? ' class="active"' : '') + ' onclick="' + fn + '(' + i + ')">' + i + '</button>';
  }
  h += '<button' + (cur >= tp ? ' disabled' : '') + ' onclick="' + fn + '(' + (cur + 1) + ')">&raquo;</button>';
  h += '<span class="page-info">' + total + ' всего</span></div>';
  return h;
}
