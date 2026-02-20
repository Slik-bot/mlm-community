// ===== CHAT SCREENS — список, диалог, инфо =====

var currentConversationId = null;
var realtimeSubscription = null;
var currentChatTab = 'personal';
var allConversations = [];
var chatDebounceTimer = null;

// ===== initChatList =====

function initChatList() {
  var user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  loadConversations();

  var searchInp = document.getElementById('chatSearch');
  if (searchInp) {
    searchInp.value = '';
    searchInp.addEventListener('input', function() {
      clearTimeout(chatDebounceTimer);
      chatDebounceTimer = setTimeout(function() {
        filterConversations(searchInp.value.trim().toLowerCase());
      }, 300);
    });
  }
}

// ===== loadConversations =====

async function loadConversations() {
  var user = getCurrentUser();
  if (!user) return;

  var skeleton = document.getElementById('chatSkeleton');
  var emptyEl = document.getElementById('chatEmpty');
  if (skeleton) skeleton.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  var result = await window.sb.from('conversations')
    .select('*, conversation_members!inner(user_id, users(id, name, avatar_url, dna_type)), last_msg:messages(content, created_at, sender_id)')
    .eq('conversation_members.user_id', user.id)
    .eq('type', currentChatTab)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (skeleton) skeleton.classList.add('hidden');

  allConversations = result.data || [];
  renderChatList(allConversations);
}

// ===== renderChatList =====

function renderChatList(conversations) {
  var list = document.getElementById('chatList');
  var emptyEl = document.getElementById('chatEmpty');
  if (!list) return;

  list.querySelectorAll('.chat-item').forEach(function(el) { el.remove(); });

  if (!conversations.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  var myId = getCurrentUser().id;
  conversations.forEach(function(conv) {
    var members = conv.conversation_members || [];
    var other = null;
    for (var i = 0; i < members.length; i++) {
      if (members[i].users && members[i].users.id !== myId) {
        other = members[i].users; break;
      }
    }
    if (!other) other = { name: 'Диалог', avatar_url: '', dna_type: '' };

    var lastMsg = (conv.last_msg && conv.last_msg[0]) || {};
    var timeStr = lastMsg.created_at ? formatChatTime(lastMsg.created_at) : '';
    var preview = lastMsg.content || '';
    if (preview.length > 40) preview = preview.substring(0, 40) + '...';

    var item = document.createElement('div');
    item.className = 'chat-item';
    item.setAttribute('data-conv-id', conv.id);
    item.onclick = function() { openChat(conv.id, other); };

    var avaHtml = other.avatar_url
      ? '<img class="chat-item-avatar" src="' + other.avatar_url + '" alt="">'
      : '<div class="chat-item-avatar chat-item-avatar-placeholder">' + (other.name || 'U').charAt(0).toUpperCase() + '</div>';

    var unreadHtml = conv.unread_count > 0
      ? '<div class="chat-unread">' + conv.unread_count + '</div>'
      : '';

    item.innerHTML = avaHtml +
      '<div class="chat-item-body">' +
        '<div class="chat-item-name">' + (other.name || 'Пользователь') + '</div>' +
        '<div class="chat-item-last">' + preview + '</div>' +
      '</div>' +
      '<div class="chat-item-meta">' +
        '<div class="chat-item-time">' + timeStr + '</div>' +
        unreadHtml +
      '</div>';

    list.appendChild(item);
  });
}

// ===== filterConversations =====

function filterConversations(query) {
  if (!query) { renderChatList(allConversations); return; }
  var myId = getCurrentUser().id;
  var filtered = allConversations.filter(function(conv) {
    var members = conv.conversation_members || [];
    for (var i = 0; i < members.length; i++) {
      if (members[i].users && members[i].users.id !== myId) {
        return (members[i].users.name || '').toLowerCase().indexOf(query) !== -1;
      }
    }
    return false;
  });
  renderChatList(filtered);
}

// ===== switchChatTab =====

function switchChatTab(tab, el) {
  currentChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  loadConversations();
}

// ===== openChat =====

var currentChatPartner = null;

function openChat(conversationId, partner) {
  currentConversationId = conversationId;
  currentChatPartner = partner || null;
  goTo('scrChat');
}

// ===== initChat =====

function initChat() {
  if (!currentConversationId) { goBack(); return; }

  if (currentChatPartner) {
    var headAvatar = document.getElementById('chatHeadAvatar');
    var headName = document.getElementById('chatHeadName');
    if (headAvatar) {
      headAvatar.src = currentChatPartner.avatar_url || '';
      headAvatar.style.display = currentChatPartner.avatar_url ? '' : 'none';
    }
    if (headName) headName.textContent = currentChatPartner.name || 'Пользователь';
  }

  var statusEl = document.getElementById('chatHeadStatus');
  if (statusEl) statusEl.textContent = 'онлайн';

  var input = document.getElementById('chatInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }

  loadMessages(currentConversationId);
  subscribeRealtime(currentConversationId);
}

// ===== loadMessages =====

async function loadMessages(convId) {
  var container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';

  var result = await window.sb.from('messages')
    .select('*, sender:users(id, name, avatar_url, dna_type)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(50);

  var messages = result.data || [];
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
  var container = document.getElementById('chatMessages');
  if (!container) return;

  var myId = getCurrentUser().id;
  messages.forEach(function(msg) {
    var bubble = createBubble(msg, myId);
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function createBubble(msg, myId) {
  var isOwn = msg.sender_id === myId;
  var div = document.createElement('div');
  div.className = 'chat-bubble ' + (isOwn ? 'own' : 'other');
  div.setAttribute('data-msg-id', msg.id);

  var content = msg.content || '';
  if (msg.type === 'file' && msg.file_url) {
    content = '<a class="chat-file-link" href="' + msg.file_url + '" target="_blank">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> ' +
      (msg.file_name || 'Файл') + '</a>';
  }

  var time = msg.created_at ? formatMsgTime(msg.created_at) : '';

  div.innerHTML = '<div class="chat-bubble-content">' + content + '</div>' +
    '<div class="chat-bubble-time">' + time + '</div>';

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
  var container = document.getElementById('chatMessages');
  if (!container) return;

  var existing = container.querySelector('[data-msg-id="' + message.id + '"]');
  if (existing) return;

  var myId = getCurrentUser().id;
  var bubble = createBubble(message, myId);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// ===== chatSend =====

async function chatSend() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text || !currentConversationId) return;

  input.value = '';
  input.style.height = 'auto';

  var user = getCurrentUser();
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
  var maxH = 120;
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
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
  input.onchange = async function() {
    var file = input.files[0];
    if (!file || !currentConversationId) return;
    var user = getCurrentUser();
    if (!user) return;

    var path = 'chat-files/' + currentConversationId + '/' + Date.now() + '_' + file.name;
    var uploadResult = await window.sb.storage.from('chat-files').upload(path, file);
    if (uploadResult.error) return;

    var urlData = window.sb.storage.from('chat-files').getPublicUrl(path);

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

// ===== initChatInfo =====

function initChatInfo() {
  if (!currentChatPartner) { goBack(); return; }

  var avatar = document.getElementById('chatInfoAvatar');
  if (avatar) {
    avatar.src = currentChatPartner.avatar_url || '';
    avatar.style.display = currentChatPartner.avatar_url ? '' : 'none';
  }

  var nameEl = document.getElementById('chatInfoName');
  if (nameEl) nameEl.textContent = currentChatPartner.name || 'Пользователь';

  var metaEl = document.getElementById('chatInfoMeta');
  if (metaEl) metaEl.textContent = 'Последнее посещение недавно';
}

// ===== chatUnsubscribe =====

function chatUnsubscribe() {
  if (realtimeSubscription) {
    window.sb.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
}

// ===== Вспомогательные =====

function chatStartNew() {
  if (window.showToast) showToast('Скоро: выбор собеседника');
}

function chatShowMenu() {
  if (window.showToast) showToast('Скоро: меню чата');
}

function chatMute() {
  if (window.showToast) showToast('Уведомления обновлены');
}

function chatClearHistory() {
  if (window.showToast) showToast('Скоро: очистка истории');
}

function chatDelete() {
  if (window.showToast) showToast('Скоро: удаление диалога');
}

function formatChatTime(dateStr) {
  var d = new Date(dateStr);
  var now = new Date();
  var diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  if (diff < 172800000) return 'Вчера';
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1);
}

function formatMsgTime(dateStr) {
  var d = new Date(dateStr);
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// ===== Экспорт =====

window.initChatList = initChatList;
window.initChat = initChat;
window.initChatInfo = initChatInfo;
window.openChat = openChat;
window.switchChatTab = switchChatTab;
window.chatSend = chatSend;
window.chatInputResize = chatInputResize;
window.chatInputKeydown = chatInputKeydown;
window.chatAttachFile = chatAttachFile;
window.chatUnsubscribe = chatUnsubscribe;
window.chatStartNew = chatStartNew;
