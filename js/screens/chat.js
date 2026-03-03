// ════════════════════════════════════════
// CHAT — точка входа
// ════════════════════════════════════════

let _pendingConvId = null;
let _pendingPartner = null;

async function openChat(convId, partner) {
  if (!convId) return;
  _pendingConvId = convId;
  _pendingPartner = partner || null;
  window.goTo('scrChat');
}

async function initChat() {
  const convId = _pendingConvId;
  if (!convId) return;
  const user = window.getCurrentUser();
  if (!user) return;
  try {
    let partner = _pendingPartner;
    if (!partner) {
      const { data: members, error } = await window.sb
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', convId);
      if (error) throw error;
      const otherIds = (members || [])
        .map(m => m.user_id)
        .filter(id => id !== user.id);
      if (otherIds.length > 0) {
        const { data: pData } = await window.sb
          .from('users')
          .select('id, name, avatar_url, dna_type')
          .eq('id', otherIds[0])
          .single();
        partner = pData;
      }
    }
    if (window.initChatMessages) {
      await window.initChatMessages(convId, partner);
    }
  } catch (err) {
    console.error('initChat:', err);
  }
}

function chatShowMenu() {
  window.showToast?.('Скоро: меню чата');
}

function chatAttachFile() {
  window.showToast?.('Скоро: прикрепить файл');
}

window.openChat = openChat;
window.initChat = initChat;
window.chatShowMenu = chatShowMenu;
window.chatAttachFile = chatAttachFile;
