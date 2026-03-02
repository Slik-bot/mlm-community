// ═══════════════════════════════════════
// CHAT LIST — табы, ДНК, свайп, realtime
// ═══════════════════════════════════════

let _clTab = 'all';
let _clData = [];
let _clDebounce = null;
let _clSub = null;
let _clSwipeOpen = null;

const CL_DNA = {
  strategist: '#3b82f6', communicator: '#22c55e',
  creator: '#f59e0b', analyst: '#a78bfa'
};

const CL_DEAL_STATUS = {
  pending: { label: 'Ожидает', color: '#fbbf24', pct: 20 },
  active: { label: 'В работе', color: '#22c55e', pct: 50 },
  review: { label: 'Проверка', color: '#8b5cf6', pct: 80 },
  completed: { label: 'Завершена', color: '#6b7280', pct: 100 },
  disputed: { label: 'Спор', color: '#f43f5e', pct: 50 }
};

// ═══ 1. Init ═══

function initChatList() {
  const user = window.getCurrentUser();
  if (!user) { console.error('initChatList: no user'); return; }

  const skel = document.getElementById('clSkeleton');
  const list = document.getElementById('clList');
  const empty = document.getElementById('clEmpty');
  if (skel) skel.classList.remove('hidden');
  if (list) { list.classList.add('hidden'); list.innerHTML = ''; }
  if (empty) empty.classList.add('hidden');

  _clTab = 'all';
  _clData = [];
  _clSwipeOpen = null;

  clBindTabs();
  clBindSearch();
  clSubscribeRealtime(user.id);

  loadClData(user.id).then(function(convs) {
    _clData = convs;
    renderClList(convs, _clTab, '');
  });
}

// ═══ 2. Load data ═══

async function loadClData(userId) {
  try {
    const { data: mems, error: e1 } = await window.sb
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);
    if (e1) throw e1;
    if (!mems || !mems.length) return [];

    const convIds = mems.map(function(m) { return m.conversation_id; });
    const readMap = {};
    mems.forEach(function(m) { readMap[m.conversation_id] = m.last_read_at; });

    const [r1, r2, r3] = await Promise.all([
      window.sb.from('conversations')
        .select('id, type, title, deal_id, last_message_at')
        .in('id', convIds).order('last_message_at', { ascending: false }),
      window.sb.from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds).neq('user_id', userId),
      window.sb.from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', convIds).eq('is_deleted', false)
        .order('created_at', { ascending: false })
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    if (r3.error) throw r3.error;

    const otherMems = r2.data || [];
    const uids = [...new Set(otherMems.map(function(m) { return m.user_id; }))];
    const convRows = r1.data || [];
    const dids = [...new Set(convRows.filter(function(c) { return c.deal_id; }).map(function(c) { return c.deal_id; }))];

    const [r4, r5] = await Promise.all([
      uids.length ? window.sb.from('users').select('id, name, avatar_url, dna_type').in('id', uids) : { data: [], error: null },
      dids.length ? window.sb.from('deals').select('id, title, status, amount').in('id', dids) : { data: [], error: null }
    ]);
    if (r4.error) throw r4.error;
    if (r5.error) throw r5.error;

    return clAssemble(convRows, readMap, otherMems, r3.data || [], r4.data || [], r5.data || []);
  } catch (err) {
    console.error('loadClData:', err);
    return [];
  }
}

function clAssemble(convRows, readMap, otherMems, msgs, users, deals) {
  const uMap = {};
  users.forEach(function(u) { uMap[u.id] = u; });
  const dMap = {};
  deals.forEach(function(d) { dMap[d.id] = d; });
  const mMap = {};
  msgs.forEach(function(m) { if (!mMap[m.conversation_id]) mMap[m.conversation_id] = m; });

  return convRows.map(function(c) {
    const others = otherMems
      .filter(function(m) { return m.conversation_id === c.id; })
      .map(function(m) { return uMap[m.user_id] || null; })
      .filter(Boolean);
    const lastMsg = mMap[c.id] || null;
    const lastRead = readMap[c.id] || null;
    let unread = 0;
    if (lastRead) {
      unread = msgs.filter(function(m) {
        return m.conversation_id === c.id && new Date(m.created_at) > new Date(lastRead);
      }).length;
    } else {
      unread = msgs.filter(function(m) { return m.conversation_id === c.id; }).length;
    }
    return {
      id: c.id, type: c.type, title: c.title,
      deal_id: c.deal_id, last_message_at: c.last_message_at,
      other: others[0] || null, lastMsg: lastMsg,
      deal: c.deal_id ? (dMap[c.deal_id] || null) : null,
      unread: unread
    };
  });
}

// ═══ 3. Render list ═══

function renderClList(convs, tab, query) {
  const list = document.getElementById('clList');
  const skel = document.getElementById('clSkeleton');
  const empty = document.getElementById('clEmpty');
  if (!list) return;

  let filtered = convs;
  if (tab && tab !== 'all') {
    filtered = filtered.filter(function(c) { return c.type === tab; });
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(function(c) {
      const name = c.other ? (c.other.name || '') : (c.title || '');
      return name.toLowerCase().indexOf(q) !== -1;
    });
  }

  if (skel) skel.classList.add('hidden');
  list.innerHTML = '';

  if (!filtered.length) {
    list.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  list.classList.remove('hidden');
  filtered.forEach(function(conv) {
    const el = conv.type === 'deal' ? buildClDealItem(conv) : buildClItem(conv);
    list.appendChild(el);
  });
}

// ═══ 4. Build personal/broker item ═══

function buildClItem(conv) {
  const o = conv.other || { name: 'Пользователь', avatar_url: '', dna_type: '' };
  const item = document.createElement('div');
  item.className = 'cl-item';
  item.setAttribute('data-conv-id', conv.id);

  const border = CL_DNA[o.dna_type] || 'rgba(255,255,255,0.12)';
  const ava = document.createElement('div');
  ava.className = 'cl-ava';
  ava.style.borderColor = border;
  if (o.avatar_url) {
    const img = document.createElement('img');
    img.src = o.avatar_url;
    img.alt = '';
    ava.appendChild(img);
  } else {
    ava.textContent = (o.name || 'U').charAt(0).toUpperCase();
  }

  const body = document.createElement('div');
  body.className = 'cl-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'cl-name';
  nameEl.textContent = o.name || 'Пользователь';
  const prev = document.createElement('div');
  prev.className = 'cl-preview';
  const txt = conv.lastMsg ? (conv.lastMsg.content || '') : '';
  prev.textContent = txt.length > 40 ? txt.substring(0, 40) + '...' : txt;
  body.appendChild(nameEl);
  body.appendChild(prev);

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  const time = document.createElement('div');
  time.className = 'cl-time';
  time.textContent = conv.lastMsg ? clFormatTime(conv.lastMsg.created_at) : '';
  meta.appendChild(time);
  if (conv.unread > 0) {
    const badge = document.createElement('div');
    badge.className = 'cl-badge';
    badge.textContent = conv.unread > 99 ? '99+' : conv.unread;
    meta.appendChild(badge);
  }

  const inner = document.createElement('div');
  inner.className = 'cl-inner';
  inner.appendChild(ava);
  inner.appendChild(body);
  inner.appendChild(meta);
  inner.onclick = function() { window.openChat(conv.id, o); };

  item.appendChild(inner);
  item.appendChild(clBuildActions());
  clInitSwipe(item);

  return item;
}

// ═══ 5. Build deal item ═══

function buildClDealItem(conv) {
  const d = conv.deal || { title: 'Сделка', status: 'pending', amount: 0 };
  const st = CL_DEAL_STATUS[d.status] || CL_DEAL_STATUS.pending;
  const item = document.createElement('div');
  item.className = 'cl-item cl-item--deal';
  item.setAttribute('data-conv-id', conv.id);

  const ava = document.createElement('div');
  ava.className = 'cl-ava cl-ava--deal';
  ava.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

  const body = document.createElement('div');
  body.className = 'cl-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'cl-name';
  nameEl.textContent = d.title || 'Сделка';
  const info = document.createElement('div');
  info.className = 'cl-deal-info';
  const amtSpan = document.createElement('span');
  amtSpan.className = 'cl-deal-amount';
  amtSpan.textContent = (d.amount || 0).toLocaleString('ru') + ' TF';
  const stSpan = document.createElement('span');
  stSpan.className = 'cl-deal-status';
  stSpan.style.color = st.color;
  stSpan.textContent = st.label;
  info.appendChild(amtSpan);
  info.appendChild(stSpan);

  const bar = document.createElement('div');
  bar.className = 'cl-deal-bar';
  const fill = document.createElement('div');
  fill.className = 'cl-deal-fill';
  fill.style.width = st.pct + '%';
  fill.style.background = st.color;
  bar.appendChild(fill);
  body.appendChild(nameEl);
  body.appendChild(info);
  body.appendChild(bar);

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  if (d.status === 'review') {
    const act = document.createElement('div');
    act.className = 'cl-action-badge';
    act.textContent = 'Действие!';
    meta.appendChild(act);
  }
  if (conv.unread > 0) {
    const badge = document.createElement('div');
    badge.className = 'cl-badge';
    badge.textContent = conv.unread > 99 ? '99+' : conv.unread;
    meta.appendChild(badge);
  }

  const inner = document.createElement('div');
  inner.className = 'cl-inner';
  inner.appendChild(ava);
  inner.appendChild(body);
  inner.appendChild(meta);
  inner.onclick = function() { window.openDeal ? window.openDeal(conv.deal_id) : window.openChat(conv.id); };

  item.appendChild(inner);
  item.appendChild(clBuildActions());
  clInitSwipe(item);

  return item;
}

// ═══ 6. Format time ═══

function clFormatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const dayMs = 86400000;
  if (diff < dayMs && d.getDate() === now.getDate()) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  if (diff < dayMs * 2 && now.getDate() - d.getDate() === 1) return 'Вчера';
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

// ═══ 7. Realtime ═══

function clSubscribeRealtime(userId) {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (!window.sb) return;

  _clSub = window.sb
    .channel('cl-rt-' + userId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, function() {
      loadClData(userId).then(function(convs) {
        _clData = convs;
        const q = document.getElementById('clSearch');
        renderClList(convs, _clTab, q ? q.value.trim() : '');
      });
    })
    .subscribe();
}

// ═══ Tabs ═══

function clBindTabs() {
  const tabs = document.querySelectorAll('.cl-tab');
  tabs.forEach(function(t) {
    t.onclick = function() {
      _clTab = t.getAttribute('data-tab');
      tabs.forEach(function(b) { b.classList.remove('active'); });
      t.classList.add('active');
      const q = document.getElementById('clSearch');
      renderClList(_clData, _clTab, q ? q.value.trim() : '');
    };
  });
}

// ═══ Search ═══

function clBindSearch() {
  const inp = document.getElementById('clSearch');
  if (!inp) return;
  inp.value = '';
  inp.addEventListener('input', function() {
    clearTimeout(_clDebounce);
    _clDebounce = setTimeout(function() {
      renderClList(_clData, _clTab, inp.value.trim());
    }, 300);
  });
}

// ═══ Swipe ═══

function clBuildActions() {
  const wrap = document.createElement('div');
  wrap.className = 'cl-actions';
  wrap.innerHTML = '<button class="cl-swipe-btn cl-swipe-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.36 19.36L5.64 6.64"/><path d="M12 2a10 10 0 000 20"/></svg></button>' +
    '<button class="cl-swipe-btn cl-swipe-del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>';
  wrap.querySelector('.cl-swipe-mute').onclick = function(e) {
    e.stopPropagation();
    window.showToast('Уведомления обновлены');
  };
  wrap.querySelector('.cl-swipe-del').onclick = function(e) {
    e.stopPropagation();
    window.showToast('Скоро: удаление');
  };
  return wrap;
}

function clInitSwipe(item) {
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  let startX = 0;

  inner.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    if (_clSwipeOpen && _clSwipeOpen !== item) clCloseSwipe(_clSwipeOpen);
  }, { passive: true });

  inner.addEventListener('touchend', function(e) {
    const dx = startX - e.changedTouches[0].clientX;
    if (dx > 50) {
      inner.style.transform = 'translateX(-80px)';
      actions.classList.add('cl-actions--open');
      _clSwipeOpen = item;
    } else if (dx < -30) {
      clCloseSwipe(item);
    }
  }, { passive: true });
}

function clCloseSwipe(item) {
  if (!item) return;
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  if (inner) inner.style.transform = '';
  if (actions) actions.classList.remove('cl-actions--open');
  if (_clSwipeOpen === item) _clSwipeOpen = null;
}

// ═══ Destroy ═══

function destroyChatList() {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (_clDebounce) clearTimeout(_clDebounce);
  _clData = [];
  _clSwipeOpen = null;
}

// ═══ Exports ═══

window.initChatList = initChatList;
window.destroyChatList = destroyChatList;
