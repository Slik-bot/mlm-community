// ════════════════════════════════════════
// CHAT — точка входа
// ════════════════════════════════════════

let _pendingConvId = null;
let _pendingPartner = null;
const _creatingConv = new Map();

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

let _chatMenuPop = null;

function chatShowMenu() {
  if (_chatMenuPop) { closeChatMenu(); return; }
  const head = document.getElementById('chHead');
  if (!head) return;
  const pop = document.createElement('div');
  pop.className = 'ch-menu-pop visible';
  const convId = _pendingConvId;
  const userId = window.getCurrentUser?.()?.id;
  loadMuteState(convId, userId).then(function(muted) {
    pop.innerHTML = '';
    const muteItem = document.createElement('div');
    muteItem.className = 'ch-menu-item';
    muteItem.textContent = muted ? '\uD83D\uDD14 Размьютить' : '\uD83D\uDD07 Замьютить';
    muteItem.onclick = function() { toggleChatMute(convId, userId, muted); };
    pop.appendChild(muteItem);
  });
  head.appendChild(pop);
  _chatMenuPop = pop;
  setTimeout(function() {
    document.addEventListener('click', closeChatMenuOnClick);
  }, 10);
}

function closeChatMenu() {
  if (_chatMenuPop) { _chatMenuPop.remove(); _chatMenuPop = null; }
  document.removeEventListener('click', closeChatMenuOnClick);
}

function closeChatMenuOnClick(e) {
  if (_chatMenuPop && !_chatMenuPop.contains(e.target)) closeChatMenu();
}

async function loadMuteState(convId, userId) {
  if (!convId || !userId) return false;
  try {
    const { data } = await window.sb
      .from('conversation_members')
      .select('is_muted')
      .eq('conversation_id', convId)
      .eq('user_id', userId)
      .single();
    return !!data?.is_muted;
  } catch (err) {
    console.error('loadMuteState:', err);
    return false;
  }
}

async function toggleChatMute(convId, userId, wasMuted) {
  closeChatMenu();
  const newVal = !wasMuted;
  try {
    const { error } = await window.sb
      .from('conversation_members')
      .update({ is_muted: newVal })
      .eq('conversation_id', convId)
      .eq('user_id', userId);
    if (error) throw error;
    window.showToast?.(newVal ? 'Чат замьючен' : 'Уведомления включены');
  } catch (err) {
    console.error('toggleChatMute:', err);
    window.showToast?.('Ошибка');
  }
}

function chatAttachFile() {
  window.showToast?.('Скоро: прикрепить файл');
}

window.findOrCreateConversation = findOrCreateConversation;
window.openChat = openChat;
window.initChat = initChat;
window.chatShowMenu = chatShowMenu;
window.chatAttachFile = chatAttachFile;
