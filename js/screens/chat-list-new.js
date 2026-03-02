// ═══════════════════════════════════════
// CHAT LIST NEW — табы, ДНК, свайп, realtime
// Перегружает initChatList из chat.js
// ═══════════════════════════════════════

let _clTab = 'all';
let _clConversations = [];
let _clDebounce = null;
let _clRealtimeSub = null;
let _clSwipeEl = null;
let _clSwipeX = 0;
let _clLongPressTimer = null;

const CL_DNA_BORDER = {
  strategist: '#3b82f6', communicator: '#22c55e',
  creator: '#f59e0b', analyst: '#a78bfa'
};

const CL_STATUS_LABELS = {
  pending: 'Ожидает', active: 'В работе', review: 'Проверка',
  revision: 'Доработка', completed: 'Завершена', disputed: 'Спор'
};

// ═══ Init / Destroy ═══

function initChatList() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  _clTab = 'all';
  updateClTabsUI();
  loadClConversations();
  initClSearch();
  subscribeClRealtime(user.id);
}

function destroyChatList() {
  if (_clRealtimeSub) { _clRealtimeSub.unsubscribe(); _clRealtimeSub = null; }
  if (_clDebounce) clearTimeout(_clDebounce);
}

// ═══ Загрузка ═══

async function loadClConversations() {
  const user = getCurrentUser();
  if (!user) return;
  const skeleton = document.getElementById('chatSkeleton');
  const emptyEl = document.getElementById('chatEmpty');
  if (skeleton) skeleton.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  try {
    let convs = await clFetchChatData(user.id);
    if (_clTab !== 'all') {
      convs = convs.filter(function(c) { return c.type === _clTab; });
    }
    if (skeleton) skeleton.classList.add('hidden');
    _clConversations = convs;
    renderClList(convs);
  } catch (err) {
    console.error('loadClConversations:', err);
    if (skeleton) skeleton.classList.add('hidden');
    _clConversations = [];
    renderClList([]);
  }
}

// 4 плоских запроса без nested join (обход auth.users → public.users)
async function clFetchChatData(uid) {
  // Шаг 1: memberships текущего юзера
  const { data: mems, error: e1 } = await window.sb
    .from('conversation_members').select('conversation_id, last_read_at').eq('user_id', uid);
  if (e1) throw e1;
  if (!mems || !mems.length) return [];
  const convIds = mems.map(function(m) { return m.conversation_id; });
  const readMap = {};
  mems.forEach(function(m) { readMap[m.conversation_id] = m.last_read_at; });

  // Шаг 2 + 3а + 4: параллельно — conversations, собеседники, сообщения
  const [r2, r3, r4] = await Promise.all([
    window.sb.from('conversations').select('id, type, title, deal_id, last_message_at')
      .in('id', convIds).order('last_message_at', { ascending: false }).limit(50),
    window.sb.from('conversation_members').select('conversation_id, user_id')
      .in('conversation_id', convIds).neq('user_id', uid),
    window.sb.from('messages').select('conversation_id, content, created_at, sender_id')
      .in('conversation_id', convIds).eq('is_deleted', false)
      .order('created_at', { ascending: false })
  ]);
  if (r2.error) throw r2.error;
  if (r3.error) throw r3.error;
  if (r4.error) throw r4.error;
  const convRows = r2.data || [];
  const otherMems = r3.data || [];

  // Шаг 3б + 5: параллельно — профили (public.users) + сделки
  const userIds = [];
  otherMems.forEach(function(m) {
    if (userIds.indexOf(m.user_id) === -1) userIds.push(m.user_id);
  });
  const dealIds = [];
  convRows.forEach(function(c) {
    if (c.deal_id && dealIds.indexOf(c.deal_id) === -1) dealIds.push(c.deal_id);
  });
  const [r5, r6] = await Promise.all([
    userIds.length ? window.sb.from('users').select('id, name, avatar_url, dna_type').in('id', userIds) : { data: [], error: null },
    dealIds.length ? window.sb.from('deals').select('id, title, status, amount').in('id', dealIds) : { data: [], error: null }
  ]);
  if (r5.error) throw r5.error;
  if (r6.error) throw r6.error;

  // Маппинг данных
  const usersMap = {};
  (r5.data || []).forEach(function(u) { usersMap[u.id] = u; });
  const dealsMap = {};
  (r6.data || []).forEach(function(d) { dealsMap[d.id] = d; });
  const msgMap = {};
  (r4.data || []).forEach(function(m) {
    if (!msgMap[m.conversation_id]) msgMap[m.conversation_id] = m;
  });
  return clAssembleConvs(convRows, readMap, otherMems, usersMap, msgMap, dealsMap);
}

// Сборка в формат совместимый с buildClItem / filterClConversations
function clAssembleConvs(convRows, readMap, otherMems, usersMap, msgMap, dealsMap) {
  return convRows.map(function(c) {
    const members = otherMems
      .filter(function(m) { return m.conversation_id === c.id; })
      .map(function(m) { return { user_id: m.user_id, users: usersMap[m.user_id] || null }; });
    const msg = msgMap[c.id];
    return {
      id: c.id, type: c.type, title: c.title, deal_id: c.deal_id,
      last_message_at: c.last_message_at,
      conversation_members: members,
      messages: msg ? [msg] : [],
      deal: c.deal_id ? (dealsMap[c.deal_id] || null) : null,
      _lastReadAt: readMap[c.id] || null
    };
  });
}

// ═══ Рендер списка ═══

function renderClList(conversations) {
  const personal = document.getElementById('clPersonal');
  const deals = document.getElementById('clDeals');
  const list = document.getElementById('chatList');
  const emptyEl = document.getElementById('chatEmpty');

  if (personal) personal.innerHTML = '';
  if (deals) deals.innerHTML = '';

  if (!conversations.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const user = getCurrentUser();
  if (!user) return;
  const myId = user.id;

  conversations.forEach(function(conv) {
    const item = buildClItem(conv, myId);
    if (conv.type === 'deal' && deals) {
      deals.appendChild(item);
    } else if (personal) {
      personal.appendChild(item);
    }
  });
}

// ═══ Карточка диалога ═══

function buildClItem(conv, myId) {
  const members = conv.conversation_members || [];
  let other = null;
  for (let i = 0; i < members.length; i++) {
    if (members[i].users && members[i].users.id !== myId) { other = members[i].users; break; }
  }
  if (!other) other = { name: 'Диалог', avatar_url: '', dna_type: '' };

  const lastMsg = (conv.messages && conv.messages[0]) || {};
  const timeStr = lastMsg.created_at ? formatChatTime(lastMsg.created_at) : '';
  let preview = lastMsg.content || '';
  if (preview.length > 40) preview = preview.substring(0, 40) + '...';

  const item = document.createElement('div');
  item.className = 'chat-item';
  item.setAttribute('data-conv-id', conv.id);

  // ДНК-рамка аватара
  const dnaBorder = CL_DNA_BORDER[other.dna_type] || 'rgba(255,255,255,0.12)';
  const avaStyle = 'border: 2px solid ' + dnaBorder + ';';

  const avaHtml = other.avatar_url
    ? '<img class="chat-item-avatar" src="' + escHtml(other.avatar_url) + '" alt="" style="' + avaStyle + '">'
    : '<div class="chat-item-avatar chat-item-avatar-placeholder" style="' + avaStyle + '">' + escHtml((other.name || 'U').charAt(0).toUpperCase()) + '</div>';

  const lastReadAt = conv._lastReadAt;
  const hasUnread = conv.last_message_at && (!lastReadAt || new Date(conv.last_message_at) > new Date(lastReadAt));
  const unreadHtml = hasUnread ? '<div class="chat-unread"></div>' : '';

  // Deal info
  let dealBadge = '';
  if (conv.type === 'deal' && conv.deal) {
    const d = conv.deal;
    const stLabel = CL_STATUS_LABELS[d.status] || d.status;
    const amountStr = (d.amount || 0).toLocaleString('ru') + ' TF';
    dealBadge = '<div class="chat-item-deal"><span class="chat-deal-status">' + stLabel + '</span> · ' + amountStr + '</div>';
  }

  item.innerHTML = '<div class="chat-item-inner">' + avaHtml +
    '<div class="chat-item-body"><div class="chat-item-name">' + escHtml(other.name || 'Пользователь') + '</div>' +
    dealBadge +
    '<div class="chat-item-last">' + escHtml(preview) + '</div></div>' +
    '<div class="chat-item-meta"><div class="chat-item-time">' + timeStr + '</div>' + unreadHtml + '</div></div>' +
    '<div class="chat-item-actions hidden">' +
    '<button class="chat-swipe-btn mute" onclick="clMuteConv(\'' + conv.id + '\',event)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 19.36L5.64 6.64"/><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-3-2-5-4-8"/></svg></button>' +
    '<button class="chat-swipe-btn delete" onclick="clDeleteConv(\'' + conv.id + '\',event)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
    '</div>';

  item.querySelector('.chat-item-inner').onclick = function() { openChat(conv.id, other); };

  // Свайп
  initClSwipe(item);
  // Долгий тап
  initClLongPress(item, conv, other);

  return item;
}

// ═══ Свайп влево ═══

function initClSwipe(item) {
  const inner = item.querySelector('.chat-item-inner');
  const actions = item.querySelector('.chat-item-actions');
  let startX = 0;
  let moved = false;

  inner.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    moved = false;
  }, { passive: true });

  inner.addEventListener('touchmove', function(e) {
    const dx = startX - e.touches[0].clientX;
    if (dx > 30) {
      moved = true;
      actions.classList.remove('hidden');
      inner.style.transform = 'translateX(-80px)';
    } else if (dx < -10 && moved) {
      actions.classList.add('hidden');
      inner.style.transform = '';
      moved = false;
    }
  }, { passive: true });

  inner.addEventListener('touchend', function() {
    if (!moved) return;
    setTimeout(function() {
      if (!actions.matches(':hover')) {
        actions.classList.add('hidden');
        inner.style.transform = '';
      }
    }, 3000);
  }, { passive: true });
}

// ═══ Долгий тап ═══

function initClLongPress(item, conv, other) {
  const inner = item.querySelector('.chat-item-inner');
  let timer = null;

  inner.addEventListener('touchstart', function(e) {
    timer = setTimeout(function() {
      showClContextMenu(e.touches[0].clientX, e.touches[0].clientY, conv, other);
    }, 500);
  }, { passive: true });

  inner.addEventListener('touchend', function() { clearTimeout(timer); }, { passive: true });
  inner.addEventListener('touchmove', function() { clearTimeout(timer); }, { passive: true });
}

function showClContextMenu(x, y, conv, other) {
  if (window.haptic) haptic('light');
  closeClContextMenu();

  const menu = document.createElement('div');
  menu.className = 'cl-context-menu';
  menu.style.cssText = 'position:fixed;left:' + Math.min(x, window.innerWidth - 180) + 'px;top:' + Math.min(y, window.innerHeight - 200) + 'px;z-index:100;background:rgba(20,18,35,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:6px 0;min-width:170px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:fadeIn .15s ease';
  menu.id = 'clContextMenu';

  const items = [
    { label: 'Открыть профиль', action: function() { window._viewProfileId = other.id; goTo('scrProfile'); } },
    { label: 'Закрепить', action: function() { showToast('Скоро'); } },
    { label: 'Без звука', action: function() { showToast('Уведомления обновлены'); } },
    { label: 'Удалить', action: function() { showToast('Скоро'); }, cls: 'dng' }
  ];

  items.forEach(function(it) {
    const btn = document.createElement('div');
    btn.className = 'cl-ctx-item' + (it.cls ? ' ' + it.cls : '');
    btn.style.cssText = 'padding:10px 16px;font-size:14px;color:' + (it.cls === 'dng' ? '#f43f5e' : 'rgba(255,255,255,0.8)') + ';cursor:pointer;transition:background .15s';
    btn.textContent = it.label;
    btn.onclick = function() { closeClContextMenu(); it.action(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  document.addEventListener('click', closeClContextMenu, { once: true });
}

function closeClContextMenu() {
  const m = document.getElementById('clContextMenu');
  if (m) m.remove();
}

// ═══ Swipe actions ═══

function clMuteConv(convId, e) {
  e.stopPropagation();
  showToast('Уведомления обновлены');
}

function clDeleteConv(convId, e) {
  e.stopPropagation();
  showToast('Скоро: удаление');
}

// ═══ Табы ═══

function switchChatTab(tab, el) {
  _clTab = tab;
  updateClTabsUI();
  loadClConversations();
}

function updateClTabsUI() {
  document.querySelectorAll('#scrChatList .chat-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === _clTab);
  });
}

// ═══ Поиск ═══

function initClSearch() {
  const searchInp = document.getElementById('chatSearch');
  if (!searchInp) return;
  searchInp.value = '';
  searchInp.addEventListener('input', function() {
    clearTimeout(_clDebounce);
    _clDebounce = setTimeout(function() {
      filterClConversations(searchInp.value.trim().toLowerCase());
    }, 300);
  });
}

function filterClConversations(query) {
  if (!query) { renderClList(_clConversations); return; }
  const user = getCurrentUser();
  if (!user) return;
  const myId = user.id;
  const filtered = _clConversations.filter(function(conv) {
    const members = conv.conversation_members || [];
    for (let i = 0; i < members.length; i++) {
      if (members[i].users && members[i].users.id !== myId) {
        return (members[i].users.name || '').toLowerCase().indexOf(query) !== -1;
      }
    }
    return false;
  });
  renderClList(filtered);
}

// ═══ Realtime ═══

function subscribeClRealtime(userId) {
  if (_clRealtimeSub) _clRealtimeSub.unsubscribe();
  if (!window.sb) return;

  _clRealtimeSub = window.sb
    .channel('chat-list-' + userId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, function() {
      loadClConversations();
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'conversations'
    }, function() {
      loadClConversations();
    })
    .subscribe();
}

// ═══ Экспорт ═══

window.initChatList = initChatList;
window.destroyChatList = destroyChatList;
window.switchChatTab = switchChatTab;
window.clMuteConv = clMuteConv;
window.clDeleteConv = clDeleteConv;
