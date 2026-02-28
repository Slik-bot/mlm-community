// ═══════════════════════════════════════
// ADMIN WITHDRAWALS — A9 Выводы
// Полная реализация экрана управления выводами
// ═══════════════════════════════════════

let _wdFilter = 'pending', _wdMethod = '', _wdPage = 1;
let _wdAmountMin = '', _wdAmountMax = '', _wdDateFrom = '', _wdDateTo = '';

function fmtRub(kopecks) {
  return (kopecks / 100).toLocaleString('ru-RU') + ' \u20BD';
}

// ===== СТАТИСТИКА =====
async function loadWithdrawalStats() {
  try {
    const today = new Date().toISOString().slice(0, 10) + 'T00:00:00';
    const [pendingR, todayR, doneR] = await Promise.all([
      sb.from('withdrawals').select('id, amount', { count: 'exact' }).eq('status', 'pending'),
      sb.from('withdrawals').select('id').eq('status', 'completed').gte('processed_at', today),
      sb.from('withdrawals').select('created_at, processed_at')
        .eq('status', 'completed').not('processed_at', 'is', null)
    ]);
    const cnt = pendingR.count || 0;
    const sum = (pendingR.data || []).reduce(function(s, w) { return s + (w.amount || 0); }, 0);
    const todayCnt = (todayR.data || []).length;
    const done = doneR.data || [];
    let avgText = '\u2014';
    if (done.length) {
      const totalMs = done.reduce(function(s, w) {
        return s + (new Date(w.processed_at) - new Date(w.created_at));
      }, 0);
      const avgH = Math.round(totalMs / done.length / 3600000);
      avgText = avgH < 24 ? avgH + ' \u0447' : Math.round(avgH / 24) + ' \u0434\u043d';
    }
    return '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-val">' + cnt + '</div><div class="stat-lbl">\u0412 \u043e\u0447\u0435\u0440\u0435\u0434\u0438</div></div>' +
      '<div class="stat-card"><div class="stat-val">' + fmtRub(sum) + '</div><div class="stat-lbl">\u0421\u0443\u043c\u043c\u0430 \u043e\u0436\u0438\u0434\u0430\u044e\u0449\u0438\u0445</div></div>' +
      '<div class="stat-card"><div class="stat-val">' + todayCnt + '</div><div class="stat-lbl">\u0412\u044b\u043f\u043b\u0430\u0447\u0435\u043d\u043e \u0441\u0435\u0433\u043e\u0434\u043d\u044f</div></div>' +
      '<div class="stat-card"><div class="stat-val">' + avgText + '</div><div class="stat-lbl">\u0421\u0440\u0435\u0434\u043d\u0435\u0435 \u0432\u0440\u0435\u043c\u044f</div></div>' +
      '</div>';
  } catch (err) {
    console.error('loadWithdrawalStats error:', err);
    return '';
  }
}

// ===== ФИЛЬТРЫ =====
function buildWdFilters() {
  const opts = [
    { v: 'pending', l: '\u041e\u0436\u0438\u0434\u0430\u044e\u0442' },
    { v: 'processing', l: '\u0412 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0435' },
    { v: 'completed', l: '\u0412\u044b\u043f\u043b\u0430\u0447\u0435\u043d\u044b' },
    { v: 'rejected', l: '\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u044b' },
    { v: '', l: '\u0412\u0441\u0435' }
  ];
  let sOpts = '';
  opts.forEach(function(o) {
    sOpts += '<option value="' + o.v + '"' + (_wdFilter === o.v ? ' selected' : '') + '>' + o.l + '</option>';
  });
  return '<div class="toolbar" style="flex-wrap:wrap;gap:8px">' +
    '<select class="field field-select" onchange="_wdFilter=this.value;_wdPage=1;loadWithdrawals()">' + sOpts + '</select>' +
    '<select class="field field-select" onchange="_wdMethod=this.value;_wdPage=1;loadWithdrawals()">' +
      '<option value="">\u0412\u0441\u0435 \u043c\u0435\u0442\u043e\u0434\u044b</option>' +
      '<option value="card"' + (_wdMethod === 'card' ? ' selected' : '') + '>\u041a\u0430\u0440\u0442\u0430</option>' +
      '<option value="crypto"' + (_wdMethod === 'crypto' ? ' selected' : '') + '>\u041a\u0440\u0438\u043f\u0442\u043e</option>' +
    '</select>' +
    '<input class="field" type="number" placeholder="\u041e\u0442 \u20BD" value="' + esc(_wdAmountMin) + '" style="width:90px" ' +
      'onchange="_wdAmountMin=this.value;_wdPage=1;loadWithdrawals()">' +
    '<input class="field" type="number" placeholder="\u0414\u043e \u20BD" value="' + esc(_wdAmountMax) + '" style="width:90px" ' +
      'onchange="_wdAmountMax=this.value;_wdPage=1;loadWithdrawals()">' +
    '<input class="field" type="date" value="' + _wdDateFrom + '" onchange="_wdDateFrom=this.value;_wdPage=1;loadWithdrawals()">' +
    '<input class="field" type="date" value="' + _wdDateTo + '" onchange="_wdDateTo=this.value;_wdPage=1;loadWithdrawals()">' +
    '</div>';
}

// ===== ТАБЛИЦА =====
function buildWdTable(data) {
  const sm = { pending: 'badge-gold', processing: 'badge-blue', completed: 'badge-green', rejected: 'badge-red' };
  const sl = { pending: '\u041e\u0436\u0438\u0434\u0430\u0435\u0442', processing: '\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430', completed: '\u0412\u044b\u043f\u043b\u0430\u0447\u0435\u043d\u043e', rejected: '\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e' };
  let h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th></th><th>\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c</th><th>\u0421\u0443\u043c\u043c\u0430</th><th>\u041c\u0435\u0442\u043e\u0434</th><th>\u0420\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b</th>' +
    '<th>\u0412\u0435\u0440\u0438\u0444.</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u0414\u0430\u0442\u0430</th><th>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f</th>' +
    '</tr></thead><tbody>';
  data.forEach(function(w) {
    h += buildWdRow(w);
  });
  h += '</tbody></table></div>';
  return h;
}

function buildWdRow(w) {
  const sm = { pending: 'badge-gold', processing: 'badge-blue', completed: 'badge-green', rejected: 'badge-red' };
  const sl = { pending: '\u041e\u0436\u0438\u0434\u0430\u0435\u0442', processing: '\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430', completed: '\u0412\u044b\u043f\u043b\u0430\u0447\u0435\u043d\u043e', rejected: '\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e' };
  const u = w.users || {};
  const avatar = u.avatar_url
    ? '<img class="avatar-sm" src="' + esc(u.avatar_url) + '" alt="">'
    : '<div class="avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-dim)">?</div>';
  const name = esc(u.name || '\u2014');
  const lvl = u.level ? ' <span class="badge badge-purple">' + esc(u.level) + '</span>' : '';
  const plan = u.tariff && u.tariff !== 'free' ? ' <span class="badge badge-blue">' + esc(u.tariff.toUpperCase()) + '</span>' : '';
  const ver = u.is_verified ? '<span class="badge badge-green">\u0414\u0430</span>' : '<span class="badge badge-red">\u041d\u0435\u0442</span>';
  const reqs = esc((w.requisites_encrypted || '').substring(0, 20)) + ((w.requisites_encrypted || '').length > 20 ? '\u2026' : '');
  let acts = '<button class="btn btn-ghost btn-sm" onclick="viewWithdrawal(\'' + w.id + '\')">\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435</button>';
  if (w.status === 'pending') {
    acts += '<button class="btn btn-success btn-sm" onclick="approveWithdrawal(\'' + w.id + '\')">\u0412\u044b\u043f\u043b\u0430\u0442\u0438\u0442\u044c</button>' +
      '<button class="btn btn-danger btn-sm" onclick="rejectWithdrawal(\'' + w.id + '\',\'' + w.user_id + '\',' + (w.amount || 0) + ')">\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="freezeWithdrawal(\'' + w.id + '\')">\u0417\u0430\u043c\u043e\u0440\u043e\u0437\u0438\u0442\u044c</button>';
  } else if (w.status === 'processing') {
    acts += '<button class="btn btn-success btn-sm" onclick="approveWithdrawal(\'' + w.id + '\')">\u0412\u044b\u043f\u043b\u0430\u0442\u0438\u0442\u044c</button>' +
      '<button class="btn btn-danger btn-sm" onclick="rejectWithdrawal(\'' + w.id + '\',\'' + w.user_id + '\',' + (w.amount || 0) + ')">\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c</button>';
  }
  return '<tr><td>' + avatar + '</td><td>' + name + lvl + plan + '</td>' +
    '<td><b>' + fmtRub(w.amount || 0) + '</b></td><td>' + esc(w.payment_method || '\u2014') + '</td>' +
    '<td title="' + esc(w.requisites_encrypted || '') + '">' + reqs + '</td>' +
    '<td>' + ver + '</td><td><span class="badge ' + (sm[w.status] || 'badge-purple') + '">' + esc(sl[w.status] || w.status) + '</span></td>' +
    '<td>' + fmtDate(w.created_at) + '</td><td class="actions">' + acts + '</td></tr>';
}

// ===== ЗАГРУЗКА СПИСКА =====
async function loadWithdrawals() {
  try {
    const area = document.getElementById('contentArea');
    area.innerHTML = '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...';
    const stats = await loadWithdrawalStats();
    const filters = buildWdFilters();
    let q = sb.from('withdrawals')
      .select('*, users(name, avatar_url, level, tariff, is_verified, balance)', { count: 'exact' })
      .order('created_at', { ascending: true });
    if (_wdFilter) q = q.eq('status', _wdFilter);
    if (_wdMethod) q = q.eq('payment_method', _wdMethod);
    if (_wdAmountMin) q = q.gte('amount', parseInt(_wdAmountMin) * 100);
    if (_wdAmountMax) q = q.lte('amount', parseInt(_wdAmountMax) * 100);
    if (_wdDateFrom) q = q.gte('created_at', _wdDateFrom);
    if (_wdDateTo) q = q.lte('created_at', _wdDateTo + 'T23:59:59');
    q = q.range((_wdPage - 1) * PER_PAGE, _wdPage * PER_PAGE - 1);
    const r = await q;
    if (r.error) throw r.error;
    const data = r.data || [], total = r.count || 0;
    if (!data.length) {
      area.innerHTML = stats + filters + '<div class="empty">\u041d\u0435\u0442 \u0437\u0430\u044f\u0432\u043e\u043a \u043d\u0430 \u0432\u044b\u0432\u043e\u0434</div>';
      return;
    }
    area.innerHTML = stats + filters + buildWdTable(data) + contentPagination(total, _wdPage, 'wdPage');
  } catch (err) {
    console.error('loadWithdrawals error:', err);
    document.getElementById('contentArea').innerHTML = '<div class="empty">\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438</div>';
    showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432\u044b\u0432\u043e\u0434\u043e\u0432', 'err');
  }
}

function wdPage(p) { _wdPage = p; loadWithdrawals(); }

// ===== ПРОСМОТР ЗАЯВКИ =====
async function viewWithdrawal(id) {
  try {
    const r = await sb.from('withdrawals')
      .select('*, users(name, avatar_url, level, tariff, is_verified, balance)')
      .eq('id', id).single();
    if (r.error) throw r.error;
    const w = r.data, u = w.users || {};
    let body =
      '<div class="info-row"><div class="info-label">\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c</div><div>' + esc(u.name || '\u2014') + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0423\u0440\u043e\u0432\u0435\u043d\u044c</div><div>' + esc(u.level || 'pawn') + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0422\u0430\u0440\u0438\u0444</div><div>' + esc((u.tariff || 'free').toUpperCase()) + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0412\u0435\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043e\u0432\u0430\u043d</div><div>' + (u.is_verified ? '\u0414\u0430' : '\u041d\u0435\u0442') + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0411\u0430\u043b\u0430\u043d\u0441</div><div>' + fmtRub(u.balance || 0) + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0421\u0443\u043c\u043c\u0430 \u0432\u044b\u0432\u043e\u0434\u0430</div><div><b>' + fmtRub(w.amount || 0) + '</b></div></div>' +
      '<div class="info-row"><div class="info-label">\u041c\u0435\u0442\u043e\u0434</div><div>' + esc(w.payment_method || '\u2014') + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0420\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b</div><div>' + esc(w.requisites_encrypted || '\u2014') + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0421\u0442\u0430\u0442\u0443\u0441</div><div>' + esc(w.status) + '</div></div>' +
      '<div class="info-row"><div class="info-label">\u0414\u0430\u0442\u0430 \u0437\u0430\u044f\u0432\u043a\u0438</div><div>' + fmtDate(w.created_at) + '</div></div>';
    if (w.processed_at) {
      body += '<div class="info-row"><div class="info-label">\u0414\u0430\u0442\u0430 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438</div><div>' + fmtDate(w.processed_at) + '</div></div>';
    }
    if (w.reject_reason) {
      body += '<div class="info-row"><div class="info-label">\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u043a\u0430\u0437\u0430</div><div>' + esc(w.reject_reason) + '</div></div>';
    }
    if (w.status === 'pending' || w.status === 'processing') {
      body += '<div class="modal-actions">' +
        '<button class="btn btn-success" onclick="approveWithdrawal(\'' + w.id + '\');closeModal()">\u0412\u044b\u043f\u043b\u0430\u0442\u0438\u0442\u044c</button>' +
        '<button class="btn btn-danger" onclick="rejectWithdrawal(\'' + w.id + '\',\'' + w.user_id + '\',' + (w.amount || 0) + ');closeModal()">\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c</button>';
      if (w.status === 'pending') {
        body += '<button class="btn btn-ghost" onclick="freezeWithdrawal(\'' + w.id + '\');closeModal()">\u0417\u0430\u043c\u043e\u0440\u043e\u0437\u0438\u0442\u044c</button>';
      }
      body += '</div>';
    }
    openModal('\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0432\u044b\u0432\u043e\u0434 #' + w.id.substring(0, 8), body);
  } catch (err) {
    console.error('viewWithdrawal error:', err);
    showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0437\u0430\u044f\u0432\u043a\u0438', 'err');
  }
}

// ===== ОДОБРИТЬ =====
async function approveWithdrawal(id) {
  try {
    if (!confirm('\u041e\u0434\u043e\u0431\u0440\u0438\u0442\u044c \u0438 \u0432\u044b\u043f\u043b\u0430\u0442\u0438\u0442\u044c?')) return;
    const r = await sb.from('withdrawals').update({
      status: 'completed', processed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('approve_withdrawal', 'withdrawal', id);
    showToast('\u0412\u044b\u0432\u043e\u0434 \u043e\u0434\u043e\u0431\u0440\u0435\u043d', 'ok');
    loadWithdrawals();
  } catch (err) {
    console.error('approveWithdrawal error:', err);
    showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0434\u043e\u0431\u0440\u0435\u043d\u0438\u044f', 'err');
  }
}

// ===== ОТКЛОНИТЬ =====
async function rejectWithdrawal(id, userId, amount) {
  try {
    const reason = prompt('\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0438\u044f:');
    if (reason === null) return;
    const r = await sb.from('withdrawals').update({
      status: 'rejected',
      reject_reason: reason.trim() || '\u0411\u0435\u0437 \u0443\u043a\u0430\u0437\u0430\u043d\u0438\u044f \u043f\u0440\u0438\u0447\u0438\u043d\u044b',
      processed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    const u = await sb.from('users').select('balance').eq('id', userId).single();
    if (u.data) {
      await sb.from('users').update({ balance: (u.data.balance || 0) + amount }).eq('id', userId);
    }
    await logAdminAction('reject_withdrawal', 'withdrawal', id, { amount: amount, reason: reason });
    showToast('\u0412\u044b\u0432\u043e\u0434 \u043e\u0442\u043a\u043b\u043e\u043d\u0451\u043d, \u0431\u0430\u043b\u0430\u043d\u0441 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0451\u043d', 'ok');
    loadWithdrawals();
  } catch (err) {
    console.error('rejectWithdrawal error:', err);
    showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0438\u044f', 'err');
  }
}

// ===== ЗАМОРОЗИТЬ =====
async function freezeWithdrawal(id) {
  try {
    if (!confirm('\u0417\u0430\u043c\u043e\u0440\u043e\u0437\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 \u0434\u043b\u044f \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438?')) return;
    const r = await sb.from('withdrawals').update({
      status: 'processing', processed_at: new Date().toISOString()
    }).eq('id', id);
    if (r.error) throw r.error;
    await logAdminAction('freeze_withdrawal', 'withdrawal', id);
    showToast('\u0417\u0430\u044f\u0432\u043a\u0430 \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u0430', 'ok');
    loadWithdrawals();
  } catch (err) {
    console.error('freezeWithdrawal error:', err);
    showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u043c\u043e\u0440\u043e\u0437\u043a\u0438', 'err');
  }
}
