// ════════════════════════════════════════
// CHAT — точка входа
// Загружает партнёра и запускает initChatMessages
// ════════════════════════════════════════

async function initChat(convId) {
  if (!convId) return;
  const user = window.getCurrentUser();
  if (!user) return;
  try {
    const { data: members, error } = await window.sb
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', convId);
    if (error) throw error;
    const otherIds = (members || [])
      .map(m => m.user_id)
      .filter(id => id !== user.id);
    let partner = null;
    if (otherIds.length > 0) {
      const { data: pData } = await window.sb
        .from('users')
        .select('id, name, avatar_url, dna_type')
        .eq('id', otherIds[0])
        .single();
      partner = pData;
    }
    if (window.initChatMessages) {
      await window.initChatMessages(convId, partner);
    }
  } catch (err) {
    console.error('initChat:', err);
  }
}

function destroyChat() {
  if (window.destroyChat && window.destroyChat !== destroyChat) {
    window.destroyChat();
  }
}

function chatShowMenu() {
  window.showToast?.('Скоро: меню чата');
}

function chatAttachFile() {
  window.showToast?.('Скоро: прикрепить файл');
}

window.initChat = initChat;
window.destroyChat = destroyChat;
window.chatShowMenu = chatShowMenu;
window.chatAttachFile = chatAttachFile;
