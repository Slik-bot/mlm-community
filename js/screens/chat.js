// ===== CHAT — диалог, инфо =====

window.currentConversationId = null;
window.currentChatPartner = null;

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
window.initChat = initChat;
window.initChatInfo = initChatInfo;
window.openChat = openChat;
window.chatStartNew = chatStartNew;
window.chatShowMenu = chatShowMenu;
window.chatMute = chatMute;
window.findOrCreateConversation = findOrCreateConversation;
window.pad2 = pad2;
