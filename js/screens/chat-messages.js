// ════════════════════════════════════════
// CHAT MESSAGES — TRAFIQO (ядро)
// INPUT → chat-input.js
// REALTIME → chat-realtime.js
// RENDER → chat-messages-render.js
// ════════════════════════════════════════

let _convId = null;
let _myId = null;
let _partner = null;
let _replyTo = null;
let _msgMap = {};
let _atBottom = true;
let _unreadCount = 0;
let _hasMore = false;
let _pins = [];
let _pinIndex = 0;
let _loadingMore = false;
let _oldestTs = null;

const MSG_PAGE = 30;

// ── ДНК-тема диалога ─────────────────────

function applyChatDnaTheme(dnaType) {
  const color = window.getDnaColor(dnaType);
  const wrap = document.getElementById('scrChat');
  if (!wrap) return;
  wrap.style.setProperty('--dna-color', color);
}

// ── Инициализация ──────────────────────

async function initChatMessages(convId, partner) {
  _convId = convId;
  _partner = partner;
  applyChatDnaTheme(partner?.dna_type);
  _myId = window.getCurrentUser()?.id;
  _replyTo = null;
  _msgMap = {};
  _atBottom = true;
  _unreadCount = 0;
  if (!_convId || !_myId) return;
  window.renderChatHead();
  await loadMessages();
  await loadPinnedMessage(_convId);
  window.bindChatInput();
  bindScrollWatch();
  window.initChatGestures(document.getElementById('scrChat'));
  window.subscribeChatRealtime(_convId, _myId, window.onIncomingMessage);
  window.subscribeStatusUpdates(_convId, _myId);
  window.initChatPresence(_convId, _myId);
  window.subscribeDelivered?.(_convId, _myId);
  const divider = document.getElementById('msgUnreadDivider');
  if (divider) divider.scrollIntoView({ block: 'center' });
  else scrollToBottom();
}

// ── Загрузка: хелперы ─────────────────

function isSameGroup(a, b) {
  if (!a || !b) return false;
  if (a.sender_id !== b.sender_id) return false;
  if (new Date(a.created_at).toDateString() !== new Date(b.created_at).toDateString()) return false;
  return Math.abs(new Date(b.created_at) - new Date(a.created_at)) < 5 * 60 * 1000;
}

function renderMessages(messages, lastReadAt, box) {
  let lastDate = null;
  let dividerInserted = false;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    _msgMap[msg.id] = msg;
    if (!dividerInserted && lastReadAt && msg.sender_id !== _myId && msg.created_at > lastReadAt) {
      box.appendChild(window.buildUnreadDivider());
      dividerInserted = true;
    }
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      box.appendChild(window.buildDateDivider(msg.created_at));
      lastDate = msgDate;
    }
    const prev = isSameGroup(messages[i - 1], msg);
    const next = isSameGroup(msg, messages[i + 1]);
    const grpPos = prev ? (next ? 'mid' : 'last') : (next ? 'first' : 'single');
    box.appendChild(window.buildBubble(msg, grpPos));
  }
}

function applyDnaFallback(box) {
  const partnerDna = window._chatPartner?.()?.dna_type;
  const fallbackColor = partnerDna ? window.getDnaColor(partnerDna) : null;
  if (!fallbackColor) return;
  const rgb = window.hexToRgb(fallbackColor);
  box.querySelectorAll('.msg:not(.msg-out) .bbl').forEach(function(b) {
    if (!b.style.getPropertyValue('--msg-dna-rgb')) {
      b.style.setProperty('--msg-dna-rgb', rgb);
    }
  });
}

// ── Загрузка сообщений ─────────────────

async function loadMessages() {
  _hasMore = false;
  _loadingMore = false;
  _oldestTs = null;
  try {
    const [msgRes, memberRes] = await Promise.all([
      window.sb
        .from('messages')
        .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id), forwarded:messages!forwarded_from_id(id,content,sender:users!sender_id(id,name))')
        .eq('conversation_id', _convId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(MSG_PAGE + 1),
      window.sb
        .from('conversation_members')
        .select('last_read_at')
        .eq('conversation_id', _convId)
        .eq('user_id', _myId)
        .single()
    ]);
    if (msgRes.error) throw msgRes.error;
    const lastReadAt = memberRes.data?.last_read_at || null;
    const box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = '';
    _msgMap = {};
    const msgs = (msgRes.data || []);
    _hasMore = msgs.length > MSG_PAGE;
    const page = _hasMore ? msgs.slice(0, MSG_PAGE) : msgs;
    let messages = page.reverse();
    _oldestTs = messages.length > 0 ? messages[0].created_at : null;
    renderMessages(messages, lastReadAt, box);
    applyDnaFallback(box);

    const undeliveredIds = messages
      .filter(m => m.sender_id !== _myId
        && !m.delivered_at)
      .map(m => m.id);

    if (undeliveredIds.length > 0) {
      window.sb
        .from('messages')
        .update({
          delivered_at: new Date().toISOString()
        })
        .in('id', undeliveredIds)
        .then(({ error }) => {
          if (error) {
            console.error('bulkDelivered:', error);
          }
        });
    }

    await window.markAsRead();
  } catch (err) {
    console.error('loadMessages:', err);
  }
}

// ── Удаление ───────────────────────────

async function deleteMessage(msgId) {
  try {
    const { error } = await window.sb
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', msgId)
      .eq('sender_id', _myId);
    if (error) throw error;
    const el = document.querySelector('[data-msg-id="' + msgId + '"]');
    if (el) {
      el.style.transition = 'all 200ms';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9)';
      setTimeout(() => el.remove(), 210);
    }
  } catch (err) {
    console.error('deleteMessage:', err);
    window.showToast?.('Не удалось удалить');
  }
}

// ── Скролл ─────────────────────────────

function scrollToBottom() {
  const box = document.getElementById('chatMessages');
  if (box) box.scrollTop = box.scrollHeight;
  _atBottom = true;
  _unreadCount = 0;
  updateScrollBtn();
}

async function scrollToMsg(msgId) {
  if (!msgId) return;

  let el = document.querySelector(
    '.msg[data-msg-id="' + msgId + '"]'
  );

  if (!el) {
    window.showToast?.('Загрузка...');
    try {
      const { data } = await window.sb
        .from('messages')
        .select(
          '*, sender:users!sender_id' +
          '(id,name,avatar_url,dna_type),' +
          'forwarded:messages!forwarded_from_id' +
          '(id,content,sender:users!sender_id(id,name))'
        )
        .eq('id', msgId)
        .single();

      if (data) {
        const box = document.getElementById(
          'chatMessages'
        );
        if (!box) return;

        const bubble = window.buildBubble?.(data);
        if (!bubble) {
          window.showToast?.('Не удалось загрузить');
          return;
        }

        const temp = document.createElement('div');
        temp.id = 'pin-temp-msg';
        temp.appendChild(bubble);
        box.insertBefore(temp, box.firstChild);

        el = temp.querySelector(
          '.msg[data-msg-id="' + msgId + '"]'
        );

        setTimeout(() => {
          document.getElementById(
            'pin-temp-msg'
          )?.remove();
        }, 3000);
      }
    } catch (err) {
      console.error('scrollToMsg:', err);
    }
  }

  if (!el) {
    window.showToast?.('Сообщение не найдено');
    return;
  }

  const box = document.getElementById('chatMessages');
  if (box) {
    box.scrollTop = el.offsetTop
      - (box.clientHeight / 2)
      + (el.clientHeight / 2);
  }

  el.classList.remove('msg-highlight');
  void el.offsetWidth;
  el.classList.add('msg-highlight');
  setTimeout(
    () => el.classList.remove('msg-highlight'),
    1500
  );
}

function bindScrollWatch() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.addEventListener('scroll', () => {
    if (box.scrollTop < 80 && _hasMore && !_loadingMore) {
      window.loadOlderMessages?.();
    }
    const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
    _atBottom = dist < 80;
    if (_atBottom) { _unreadCount = 0; }
    updateScrollBtn();
  }, { passive: true });
}

function updateScrollBtn() {
  const btn = document.getElementById('chScrollBtn');
  const badge = document.getElementById('chScrollBadge');
  if (!btn) return;
  if (_atBottom) btn.classList.add('hidden');
  else btn.classList.remove('hidden');
  if (badge) {
    if (_unreadCount > 0) {
      badge.textContent = _unreadCount;
      badge.classList.remove('hidden');
    } else badge.classList.add('hidden');
  }
}

// ── Уничтожение ────────────────────────

function destroyChat() {
  document.getElementById('pin-temp-msg')?.remove();
  window.hidePinBanner?.();
  const wrap = document.getElementById('scrChat');
  if (wrap) wrap.style.removeProperty('--dna-color');
  window.unsubscribeRealtime();
  _convId = null;
  _myId = null;
  _partner = null;
  _replyTo = null;
  _msgMap = {};
}

// ── Ответ из контекстного меню ─────────

document.addEventListener('chat:reply', (e) => {
  const msg = _msgMap[e.detail.msgId];
  if (msg) window.startReply?.(msg);
});

// ── Доступ к состоянию ─────────────────

window.getChatReplyTo = () => _replyTo;
window.setChatReplyTo = (v) => { _replyTo = v; };
window._chatPartner = () => _partner;
window._chatMyId = () => _myId;

// ── Редактирование сообщения ─────────

async function updateMessage(msgId, newText) {
  if (!msgId || !newText.trim()) return false;
  try {
    const { error } = await window.sb.from('messages')
      .update({ content: newText.trim(), is_edited: true })
      .eq('id', msgId)
      .eq('sender_id', _myId);
    if (error) throw error;
    const msgEl = document.querySelector(`[data-msg-id="${msgId}"] .bbl-text`);
    if (msgEl) msgEl.textContent = newText.trim();
    const editedEl = document.querySelector(`[data-msg-id="${msgId}"] .bbl-edited`);
    if (editedEl) editedEl.style.display = 'inline';
    else {
      const meta = document.querySelector(`[data-msg-id="${msgId}"] .bbl-meta`);
      if (meta) {
        const span = document.createElement('span');
        span.className = 'bbl-edited';
        span.textContent = 'изменено';
        meta.prepend(span);
        const bblEl = document.querySelector(`[data-msg-id="${msgId}"] .bbl`);
        if (bblEl) bblEl.classList.add('bbl--edited');
      }
    }
    return true;
  } catch (err) {
    console.error('updateMessage error:', err);
    return false;
  }
}

// ── Закрепление сообщения ────────────

async function pinMessage(msgId, convId) {
  if (!msgId || !convId) return;
  try {
    const { data: existing } = await window.sb
      .from('pinned_messages')
      .select('id')
      .eq('conversation_id', convId)
      .eq('message_id', msgId)
      .single();
    if (existing) {
      const { error } = await window.sb
        .from('pinned_messages')
        .delete()
        .eq('conversation_id', convId)
        .eq('message_id', msgId);
      if (error) throw error;
      window.showToast?.('Сообщение откреплено', 'ok', 1500);
    } else {
      const { error } = await window.sb
        .from('pinned_messages')
        .insert({
          conversation_id: convId,
          message_id: msgId,
          pinned_by: _myId,
          position: _pins.length
        });
      if (error) throw error;
      window.showToast?.('Сообщение закреплено', 'ok', 1500);
    }
    await loadPinnedMessage(convId);
  } catch (err) {
    console.error('pinMessage:', err);
    window.showToast?.('Ошибка', 'err', 1500);
  }
}

async function loadPinnedMessage(convId) {
  if (!convId) return;
  const { data } = await window.sb
    .from('pinned_messages')
    .select('message_id, msg:messages!message_id(id, content)')
    .eq('conversation_id', convId)
    .order('position', { ascending: true });
  if (_convId !== convId) return;
  _pins = (data || []).filter(p => p.msg);
  _pinIndex = 0;
  if (_pins.length > 0) {
    const p = _pins[0];
    window.showPinBanner?.(p.msg.id, p.msg.content, 1, _pins.length);
  } else {
    window.hidePinBanner?.();
  }
}

function nextPin() {
  if (_pins.length === 0) return;
  _pinIndex = (_pinIndex + 1) % _pins.length;
  const p = _pins[_pinIndex];
  window.showPinBanner?.(p.msg.id, p.msg.content, _pinIndex + 1, _pins.length);
  window.scrollToMsg?.(p.msg.id);
}

// ── Экспорты ───────────────────────────

window.initChatMessages = initChatMessages;
window.deleteMessage = deleteMessage;
window.updateMessage = updateMessage;
window.pinMessage = pinMessage;
window.loadPinnedMessage = loadPinnedMessage;
window.nextPin = nextPin;
window.scrollToBottom = scrollToBottom;
window.scrollToMsg = scrollToMsg;
window.updateScrollBtn = updateScrollBtn;
window.destroyChat = destroyChat;

window._chatPagination = {
  get hasMore()      { return _hasMore; },
  set hasMore(v)     { _hasMore = v; },
  get loadingMore()  { return _loadingMore; },
  set loadingMore(v) { _loadingMore = v; },
  get oldestTs()     { return _oldestTs; },
  set oldestTs(v)    { _oldestTs = v; },
  get convId()       { return _convId; },
  get myId()         { return _myId; },
  get msgMap()       { return _msgMap; },
  get msgPageSize()  { return MSG_PAGE; },
  get atBottom()     { return _atBottom; },
  set atBottom(v)    { _atBottom = v; },
  get unreadCount()  { return _unreadCount; },
  set unreadCount(v) { _unreadCount = v; }
};
