// ════════════════════════════════════════
// CHAT REALTIME — TRAFIQO
// Realtime подписки, Presence typing + online
// ════════════════════════════════════════

let _chatChannel = null;
let _readChannel = null;
let _presenceCh = null;
let _typingTimer = null;

// ── Подписка на новые сообщения ─────────

function subscribeChatRealtime(convId, myId, onNewMessage) {
  if (_chatChannel) {
    window.sb.removeChannel(_chatChannel);
    _chatChannel = null;
  }
  _chatChannel = window.sb
    .channel('chat:' + convId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.' + convId
    }, async (payload) => {
      const msg = payload.new;
      if (msg.sender_id === myId) return;
      const { data } = await window.sb
        .from('messages')
        .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
        .eq('id', msg.id).single();
      if (!data) return;
      if (typeof onNewMessage === 'function') onNewMessage(data);
    })
    .subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setTimeout(() => subscribeChatRealtime(convId, myId, onNewMessage), 3000);
      }
    });
}

// ── Подписка на прочтение ────────────────

function subscribeReadStatus(convId, myId) {
  if (_readChannel) {
    window.sb.removeChannel(_readChannel);
    _readChannel = null;
  }
  _readChannel = window.sb
    .channel('read:' + convId)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public',
      table: 'conversation_members',
      filter: 'conversation_id=eq.' + convId
    }, (payload) => {
      if (payload.new.user_id !== myId) {
        window.markOutgoingAsRead?.();
      }
    })
    .subscribe();
}

// ── Presence: typing + online ───────────

function initChatPresence(conversationId, currentUserId) {
  if (_presenceCh) {
    window.sb.removeChannel(_presenceCh);
    _presenceCh = null;
  }
  _presenceCh = window.sb
    .channel('presence:' + conversationId)
    .on('presence', { event: 'sync' }, () => {
      const state = _presenceCh.presenceState();
      const others = Object.values(state)
        .flat()
        .filter(p => p.userId !== currentUserId);

      const anyTyping = others.some(p => p.typing);
      const anyOnline = others.length > 0;

      if (anyTyping) window.showTyping?.();
      else window.hideTyping?.();

      const statusEl = document.getElementById('chStatus');
      const dot = document.getElementById('chAvDot');
      if (statusEl) {
        statusEl.textContent = anyOnline ? 'В сети' : 'Не в сети';
        statusEl.className = anyOnline ? 'ch-status' : 'ch-status offline';
      }
      if (dot) {
        if (anyOnline) dot.classList.remove('hidden');
        else dot.classList.add('hidden');
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await _presenceCh.track({ userId: currentUserId, typing: false });
      }
    });
}

// ── Typing indicator ────────────────────

function handleTyping() {
  if (!_presenceCh) return;
  _presenceCh.track({ userId: window.getCurrentUser()?.id, typing: true });
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(() => {
    _presenceCh.track({ userId: window.getCurrentUser()?.id, typing: false });
  }, 1500);
}

// ── Cleanup ─────────────────────────────

function unsubscribeRealtime() {
  if (_chatChannel) {
    window.sb.removeChannel(_chatChannel);
    _chatChannel = null;
  }
  if (_readChannel) {
    window.sb.removeChannel(_readChannel);
    _readChannel = null;
  }
  if (_presenceCh) {
    window.sb.removeChannel(_presenceCh);
    _presenceCh = null;
  }
  clearTimeout(_typingTimer);
  _typingTimer = null;
}

// ── Экспорты ───────────────────────────

window.subscribeChatRealtime = subscribeChatRealtime;
window.subscribeReadStatus = subscribeReadStatus;
window.initChatPresence = initChatPresence;
window.handleTyping = handleTyping;
window.unsubscribeRealtime = unsubscribeRealtime;
