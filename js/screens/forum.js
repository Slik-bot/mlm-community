// ===== FORUM SCREENS — список тем, тема, создание =====
let allForumTopics = [];
let forumCat = 'all';
let forumSortMethod = 'new';
let forumQuery = '';
let currentTopic = null;
let currentTopicReplies = [];
let forumReplyToId = null;
let forumSelectedCat = '';
const FORUM_CATS = {
  business: { label: 'Бизнес', css: 'ct-biz' },
  marketing: { label: 'Маркетинг', css: 'ct-mkt' },
  tools: { label: 'Инструменты', css: 'ct-tool' },
  education: { label: 'Обучение', css: 'ct-edu' },
  newbies: { label: 'Новичкам', css: 'ct-new' },
  cases: { label: 'Кейсы', css: 'ct-case' },
  offtopic: { label: 'Оффтоп', css: 'ct-off' }
};
function fEsc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function fDnaSuffix(dna) {
  if (dna === 'strategist' || dna === 'S') return 's';
  if (dna === 'communicator' || dna === 'C') return 'c';
  if (dna === 'creator' || dna === 'K') return 'r';
  if (dna === 'analyst' || dna === 'A') return 'a';
  return 's';
}
function fTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return m + ' мин';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ч';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' д';
  return Math.floor(d / 30) + ' мес';
}
function fInitials(name) { return (name || '?')[0].toUpperCase(); }
function fEl(id, fn) { const el = document.getElementById(id); if (el) fn(el); }
function buildForumAv(author, size) {
  const suffix = fDnaSuffix(author.dna_type);
  const cls = 'forum-av forum-av-' + suffix;
  const fs = Math.round(size * 0.4);
  if (author.avatar_url) {
    return '<img class="' + cls + '" src="' + fEsc(author.avatar_url) + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;flex-shrink:0" alt="">';
  }
  return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fs + 'px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + fInitials(author.name) + '</div>';
}
// ===== FORUM LIST =====
function initForum() {
  forumCat = 'all';
  forumSortMethod = 'new';
  forumQuery = '';
  fEl('forumSearchBar', function(el) { el.classList.add('hidden'); });
  fEl('forumSearchInput', function(el) { el.value = ''; });
  updateForumCatUI();
  updateForumSortUI();
  loadForumTopics();
}
async function loadForumTopics() {
  fEl('forumSkeletons', function(el) { el.classList.remove('hidden'); });
  fEl('forumList', function(el) { el.innerHTML = ''; });
  const result = await window.sb.from('forum_topics')
    .select('*, author:users(id, name, avatar_url, dna_type, level)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  allForumTopics = result.data || [];
  fEl('forumSkeletons', function(el) { el.classList.add('hidden'); });
  renderForumList(applyForumFilters());
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
    return '<div class="forum-card" style="animation-delay:' + (i * 40) + 'ms" onclick="openForumTopic(\'' + t.id + '\')">' +
      '<div class="ftc-top"><span class="cat-tag ' + cat.css + '">' + fEsc(cat.label) + '</span>' + (isHot ? '<span class="heat-badge">Hot</span>' : '') + pinIcon + '</div>' +
      '<div class="ftc-title">' + fEsc(t.title) + '</div>' +
      '<div class="ftc-preview">' + fEsc((t.content || '').slice(0, 120)) + '</div>' +
      '<div class="ftc-meta"><div class="forum-av forum-av-' + suffix + '" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">' + ini + '</div><span class="ftc-author">' + fEsc(author.name) + '</span><span class="ftc-time">' + fTimeAgo(t.created_at) + '</span></div>' +
      '<div class="ftc-stats">' +
      '<div class="ftc-stat' + (t.likes_count > 0 ? ' liked' : '') + '"><svg viewBox="0 0 24 24" fill="' + (t.likes_count > 0 ? '#ef4444' : 'none') + '" stroke="' + (t.likes_count > 0 ? '#ef4444' : 'currentColor') + '" stroke-width="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><span>' + (t.likes_count || 0) + '</span></div>' +
      '<div class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' + (t.views_count || 0) + '</div>' +
      '<div class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' + (t.replies_count || 0) + '</div></div></div>';
  }).join('');
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
function forumSearch(val) {
  forumQuery = (val || '').toLowerCase().trim();
  renderForumList(applyForumFilters());
}
// ===== FORUM TOPIC DETAIL =====
function openForumTopic(topicId) {
  currentTopic = allForumTopics.find(function(t) { return t.id === topicId; });
  if (!currentTopic) return;
  window._forumTopicId = topicId;
  goTo('scrForumTopic');
}
async function initForumTopic() {
  const topicId = window._forumTopicId;
  if (!topicId) { goBack(); return; }
  if (!currentTopic || currentTopic.id !== topicId) {
    const res = await window.sb.from('forum_topics')
      .select('*, author:users(id, name, avatar_url, dna_type, level)')
      .eq('id', topicId).single();
    currentTopic = res.data;
  }
  if (!currentTopic) { goBack(); return; }
  window.sb.from('forum_topics').update({ views_count: (currentTopic.views_count || 0) + 1 })
    .eq('id', topicId).then(function() {});
  requestAnimationFrame(function() { renderTopicHeader(currentTopic); });
  loadForumReplies(topicId);
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
  if (likeBtn && currentTopic && localStorage.getItem('liked_topic_' + currentTopic.id)) {
    likeBtn.classList.add('liked');
  }
}
async function loadForumReplies(topicId) {
  const res = await window.sb.from('forum_replies')
    .select('*, author:users(id, name, avatar_url, dna_type, level)')
    .eq('topic_id', topicId)
    .order('is_best', { ascending: false })
    .order('created_at', { ascending: true });
  currentTopicReplies = res.data || [];
  renderForumReplies(currentTopicReplies);
}
function renderForumReplies(replies) {
  const container = document.getElementById('forumReplies');
  const noReplies = document.getElementById('forumNoReplies');
  const countLabel = document.getElementById('forumRepliesCountLabel');
  const divider = document.getElementById('forumRepliesDiv');
  if (countLabel) {
    const n = replies.length;
    countLabel.textContent = n + ' ' + (n === 1 ? 'ответ' : (n < 5 ? 'ответа' : 'ответов'));
  }
  if (!replies.length) {
    if (container) container.innerHTML = '';
    if (noReplies) noReplies.classList.remove('hidden');
    if (divider) divider.classList.add('hidden');
    return;
  }
  if (noReplies) noReplies.classList.add('hidden');
  if (divider) divider.classList.remove('hidden');
  if (!container) return;
  container.innerHTML = replies.map(function(r, i) {
    const author = r.author || {};
    const suffix = fDnaSuffix(author.dna_type);
    const bestClass = r.is_best ? ' is-best' : '';
    const bestLabel = r.is_best ? '<div class="best-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Лучший ответ</div>' : '';
    const user = window.currentUser;
    const isAuthor = currentTopic && user && currentTopic.author_id === user.id;
    return '<div class="forum-reply-row">' +
      buildForumAv(author, 34) +
      '<div class="forum-reply' + bestClass + ' dna-' + suffix + '" style="animation-delay:' + (i * 30) + 'ms">' +
        bestLabel +
        '<div class="reply-top">' +
          '<span class="reply-name">' + fEsc(author.name || 'Аноним') + '</span>' +
          '<span class="reply-time">' + fTimeAgo(r.created_at) + '</span>' +
        '</div>' +
        '<div class="reply-text">' + fEsc(r.content) + '</div>' +
        '<div class="reply-reactions">' +
          '<div class="reaction' + (localStorage.getItem('liked_reply_' + r.id) ? ' liked' : '') + '" onclick="event.stopPropagation();likeForumReply(\'' + r.id + '\',this)">' +
            '<svg viewBox="0 0 24 24" width="12" height="12" fill="' + (localStorage.getItem('liked_reply_' + r.id) ? '#ef4444' : 'none') + '" stroke="' + (localStorage.getItem('liked_reply_' + r.id) ? '#ef4444' : 'currentColor') + '" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' +
            '<span>' + (r.likes_count || 0) + '</span>' +
          '</div>' +
          '<button class="reply-reply-btn" onclick="event.stopPropagation();replyToForumReply(\'' + r.id + '\',\'' + fEsc(author.name || '') + '\',\'' + fEsc((r.content || '').slice(0,60)) + '\')">' +
            'Ответить' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}
function forumLikeTopic() {
  if (!currentTopic) return;
  const key = 'liked_topic_' + currentTopic.id;
  const wasLiked = localStorage.getItem(key);
  const el = document.getElementById('forumTopicLike');
  const countEl = document.getElementById('forumTopicLikeCount');
  const cur = parseInt(countEl ? countEl.textContent : '0') || 0;
  if (wasLiked) {
    localStorage.removeItem(key);
    if (el) el.classList.remove('liked');
    if (countEl) countEl.textContent = Math.max(0, cur - 1);
    window.sb.from('forum_topics').update({ likes_count: Math.max(0, cur - 1) }).eq('id', currentTopic.id).then(function(r) { if (r.error) console.error(r.error); });
  } else {
    localStorage.setItem(key, '1');
    if (el) el.classList.add('liked');
    if (countEl) countEl.textContent = cur + 1;
    window.sb.from('forum_topics').update({ likes_count: cur + 1 }).eq('id', currentTopic.id).then(function(r) { if (r.error) console.error(r.error); });
  }
}
function likeForumReply(replyId, btn) {
  const key = 'liked_reply_' + replyId;
  const wasLiked = localStorage.getItem(key);
  const span = btn ? btn.querySelector('span') : null;
  const cur = parseInt(span ? span.textContent : '0') || 0;
  if (wasLiked) {
    localStorage.removeItem(key);
    if (btn) btn.classList.remove('liked');
    if (span) span.textContent = Math.max(0, cur - 1);
    window.sb.from('forum_replies').update({ likes_count: Math.max(0, cur - 1) }).eq('id', replyId).then(function(r) { if (r.error) console.error(r.error); });
  } else {
    localStorage.setItem(key, '1');
    if (btn) btn.classList.add('liked');
    if (span) span.textContent = cur + 1;
    window.sb.from('forum_replies').update({ likes_count: cur + 1 }).eq('id', replyId).then(function(r) { if (r.error) console.error(r.error); });
  }
}
async function markBestReply(replyId) {
  if (!currentTopic) return;
  await window.sb.from('forum_replies').update({ is_best: false }).eq('topic_id', currentTopic.id);
  await window.sb.from('forum_replies').update({ is_best: true }).eq('id', replyId);
  if (window.showToast) showToast('Лучший ответ выбран');
  loadForumReplies(currentTopic.id);
}
function replyToForumReply(replyId, authorName, replyText) {
  forumReplyToId = replyId;
  fEl('forumReplyContext', function(el) { el.classList.remove('hidden'); });
  fEl('forumReplyContextName', function(el) { el.textContent = authorName; });
  fEl('forumReplyContextText', function(el) { el.textContent = (replyText || '').slice(0, 60); });
  fEl('forumReplyInput', function(el) { el.focus(); });
}
function cancelForumReply() {
  forumReplyToId = null;
  fEl('forumReplyContext', function(el) { el.classList.add('hidden'); });
}
async function sendForumReply() {
  const user = window.currentUser;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }
  if (!currentTopic) return;
  const inp = document.getElementById('forumReplyInput');
  const content = (inp ? inp.value : '').trim();
  if (!content) return;
  const btn = document.querySelector('.forum-reply-send');
  if (btn) btn.disabled = true;
  const result = await window.sb.from('forum_replies').insert({
    topic_id: currentTopic.id, author_id: user.id, content: content
  });
  if (result.error) {
    if (window.showToast) showToast('Ошибка отправки');
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
  var suffix = fDnaSuffix(user.dna_type);
  var newBubble = document.createElement('div');
  newBubble.className = 'reply-row new-reply';
  newBubble.style.cssText = 'display:flex;gap:7px;margin:0 10px 10px;align-items:flex-start;animation:bubbleIn 300ms cubic-bezier(0.34,1.56,0.64,1) both';
  newBubble.innerHTML = buildForumAv(user, 32) +
    '<div class="forum-reply dna-' + suffix + '" style="flex:1;min-width:0">' +
      '<div class="reply-top">' +
        '<span class="reply-name">' + fEsc(user.name || user.full_name || 'Вы') + '</span>' +
        '<span class="reply-time">только что</span>' +
      '</div>' +
      '<div class="reply-text">' + fEsc(content) + '</div>' +
      '<div class="reply-reactions"></div>' +
    '</div>';
  var container = document.getElementById('forumReplies');
  if (container) {
    container.appendChild(newBubble);
    newBubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  var countEl = document.getElementById('forumTopicReplyCount');
  if (countEl) countEl.textContent = (currentTopic.replies_count || 0) + 1;
  var labelEl = document.getElementById('forumRepliesCountLabel');
  if (labelEl) {
    var n = (currentTopic.replies_count || 0) + 1;
    labelEl.textContent = n + ' ' + (n === 1 ? 'ответ' : n < 5 ? 'ответа' : 'ответов');
  }
  currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
}
// ===== FORUM MORE MENU =====
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
function showXpToast(text) {
  var t = document.createElement('div');
  t.className = 'forum-xp-toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2500);
}
// ===== EXPORTS =====
window.initForum = initForum;
window.initForumTopic = initForumTopic;
window.initForumCreate = initForumCreate;
window.forumFilterCat = forumFilterCat;
window.forumSort = forumSort;
window.forumSearch = forumSearch;
window.toggleForumSearch = toggleForumSearch;
window.openForumTopic = openForumTopic;
window.forumLikeTopic = forumLikeTopic;
window.sendForumReply = sendForumReply;
window.cancelForumReply = cancelForumReply;
window.replyToForumReply = replyToForumReply;
window.likeForumReply = likeForumReply;
window.markBestReply = markBestReply;
window.openForumMore = openForumMore;
window.closeForumMore = closeForumMore;
window.shareForum = shareForum;
window.deleteForumTopic = deleteForumTopic;
window.openForumCatSheet = openForumCatSheet;
window.closeForumCatSheet = closeForumCatSheet;
window.selectForumCat = selectForumCat;
window.onForumFormInput = onForumFormInput;
window.publishForumTopic = publishForumTopic;
window.showXpToast = showXpToast;
