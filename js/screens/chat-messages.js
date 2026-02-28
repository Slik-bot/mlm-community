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

  messages.forEach(function(msg) {
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
    const bubble = createBubble(msg, myId);
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

function createBubble(msg, myId) {
  const isOwn = msg.sender_id === myId;
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + (isOwn ? 'own' : 'other');
  div.setAttribute('data-msg-id', msg.id);

  const time = msg.created_at ? formatMsgTime(msg.created_at) : '';

  const bubbleContent = document.createElement('div');
  bubbleContent.className = 'chat-bubble-content';
  if (msg.type === 'file' && msg.file_url) {
    const safeFileUrl = (msg.file_url && msg.file_url.startsWith('https://')) ? escHtml(msg.file_url) : '#';
    bubbleContent.innerHTML = '<a class="chat-file-link" href="' + safeFileUrl + '" target="_blank">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> ' +
      escHtml(msg.file_name || 'Файл') + '</a>';
  } else {
    bubbleContent.textContent = msg.content || '';
  }
  const bubbleTime = document.createElement('div');
  bubbleTime.className = 'chat-bubble-time';
  bubbleTime.textContent = time;
  div.appendChild(bubbleContent);
  div.appendChild(bubbleTime);

  return div;
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

  input.value = '';
  input.style.height = 'auto';

  const user = getCurrentUser();
  if (!user) return;

  await window.sb.from('messages').insert({
    conversation_id: currentConversationId,
    sender_id: user.id,
    content: text,
    type: 'text'
  });
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
