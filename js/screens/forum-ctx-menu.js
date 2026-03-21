// ═══════════════════════════════════════
// FORUM REPLY CONTEXT MENU
// Отделено от forum.js
// ═══════════════════════════════════════

const CTX_SVG = {
  reply: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>',
  copy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  forward: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>',
  select: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  del: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>',
  flag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>'
};

function openReplyCtxMenu(replyId, isMine, text, author, rowEl) {
  const menu = document.getElementById('replyCtxMenu');
  const sheet = document.getElementById('replyCtxSheet');
  const overlay = document.getElementById('replyCtxOverlay');
  const items = document.getElementById('replyCtxItems');
  if (!menu || !sheet || !items || !overlay) return;

  const close = () => closeReplyCtxMenu();

  const ownActions = [
    { icon: CTX_SVG.reply, label: 'Ответить', fn: () => {
      close();
      window.replyToForumReply?.(replyId, author, text);
    }},
    { icon: CTX_SVG.copy, label: 'Скопировать', fn: () => {
      navigator.clipboard?.writeText(text);
      close();
    }},
    { icon: CTX_SVG.forward, label: 'Переслать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.select, label: 'Выбрать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.edit, label: 'Редактировать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.del, label: 'Удалить', danger: true, fn: () => {
      close();
      deleteReplyById(replyId);
    }}
  ];

  const otherActions = [
    { icon: CTX_SVG.reply, label: 'Ответить', fn: () => {
      close();
      window.replyToForumReply?.(replyId, author, text);
    }},
    { icon: CTX_SVG.copy, label: 'Скопировать', fn: () => {
      navigator.clipboard?.writeText(text);
      close();
    }},
    { icon: CTX_SVG.forward, label: 'Переслать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.select, label: 'Выбрать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.flag, label: 'Пожаловаться', danger: true, fn: () => {
      close();
    }}
  ];

  const actions = isMine ? ownActions : otherActions;
  items.innerHTML = '';
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'reply-ctx-item' + (a.danger ? ' danger' : '');
    btn.innerHTML = a.icon + '<span>' + a.label + '</span>';
    btn.addEventListener('click', a.fn);
    items.appendChild(btn);
  });

  const repliesList = document.getElementById('forumReplies');

  menu.style.display = 'block';
  if (repliesList) repliesList.classList.add('forum-replies-dimmed');

  if (rowEl) {
    rowEl.style.opacity = '0';
    const clone = rowEl.cloneNode(true);
    clone.id = 'replyCtxClone';
    const sheetH = window.innerHeight * 0.55;
    const topicCard = document.getElementById('forumTopicCard');
    const topBound = topicCard
      ? topicCard.getBoundingClientRect().bottom + 10
      : 80;
    const bottomBound = window.innerHeight - sheetH - 10;
    const freeH = bottomBound - topBound;
    const cloneH = rowEl.getBoundingClientRect().height;
    const centerY = topBound + Math.max(0, (freeH - cloneH) / 2);
    clone.style.cssText = 'position:fixed;left:12px;right:12px;top:'+centerY+'px;z-index:102;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.5);pointer-events:none;';
    document.body.appendChild(clone);
    const scr = document.getElementById('scrForumTopic');
    if (scr) scr.style.overflow = 'hidden';
  }

  requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
    overlay.style.opacity = '1';
  });
  overlay.onclick = close;
}

function closeReplyCtxMenu() {
  const menu = document.getElementById('replyCtxMenu');
  const sheet = document.getElementById('replyCtxSheet');
  const overlay = document.getElementById('replyCtxOverlay');
  if (!sheet || !overlay) return;
  sheet.style.transform = 'translateY(100%)';
  overlay.style.opacity = '0';
  const clone = document.getElementById('replyCtxClone');
  if (clone) clone.remove();
  const scr = document.getElementById('scrForumTopic');
  if (scr) scr.style.overflow = '';
  const repliesList = document.getElementById('forumReplies');
  if (repliesList) {
    repliesList.classList.remove('forum-replies-dimmed');
    repliesList.querySelectorAll('.forum-reply-row')
      .forEach(el => { el.style.opacity = ''; });
  }
  setTimeout(() => {
    if (menu) menu.style.display = 'none';
  }, 300);
}

async function deleteReplyById(replyId) {
  if (!window.sb || !replyId) return;
  try {
    const { error } = await window.sb
      .from('forum_posts')
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

window.openReplyCtxMenu = openReplyCtxMenu;
window.closeReplyCtxMenu = closeReplyCtxMenu;
window.deleteReplyById = deleteReplyById;
