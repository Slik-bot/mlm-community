// ═══════════════════════════════════════
// CHAT MESSAGES — PAGINATION
// Отделено от chat-messages.js
// ═══════════════════════════════════════

async function loadOlderMessages() {
  const pg = window._chatPagination;
  if (!pg) return;
  if (pg.loadingMore || !pg.hasMore || !pg.oldestTs || !pg.convId) return;
  pg.loadingMore = true;

  const box = document.getElementById('chatMessages');
  if (!box) { pg.loadingMore = false; return; }

  const prevHeight = box.scrollHeight;

  try {
    const { data, error } = await window.sb
      .from('messages')
      .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
      .eq('conversation_id', pg.convId)
      .eq('is_deleted', false)
      .lt('created_at', pg.oldestTs)
      .order('created_at', { ascending: false })
      .limit(pg.msgPageSize + 1);

    if (error) throw error;

    const msgs = data || [];
    pg.hasMore = msgs.length > pg.msgPageSize;
    const page = pg.hasMore ? msgs.slice(1) : msgs;
    const older = page.reverse();

    if (older.length === 0) { pg.loadingMore = false; return; }

    pg.oldestTs = older[0].created_at;

    let lastSender = null;
    const fragment = document.createDocumentFragment();
    older.forEach(msg => {
      if (pg.msgMap[msg.id]) return;
      pg.msgMap[msg.id] = msg;
      const isGrp = lastSender === msg.sender_id;
      fragment.appendChild(window.buildBubble(msg, isGrp));
      lastSender = msg.sender_id;
    });
    box.insertBefore(fragment, box.firstChild);

    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight - prevHeight;
      pg.loadingMore = false;
    });

  } catch (err) {
    console.error('loadOlderMessages:', err);
    pg.loadingMore = false;
  }
}

// ЭКСПОРТ
window.loadOlderMessages = loadOlderMessages;
