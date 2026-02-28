// ═══════════════════════════════════════
// ADMIN PAGES 5 — Верификация, Проверка заданий, Выводы
// Отделено для соблюдения лимита 500 строк
// ═══════════════════════════════════════

// ===== ВЕРИФИКАЦИЯ (таб в разделе Пользователи) =====
let _verFilter = 'pending';

async function loadVerification() {
  try {
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    let q = sb.from('verification_requests').select('*, users(name, avatar_url)')
      .order('created_at', { ascending: false });
    if (_verFilter) q = q.eq('status', _verFilter);
    const r = await q;
    if (r.error) throw r.error;
    const data = r.data || [];
    const sm = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-red' };
    const fh = '<div class="toolbar"><select class="field field-select" onchange="_verFilter=this.value;loadVerification()">' +
      '<option value="pending"' + (_verFilter === 'pending' ? ' selected' : '') + '>Ожидают</option>' +
      '<option value="approved"' + (_verFilter === 'approved' ? ' selected' : '') + '>Одобренные</option>' +
      '<option value="rejected"' + (_verFilter === 'rejected' ? ' selected' : '') + '>Отклонённые</option>' +
      '<option value="">Все</option>' +
      '</select></div>';
    if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет заявок на верификацию</div>'; return; }
    let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th></th><th>Пользователь</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(v) {
      const usr = v.users ? v.users.name : '—';
      const avatar = v.users && v.users.avatar_url
        ? '<img class="avatar-sm" src="' + esc(v.users.avatar_url) + '" alt="">'
        : '<div class="avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--text-dim)">👤</div>';
      const badge = sm[v.status] || 'badge-purple';
      const acts = v.status === 'pending'
        ? '<button class="btn btn-ghost btn-sm" onclick="viewVerification(\'' + v.id + '\')">Просмотр</button>' +
          '<button class="btn btn-success btn-sm" onclick="approveVerification(\'' + v.id + '\',\'' + v.user_id + '\')">Одобрить</button>' +
          '<button class="btn btn-danger btn-sm" onclick="rejectVerification(\'' + v.id + '\')">Отклонить</button>'
        : '<button class="btn btn-ghost btn-sm" onclick="viewVerification(\'' + v.id + '\')">Просмотр</button>';
      h += '<tr><td>' + avatar + '</td><td>' + esc(usr) + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(v.status) + '</span></td>' +
        '<td>' + fmtDate(v.created_at) + '</td>' +
        '<td class="actions">' + acts + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadVerification error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки верификаций', 'err');
  }
}

async function viewVerification(id) {
  try {
    const r = await sb.from('verification_requests').select('*, users(name)').eq('id', id).single();
    if (r.error) throw r.error;
    const v = r.data;
    const passUrl = v.passport_photo
      ? sb.storage.from('verification-docs').getPublicUrl(v.passport_photo).data.publicUrl : '';
    const selfUrl = v.selfie_photo
      ? sb.storage.from('verification-docs').getPublicUrl(v.selfie_photo).data.publicUrl : '';
    let body = '<div class="info-row"><div class="info-label">Пользователь</div><div>' + esc(v.users ? v.users.name : '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Статус</div><div>' + esc(v.status) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Дата</div><div>' + fmtDate(v.created_at) + '</div></div>';
    if (passUrl) {
      body += '<div class="info-row"><div class="info-label">Паспорт</div><div>' +
        '<img src="' + esc(passUrl) + '" style="max-width:100%;border-radius:8px;margin-top:4px" alt="passport"></div></div>';
    }
    if (selfUrl) {
      body += '<div class="info-row"><div class="info-label">Селфи</div><div>' +
        '<img src="' + esc(selfUrl) + '" style="max-width:100%;border-radius:8px;margin-top:4px" alt="selfie"></div></div>';
    }
    if (v.status === 'pending') {
      body += '<div class="modal-actions">' +
        '<button class="btn btn-success" onclick="approveVerification(\'' + v.id + '\',\'' + v.user_id + '\');closeModal()">Одобрить</button>' +
        '<button class="btn btn-danger" onclick="rejectVerification(\'' + v.id + '\');closeModal()">Отклонить</button>' +
        '</div>';
    }
    openModal('Заявка на верификацию', body);
  } catch (err) {
    console.error('viewVerification error:', err);
    showToast('Ошибка загрузки заявки', 'err');
  }
}

async function approveVerification(id, userId) {
  try {
    const r = await sb.from('verification_requests').update({
      status: 'approved', reviewed_by: adminProfile.id, reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await sb.from('users').update({ is_verified: true }).eq('id', userId);
    await logAdminAction('verify_user', 'user', userId);
    showToast('Верификация одобрена', 'ok');
    loadVerification();
  } catch (err) {
    console.error('approveVerification error:', err);
    showToast('Ошибка', 'err');
  }
}

async function rejectVerification(id) {
  try {
    const r = await sb.from('verification_requests').update({
      status: 'rejected', reviewed_by: adminProfile.id, reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast('Верификация отклонена', 'ok');
    loadVerification();
  } catch (err) {
    console.error('rejectVerification error:', err);
    showToast('Ошибка', 'err');
  }
}


// ===== ПРОВЕРКА ЗАДАНИЙ (таб в разделе Контент) =====
let _taskRevFilter = 'pending';

async function loadTaskReview() {
  try {
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    let q = sb.from('task_completions').select('*, users(name, avatar_url), tasks(title, xp_reward)')
      .order('created_at', { ascending: false });
    if (_taskRevFilter) q = q.eq('status', _taskRevFilter);
    const r = await q;
    if (r.error) throw r.error;
    const data = r.data || [];
    const sm = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-red' };
    const fh = '<div class="toolbar"><select class="field field-select" onchange="_taskRevFilter=this.value;loadTaskReview()">' +
      '<option value="pending"' + (_taskRevFilter === 'pending' ? ' selected' : '') + '>Ожидают</option>' +
      '<option value="approved"' + (_taskRevFilter === 'approved' ? ' selected' : '') + '>Принятые</option>' +
      '<option value="rejected"' + (_taskRevFilter === 'rejected' ? ' selected' : '') + '>Отклонённые</option>' +
      '<option value="">Все</option>' +
      '</select></div>';
    if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет заявок на проверку</div>'; return; }
    let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Пользователь</th><th>Задание</th><th>XP</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(tc) {
      const usr = tc.users ? tc.users.name : '—';
      const task = tc.tasks ? tc.tasks.title : '—';
      const xp = tc.tasks ? (tc.tasks.xp_reward || 0) : 0;
      const badge = sm[tc.status] || 'badge-purple';
      const acts = tc.status === 'pending'
        ? '<button class="btn btn-ghost btn-sm" onclick="viewTaskCompletion(\'' + tc.id + '\')">Просмотр</button>' +
          '<button class="btn btn-success btn-sm" onclick="approveTaskCompletion(\'' + tc.id + '\',\'' + tc.user_id + '\',\'' + tc.task_id + '\')">Принять</button>' +
          '<button class="btn btn-danger btn-sm" onclick="rejectTaskCompletion(\'' + tc.id + '\')">Отклонить</button>'
        : '<button class="btn btn-ghost btn-sm" onclick="viewTaskCompletion(\'' + tc.id + '\')">Просмотр</button>';
      h += '<tr><td>' + esc(usr) + '</td><td>' + esc(task) + '</td>' +
        '<td><b>' + xp + '</b></td>' +
        '<td><span class="badge ' + badge + '">' + esc(tc.status) + '</span></td>' +
        '<td>' + fmtDate(tc.created_at) + '</td>' +
        '<td class="actions">' + acts + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadTaskReview error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки заданий', 'err');
  }
}

async function viewTaskCompletion(id) {
  try {
    const r = await sb.from('task_completions')
      .select('*, users(name), tasks(title, xp_reward)').eq('id', id).single();
    if (r.error) throw r.error;
    const tc = r.data;
    const scrUrl = tc.screenshot_url
      ? sb.storage.from('task-screenshots').getPublicUrl(tc.screenshot_url).data.publicUrl : '';
    let body = '<div class="info-row"><div class="info-label">Пользователь</div><div>' + esc(tc.users ? tc.users.name : '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">Задание</div><div>' + esc(tc.tasks ? tc.tasks.title : '—') + '</div></div>' +
      '<div class="info-row"><div class="info-label">XP награда</div><div>' + (tc.tasks ? tc.tasks.xp_reward || 0 : 0) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Статус</div><div>' + esc(tc.status) + '</div></div>' +
      '<div class="info-row"><div class="info-label">Дата</div><div>' + fmtDate(tc.created_at) + '</div></div>';
    if (tc.comment) {
      body += '<div class="info-row"><div class="info-label">Комментарий</div><div>' + esc(tc.comment) + '</div></div>';
    }
    if (scrUrl) {
      body += '<div class="info-row"><div class="info-label">Скриншот</div><div>' +
        '<img src="' + esc(scrUrl) + '" style="max-width:100%;border-radius:8px;margin-top:4px" alt="screenshot"></div></div>';
    }
    if (tc.status === 'pending') {
      body += '<div class="modal-actions">' +
        '<button class="btn btn-success" onclick="approveTaskCompletion(\'' + tc.id + '\',\'' + tc.user_id + '\',\'' + tc.task_id + '\');closeModal()">Принять</button>' +
        '<button class="btn btn-danger" onclick="rejectTaskCompletion(\'' + tc.id + '\');closeModal()">Отклонить</button>' +
        '</div>';
    }
    openModal('Проверка задания', body);
  } catch (err) {
    console.error('viewTaskCompletion error:', err);
    showToast('Ошибка загрузки', 'err');
  }
}

async function approveTaskCompletion(id, userId, taskId) {
  try {
    const r = await sb.from('task_completions').update({
      status: 'approved', reviewed_by: adminProfile.id, reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    const sess = await sb.auth.getSession();
    const token = sess.data.session.access_token;
    await fetch(SB_URL + '/functions/v1/complete-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ user_id: userId, task_id: taskId })
    });
    showToast('Задание принято, XP начислен', 'ok');
    loadTaskReview();
  } catch (err) {
    console.error('approveTaskCompletion error:', err);
    showToast('Ошибка', 'err');
  }
}

async function rejectTaskCompletion(id) {
  try {
    const r = await sb.from('task_completions').update({
      status: 'rejected', reviewed_by: adminProfile.id, reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    showToast('Задание отклонено', 'ok');
    loadTaskReview();
  } catch (err) {
    console.error('rejectTaskCompletion error:', err);
    showToast('Ошибка', 'err');
  }
}


// ===== УПРАВЛЕНИЕ ВЫВОДАМИ (таб в разделе Финансы) =====
let _wdFilter = 'pending';

async function loadWithdrawals() {
  try {
    const area = document.getElementById('contentArea');
    area.innerHTML = 'Загрузка...';
    let q = sb.from('withdrawals').select('*, users(name, balance)')
      .order('created_at', { ascending: false });
    if (_wdFilter) q = q.eq('status', _wdFilter);
    const r = await q;
    if (r.error) throw r.error;
    const data = r.data || [];
    const sm = { pending: 'badge-gold', paid: 'badge-green', rejected: 'badge-red' };
    const fh = '<div class="toolbar"><select class="field field-select" onchange="_wdFilter=this.value;loadWithdrawals()">' +
      '<option value="pending"' + (_wdFilter === 'pending' ? ' selected' : '') + '>Ожидают</option>' +
      '<option value="paid"' + (_wdFilter === 'paid' ? ' selected' : '') + '>Выплаченные</option>' +
      '<option value="rejected"' + (_wdFilter === 'rejected' ? ' selected' : '') + '>Отклонённые</option>' +
      '<option value="">Все</option>' +
      '</select></div>';
    if (!data.length) { area.innerHTML = fh + '<div class="empty">Нет заявок на вывод</div>'; return; }
    let h = fh + '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Пользователь</th><th>Сумма</th><th>Реквизиты</th><th>Баланс</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody>';
    data.forEach(function(w) {
      const usr = w.users ? w.users.name : '—';
      const balance = w.users ? (w.users.balance || 0) : '—';
      const badge = sm[w.status] || 'badge-purple';
      const acts = w.status === 'pending'
        ? '<button class="btn btn-success btn-sm" onclick="payWithdrawal(\'' + w.id + '\')">Выплатить</button>' +
          '<button class="btn btn-danger btn-sm" onclick="rejectWithdrawal(\'' + w.id + '\',\'' + w.user_id + '\',' + (w.amount || 0) + ')">Отклонить</button>'
        : '';
      h += '<tr><td>' + esc(usr) + '</td>' +
        '<td><b>' + (w.amount || 0) + ' ₽</b></td>' +
        '<td>' + esc(w.payment_details || w.card_number || '—') + '</td>' +
        '<td>' + balance + ' ₽</td>' +
        '<td><span class="badge ' + badge + '">' + esc(w.status) + '</span></td>' +
        '<td>' + fmtDate(w.created_at) + '</td>' +
        '<td class="actions">' + acts + '</td></tr>';
    });
    h += '</tbody></table></div>';
    area.innerHTML = h;
  } catch (err) {
    console.error('loadWithdrawals error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    showToast('Ошибка загрузки выводов', 'err');
  }
}

async function payWithdrawal(id) {
  try {
    const r = await sb.from('withdrawals').update({
      status: 'paid', paid_at: new Date().toISOString(), reviewed_by: adminProfile.id
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('approve_withdrawal', 'withdrawal', id);
    showToast('Вывод оплачен', 'ok');
    loadWithdrawals();
  } catch (err) {
    console.error('payWithdrawal error:', err);
    showToast('Ошибка', 'err');
  }
}

async function rejectWithdrawal(id, userId, amount) {
  try {
    const r = await sb.from('withdrawals').update({
      status: 'rejected', reviewed_by: adminProfile.id, reviewed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    const u = await sb.from('users').select('balance').eq('id', userId).single();
    if (u.data) {
      await sb.from('users').update({ balance: (u.data.balance || 0) + amount }).eq('id', userId);
    }
    await logAdminAction('reject_withdrawal', 'withdrawal', id, { amount: amount });
    showToast('Вывод отклонён, баланс возвращён', 'ok');
    loadWithdrawals();
  } catch (err) {
    console.error('rejectWithdrawal error:', err);
    showToast('Ошибка', 'err');
  }
}
