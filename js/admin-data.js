// ===== ADMIN DATA — загрузка и CRUD =====

const PER_PAGE = 20;


// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====

async function loadUsers(page, search, dna, plan) {
  try {
    const result = await sb.rpc('admin_get_users', {
      tariff_filter: plan || null,
      search_filter: search || null,
      dna_filter: dna || null,
      page_num: page || 1,
      page_size: PER_PAGE
    });
    if (result.error) throw result.error;
    const rows = result.data || [];
    const count = rows.length > 0 ? rows[0].total_count : 0;
    return { data: rows, count: count };
  } catch (err) {
    console.error('loadUsers error:', err);
    showToast('Ошибка загрузки пользователей', 'err');
    return { data: [], count: 0 };
  }
}


// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ =====

async function updateProfile(userId, fields) {
  try {
    const result = await sb.from('users').update(fields).eq('id', userId);
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
      xp_amount: amount,
      type: 'deposit',
      balance_after: 0,
      xp_after: 0,
      description: 'admin_adjust'
    });

    // Получаем текущий XP
    const p = await sb.from('vw_public_profiles').select('xp_total').eq('id', userId).single();
    if (!p.data) return;

    const newXp = Math.max(0, (p.data.xp_total || 0) + amount);

    const gLevel = window.Gamification.getUserLevel(newXp);

    // Обновляем профиль
    await sb.from('users').update({ xp_total: newXp, level: gLevel.level }).eq('id', userId);
  } catch (err) {
    console.error('logXpChange error:', err);
    showToast('Ошибка коррекции XP', 'err');
  }
}


// ===== КОНТЕНТ: ПОСТЫ =====
let _postsPage = 1;

async function loadPosts(page) {
  try {
    _postsPage = page || 1;
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    const r = await sb.from('posts').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_postsPage - 1) * PER_PAGE, _postsPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    const data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет постов</div>'; return; }
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Текст</th><th>Тип</th><th>Лайки</th><th>Коммент.</th><th>Просм.</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(p) {
      const author = p.users ? p.users.name : '—';
      const txt = (p.content || '').substring(0, 50);
      const vis = p.is_published !== false;
      h += '<tr><td>' + esc(author) + '</td><td>' + esc(txt) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(p.type || '—') + '</span></td>' +
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
    const r = await sb.from('posts').update({ is_published: !cur }).eq('id', id);
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
    const r = await sb.from('posts').delete().eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('delete_post', 'post', id);
    showToast('Пост удалён', 'ok');
    loadPosts(_postsPage);
  } catch (err) {
    console.error('deletePost error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ===== КОНТЕНТ: КОММЕНТАРИИ =====
let _commentsPage = 1;

async function loadComments(page) {
  try {
    _commentsPage = page || 1;
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    const r = await sb.from('comments').select('*, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((_commentsPage - 1) * PER_PAGE, _commentsPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    const data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет комментариев</div>'; return; }
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Текст</th><th>Пост</th><th>Лайки</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(c) {
      const author = c.users ? c.users.name : '—';
      const txt = (c.content || '').substring(0, 80);
      const pid = c.post_id ? String(c.post_id).substring(0, 8) + '…' : '—';
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
    const r = await sb.from('comments').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Комментарий удалён', 'ok');
    loadComments(_commentsPage);
  } catch (err) {
    console.error('deleteComment error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ===== КОНТЕНТ: КЕЙСЫ =====
let _casesPage = 1;

async function loadCases(page) {
  try {
    _casesPage = page || 1;
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    const r = await sb.from('posts').select('*, users(name)', { count: 'exact' })
      .eq('type', 'case')
      .order('created_at', { ascending: false })
      .range((_casesPage - 1) * PER_PAGE, _casesPage * PER_PAGE - 1);
    if (r.error) throw r.error;
    const data = r.data || [], total = r.count || 0;
    if (!data.length) { area.innerHTML = '<div class="empty">Нет кейсов</div>'; return; }
    let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Автор</th><th>Тип</th><th>Текст</th><th>Просм.</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(s) {
      const author = s.users ? s.users.name : '—';
      const txt = (s.content || '').substring(0, 50);
      h += '<tr><td>' + esc(author) + '</td>' +
        '<td><span class="badge badge-blue">' + esc(s.type || '—') + '</span></td>' +
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
    const r = await sb.from('posts').delete().eq('id', id);
    if (r.error) throw r.error;
    showToast('Кейс удалён', 'ok');
    loadCases(_casesPage);
  } catch (err) {
    console.error('deleteCase error:', err);
    showToast('Ошибка удаления', 'err');
  }
}


// ═══════════════════════════════════════
// МОДЕРАЦИЯ — см. admin-moderation.js
// ═══════════════════════════════════════


// ===== AUDIT LOG =====

async function logAdminAction(action, targetType, targetId, details) {
  try {
    const adminId = adminProfile ? adminProfile.id : null;
    if (!adminId) return;
    await sb.from('admin_audit_log').insert({
      admin_id: adminId,
      action: action,
      target_type: targetType,
      target_id: targetId,
      details: typeof details === 'string' ? details : JSON.stringify(details)
    });
  } catch (err) {
    // Не ломаем основное действие если лог не записался
  }
}
window.logAdminAction = logAdminAction;
