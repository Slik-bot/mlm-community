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
  if (!_myId) {
    await new Promise(r => setTimeout(r, 500));
    _myId = window.getCurrentUser()?.id;
  }
  _replyTo = null;
  _msgMap = {};
  _atBottom = true;
  _unreadCount = 0;
  if (!_convId || !_myId) return;
  window.renderChatHead();
  await loadMessages();
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

function renderMessages(messages, lastReadAt, box) {
  let lastDate = null;
  let lastSender = null;
  let lastTimestamp = null;
  let dividerInserted = false;
  messages.forEach(function(msg) {
    _msgMap[msg.id] = msg;
    if (!dividerInserted && lastReadAt && msg.sender_id !== _myId && msg.created_at > lastReadAt) {
      box.appendChild(window.buildUnreadDivider());
      dividerInserted = true;
    }
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      box.appendChild(window.buildDateDivider(msg.created_at));
      lastDate = msgDate;
      lastSender = null;
      lastTimestamp = null;
    }
    const timeDiff = lastTimestamp ? (new Date(msg.created_at) - new Date(lastTimestamp)) : Infinity;
    const isGrp = lastSender === msg.sender_id && timeDiff < 5 * 60 * 1000;
    box.appendChild(window.buildBubble(msg, isGrp));
    lastSender = msg.sender_id;
    lastTimestamp = msg.created_at;
  });
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
        .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
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
    const msgIds = messages.map(m => m.id);
    let reactionsMap = {};
    if (msgIds.length) {
      const { data: rxData } = await window.sb
        .from('reactions')
        .select('target_id, reaction_type, user_id')
        .eq('target_type', 'message')
        .in('target_id', msgIds);
      if (rxData) {
        rxData.forEach(r => {
          if (!reactionsMap[r.target_id]) reactionsMap[r.target_id] = {};
          if (!reactionsMap[r.target_id][r.reaction_type])
            reactionsMap[r.target_id][r.reaction_type] = { count: 0, users: [] };
          reactionsMap[r.target_id][r.reaction_type].count++;
          reactionsMap[r.target_id][r.reaction_type].users.push(r.user_id);
        });
      }
      messages = messages.map(m => ({
        ...m,
        reactions: reactionsMap[m.id] || {}
      }));
    }
    renderMessages(messages, lastReadAt, box);
    applyDnaFallback(box);
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

function scrollToMsg(msgId) {
  const el = document.querySelector('[data-msg-id="' + msgId + '"]');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

// ── Экспорты ───────────────────────────

window.initChatMessages = initChatMessages;
window.deleteMessage = deleteMessage;
window.updateMessage = updateMessage;
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
