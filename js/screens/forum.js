// ===== FORUM SCREENS — список тем, тема, создание =====
let allForumTopics = [];
let forumCat = 'all';
let forumSortMethod = 'new';
let forumQuery = '';
let currentTopic = null;
let currentTopicReplies = [];
let forumReplyToId = null;
let likedReplyIds = new Set();
let likedTopicIds = new Set();
let forumSelectedCat = '';
let forumPage = 0;
let forumHasMore = true;
var FORUM_PAGE = 20;
let _forumChannel = null;
let _forumRepliesChannel = null;
// ===== FORUM LIST =====
function initForum() {
  forumCat = 'all';
  forumSortMethod = 'new';
  forumQuery = '';
  fEl('forumSearchBar', function(el) { el.classList.add('hidden'); });
  fEl('forumSearchInput', function(el) { el.value = ''; });
  forumPage = 0; forumHasMore = true;
  likedTopicIds = new Set();
  updateForumCatUI();
  updateForumSortUI();
  loadForumTopics();
  if (_forumChannel) window.sb.removeChannel(_forumChannel);
  _forumChannel = window.sb.channel('forum-topics-rt')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_topics' }, function() { forumPage = 0; forumHasMore = true; loadForumTopics(); })
    .subscribe();
}
async function loadForumTopics(append) {
  if (!append) { fEl('forumSkeletons', function(el) { el.classList.remove('hidden'); }); fEl('forumList', function(el) { el.innerHTML = ''; }); }
  try {
    var from = forumPage * FORUM_PAGE, to = from + FORUM_PAGE - 1;
    const result = await window.sb.from('forum_topics')
      .select('*, author:users(id, name, avatar_url, dna_type, level)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (result.error) throw result.error;
    var rows = result.data || [];
    forumHasMore = rows.length >= FORUM_PAGE;
    allForumTopics = append ? allForumTopics.concat(rows) : rows;
    if (window.currentUser && rows.length) {
      var tIds = rows.map(function(t) { return t.id; });
      var lt = await window.sb.from('reactions').select('target_id')
        .eq('user_id', window.currentUser.id)
        .eq('target_type', 'forum_topic')
        .in('target_id', tIds);
      if (!append) likedTopicIds = new Set();
      if (lt.data) lt.data.forEach(function(r) { likedTopicIds.add(r.target_id); });
    }
    renderForumList(applyForumFilters());
  } catch (e) {
    console.error('Forum load error:', e);
    if (window.showToast) showToast('Ошибка загрузки тем');
  }
  fEl('forumSkeletons', function(el) { el.classList.add('hidden'); });
}
function forumLoadMore() {
  forumPage++;
  loadForumTopics(true);
}
function applyForumFilters() {
  let filtered = allForumTopics;
  if (forumCat !== 'all') {
    filtered = filtered.filter(function(t) { return t.category === forumCat; });
  }
  if (forumQuery) {
    filtered = filtered.filter(function(t) {
      const title = (t.title || '').toLowerCase();
      const content = (t.content || '').toLowerCase();
      return title.indexOf(forumQuery) !== -1 || content.indexOf(forumQuery) !== -1;
    });
  }
  return sortForumTopics(filtered);
}
function sortForumTopics(arr) {
  const sorted = arr.slice();
  if (forumSortMethod === 'hot') {
    sorted.sort(function(a, b) {
      return (b.replies_count || 0) + (b.views_count || 0) - (a.replies_count || 0) - (a.views_count || 0);
    });
  } else if (forumSortMethod === 'unanswered') {
    return sorted.filter(function(t) { return (t.replies_count || 0) === 0; });
  }
  return sorted;
}
function renderForumList(topics) {
  const list = document.getElementById('forumList');
  const empty = document.getElementById('forumEmpty');
  if (!list) return;
  if (!topics || topics.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = topics.map(function(t, i) {
    const cat = FORUM_CATS[t.category] || { label: t.category, css: 'ct-off' };
    const author = t.author || {};
    const suffix = fDnaSuffix(author.dna_type);
    const ini = fInitials(author.name);
    const isHot = (t.replies_count || 0) >= 5;
    const pinIcon = t.is_pinned ? '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" width="14" height="14"><path d="M12 2v10l4 4H8l4-4V2z"/><line x1="12" y1="22" x2="12" y2="18"/></svg>' : '';
    return '<div class="forum-card" data-cat="' + t.category + '" style="animation-delay:' + (i * 40) + 'ms" onclick="openForumTopic(\'' + t.id + '\')">' +
      '<div class="ftc-top"><span class="cat-tag ' + cat.css + '">' + fEsc(cat.label) + '</span>' + (isHot ? '<span class="heat-badge">Hot</span>' : '') + pinIcon + '</div>' +
      '<div class="ftc-title">' + fEsc(t.title) + '</div>' +
      '<div class="ftc-preview">' + fEsc((t.content || '').slice(0, 120)) + '</div>' +
      '<div class="ftc-meta">' + buildForumAv(author, 22) + '<span class="ftc-author ftc-author-' + suffix + '">' + fEsc(author.name) + '</span><span class="ftc-time">' + fTimeAgo(t.created_at) + '</span></div>' +
      '<div class="ftc-stats">' +
      '<div class="ftc-stat' + (likedTopicIds.has(t.id) ? ' liked' : '') + '" onclick="event.stopPropagation();likeTopicFromList(\'' + t.id + '\',this)"><svg viewBox="0 0 24 24" fill="' + (likedTopicIds.has(t.id) ? '#ef4444' : 'none') + '" stroke="' + (likedTopicIds.has(t.id) ? '#ef4444' : 'currentColor') + '" stroke-width="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><span>' + (t.likes_count || 0) + '</span></div>' +
      '<div class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' + (t.views_count || 0) + '</div>' +
      '<div class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' + (t.replies_count || 0) + '</div></div></div>';
  }).join('');
  fEl('forumLoadMore', function(el) { el.classList.toggle('hidden', !forumHasMore); });
}
function forumFilterCat(cat) {
  forumCat = cat;
  updateForumCatUI();
  renderForumList(applyForumFilters());
}
function updateForumCatUI() {
  document.querySelectorAll('#forumCats .forum-cat').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-cat') === forumCat); });
}
function forumSort(method) {
  forumSortMethod = method;
  updateForumSortUI();
  renderForumList(applyForumFilters());
}
function updateForumSortUI() {
  document.querySelectorAll('#forumSortTabs .forum-sort-tab').forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-sort') === forumSortMethod); });
}
function toggleForumSearch() {
  const bar = document.getElementById('forumSearchBar');
  const inp = document.getElementById('forumSearchInput');
  if (!bar) return;
  const show = bar.classList.contains('hidden');
  bar.classList.toggle('hidden', !show);
  if (show && inp) { inp.value = ''; inp.focus(); }
  if (!show) { forumQuery = ''; renderForumList(applyForumFilters()); }
}
let _forumSearchTimer;
function forumSearch(val) {
  clearTimeout(_forumSearchTimer);
  _forumSearchTimer = setTimeout(function() {
    forumQuery = (val || '').toLowerCase().trim();
    renderForumList(applyForumFilters());
  }, 300);
}
// ===== FORUM TOPIC DETAIL =====
function openForumTopic(topicId) {
  currentTopic = null;
  currentTopic = allForumTopics.find(function(t) { return t.id === topicId; }) || null;
  if (!currentTopic) return;
  window._forumTopicId = topicId;
  goTo('scrForumTopic');
}
async function initForumTopic() {
  if (window.cancelForumReply) cancelForumReply();
  const topicId = window._forumTopicId;
  const scrEl = document.getElementById('scrForumTopic');
  if (scrEl && currentTopic) scrEl.setAttribute('data-category', currentTopic.category || '');
  if (!topicId) { goBack(); return; }
  const res = await window.sb.from('forum_topics')
    .select('*, author:users(id, name, avatar_url, dna_type, level)')
    .eq('id', topicId).single();
  if (res.error || !res.data) { goBack(); return; }
  currentTopic = res.data;
  if (scrEl) scrEl.setAttribute('data-category', currentTopic.category || '');
  window.sb.from('forum_topics').update({ views_count: (currentTopic.views_count || 0) + 1 })
    .eq('id', topicId).then(function() {});
  requestAnimationFrame(function() { renderTopicHeader(currentTopic); });
  loadForumReplies(topicId);
  if (_forumRepliesChannel) window.sb.removeChannel(_forumRepliesChannel);
  _forumRepliesChannel = window.sb.channel('forum-replies-rt-' + topicId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_replies', filter: 'topic_id=eq.' + topicId }, function() { loadForumReplies(topicId); })
    .subscribe();
  if (window.initForumTopicSwipe) initForumTopicSwipe();
  if (window.initReplyInput) initReplyInput();
  const scrollEl = document.getElementById('scrForumTopic');
  if (scrollEl && !scrollEl._dateScroll) {
    scrollEl._dateScroll = true;
    let _scrollTimer;
    scrollEl.addEventListener('scroll', function() {
      document.querySelectorAll('.forum-date-divider').forEach(function(el) {
        el.classList.add('visible');
      });
      clearTimeout(_scrollTimer);
      _scrollTimer = setTimeout(function() {
        document.querySelectorAll('.forum-date-divider').forEach(function(el) {
          el.classList.remove('visible');
        });
      }, 1200);
    }, { passive: true });
  }
}
function renderTopicHeader(t) {
  const author = t.author || {};
  const suffix = fDnaSuffix(author.dna_type);
  const cat = FORUM_CATS[t.category] || { label: t.category, css: 'ct-off' };
  fEl('forumTopicTitleH', function(el) { el.textContent = t.title || ''; });
  fEl('forumTopicAv', function(el) { el.textContent = fInitials(author.name); el.className = 'forum-av forum-av-' + suffix; });
  fEl('forumTopicAuthor', function(el) { el.textContent = author.name || 'Аноним'; });
  fEl('forumTopicTime', function(el) { el.textContent = fTimeAgo(t.created_at); });
  fEl('forumTopicCatTag', function(el) { el.textContent = cat.label; el.className = 'cat-tag ' + cat.css; });
  fEl('forumTopicTitle', function(el) { el.textContent = t.title || ''; });
  fEl('forumTopicBody', function(el) { el.textContent = t.content || ''; });
  fEl('forumTopicViews', function(el) { el.textContent = (t.views_count || 0) + 1; });
  fEl('forumTopicReplyCount', function(el) { el.textContent = t.replies_count || 0; });
  fEl('forumTopicLikeCount', function(el) { el.textContent = t.likes_count || 0; });
  const likeBtn = document.getElementById('forumTopicLike');
  if (likeBtn) {
    likeBtn.classList.remove('liked');
    if (likedTopicIds.has(t.id)) likeBtn.classList.add('liked');
  }
}
async function loadForumReplies(topicId) {
  try {
    const res = await window.sb.from('forum_replies')
      .select('*, author:users(id, name, avatar_url, dna_type, level)')
      .eq('topic_id', topicId)
      .order('is_best', { ascending: false })
      .order('created_at', { ascending: true });
    if (res.error) throw res.error;
    currentTopicReplies = res.data || [];
    likedReplyIds = new Set();
    if (window.currentUser && currentTopicReplies.length) {
      var ids = currentTopicReplies.map(function(r) { return r.id; });
      var lr = await window.sb.from('reactions').select('target_id')
        .eq('user_id', window.currentUser.id)
        .eq('target_type', 'forum_reply')
        .in('target_id', ids);
      if (lr.data) lr.data.forEach(function(r) { likedReplyIds.add(r.target_id); });
    }
    renderForumReplies(currentTopicReplies);
  } catch (e) {
    console.error('Forum replies load error:', e);
    if (window.showToast) showToast('Ошибка загрузки ответов');
  }
}
function renderForumReplies(replies) {
  const container = document.getElementById('forumReplies'), noReplies = document.getElementById('forumNoReplies');
  const countLabel = document.getElementById('forumRepliesCountLabel'), divider = document.getElementById('forumRepliesDiv');
  const n = replies.length;
  if (countLabel) countLabel.textContent = n + ' ' + (n===1?'ответ':n<5?'ответа':'ответов');
  if (!n) { if (container) container.innerHTML = ''; if (noReplies) noReplies.classList.remove('hidden'); if (divider) divider.classList.add('hidden'); return; }
  if (noReplies) noReplies.classList.add('hidden'); if (divider) divider.classList.remove('hidden');
  if (!container) return;
  const replyMap = {}; replies.forEach(function(r) { replyMap[r.id] = r; });
  const sorted = replies.slice().sort(function(a,b) {
    if (a.is_best && !b.is_best) return -1; if (!a.is_best && b.is_best) return 1;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  let html = '';
  let lastDate = '';
  sorted.forEach(function(r, i) {
    const d = new Date(r.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let label = '';
    if (d.toDateString() === today.toDateString()) label = 'Сегодня';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Вчера';
    else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    if (label !== lastDate) {
      html += '<div class="forum-date-divider"><span>' + label + '</span></div>';
      lastDate = label;
    }
    html += buildReplyBubble(r, i, replyMap);
  });
  container.innerHTML = html;
  if (window.attachReplySwipe) attachReplySwipe();
  container.querySelectorAll('.forum-reply-row').forEach(row => {
    attachLongPress(row, () => {
      const id = row.dataset.id;
      const mine = row.dataset.mine === 'true';
      const text = row.querySelector('.reply-text')
        ?.textContent?.trim() || '';
      const author = row.querySelector('.reply-name')
        ?.textContent?.trim() || '';
      openReplyCtxMenu(id, mine, text, author, row);
    });
  });
}
function buildReplyBubble(r, i, replyMap) {
  const a = r.author || {}, suffix = fDnaSuffix(a.dna_type);
  const isMe = window.currentUser && a.id === window.currentUser.id;
  const bestCls = r.is_best ? ' is-best' : '', bestLabel = r.is_best ? '<div class="best-label">★ Лучший ответ</div>' : '';
  const liked = likedReplyIds.has(r.id), lc = liked ? ' liked' : '', lf = liked ? '#ef4444' : 'none', ls = liked ? '#ef4444' : 'currentColor';
  let quoteHtml = '';
  if (r.parent_id && replyMap[r.parent_id]) {
    const p = replyMap[r.parent_id], pa = p.author || {};
    quoteHtml = '<div class="reply-quote-block" onclick="event.stopPropagation();scrollToReply(\'' + r.parent_id + '\')"><span class="reply-quote-author">' + fEsc(pa.name||'Аноним') + '</span><span class="reply-quote-text">' + fEsc((p.content||'').slice(0,60)) + '</span></div>';
  }
  return '<div class="forum-reply-row" data-id="' + r.id + '" data-mine="' + isMe + '" data-time="' + new Date(r.created_at).getTime() + '" style="animation-delay:' + (i*30) + 'ms">' +
    buildForumAv(a, 32) +
    '<div class="forum-reply' + bestCls + ' dna-' + suffix + (isMe ? ' is-mine' : '') + '">' + bestLabel + quoteHtml +
      '<div class="reply-top"><span class="reply-name reply-name-' + suffix + '">' + (isMe ? 'Вы' : fEsc(a.name||'Аноним')) + '</span><span class="reply-time">' + fTimeAgo(r.created_at) + '</span>' + (r.updated_at && r.updated_at !== r.created_at ? '<span class="reply-edited">изменено</span>' : '') + '</div>' +
      '<div class="reply-text">' + fEsc(r.content) + '</div>' +
      '<div class="reply-actions-row">' +
        '<button class="reply-reply-btn" onclick="event.stopPropagation();replyToForumReply(\'' + r.id + '\',\'' + fEsc(a.name||'') + '\',\'' + fEsc((r.content||'').slice(0,60)) + '\')">Ответить</button>' +
        '<div class="reply-like-btn' + lc + '" onclick="event.stopPropagation();likeForumReply(\'' + r.id + '\',this)">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="' + lf + '" stroke="' + ls + '" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' +
          '<span>' + (r.likes_count||0) + '</span></div></div></div></div>';
}
// ═══════════════════════════════════════
// ЛАЙКИ, МЕНЮ, ШЕРИНГ, УДАЛЕНИЕ — см. forum-interactions.js
// ═══════════════════════════════════════
function replyToForumReply(replyId, authorName, previewText) {
  forumReplyToId = replyId;
  const ctx = document.getElementById('forumReplyContext');
  const authorEl = document.getElementById('forumReplyAuthor');
  const msgEl = document.getElementById('forumReplyMsg');
  if (authorEl) authorEl.textContent = authorName || 'Аноним';
  if (msgEl) msgEl.textContent = (previewText || '').slice(0, 60);
  if (ctx) ctx.classList.add('active');
  const input = document.getElementById('forumReplyInput');
  if (input) input.focus();
}
function cancelForumReply() {
  forumReplyToId = null;
  window._editReplyId = null;
  const ctx = document.getElementById('forumReplyContext');
  if (ctx) ctx.classList.remove('active');
  const input = document.getElementById('forumReplyInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const sendBtn = document.getElementById('forumReplySendBtn');
  if (sendBtn) sendBtn.classList.remove('visible');
}
async function sendForumReply() {
  const user = window.currentUser;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }
  if (!currentTopic) return;
  const inp = document.getElementById('forumReplyInput');
  const content = (inp ? inp.value : '').trim();
  if (!content) return;
  if (window._editReplyId) {
    await window.editReplyById(window._editReplyId, content);
    if (inp) inp.value = '';
    if (window.cancelForumReply) cancelForumReply();
    return;
  }
  const btn = document.querySelector('.forum-reply-send');
  if (btn) btn.disabled = true;
  const payload = { topic_id: currentTopic.id, author_id: user.id, content: content };
  if (forumReplyToId && !forumReplyToId.toString().startsWith('temp_')) payload.parent_id = forumReplyToId;
  const result = await window.sb.from('forum_replies').insert(payload);
  if (result.error) {
    console.error('sendForumReply:', result.error); if (window.showToast) showToast('Ошибка: ' + (result.error.message || 'отправка'));
    if (btn) btn.disabled = false;
    return;
  }
  await window.sb.from('forum_topics').update({
    replies_count: (currentTopic.replies_count || 0) + 1,
    last_reply_at: new Date().toISOString()
  }).eq('id', currentTopic.id);
  if (inp) inp.value = '';
  cancelForumReply();
  if (btn) btn.disabled = false;
  currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
  loadForumReplies(currentTopic.id).then(function() {
    const scr = document.querySelector('#scrForumTopic.scr') || document.getElementById('scrForumTopic');
    if (scr) setTimeout(function() { scr.scrollTop = scr.scrollHeight; }, 150);
  });
}
// ===== FORUM CREATE =====
function initForumCreate() {
  forumSelectedCat = '';
  fEl('forumTitleInput', function(el) { el.value = ''; });
  fEl('forumContentInput', function(el) { el.value = ''; });
  fEl('forumCatSelectText', function(el) { el.textContent = 'Выберите категорию'; });
  fEl('forumTitleCount', function(el) { el.textContent = '0/120'; });
  fEl('forumContentCount', function(el) { el.textContent = '0/3000'; });
  fEl('forumPreview', function(el) { el.classList.add('hidden'); });
  fEl('forumPublishBtn', function(el) { el.classList.add('disabled'); el.disabled = true; });
}
function onForumFormInput() {
  const title = (document.getElementById('forumTitleInput')?.value || '');
  const content = (document.getElementById('forumContentInput')?.value || '');
  fEl('forumTitleCount', function(el) { el.textContent = title.length + '/120'; });
  fEl('forumContentCount', function(el) { el.textContent = content.length + '/3000'; });
  const valid = forumSelectedCat && title.trim().length >= 5 && content.trim().length >= 10;
  fEl('forumPublishBtn', function(el) { el.classList.toggle('disabled', !valid); el.disabled = !valid; });
  const preview = document.getElementById('forumPreview');
  if (title.trim()) {
    if (preview) preview.classList.remove('hidden');
    fEl('forumPreviewTitle', function(el) { el.textContent = title; });
    fEl('forumPreviewText', function(el) { el.textContent = content.slice(0, 150) + (content.length > 150 ? '...' : ''); });
    const catInfo = FORUM_CATS[forumSelectedCat];
    fEl('forumPreviewFooter', function(el) { el.textContent = (catInfo ? catInfo.label : '') + ' · только что'; });
  } else {
    if (preview) preview.classList.add('hidden');
  }
}
function openForumCatSheet() { fEl('forumCatSheet', function(el) { el.classList.remove('hidden'); }); }
function closeForumCatSheet() { fEl('forumCatSheet', function(el) { el.classList.add('hidden'); }); }
function selectForumCat(cat, label) {
  forumSelectedCat = cat;
  fEl('forumCatSelectText', function(el) { el.textContent = label; });
  closeForumCatSheet();
  onForumFormInput();
}
async function publishForumTopic() {
  const user = window.currentUser;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }
  const title = (document.getElementById('forumTitleInput')?.value || '').trim();
  const content = (document.getElementById('forumContentInput')?.value || '').trim();
  if (!forumSelectedCat || title.length < 5 || content.length < 10) return;
  const pubBtn = document.getElementById('forumPublishBtn');
  if (pubBtn) { pubBtn.disabled = true; pubBtn.textContent = 'Создание...'; }
  const result = await window.sb.from('forum_topics').insert({
    author_id: user.id, category: forumSelectedCat, title: title, content: content
  });
  if (result.error) {
    if (window.showToast) showToast('Ошибка публикации');
    if (pubBtn) { pubBtn.disabled = false; pubBtn.textContent = 'Создать'; }
    return;
  }
  if (window.showToast) showToast('Тема создана!');
  goBack();
}
function forumCleanup() {
  closeReplyCtxMenu?.();
  if (_forumChannel) { window.sb.removeChannel(_forumChannel); _forumChannel = null; }
  if (_forumRepliesChannel) { window.sb.removeChannel(_forumRepliesChannel); _forumRepliesChannel = null; }
}
// ===== REPLY CONTEXT MENU — см. forum-ctx-menu.js =====

// ===== EXPORTS =====
window.forumCleanup = forumCleanup;
window.initForum = initForum;
window.initForumTopic = initForumTopic;
window.initForumCreate = initForumCreate;
window.forumFilterCat = forumFilterCat;
function scrollToReply(replyId) {
  const rows = document.querySelectorAll('.forum-reply-row');
  for (let i = 0; i < rows.length; i++) {
    const btn = rows[i].querySelector('[onclick*="' + replyId + '"]');
    if (btn) {
      rows[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows[i].style.transition = 'background 0.3s';
      rows[i].style.background = 'rgba(139,92,246,0.1)';
      setTimeout(function(el) { el.style.background = ''; }, 800, rows[i]);
      return;
    }
  }
}
window.scrollToReply = scrollToReply;
window.forumLoadMore = forumLoadMore;
window.forumSort = forumSort;
window.forumSearch = forumSearch;
window.toggleForumSearch = toggleForumSearch;
window.openForumTopic = openForumTopic;
window.sendForumReply = sendForumReply;
window.cancelForumReply = cancelForumReply;
window.replyToForumReply = replyToForumReply;
window.openForumCatSheet = openForumCatSheet;
window.closeForumCatSheet = closeForumCatSheet;
window.selectForumCat = selectForumCat;
window.onForumFormInput = onForumFormInput;
window.publishForumTopic = publishForumTopic;
