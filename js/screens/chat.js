// ════════════════════════════════════════
// CHAT — точка входа
// ════════════════════════════════════════

let _pendingConvId = null;
let _pendingPartner = null;

async function findExistingConversation(myId, partnerId) {
  const { data: myConvs } = await window.sb
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', myId);
  if (!myConvs?.length) return null;
  const myIds = myConvs.map(r => r.conversation_id);
  const { data: shared } = await window.sb
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', partnerId)
    .in('conversation_id', myIds);
  if (!shared?.length) return null;
  const { data: conv } = await window.sb
    .from('conversations')
    .select('id')
    .eq('id', shared[0].conversation_id)
    .eq('type', 'personal')
    .single();
  return conv?.id || null;
}

async function findOrCreateConversation(partnerId) {
  if (!partnerId) return null;
  const myId = window.getCurrentUser()?.id;
  if (!myId) return null;
  try {
    const existingId = await findExistingConversation(myId, partnerId);
    if (existingId) return existingId;

    const { data: newConv, error: convErr } = await window.sb
      .from('conversations')
      .insert({ type: 'personal', created_by: myId })
      .select('id')
      .single();
    if (convErr || !newConv) return null;

    const { error: membersErr } = await window.sb
      .from('conversation_members')
      .insert([
        { conversation_id: newConv.id, user_id: myId },
        { conversation_id: newConv.id, user_id: partnerId }
      ]);

    if (membersErr) {
      console.error('conversation_members insert:', membersErr);
      await window.sb.from('conversations').delete().eq('id', newConv.id);
      return null;
    }

    return newConv.id;
  } catch (err) {
    console.error('findOrCreateConversation:', err);
    return null;
  }
}

async function openChat(convId, partner) {
  if (!convId && partner?.id) {
    convId = await findOrCreateConversation(partner.id);
  }
  if (!convId) {
    window.showToast?.('Не удалось открыть чат');
    return;
  }
  _pendingConvId = convId;
  _pendingPartner = partner || null;
  window.goTo('scrChat');
}

async function initChat() {
  let convId = _pendingConvId;
  if (!convId) {
    await new Promise(r => setTimeout(r, 300));
    convId = _pendingConvId;
  }
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
          .select('id, name, avatar_url, dna_type, last_active_at')
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

window.findOrCreateConversation = findOrCreateConversation;
window.openChat = openChat;
window.initChat = initChat;
window.chatShowMenu = chatShowMenu;
window.chatAttachFile = chatAttachFile;
