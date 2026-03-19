// ═══════════════════════════════════════
// FORUM INTERACTIONS — лайки, меню, шеринг, удаление
// Отделено от forum.js
// ═══════════════════════════════════════

async function forumLikeTopic() {
  if (!currentTopic || !window.currentUser) return;
  var el = document.getElementById('forumTopicLike'), countEl = document.getElementById('forumTopicLikeCount');
  var cur = parseInt(countEl ? countEl.textContent : '0') || 0, wasLiked = el && el.classList.contains('liked');
  var uid = window.currentUser.id, tid = currentTopic.id;
  var newCount = wasLiked ? Math.max(0, cur - 1) : cur + 1;
  if (wasLiked) {
    likedTopicIds.delete(tid);
    if (el) el.classList.remove('liked'); if (countEl) countEl.textContent = newCount;
  } else {
    likedTopicIds.add(tid);
    if (el) el.classList.add('liked'); if (countEl) countEl.textContent = newCount;
  }
  var cached = allForumTopics.find(function(t) { return t.id === tid; });
  if (cached) cached.likes_count = newCount;
  if (currentTopic && currentTopic.id === tid) currentTopic.likes_count = newCount;
  try {
    if (wasLiked) {
      await window.sb.from('reactions').delete().eq('user_id', uid).eq('target_type', 'forum_topic').eq('target_id', tid);
      await window.sb.from('forum_topics').update({ likes_count: newCount }).eq('id', tid);
    } else {
      await window.sb.from('reactions').upsert({ user_id: uid, target_type: 'forum_topic', target_id: tid, reaction_type: 'like' }, { onConflict: 'user_id,target_type,target_id' });
      await window.sb.from('forum_topics').update({ likes_count: newCount }).eq('id', tid);
    }
  } catch (e) {
    console.error('forumLikeTopic error:', e);
  }
  const card = document.querySelector('.forum-card[onclick*="' + tid + '"]');
  if (card) {
    const cardStat = card.querySelector('.ftc-stat');
    if (cardStat) {
      wasLiked ? cardStat.classList.remove('liked') : cardStat.classList.add('liked');
      const cardSpan = cardStat.querySelector('span');
      if (cardSpan) cardSpan.textContent = newCount;
    }
  }
}
function likeForumReply(replyId, btn) {
  if (!window.currentUser) return;
  var wasLiked = likedReplyIds.has(replyId), span = btn ? btn.querySelector('span') : null;
  var cur = parseInt(span ? span.textContent : '0') || 0, uid = window.currentUser.id;
  var eh = function(r) { if (r.error) console.error(r.error); };
  if (wasLiked) {
    likedReplyIds.delete(replyId);
    if (btn) btn.classList.remove('liked'); if (span) span.textContent = Math.max(0, cur - 1);
    window.sb.from('reactions').delete().eq('user_id', uid).eq('target_type', 'forum_reply').eq('target_id', replyId).then(eh);
    window.sb.from('forum_replies').update({ likes_count: Math.max(0, cur - 1) }).eq('id', replyId).then(eh);
  } else {
    likedReplyIds.add(replyId);
    if (btn) btn.classList.add('liked'); if (span) span.textContent = cur + 1;
    window.sb.from('reactions').upsert({ user_id: uid, target_type: 'forum_reply', target_id: replyId, reaction_type: 'like' }, { onConflict: 'user_id,target_type,target_id' }).then(eh);
    window.sb.from('forum_replies').update({ likes_count: cur + 1 }).eq('id', replyId).then(eh);
  }
}
async function markBestReply(replyId) {
  if (!currentTopic) return;
  await window.sb.from('forum_replies').update({ is_best: false }).eq('topic_id', currentTopic.id);
  await window.sb.from('forum_replies').update({ is_best: true }).eq('id', replyId);
  if (window.showToast) showToast('Лучший ответ выбран');
  loadForumReplies(currentTopic.id);
}
function openForumMore() {
  const user = window.currentUser;
  if (!user || !currentTopic) return;
  const isAuthor = currentTopic.author_id === user.id;
  const overlay = document.createElement('div');
  overlay.className = 'forum-more-overlay';
  overlay.onclick = function() { closeForumMore(); };
  const menu = document.createElement('div');
  menu.className = 'forum-more-menu';
  menu.id = 'forumMoreMenu';
  let items = '<button class="forum-more-item" onclick="closeForumMore();shareForum()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Поделиться</button>';
  if (isAuthor) {
    items += '<button class="forum-more-item forum-more-item-danger" onclick="closeForumMore();deleteForumTopic()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>Удалить тему</button>';
  }
  menu.innerHTML = items;
  document.body.appendChild(overlay);
  document.body.appendChild(menu);
}
function closeForumMore() {
  const overlay = document.querySelector('.forum-more-overlay');
  const menu = document.getElementById('forumMoreMenu');
  if (overlay) overlay.remove();
  if (menu) menu.remove();
}
function shareForum() {
  if (navigator.share && currentTopic) {
    navigator.share({ title: currentTopic.title, text: currentTopic.title });
  }
}
async function deleteForumTopic() {
  if (!currentTopic) return;
  await window.sb.from('forum_replies').delete().eq('topic_id', currentTopic.id);
  await window.sb.from('forum_topics').delete().eq('id', currentTopic.id);
  if (window.showToast) showToast('Тема удалена');
  goBack();
}

async function likeTopicFromList(topicId, el) {
  if (!window.currentUser) return;
  const wasLiked = likedTopicIds.has(topicId);
  const span = el ? el.querySelector('span') : null;
  const cur = parseInt(span ? span.textContent : '0') || 0;
  const uid = window.currentUser.id;
  const eh = function(r) { if (r.error) console.error(r.error); };
  if (wasLiked) {
    likedTopicIds.delete(topicId);
    el.classList.remove('liked');
    if (span) span.textContent = Math.max(0, cur - 1);
    await window.sb.from('reactions').delete()
      .eq('user_id', uid).eq('target_type', 'forum_topic')
      .eq('target_id', topicId).then(eh);
    await window.sb.from('forum_topics')
      .update({ likes_count: Math.max(0, cur - 1) })
      .eq('id', topicId).then(eh);
  } else {
    likedTopicIds.add(topicId);
    el.classList.add('liked');
    if (span) span.textContent = cur + 1;
    await window.sb.from('reactions').upsert(
      { user_id: uid, target_type: 'forum_topic', target_id: topicId, reaction_type: 'like' },
      { onConflict: 'user_id,target_type,target_id' }
    ).then(eh);
    await window.sb.from('forum_topics')
      .update({ likes_count: cur + 1 })
      .eq('id', topicId).then(eh);
  }
  const cached = allForumTopics.find(function(t) { return t.id === topicId; });
  if (cached) cached.likes_count = wasLiked ? Math.max(0, cur - 1) : cur + 1;
  const topicLikeBtn = document.getElementById('forumTopicLike');
  const topicLikeCount = document.getElementById('forumTopicLikeCount');
  if (topicLikeBtn && window.currentTopic && window.currentTopic.id === topicId) {
    wasLiked ? topicLikeBtn.classList.remove('liked') : topicLikeBtn.classList.add('liked');
    if (topicLikeCount) topicLikeCount.textContent = wasLiked ? Math.max(0, cur - 1) : cur + 1;
  }
}

// ЭКСПОРТЫ
window.likeTopicFromList = likeTopicFromList;
window.forumLikeTopic = forumLikeTopic;
window.likeForumReply = likeForumReply;
window.markBestReply = markBestReply;
window.openForumMore = openForumMore;
window.closeForumMore = closeForumMore;
window.shareForum = shareForum;
window.deleteForumTopic = deleteForumTopic;
