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
      navigator.clipboard.writeText(text)
        .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        });
      close();
      showCopyToast();
    }},
    { icon: CTX_SVG.forward, label: 'Переслать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.select, label: 'Выбрать', fn: () => {
      close();
      enterSelectionMode(replyId);
    }},
    { icon: CTX_SVG.edit, label: 'Редактировать', fn: () => {
      window._editReplyId = replyId;
      const ctx = document.getElementById('forumReplyContext');
      const authorEl = document.getElementById('forumReplyAuthor');
      const msgEl = document.getElementById('forumReplyMsg');
      const input = document.getElementById('forumReplyInput');
      if (ctx && authorEl && msgEl && input) {
        authorEl.textContent = 'Редактирование';
        msgEl.textContent = text;
        input.value = text;
        input.dispatchEvent(new Event('input'));
        input.focus();
        ctx.classList.add('active');
      }
      close();
    }},
    { icon: CTX_SVG.del, label: 'Удалить', danger: true, fn: () => {
      const replyEl = document.querySelector(`[data-id="${replyId}"]`);
      const replyTime = replyEl ? parseInt(replyEl.dataset.time || '0') : 0;
      const canDeleteForAll = replyTime && (Date.now() - replyTime) < 24 * 60 * 60 * 1000;
      if (canDeleteForAll) {
        if (confirm('Удалить у всех?')) deleteReplyById(replyId, true);
      } else {
        if (confirm('Удалить сообщение?')) deleteReplyById(replyId, false);
      }
      close();
    }}
  ];

  const otherActions = [
    { icon: CTX_SVG.reply, label: 'Ответить', fn: () => {
      close();
      window.replyToForumReply?.(replyId, author, text);
    }},
    { icon: CTX_SVG.copy, label: 'Скопировать', fn: () => {
      navigator.clipboard.writeText(text)
        .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        });
      close();
      showCopyToast();
    }},
    { icon: CTX_SVG.forward, label: 'Переслать', fn: () => {
      close();
    }},
    { icon: CTX_SVG.select, label: 'Выбрать', fn: () => {
      close();
      enterSelectionMode(replyId);
    }},
    { icon: CTX_SVG.flag, label: 'Пожаловаться', danger: true, fn: () => {
      close();
      reportReply(replyId);
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
    const freeH = window.innerHeight - sheetH;
    const cloneH = rowEl.getBoundingClientRect().height;
    const header = document.getElementById('forumTopicHeader');
    const headerBottom = header
      ? Math.max(0, header.getBoundingClientRect().bottom)
      : 0;
    const safeTop = headerBottom + 16;
    const centerY = Math.max(safeTop, (freeH - cloneH) / 2);
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

const _selectedIds = new Set();

function enterSelectionMode(firstId) {
  const replies = document.getElementById('forumReplies');
  const bar = document.getElementById('forumSelectBar');
  const replyBar = document.getElementById('forumReplyBar');
  if (!replies || !bar) return;

  _selectedIds.clear();
  replies.classList.add('selection-mode');
  bar.classList.add('active');
  if (replyBar) replyBar.style.display = 'none';

  replies.querySelectorAll('.forum-reply-row').forEach(row => {
    let circle = row.querySelector('.select-circle');
    if (!circle) {
      circle = document.createElement('div');
      circle.className = 'select-circle';
      row.insertBefore(circle, row.firstChild);
    }
    row.onclick = () => toggleSelectReply(row);
  });

  if (firstId) {
    const first = replies.querySelector(`[data-id="${firstId}"]`);
    if (first) toggleSelectReply(first);
  }

  document.getElementById('forumSelectCancel')
    .onclick = exitSelectionMode;
  document.getElementById('forumSelectCopy')
    .onclick = copySelectedReplies;
  document.getElementById('forumSelectDelete')
    .onclick = deleteSelectedReplies;
  document.getElementById('forumSelectForward')
    .onclick = forwardSelectedReplies;
}

function toggleSelectReply(row) {
  const id = row.dataset.id;
  if (_selectedIds.has(id)) {
    _selectedIds.delete(id);
    row.classList.remove('selected');
  } else {
    _selectedIds.add(id);
    row.classList.add('selected');
  }
  const count = _selectedIds.size;
  const el = document.getElementById('forumSelectCount');
  if (el) el.textContent = count + ' выбрано';
  const del = document.getElementById('forumSelectDelete');
  const fwd = document.getElementById('forumSelectForward');
  const cpy = document.getElementById('forumSelectCopy');
  if (del) del.style.opacity = count ? '1' : '0.3';
  if (fwd) fwd.style.opacity = count ? '1' : '0.3';
  if (cpy) cpy.style.opacity = count ? '1' : '0.3';
}

function exitSelectionMode() {
  const replies = document.getElementById('forumReplies');
  const bar = document.getElementById('forumSelectBar');
  const replyBar = document.getElementById('forumReplyBar');
  if (!replies || !bar) return;
  _selectedIds.clear();
  replies.classList.remove('selection-mode');
  bar.classList.remove('active');
  if (replyBar) replyBar.style.display = '';
  replies.querySelectorAll('.forum-reply-row').forEach(row => {
    row.classList.remove('selected');
    row.onclick = null;
  });
}

function copySelectedReplies() {
  if (!_selectedIds.size) return;
  const texts = [];
  _selectedIds.forEach(id => {
    const el = document.querySelector(`[data-id="${id}"] .reply-text`);
    if (el) texts.push(el.textContent.trim());
  });
  navigator.clipboard.writeText(texts.join('\n\n'))
    .catch(() => {});
  showCopyToast('Скопировано (' + texts.length + ')');
  exitSelectionMode();
}

async function deleteSelectedReplies() {
  if (!_selectedIds.size || !window.sb) return;
  const ids = [..._selectedIds];
  const { error } = await window.sb
    .from('forum_replies').delete().in('id', ids);
  if (error) { console.error('delete selected:', error); return; }
  ids.forEach(id => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
  });
  exitSelectionMode();
}

function forwardSelectedReplies() {
  if (!_selectedIds.size) return;
  showCopyToast('Скоро: пересылка в тему');
  exitSelectionMode();
}

async function reportReply(replyId) {
  if (!window.sb || !replyId) return;
  const user = window._currentUser || window.currentUser;
  if (!user) { showCopyToast('Необходима авторизация'); return; }
  const { error } = await window.sb
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type: 'comment',
      target_id: replyId,
      reason_category: 'inappropriate',
      status: 'pending'
    });
  if (error) { console.error('report error:', error); showCopyToast('Ошибка отправки'); return; }
  showCopyToast('Жалоба отправлена');
}

async function editReplyById(replyId, newContent) {
  if (!window.sb || !replyId || !newContent.trim()) return;
  const { error } = await window.sb
    .from('forum_replies')
    .update({ content: newContent.trim() })
    .eq('id', replyId);
  if (error) {
    console.error('edit reply error:', error);
    showCopyToast('Ошибка: ' + (error.message || error.code || 'unknown'));
    return;
  }
  const row = document.querySelector(`[data-id="${replyId}"]`);
  if (row) {
    const textEl = row.querySelector('.reply-text');
    if (textEl) textEl.textContent = newContent.trim();
    const timeEl = row.querySelector('.reply-time');
    if (timeEl && !row.querySelector('.reply-edited')) {
      const mark = document.createElement('span');
      mark.className = 'reply-edited';
      mark.textContent = 'изменено';
      timeEl.insertAdjacentElement('afterend', mark);
    }
  }
  window._editReplyId = null;
}
window.editReplyById = editReplyById;

function showCopyToast(msg) {
  const existing = document.getElementById('copyToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'copyToast';
  toast.textContent = msg || 'Скопировано';
  toast.style.cssText = 'position:fixed;bottom:48%;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(30,30,40,0.92);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:999;opacity:0;transition:opacity 180ms ease,transform 180ms ease;pointer-events:none;backdrop-filter:blur(8px);';
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-8px)';
    setTimeout(() => toast.remove(), 200);
  }, 1500);
}

async function deleteReplyById(replyId, forEveryone) {
  if (!window.sb) return;
  const { error } = await window.sb
    .from('forum_replies')
    .delete()
    .eq('id', replyId);
  if (error) { console.error('delete reply error:', error); return; }

  const el = document.querySelector(`[data-id="${replyId}"]`);
  if (el) el.remove();

  if (window.currentTopicReplies) {
    window.currentTopicReplies = window.currentTopicReplies
      .filter(r => r.id !== replyId);
  }

  const topicId = window._forumTopicId;
  if (topicId) {
    const { data: topic } = await window.sb
      .from('forum_topics')
      .select('replies_count')
      .eq('id', topicId)
      .single();
    if (topic) {
      await window.sb.from('forum_topics')
        .update({ replies_count: Math.max(0, (topic.replies_count || 1) - 1) })
        .eq('id', topicId);
    }
  }
}

window.openReplyCtxMenu = openReplyCtxMenu;
window.closeReplyCtxMenu = closeReplyCtxMenu;
window.deleteReplyById = deleteReplyById;
