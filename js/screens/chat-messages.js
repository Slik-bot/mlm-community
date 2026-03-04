// ════════════════════════════════════════
// CHAT MESSAGES — TRAFIQO
// ════════════════════════════════════════

let _convId = null;
let _myId = null;
let _partner = null;
let _replyTo = null;
let _msgMap = {};
let _atBottom = true;
let _unreadCount = 0;

// ── Инициализация ──────────────────────

async function initChatMessages(convId, partner) {
  _convId = convId;
  _partner = partner;
  _myId = window.getCurrentUser()?.id;
  _replyTo = null;
  _msgMap = {};
  _atBottom = true;
  _unreadCount = 0;
  if (!_convId || !_myId) return;
  renderChatHead();
  await loadMessages();
  bindChatInput();
  bindScrollWatch();
  window.subscribeChatRealtime(_convId, _myId, onIncomingMessage);
  window.subscribeReadStatus(_convId, _myId);
  window.initChatPresence(_convId, _myId);
  const divider = document.getElementById('msgUnreadDivider');
  if (divider) divider.scrollIntoView({ block: 'center' });
  else scrollToBottom();
}

// ── Шапка чата ────────────────────────

function renderChatHead() {
  const ph = document.getElementById('chAvPh');
  const dot = document.getElementById('chAvDot');
  const name = document.getElementById('chName');
  const status = document.getElementById('chStatus');
  const tfRecipient = document.getElementById('tfRecipient');
  if (!ph || !name) return;
  const p = _partner || {};
  const dnaMap = {
    strategist: 'dna-s', communicator: 'dna-c',
    creator: 'dna-r', analyst: 'dna-a'
  };
  ph.className = 'ch-av-ph' + (dnaMap[p.dna_type] ? ' ' + dnaMap[p.dna_type] : '');
  ph.innerHTML = '';
  if (p.avatar_url) {
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
    ph.appendChild(img);
  } else {
    ph.textContent = (p.name || 'П')[0].toUpperCase();
  }
  if (name) name.textContent = p.name || 'Пользователь';
  if (status) { status.textContent = 'В сети'; status.className = 'ch-status'; }
  if (dot) dot.classList.remove('hidden');
  if (tfRecipient) tfRecipient.textContent = p.name || '';
}

// ── Загрузка сообщений ─────────────────

async function loadMessages() {
  try {
    const [msgRes, memberRes] = await Promise.all([
      window.sb
        .from('messages')
        .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
        .eq('conversation_id', _convId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50),
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
    let lastDate = null;
    let lastSender = null;
    let dividerInserted = false;
    (msgRes.data || []).forEach((msg) => {
      _msgMap[msg.id] = msg;
      if (!dividerInserted && lastReadAt && msg.sender_id !== _myId && msg.created_at > lastReadAt) {
        box.appendChild(buildUnreadDivider());
        dividerInserted = true;
      }
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        box.appendChild(buildDateDivider(msg.created_at));
        lastDate = msgDate;
        lastSender = null;
      }
      const isGrp = lastSender === msg.sender_id;
      box.appendChild(buildBubble(msg, isGrp));
      lastSender = msg.sender_id;
    });
    await markAsRead();
  } catch (err) {
    console.error('loadMessages:', err);
  }
}

// ── Построить пузырь ───────────────────

function buildBubble(msg, isGrp) {
  const isOut = msg.sender_id === _myId;
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + (isOut ? 'msg-out' : 'msg-in') + (isGrp ? ' grp' : '');
  wrapper.dataset.msgId = msg.id;
  if (!isOut) {
    const av = document.createElement('div');
    av.className = 'msg-av-w';
    if (msg.sender?.avatar_url) {
      const img = document.createElement('img');
      img.src = msg.sender.avatar_url;
      img.alt = (msg.sender?.name || 'П')[0].toUpperCase();
      av.appendChild(img);
    } else {
      av.textContent = (msg.sender?.name || 'П')[0].toUpperCase();
    }
    wrapper.appendChild(av);
  }
  const bbl = document.createElement('div');
  bbl.className = 'bbl';
  if (msg.reply_to?.content) {
    const replyDiv = document.createElement('div');
    replyDiv.className = 'bbl-reply';
    replyDiv.textContent = msg.reply_to.content.slice(0, 60);
    replyDiv.addEventListener('click', () => scrollToMsg(msg.reply_to.id));
    bbl.appendChild(replyDiv);
  }
  const content = document.createElement('div');
  content.textContent = msg.content || '';
  bbl.appendChild(content);
  const meta = buildMeta(msg, isOut);
  bbl.appendChild(meta);
  wrapper.appendChild(bbl);
  window.bindBubbleEvents(wrapper, bbl, msg, isOut);
  return wrapper;
}

// ── Мета сообщения ─────────────────────

function buildMeta(msg, isOut) {
  const meta = document.createElement('div');
  meta.className = 'bbl-meta';
  const t = document.createElement('span');
  t.className = 'bbl-t';
  t.textContent = formatMsgTime(msg.created_at);
  meta.appendChild(t);
  if (isOut) {
    const chk = document.createElement('span');
    chk.className = 'chk chk-sent';
    chk.innerHTML = '<svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    meta.appendChild(chk);
  }
  return meta;
}

// ── Отправка ───────────────────────────

async function chatSend() {
  const input = document.getElementById('chatInput');
  const text = input?.value.trim();
  if (!text || !_convId || !_myId) return;
  const box = document.getElementById('chatMessages');
  input.value = '';
  chatToggleSend();
  chatInputResize(input);
  const replyRef = _replyTo;
  if (_replyTo) window.cancelReply();

  // Optimistic: мгновенный пузырь
  const tempId = 'temp_' + Date.now();
  const user = window.getCurrentUser() || {};
  const tempMsg = {
    id: tempId,
    content: text,
    sender_id: _myId,
    sender: { id: _myId, name: user.name || '' },
    created_at: new Date().toISOString(),
    reply_to: replyRef ? { id: replyRef.id, content: replyRef.content } : null
  };
  const el = buildBubble(tempMsg, false);
  el.dataset.tempId = tempId;
  el.classList.add('msg-new', 'msg-sending');
  box?.appendChild(el);
  scrollToBottom();

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }

  // Фоновая отправка
  const payload = {
    conversation_id: _convId,
    sender_id: _myId,
    content: text,
    type: 'text'
  };
  if (replyRef) payload.reply_to_id = replyRef.id;

  try {
    const { data, error } = await window.sb
      .from('messages').insert(payload)
      .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
      .single();
    if (error) throw error;
    _msgMap[data.id] = data;
    const tmp = box?.querySelector('[data-temp-id="' + tempId + '"]');
    if (tmp) {
      tmp.dataset.msgId = data.id;
      tmp.dataset.tempId = '';
      tmp.classList.remove('msg-sending');
    }
    await window.sb.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', _convId);
  } catch (err) {
    console.error('chatSend:', err);
    const tmp = box?.querySelector('[data-temp-id="' + tempId + '"]');
    if (tmp) {
      tmp.classList.remove('msg-sending');
      tmp.classList.add('msg-error');
      tmp.addEventListener('click', () => {
        tmp.remove();
        const inp = document.getElementById('chatInput');
        if (inp) { inp.value = text; chatToggleSend(); }
        window.showToast?.('Текст возвращён — отправьте снова');
      }, { once: true });
    }
  }
}

// ── Обработка входящего сообщения ────────

async function onIncomingMessage(data) {
  _msgMap[data.id] = data;
  const box = document.getElementById('chatMessages');
  const el = buildBubble(data, false);
  el.classList.add('msg-new');
  box?.appendChild(el);
  if (_atBottom) { scrollToBottom(); await markAsRead(); }
  else { _unreadCount++; updateScrollBtn(); }
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

// ── TF перевод ─────────────────────────

function chatTransfer() {
  document.getElementById('chatTfOv')?.classList.add('on');
  setTimeout(() => document.getElementById('tfInput')?.focus(), 380);
}
function hideTfModal() {
  document.getElementById('chatTfOv')?.classList.remove('on');
}
function calcTf(v) {
  const el = document.getElementById('tfConvert');
  if (el) el.textContent = '≈ $' + ((parseFloat(v) || 0) * 0.01).toFixed(2);
}
async function sendTf() {
  window.showToast?.('Скоро: TF перевод');
  hideTfModal();
}

// ── Typing indicator ───────────────────

function showTyping() {
  document.getElementById('chatTyping')?.classList.remove('hidden');
  scrollToBottom();
}
function hideTyping() {
  document.getElementById('chatTyping')?.classList.add('hidden');
}

// ── Input хелперы ──────────────────────

function chatInputResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function chatToggleSend() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  if (!input || !btn) return;
  if (input.value.trim()) btn.classList.add('visible');
  else btn.classList.remove('visible');
}
function chatInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); chatSend();
  }
}
function bindChatInput() {
  const btn = document.getElementById('chatSendBtn');
  if (btn) btn.classList.remove('visible');
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = '';
    chatInputResize(input);
    input.addEventListener('input', () => window.handleTyping?.());
  }
  window.cancelReply();
  bindTgViewport();
}

function bindTgViewport() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  const update = () => {
    const h = tg.viewportHeight;
    if (h && h > 100) {
      document.documentElement.style.setProperty(
        '--tg-viewport-height', h + 'px'
      );
    }
  };
  tg.onEvent('viewportChanged', update);
  update();
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

// ── Прочитано ──────────────────────────

async function markAsRead() {
  if (!_convId || !_myId) return;
  const div = document.getElementById('msgUnreadDivider');
  if (div) {
    div.style.transition = 'opacity 400ms';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 400);
  }
  try {
    await window.sb.from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', _convId)
      .eq('user_id', _myId);
  } catch (err) {
    console.error('markAsRead:', err);
  }
}

// ── Галочки прочтения ───────────────────

function markOutgoingAsRead() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  const SVG_READ = '<svg width="15" height="8" fill="none" viewBox="0 0 15 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4l2.5 2.5L14 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  box.querySelectorAll('.msg-out:not(.msg-sending) .chk').forEach(chk => {
    if (!chk.classList.contains('chk-read')) {
      chk.className = 'chk chk-read';
      chk.innerHTML = SVG_READ;
    }
  });
}

// ── Дата разделитель ───────────────────

function buildDateDivider(dateStr) {
  const d = document.createElement('div');
  d.className = 'msg-date';
  const s = document.createElement('span');
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) s.textContent = 'Сегодня';
  else if (date.toDateString() === yesterday.toDateString()) s.textContent = 'Вчера';
  else s.textContent = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  d.appendChild(s);
  return d;
}

// ── Разделитель непрочитанных ─────────

function buildUnreadDivider() {
  const el = document.createElement('div');
  el.className = 'msg-unread-divider';
  el.id = 'msgUnreadDivider';
  el.innerHTML = '<span>Новые сообщения</span>';
  return el;
}

// ── Форматирование времени ─────────────

function formatMsgTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Уничтожение ────────────────────────

function destroyChat() {
  window.unsubscribeRealtime();
  _convId = null;
  _myId = null;
  _partner = null;
  _replyTo = null;
  _msgMap = {};
}

// ── Доступ к _replyTo для chat-gestures ─

window.getChatReplyTo = () => _replyTo;
window.setChatReplyTo = (v) => { _replyTo = v; };

// ── Экспорты ───────────────────────────

window.initChatMessages = initChatMessages;
window.chatSend = chatSend;
window.chatInputResize = chatInputResize;
window.chatToggleSend = chatToggleSend;
window.chatInputKeydown = chatInputKeydown;
window.chatTransfer = chatTransfer;
window.hideTfModal = hideTfModal;
window.calcTf = calcTf;
window.sendTf = sendTf;
window.deleteMessage = deleteMessage;
window.scrollToBottom = scrollToBottom;
window.markOutgoingAsRead = markOutgoingAsRead;
window.showTyping = showTyping;
window.hideTyping = hideTyping;
window.destroyChat = destroyChat;
