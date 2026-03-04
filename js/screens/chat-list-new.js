// ═══════════════════════════════════════
// CHAT LIST — данные, realtime, init
// Рендер вынесен в chat-list-render.js
// ═══════════════════════════════════════

let _clTab = 'all';
let _clData = [];
let _clDebounce = null;
let _clSub = null;
let _clSwipeOpen = null;
let _clBound = false;

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
  window._clSwipeOpen = null;

  if (!_clBound) {
    clBindTabs();
    clBindSearch();
    _clBound = true;
  }
  clSubscribeRealtime(user.id);

  loadClData(user.id).then(function(convs) {
    _clData = convs;
    window.renderClList?.(convs, _clTab, '');
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
        .limit(convIds.length)
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
      unread: unread
    };
  });
}

// ═══ 3. Realtime ═══

function updateClCard(convId, msg) {
  var card = document.querySelector('[data-conv-id="' + convId + '"]');
  if (!card) {
    var user = window.getCurrentUser();
    if (!user) return;
    loadClData(user.id).then(function(convs) {
      _clData = convs;
      var q = document.getElementById('clSearch');
      window.renderClList?.(convs, _clTab, q ? q.value.trim() : '');
    });
    return;
  }
  var prev = card.querySelector('.cl-preview');
  if (prev) {
    var txt = msg.content || '';
    prev.textContent = txt.length > 40 ? txt.substring(0, 40) + '...' : txt;
  }
  var time = card.querySelector('.cl-time');
  if (time) time.textContent = clFormatTime(msg.created_at);
  var idx = _clData.findIndex(function(c) { return c.id === convId; });
  if (idx > -1) {
    _clData[idx].lastMsg = msg;
    _clData[idx].last_message_at = msg.created_at;
  }
  var badge = card.querySelector('.cl-badge');
  if (badge) {
    var current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.style.display = 'flex';
  } else {
    var meta = card.querySelector('.cl-meta');
    if (meta) {
      var newBadge = document.createElement('div');
      newBadge.className = 'cl-badge';
      newBadge.textContent = '1';
      meta.appendChild(newBadge);
    }
  }
  var list = card.parentElement;
  if (list && list.firstChild !== card) list.insertBefore(card, list.firstChild);
}

function clSubscribeRealtime(userId) {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (!window.sb) return;

  _clSub = window.sb
    .channel('cl-rt-' + userId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, function(payload) {
      var msg = payload.new;
      if (!msg || !msg.conversation_id) return;
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

// ═══ Destroy ═══

function destroyChatList() {
  if (_clSub) { _clSub.unsubscribe(); _clSub = null; }
  if (_clDebounce) clearTimeout(_clDebounce);
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

// ═══ Exports ═══

window.initChatList = initChatList;
window.destroyChatList = destroyChatList;
window.chatStartNew = chatStartNew;
