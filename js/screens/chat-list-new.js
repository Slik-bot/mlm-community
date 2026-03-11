// ═══════════════════════════════════════
// CHAT LIST — данные, realtime, init
// Рендер вынесен в chat-list-render.js
// ═══════════════════════════════════════

let _clTab = 'all';
let _clData = [];
let _clCache = null;
let _clDebounce = null;
let _clSub = null;
let _clSwipeOpen = null;
let _clBound = false;
let _clTypingChannels = {};

// ═══ 1. Init ═══

function initChatList() {
  const user = window.getCurrentUser();
  if (!user) { console.error('initChatList: no user'); return; }

  const skel = document.getElementById('clSkeleton');
  const list = document.getElementById('clList');
  const empty = document.getElementById('clEmpty');

  _clTab = 'all';
  _clSwipeOpen = null;
  window._clSwipeOpen = null;

  // Кэш есть — показать мгновенно без skeleton
  if (_clCache?.length) {
    if (skel) skel.classList.add('hidden');
    if (list) list.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    _clData = _clCache;
    window.renderClList?.(_clCache, _clTab, '');
  } else {
    if (skel) skel.classList.remove('hidden');
    if (list) { list.classList.add('hidden'); list.innerHTML = ''; }
    if (empty) empty.classList.add('hidden');
  }

  if (!_clBound) {
    clBindTabs();
    clBindSearch();
    _clBound = true;
  }
  clSubscribeRealtime(user.id);

  // Фоном загрузить актуальные данные
  loadClData(user.id).then(function(convs) {
    _clCache = convs;
    _clData = convs;
    if (skel) skel.classList.add('hidden');
    if (list) list.classList.remove('hidden');
    const q = document.getElementById('clSearch');
    window.renderClList?.(convs, _clTab, q ? q.value.trim() : '');
    clSubscribeTyping(convs, user.id);
  });
}

// ═══ 2. Load data ═══

async function loadClData(userId) {
  try {
    const { data: mems, error: e1 } = await window.sb
      .from('conversation_members')
      .select('conversation_id, last_read_at, is_muted, is_pinned')
      .eq('user_id', userId);
    if (e1) throw e1;
    if (!mems || !mems.length) return [];

    const convIds = mems.map(function(m) { return m.conversation_id; });
    const readMap = {};
    const muteMap = {};
    const pinMap = {};
    mems.forEach(function(m) {
      readMap[m.conversation_id] = m.last_read_at;
      muteMap[m.conversation_id] = !!m.is_muted;
      pinMap[m.conversation_id] = !!m.is_pinned;
    });

    const [r1, r2, r3] = await Promise.all([
      window.sb.from('conversations')
        .select('id, type, title, deal_id, last_message_at')
        .in('id', convIds).order('last_message_at', { ascending: false, nullsFirst: false }),
      window.sb.from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds).neq('user_id', userId),
      window.sb.from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', convIds).eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(convIds.length * 50)
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    if (r3.error) throw r3.error;

    const otherMems = r2.data || [];
    const uids = [...new Set(otherMems.map(function(m) { return m.user_id; }))];
    const convRows = r1.data || [];
    const dids = [...new Set(convRows.filter(function(c) { return c.deal_id; }).map(function(c) { return c.deal_id; }))];

    const [r4, r5] = await Promise.all([
      uids.length ? window.sb.from('users').select('id, name, avatar_url, dna_type, last_active_at').in('id', uids) : { data: [], error: null },
      dids.length ? window.sb.from('deals').select('id, title, status, amount').in('id', dids) : { data: [], error: null }
    ]);
    if (r4.error) throw r4.error;
    if (r5.error) throw r5.error;

    return clAssemble(convRows, readMap, muteMap, pinMap, otherMems, r3.data || [], r4.data || [], r5.data || []);
  } catch (err) {
    console.error('loadClData:', err);
    return [];
  }
}

function clAssemble(convRows, readMap, muteMap, pinMap, otherMems, msgs, users, deals) {
  const uMap = {};
  users.forEach(function(u) { uMap[u.id] = u; });
  const dMap = {};
  deals.forEach(function(d) { dMap[d.id] = d; });
  const mMap = {};
  msgs.forEach(function(m) { if (!mMap[m.conversation_id]) mMap[m.conversation_id] = m; });

  return convRows.map(function(c) {
    const othersRaw = otherMems.filter(function(m) { return m.conversation_id === c.id; });
    const others = othersRaw
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
      unread: unread,
      is_muted: !!muteMap[c.id],
      is_pinned: !!pinMap[c.id]
    };
  }).sort(function(a, b) {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });
}

// ═══ 3. Realtime ═══

function updateClCard(convId, msg) {
  const card = document.querySelector('[data-conv-id="' + convId + '"]');
  if (!card) {
    const user = window.getCurrentUser();
    if (!user) return;
    loadClData(user.id).then(function(convs) {
      _clData = convs;
      const q = document.getElementById('clSearch');
      window.renderClList?.(convs, _clTab, q ? q.value.trim() : '');
    });
    return;
  }
  const prev = card.querySelector('.cl-preview');
  if (prev) {
    const txt = msg.content || '';
    prev.textContent = txt.length > 40 ? txt.substring(0, 40) + '...' : txt;
  }
  const time = card.querySelector('.cl-time');
  if (time) time.textContent = clFormatTime(msg.created_at);
  const idx = _clData.findIndex(function(c) { return c.id === convId; });
  if (idx > -1) {
    _clData[idx].lastMsg = msg;
    _clData[idx].last_message_at = msg.created_at;
    _clData.sort(function(a, b) {
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });
  }
  const badge = card.querySelector('.cl-badge');
  if (badge) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.style.display = 'flex';
  } else {
    const meta = card.querySelector('.cl-meta');
    if (meta) {
      const newBadge = document.createElement('div');
      newBadge.className = 'cl-badge';
      newBadge.textContent = '1';
      meta.appendChild(newBadge);
    }
  }
  const list = card.parentElement;
  if (list && list.firstChild !== card) list.insertBefore(card, list.firstChild);
  _clData.forEach(function(conv) {
    const el = list.querySelector('[data-conv-id="' + conv.id + '"]');
    if (el) list.appendChild(el);
  });
}

function clSubscribeRealtime(userId) {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (!window.sb) return;

  _clSub = window.sb
    .channel('cl-rt-' + userId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, function(payload) {
      const msg = payload.new;
      if (!msg || !msg.conversation_id) return;
      if (!_clData.some(function(c) { return c.id === msg.conversation_id; })) {
        const user = window.getCurrentUser?.();
        if (user) loadClData(user.id);
        return;
      }
      updateClCard(msg.conversation_id, msg);
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
      window.renderClList?.(_clData, _clTab, q ? q.value.trim() : '');
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
      window.renderClList?.(_clData, _clTab, inp.value.trim());
    }, 300);
  });
}

// ═══ Typing presence в списке чатов ═══

function clShowTyping(convId) {
  const item = document.querySelector(
    '.cl-item[data-conv-id="' + convId + '"]'
  );
  if (!item) return;
  item.classList.add('cl-item--typing');
}

function clHideTyping(convId) {
  const item = document.querySelector(
    '.cl-item[data-conv-id="' + convId + '"]'
  );
  if (!item) return;
  item.classList.remove('cl-item--typing');
}

function clSubscribeTyping(convs, myId) {
  Object.values(_clTypingChannels).forEach(function(ch) {
    window.sb.removeChannel(ch);
  });
  _clTypingChannels = {};
  convs.forEach(function(conv) {
    const ch = window.sb.channel(
      'presence:' + conv.id,
      { config: { presence: { key: myId } } }
    );
    ch.on('presence', { event: 'sync' }, function() {
      const state = ch.presenceState();
      const isTyping = Object.entries(state)
        .some(function(entry) {
          return entry[0] !== myId &&
            entry[1].some(function(p) { return p.typing === true; });
        });
      if (isTyping) clShowTyping(conv.id);
      else clHideTyping(conv.id);
    })
    .subscribe();
    _clTypingChannels[conv.id] = ch;
  });
}

// ═══ Destroy ═══

function destroyChatList() {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (_clDebounce) clearTimeout(_clDebounce);
  Object.values(_clTypingChannels).forEach(function(ch) {
    window.sb.removeChannel(ch);
  });
  _clTypingChannels = {};
  _clCache = null;
  _clData = [];
  _clSwipeOpen = null;
  window._clSwipeOpen = null;
}

function chatStartNew() {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }
  window.showToast('Выберите пользователя для начала диалога');
}

// ═══ Mark as read ═══

async function clMarkAsRead(conv, item) {
  const user = window.getCurrentUser?.();
  if (!user || !conv) return;
  try {
    const { error } = await window.sb
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conv.id)
      .eq('user_id', user.id);
    if (error) throw error;
    const badge = item.querySelector('.cl-badge');
    if (badge) badge.remove();
    window.clCloseSwipe?.(item);
    window.showToast?.('Прочитано');
  } catch (err) {
    console.error('clMarkAsRead:', err);
    window.showToast?.('Ошибка');
  }
}

// ═══ Toggle pin ═══

async function clTogglePin(conv, item, pinBtn) {
  const user = window.getCurrentUser?.();
  if (!user || !conv) return;
  const newVal = !conv.is_pinned;
  try {
    const { error } = await window.sb
      .from('conversation_members')
      .update({ is_pinned: newVal })
      .eq('conversation_id', conv.id)
      .eq('user_id', user.id);
    if (error) throw error;
    conv.is_pinned = newVal;
    item.classList.toggle('cl-item--pinned', newVal);
    const label = pinBtn.querySelector('span');
    if (label) label.textContent = newVal ? 'Открепить' : 'Закрепить';
    window.clCloseSwipe?.(item);
    window.showToast?.(newVal ? 'Чат закреплён' : 'Чат откреплён');
  } catch (err) {
    console.error('clTogglePin:', err);
    window.showToast?.('Ошибка');
  }
}

// ═══ Exports ═══

window.initChatList = initChatList;
window.destroyChatList = destroyChatList;
window.chatStartNew = chatStartNew;
window.clMarkAsRead = clMarkAsRead;
window.clTogglePin = clTogglePin;
