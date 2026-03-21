// ═══════════════════════════════════════
// FORUM REPLY CONTEXT MENU
// Отделено от forum.js
// ═══════════════════════════════════════

const R_SVG = {
  reply: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>',
  copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  del: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>',
  flag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>'
};

function openReplyCtxMenu(replyId, isMine, text, author) {
  const menu = document.getElementById('replyCtxMenu');
  const sheet = document.getElementById('replyCtxSheet');
  const overlay = document.getElementById('replyCtxOverlay');
  const items = document.getElementById('replyCtxItems');
  if (!menu || !sheet || !items) return;

  const actions = isMine ? [
    { icon: R_SVG.reply, label: 'Ответить', fn: () => {
      closeReplyCtxMenu();
      window.replyToForumReply?.(replyId, author, text);
    }},
    { icon: R_SVG.copy, label: 'Скопировать', fn: () => {
      navigator.clipboard?.writeText(text);
      closeReplyCtxMenu();
    }},
    { icon: R_SVG.del, label: 'Удалить', danger: true, fn: () => {
      closeReplyCtxMenu();
      deleteReplyById(replyId);
    }}
  ] : [
    { icon: R_SVG.reply, label: 'Ответить', fn: () => {
      closeReplyCtxMenu();
      window.replyToForumReply?.(replyId, author, text);
    }},
    { icon: R_SVG.copy, label: 'Скопировать', fn: () => {
      navigator.clipboard?.writeText(text);
      closeReplyCtxMenu();
    }},
    { icon: R_SVG.flag, label: 'Пожаловаться', danger: true, fn: () => {
      closeReplyCtxMenu();
    }}
  ];

  items.innerHTML = '';
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'reply-ctx-item' + (a.danger ? ' danger' : '');
    btn.innerHTML = a.icon + '<span>' + a.label + '</span>';
    btn.addEventListener('click', a.fn);
    items.appendChild(btn);
  });

  menu.style.display = 'block';
  requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
    overlay.style.opacity = '1';
  });
  overlay.onclick = closeReplyCtxMenu;
}

function closeReplyCtxMenu() {
  const menu = document.getElementById('replyCtxMenu');
  const sheet = document.getElementById('replyCtxSheet');
  const overlay = document.getElementById('replyCtxOverlay');
  if (!sheet) return;
  sheet.style.transform = 'translateY(100%)';
  overlay.style.opacity = '0';
  setTimeout(() => {
    if (menu) menu.style.display = 'none';
  }, 300);
}

async function deleteReplyById(replyId) {
  if (!window.sb || !replyId) return;
  try {
    const { error } = await window.sb
      .from('forum_replies')
      .delete()
      .eq('id', replyId);
    if (error) throw error;
    const el = document.querySelector(
      `[data-id="${replyId}"]`
    );
    if (el) el.remove();
  } catch (err) {
    console.error('deleteReplyById:', err);
  }
}

// ЭКСПОРТЫ
window.openReplyCtxMenu = openReplyCtxMenu;
window.closeReplyCtxMenu = closeReplyCtxMenu;
