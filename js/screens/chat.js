// ===== CHAT SCREENS — список, диалог, инфо =====

window.currentConversationId = null;
window.currentChatPartner = null;
let currentChatTab = 'personal';
let allConversations = [];
let chatDebounceTimer = null;

// ===== initChatList =====
function initChatList() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  loadConversations();

  const searchInp = document.getElementById('chatSearch');
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
  const user = getCurrentUser();
  if (!user) return;

  const skeleton = document.getElementById('chatSkeleton');
  const emptyEl = document.getElementById('chatEmpty');
  if (skeleton) skeleton.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  const result = await window.sb.from('conversations')
    .select('*, conversation_members!inner(user_id, users(id, name, avatar_url, dna_type)), last_msg:messages(content, created_at, sender_id)')
    .eq('conversation_members.user_id', user.id)
    .eq('type', currentChatTab)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (skeleton) skeleton.classList.add('hidden');

  allConversations = result.data || [];
  renderChatList(allConversations);
}

// ===== buildChatItem =====
function buildChatItem(conv, myId) {
  const members = conv.conversation_members || [];
  let other = null;
  for (let i = 0; i < members.length; i++) {
    if (members[i].users && members[i].users.id !== myId) { other = members[i].users; break; }
  }
  if (!other) other = { name: 'Диалог', avatar_url: '', dna_type: '' };
  const lastMsg = (conv.last_msg && conv.last_msg[0]) || {};
  const timeStr = lastMsg.created_at ? formatChatTime(lastMsg.created_at) : '';
  let preview = lastMsg.content || '';
  if (preview.length > 40) preview = preview.substring(0, 40) + '...';
  const item = document.createElement('div');
  item.className = 'chat-item';
  item.setAttribute('data-conv-id', conv.id);
  item.onclick = function() { openChat(conv.id, other); };
  const avaHtml = other.avatar_url
    ? '<img class="chat-item-avatar" src="' + other.avatar_url + '" alt="">'
    : '<div class="chat-item-avatar chat-item-avatar-placeholder">' + escHtml((other.name || 'U').charAt(0).toUpperCase()) + '</div>';
  const unreadHtml = conv.unread_count > 0 ? '<div class="chat-unread">' + conv.unread_count + '</div>' : '';
  item.innerHTML = avaHtml +
    '<div class="chat-item-body"><div class="chat-item-name">' + escHtml(other.name || 'Пользователь') + '</div>' +
    '<div class="chat-item-last">' + escHtml(preview) + '</div></div>' +
    '<div class="chat-item-meta"><div class="chat-item-time">' + timeStr + '</div>' + unreadHtml + '</div>';
  return item;
}

// ===== renderChatList =====
function renderChatList(conversations) {
  const list = document.getElementById('chatList');
  const emptyEl = document.getElementById('chatEmpty');
  if (!list) return;
  list.querySelectorAll('.chat-item').forEach(function(el) { el.remove(); });
  if (!conversations.length) { if (emptyEl) emptyEl.classList.remove('hidden'); return; }
  if (emptyEl) emptyEl.classList.add('hidden');
  const myId = getCurrentUser().id;
  conversations.forEach(function(conv) { list.appendChild(buildChatItem(conv, myId)); });
}

// ===== filterConversations =====
function filterConversations(query) {
  if (!query) { renderChatList(allConversations); return; }
  const myId = getCurrentUser().id;
  const filtered = allConversations.filter(function(conv) {
    const members = conv.conversation_members || [];
    for (let i = 0; i < members.length; i++) {
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
function openChat(conversationId, partner) {
  currentConversationId = conversationId;
  currentChatPartner = partner || null;
  goTo('scrChat');
}

// ===== initChat =====
function initChat() {
  if (!currentConversationId) { goBack(); return; }

  if (currentChatPartner) {
    const headAvatar = document.getElementById('chatHeadAvatar');
    const headName = document.getElementById('chatHeadName');
    if (headAvatar) {
      headAvatar.src = currentChatPartner.avatar_url || '';
      headAvatar.style.display = currentChatPartner.avatar_url ? '' : 'none';
    }
    if (headName) headName.textContent = currentChatPartner.name || 'Пользователь';
  }

  const statusEl = document.getElementById('chatHeadStatus');
  if (statusEl) statusEl.textContent = 'онлайн';

  const input = document.getElementById('chatInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }

  loadMessages(currentConversationId);
  subscribeRealtime(currentConversationId);
}

// ═══════════════════════════════════════
// СООБЩЕНИЯ — см. chat-messages.js
// ═══════════════════════════════════════

// ===== initChatInfo =====
function initChatInfo() {
  if (!currentChatPartner) { goBack(); return; }

  const avatar = document.getElementById('chatInfoAvatar');
  if (avatar) {
    avatar.src = currentChatPartner.avatar_url || '';
    avatar.style.display = currentChatPartner.avatar_url ? '' : 'none';
  }

  const nameEl = document.getElementById('chatInfoName');
  if (nameEl) nameEl.textContent = currentChatPartner.name || 'Пользователь';

  const metaEl = document.getElementById('chatInfoMeta');
  if (metaEl) metaEl.textContent = 'Последнее посещение недавно';
}

// ===== Вспомогательные =====
async function findOrCreateConversation(targetUserId) {
  const user = getCurrentUser();
  if (!user || !targetUserId) return null;

  const { data: myConvs } = await window.sb
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (myConvs && myConvs.length) {
    const convIds = myConvs.map(function(c) { return c.conversation_id; });
    const { data: match } = await window.sb
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', targetUserId)
      .in('conversation_id', convIds);

    if (match && match.length) {
      const { data: conv } = await window.sb
        .from('conversations')
        .select('id, type')
        .eq('id', match[0].conversation_id)
        .eq('type', 'personal')
        .single();
      if (conv) return conv.id;
    }
  }

  const { data: newConv, error } = await window.sb
    .from('conversations')
    .insert({ type: 'personal' })
    .select('id')
    .single();
  if (error || !newConv) return null;

  await window.sb.from('conversation_members').insert([
    { conversation_id: newConv.id, user_id: user.id },
    { conversation_id: newConv.id, user_id: targetUserId }
  ]);

  return newConv.id;
}

function chatStartNew() {
  showToast('Выберите собеседника из профиля');
}

function chatShowMenu() {
  showToast('Скоро: меню чата');
}

function chatMute() {
  showToast('Уведомления обновлены');
}

// ===== formatChatTime =====
function formatChatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  if (diff < 172800000) return 'Вчера';
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1);
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// ===== Экспорт =====
window.initChatList = initChatList;
window.initChat = initChat;
window.initChatInfo = initChatInfo;
window.openChat = openChat;
window.switchChatTab = switchChatTab;
window.chatStartNew = chatStartNew;
window.chatShowMenu = chatShowMenu;
window.chatMute = chatMute;
window.findOrCreateConversation = findOrCreateConversation;
window.pad2 = pad2;
