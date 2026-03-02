// ═══════════════════════════════════════
// CHAT — СООБЩЕНИЯ
// Отделено от chat.js
// ═══════════════════════════════════════

let realtimeSubscription = null;

// ===== loadMessages =====
async function loadMessages(convId) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';

  const result = await window.sb.from('messages')
    .select('*, sender:users(id, name, avatar_url, dna_type)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(50);

  const messages = result.data || [];
  renderMessages(messages);

  window.sb.from('messages')
    .update({ is_read: true })
    .eq('conversation_id', convId)
    .neq('sender_id', getCurrentUser().id)
    .eq('is_read', false)
    .then(function() {});
}

// ===== renderMessages =====
function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const myId = getCurrentUser().id;
  let lastDateLabel = '';

  messages.forEach(function(msg, i) {
    if (msg.created_at) {
      const label = getDateLabel(msg.created_at);
      if (label !== lastDateLabel) {
        lastDateLabel = label;
        const divider = document.createElement('div');
        divider.className = 'chat-date-divider';
        divider.textContent = label;
        container.appendChild(divider);
      }
    }
    const bubble = createBubble(msg, myId, messages[i - 1]);
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function getDateLabel(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today - msgDay;

  if (diff === 0) return 'Сегодня';
  if (diff === 86400000) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function createBubble(msg, myId, prevMsg) {
  const isOwn = msg.sender_id === myId;

  const wrapper = document.createElement('div');
  const continued = prevMsg &&
    prevMsg.sender_id === msg.sender_id &&
    (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 60000;

  wrapper.className = 'chat-msg ' +
    (isOwn ? 'chat-msg--out' : 'chat-msg--in') +
    (continued ? ' chat-msg--continued' : '');
  wrapper.setAttribute('data-msg-id', msg.id);

  if (!isOwn) {
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'chat-msg-avatar-wrap';
    if (!continued) {
      const sender = msg.sender || {};
      if (sender.avatar_url) {
        const img = document.createElement('img');
        img.className = 'chat-msg-avatar';
        img.src = sender.avatar_url;
        img.alt = sender.name || '';
        avatarWrap.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'chat-msg-avatar chat-msg-avatar--placeholder';
        placeholder.textContent = (sender.name || '?')[0].toUpperCase();
        avatarWrap.appendChild(placeholder);
      }
    }
    wrapper.appendChild(avatarWrap);
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const content = document.createElement('div');
  content.className = 'chat-bubble-content';
  if (msg.type === 'file' && msg.file_url) {
    const link = document.createElement('a');
    link.href = msg.file_url;
    link.target = '_blank';
    link.className = 'chat-file-link';
    link.textContent = msg.content || 'Файл';
    content.appendChild(link);
  } else {
    content.textContent = msg.content || '';
  }
  bubble.appendChild(content);

  const meta = document.createElement('div');
  meta.className = 'chat-bubble-meta';
  const time = document.createElement('span');
  time.className = 'chat-bubble-time';
  time.textContent = msg.created_at ? formatMsgTime(msg.created_at) : '';
  meta.appendChild(time);

  if (isOwn) {
    const status = document.createElement('span');
    status.className = 'chat-status ' +
      (msg.is_read ? 'chat-status--read' : 'chat-status--sent');
    status.innerHTML = msg.is_read
      ? '<svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M1 5l3 3L12 1M5 5l3 3 5-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    meta.appendChild(status);
  }

  bubble.appendChild(meta);
  wrapper.appendChild(bubble);
  initMessageLongPress(wrapper, msg, isOwn);
  return wrapper;
}

// ===== subscribeRealtime =====
function subscribeRealtime(convId) {
  chatUnsubscribe();

  realtimeSubscription = window.sb.channel('chat:' + convId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.' + convId
    }, function(payload) {
      appendMessage(payload.new);
    })
    .subscribe();
}

// ===== appendMessage =====
function appendMessage(message) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const existing = container.querySelector('[data-msg-id="' + message.id + '"]');
  if (existing) return;

  const myId = getCurrentUser().id;
  const bubble = createBubble(message, myId);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// ===== chatSend =====
async function chatSend() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !currentConversationId) return;

  const user = getCurrentUser();
  if (!user) return;

  const savedText = text;
  input.value = '';
  input.style.height = 'auto';

  try {
    const payload = {
      conversation_id: currentConversationId,
      sender_id: user.id,
      content: savedText,
      type: 'text'
    };
    if (window.chatReplyTo) {
      payload.reply_to_id = window.chatReplyTo.id;
      cancelReply();
    }
    const { error } = await window.sb.from('messages').insert(payload);
    if (error) throw error;

    await window.sb.from('conversations').update({
      last_message_at: new Date().toISOString()
    }).eq('id', currentConversationId);

  } catch (err) {
    console.error('chatSend:', err);
    input.value = savedText;
    showToast('Не удалось отправить сообщение');
  }
}

// ===== chatInputResize =====
function chatInputResize(el) {
  el.style.height = 'auto';
  const maxH = 120;
  el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
}

// ===== chatInputKeydown =====
function chatInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatSend();
  }
}

// ===== chatAttachFile =====
function chatAttachFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
  input.onchange = async function() {
    const file = input.files[0];
    if (!file || !currentConversationId) return;
    const user = getCurrentUser();
    if (!user) return;

    const path = 'chat-files/' + currentConversationId + '/' + Date.now() + '_' + file.name;
    const uploadResult = await window.sb.storage.from('chat-files').upload(path, file);
    if (uploadResult.error) return;

    const urlData = window.sb.storage.from('chat-files').getPublicUrl(path);

    await window.sb.from('messages').insert({
      conversation_id: currentConversationId,
      sender_id: user.id,
      content: file.name,
      type: 'file',
      file_url: urlData.data.publicUrl,
      file_name: file.name
    });
  };
  input.click();
}

// ===== chatUnsubscribe =====
function chatUnsubscribe() {
  if (realtimeSubscription) {
    window.sb.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
}

// ===== chatClearHistory =====
async function chatClearHistory() {
  const user = getCurrentUser();
  if (!user || !currentConversationId) return;

  try {
    await window.sb.from('messages')
      .delete()
      .eq('conversation_id', currentConversationId)
      .eq('sender_id', user.id);

    const container = document.getElementById('chatMessages');
    if (container) container.innerHTML = '';
    loadMessages(currentConversationId);
    showToast('История очищена');
  } catch (err) {
    console.error('Clear history error:', err);
    showToast('Ошибка очистки');
  }
}

// ===== chatDelete =====
async function chatDelete() {
  if (!currentConversationId) return;

  try {
    await window.sb.from('conversations')
      .delete()
      .eq('id', currentConversationId);

    currentConversationId = null;
    currentChatPartner = null;
    showToast('Диалог удалён');
    goBack();
  } catch (err) {
    console.error('Delete chat error:', err);
    showToast('Ошибка удаления');
  }
}

// ===== formatMsgTime =====
function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
let chatLongPressTimer = null;

function initMessageLongPress(el, msg, isOwn) {
  el.addEventListener('touchstart', function(e) {
    chatLongPressTimer = setTimeout(function() {
      showMsgContextMenu(msg, isOwn, e.touches[0]);
    }, 500);
  }, { passive: true });

  el.addEventListener('touchend', function() {
    clearTimeout(chatLongPressTimer);
  });

  el.addEventListener('touchmove', function() {
    clearTimeout(chatLongPressTimer);
  });
}

function showMsgContextMenu(msg, isOwn, touch) {
  const old = document.getElementById('chatContextMenu');
  if (old) old.remove();

  const menu = document.createElement('div');
  menu.id = 'chatContextMenu';
  menu.className = 'chat-context-menu';

  const actions = [
    { label: 'Ответить', fn: function() { startReply(msg); } },
    { label: 'Копировать', fn: function() {
      navigator.clipboard.writeText(msg.content || '');
      showToast('Скопировано');
    }}
  ];

  if (isOwn) {
    actions.push({ label: 'Удалить', fn: function() {
      deleteMessage(msg.id);
    }, danger: true });
  }

  actions.forEach(function(a) {
    const btn = document.createElement('button');
    btn.className = 'chat-context-btn' + (a.danger ? ' chat-context-btn--danger' : '');
    btn.textContent = a.label;
    btn.onclick = function() { menu.remove(); a.fn(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  const x = Math.min(touch.clientX, window.innerWidth - 180);
  const y = Math.min(touch.clientY, window.innerHeight - 150);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  setTimeout(function() {
    document.addEventListener('touchstart', function closeMenu() {
      menu.remove();
      document.removeEventListener('touchstart', closeMenu);
    }, { once: true });
  }, 100);
}

async function deleteMessage(msgId) {
  try {
    const { error } = await window.sb.from('messages')
      .delete().eq('id', msgId);
    if (error) throw error;
    const el = document.querySelector('[data-msg-id="' + msgId + '"]');
    if (el) {
      el.style.transition = 'opacity 250ms, transform 250ms';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.8)';
      setTimeout(function() { el.remove(); }, 250);
    }
  } catch (err) {
    console.error('deleteMessage:', err);
    showToast('Не удалось удалить');
  }
}

function startReply(msg) {
  window.chatReplyTo = msg;
  const preview = document.getElementById('chatReplyPreview');
  const text = document.getElementById('chatReplyText');
  if (preview && text) {
    text.textContent = msg.content || '';
    preview.classList.add('visible');
    const inp = document.getElementById('chatInput');
    if (inp) inp.focus();
  }
}

function cancelReply() {
  window.chatReplyTo = null;
  const preview = document.getElementById('chatReplyPreview');
  if (preview) preview.classList.remove('visible');
}

// ЭКСПОРТЫ
window.loadMessages = loadMessages;
window.subscribeRealtime = subscribeRealtime;
window.appendMessage = appendMessage;
window.chatSend = chatSend;
window.chatInputResize = chatInputResize;
window.chatInputKeydown = chatInputKeydown;
window.chatAttachFile = chatAttachFile;
window.chatUnsubscribe = chatUnsubscribe;
window.chatClearHistory = chatClearHistory;
window.chatDelete = chatDelete;
window.cancelReply = cancelReply;
