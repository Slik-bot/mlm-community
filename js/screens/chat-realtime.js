// ════════════════════════════════════════
// CHAT REALTIME — TRAFIQO
// Realtime подписки, Presence typing + online
// ════════════════════════════════════════

let _chatChannel = null;
let _presenceCh = null;
let _typingTimer = null;
let _deliveredChannel = null;
let _partnerLastSeen = null;

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'];

// ── Форматирование «был X назад» ─────────

function formatLastActive(isoDate) {
  if (!isoDate) return 'Не в сети';
  const now = Date.now();
  const diff = now - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return 'был ' + mins + ' мин. назад';
  const d = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return 'был сегодня в ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  if (d.toDateString() === yesterday.toDateString()) return 'был вчера';
  return 'был ' + d.getDate() + ' ' + MONTHS_RU[d.getMonth()];
}

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
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reactions'
    }, (payload) => {
      if (payload.new.user_id === myId) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const { target_id, reaction_type } = payload.new;
        const msgEl = document.querySelector(
          '[data-msg-id="' + target_id + '"] .bbl'
        );
        if (msgEl) window.showReactionBadge?.(msgEl, reaction_type);
      }
    })
    .subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setTimeout(() => subscribeChatRealtime(convId, myId, onNewMessage), 3000);
      }
    });
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
        if (anyOnline) {
          statusEl.textContent = 'В сети';
          statusEl.className = 'ch-status';
          _partnerLastSeen = new Date().toISOString();
        } else {
          const lastActive = _partnerLastSeen || window._chatPartner?.()?.last_active_at;
          statusEl.textContent = formatLastActive(lastActive);
          statusEl.className = 'ch-status offline';
        }
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

// ── Подписка на delivered_at ─────────────

function subscribeDelivered(convId, myId) {
  if (_deliveredChannel) {
    window.sb.removeChannel(_deliveredChannel);
    _deliveredChannel = null;
  }
  if (!window.sb || !convId || !myId) return;

  _deliveredChannel = window.sb
    .channel('delivered:' + convId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.' + convId
    }, (payload) => {
      const msg = payload.new;
      if (!msg || msg.sender_id !== myId) return;
      if (!msg.delivered_at || msg.is_read) return;
      window.updateMsgStatus?.(msg.id, 'delivered');
    })
    .subscribe();
}

// ════════════════════════════════════════
// Перенесено из chat-messages.js — 06.03.2026
// ════════════════════════════════════════

// ── Пометка доставки ────────────────────

async function markAsDelivered(msgId) {
  if (!msgId || !window.sb) return;
  try {
    const { error } = await window.sb
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', msgId)
      .is('delivered_at', null);
    if (error) throw error;
  } catch (err) {
    console.error('markAsDelivered:', err);
  }
}

// ── Обработка входящего сообщения ────────

async function onIncomingMessage(data) {
  window._chatPagination.msgMap[data.id] = data;
  const box = document.getElementById('chatMessages');
  const el = window.buildBubble(data, false);
  el.classList.add('msg-new');
  box?.appendChild(el);
  markAsDelivered(data.id);
  if (window._chatPagination.atBottom) { window.scrollToBottom(); await markAsRead(); }
  else { window._chatPagination.unreadCount++; window.updateScrollBtn(); }
}

// ── Typing indicator (DOM) ───────────────

function showTyping() {
  document.getElementById('chatTyping')?.classList.remove('hidden');
  window.scrollToBottom();
}

function hideTyping() {
  document.getElementById('chatTyping')?.classList.add('hidden');
}

// ── Подписка на статусы сообщений ────────

let _statusChannel = null;

function subscribeStatusUpdates(convId, myId) {
  if (_statusChannel) {
    window.sb.removeChannel(_statusChannel);
    _statusChannel = null;
  }
  _statusChannel = window.sb
    .channel('msg-status:' + convId)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public',
      table: 'conversation_members',
      filter: 'conversation_id=eq.' + convId
    }, (payload) => {
      const upd = payload.new;
      if (upd.user_id === myId) return;
      const readTime = new Date(upd.last_read_at);
      document.querySelectorAll('.msg-out .msg-status[data-msg-id]').forEach(el => {
        if (el.classList.contains('msg-status--read')) return;
        const bubble = el.closest('[data-created-at]');
        if (!bubble) return;
        if (new Date(bubble.dataset.createdAt) <= readTime) {
          window.updateMsgStatus?.(el.dataset.msgId, 'read');
        }
      });
    })
    .subscribe();
}

// ── Прочитано ──────────────────────────

async function markAsRead() {
  const convId = window._chatPagination?.convId;
  const myId = window._chatMyId?.();
  if (!convId || !myId) return;
  const div = document.getElementById('msgUnreadDivider');
  if (div) {
    div.classList.add('msg-unread-divider--hide');
    setTimeout(() => div.remove(), 400);
  }
  try {
    await window.sb.from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', myId);
  } catch (err) {
    console.error('markAsRead:', err);
  }
}

// ── Cleanup ─────────────────────────────

function unsubscribeRealtime() {
  if (_chatChannel) {
    window.sb.removeChannel(_chatChannel);
    _chatChannel = null;
  }
  if (_presenceCh) {
    window.sb.removeChannel(_presenceCh);
    _presenceCh = null;
  }
  if (_deliveredChannel) {
    window.sb.removeChannel(_deliveredChannel);
    _deliveredChannel = null;
  }
  if (_statusChannel) {
    window.sb.removeChannel(_statusChannel);
    _statusChannel = null;
  }
  clearTimeout(_typingTimer);
  _typingTimer = null;
  _partnerLastSeen = null;
}

// ── Экспорты ───────────────────────────

window.subscribeChatRealtime = subscribeChatRealtime;
window.initChatPresence = initChatPresence;
window.handleTyping = handleTyping;
window.subscribeDelivered = subscribeDelivered;
window.unsubscribeRealtime = unsubscribeRealtime;
window.markAsDelivered = markAsDelivered;
window.onIncomingMessage = onIncomingMessage;
window.showTyping = showTyping;
window.hideTyping = hideTyping;
window.subscribeStatusUpdates = subscribeStatusUpdates;
window.markAsRead = markAsRead;
window.formatLastActive = formatLastActive;
