// ════════════════════════════════════════
// CHAT — точка входа
// ════════════════════════════════════════

let _pendingConvId = null;
let _pendingPartner = null;
const _creatingConv = new Map();

window.Telegram?.WebApp?.onEvent('viewportChanged', () => {
  const h = window.Telegram.WebApp.viewportStableHeight;
  document.getElementById('scrChat')
    ?.style.setProperty('height', h + 'px');
});

async function findExistingConversation(myId, partnerId) {
  const { data: mine } = await window.sb
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', myId);
  if (!mine?.length) return null;
  const myIds = mine.map(r => r.conversation_id);
  const { data: found } = await window.sb
    .from('conversation_members')
    .select('conversation_id, conversations!inner(type)')
    .eq('user_id', partnerId)
    .eq('conversations.type', 'personal')
    .in('conversation_id', myIds)
    .limit(1);
  return found?.[0]?.conversation_id || null;
}

async function findOrCreateConversation(partnerId) {
  if (!partnerId) return null;
  const myId = window.getCurrentUser()?.id;
  if (!myId) return null;
  // Защита от race condition: повторный вызов вернёт тот же промис
  if (_creatingConv.has(partnerId)) return _creatingConv.get(partnerId);
  const promise = (async () => {
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
  })();
  _creatingConv.set(partnerId, promise);
  promise.finally(() => _creatingConv.delete(partnerId));
  return promise;
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
    window.initChatSearch?.();
    window.loadPinnedMessage?.(convId);
  } catch (err) {
    console.error('initChat:', err);
  }
}

function chatAttachFile() {
  window.showToast?.('Скоро: прикрепить файл');
}

window.findOrCreateConversation = findOrCreateConversation;
window.openChat = openChat;
window.initChat = initChat;
window.chatAttachFile = chatAttachFile;
