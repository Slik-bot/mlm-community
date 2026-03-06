// ─── CHAT REACTIONS ───────────────────────────────────────
// Загрузка реакций, рендер таблеток, добавление/удаление

async function loadReactions() {
  const msgEls = document.querySelectorAll('[data-msg-id]');
  const msgIds = [...msgEls].map(function(el) { return el.dataset.msgId; });
  if (!msgIds.length) return;
  const { data } = await window.sb
    .from('reactions')
    .select('target_id, reaction_type, user_id')
    .eq('target_type', 'message')
    .in('target_id', msgIds);
  if (!data?.length) return;
  const grouped = {};
  data.forEach(function(r) {
    const key = r.target_id + '|' + r.reaction_type;
    if (!grouped[key]) grouped[key] = { msgId: r.target_id, emoji: r.reaction_type, count: 0 };
    grouped[key].count++;
  });
  Object.values(grouped).forEach(function(g) {
    window.addReactionToBubble?.(g.msgId, g.emoji, g.count);
  });
}
window.loadReactions = loadReactions;
