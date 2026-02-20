// ===== FORUM SCREENS — список тем, тема, создание =====

var currentTopic = null;
var allTopics = [];
var forumCategory = 'all';
var forumSortMethod = 'new';

var FORUM_CATS = {
  business:  { label: 'Бизнес',       color: '#3b82f6' },
  marketing: { label: 'Маркетинг',    color: '#22c55e' },
  tools:     { label: 'Инструменты',  color: '#f59e0b' },
  education: { label: 'Обучение',     color: '#a78bfa' },
  newbies:   { label: 'Новичкам',     color: '#8b5cf6' },
  cases:     { label: 'Кейсы',        color: '#f97316' },
  offtopic:  { label: 'Оффтоп',       color: 'rgba(255,255,255,0.3)' }
};

function getCatLabel(cat) {
  return FORUM_CATS[cat] || { label: cat, color: 'rgba(255,255,255,0.3)' };
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return min + ' мин';
  var hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + ' ч';
  var days = Math.floor(hrs / 24);
  if (days < 30) return days + ' д';
  return Math.floor(days / 30) + ' мес';
}

// ===== FORUM LIST =====

function initForum() {
  forumCategory = 'all';
  forumSortMethod = 'new';
  var sortSel = document.getElementById('forumSortSelect');
  if (sortSel) sortSel.value = 'new';
  updateForumCatUI();
  loadForumTopics();
}

async function loadForumTopics() {
  var query = window.sb.from('forum_topics')
    .select('*, author:users(id, name, avatar_url, dna_type, level)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (forumCategory !== 'all') {
    query = query.eq('category', forumCategory);
  }

  var result = await query;
  allTopics = result.data || [];
  applySortAndRender();
}

function applySortAndRender() {
  var sorted = allTopics.slice();
  if (forumSortMethod === 'active') {
    sorted.sort(function(a, b) {
      return new Date(b.last_reply_at || b.created_at) - new Date(a.last_reply_at || a.created_at);
    });
  } else if (forumSortMethod === 'popular') {
    sorted.sort(function(a, b) { return (b.replies_count || 0) - (a.replies_count || 0); });
  }
  renderForumList(sorted);
}

function renderForumList(topics) {
  var list = document.getElementById('forumList');
  var empty = document.getElementById('forumEmpty');
  if (!list) return;

  if (!topics.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = topics.map(function(t) {
    var cat = getCatLabel(t.category);
    var author = t.author || {};
    var pinIcon = t.is_pinned ? '<span class="ftc-pinned"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>' : '';
    return '<div class="forum-topic-card" onclick="openTopic(\'' + t.id + '\')">' +
      '<div class="ftc-top">' +
        '<span class="ftc-cat" style="background:' + cat.color + '22;color:' + cat.color + '">' + cat.label + '</span>' +
        pinIcon +
      '</div>' +
      '<div class="ftc-title">' + escapeHtml(t.title) + '</div>' +
      '<div class="ftc-meta">' +
        '<img class="ftc-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<span class="ftc-author">' + escapeHtml(author.name || 'Участник') + '</span>' +
        '<span class="ftc-time">' + formatTimeAgo(t.created_at) + '</span>' +
      '</div>' +
      '<div class="ftc-stats">' +
        '<span class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + (t.views_count || 0) + '</span>' +
        '<span class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> ' + (t.replies_count || 0) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function forumFilterCat(cat) {
  forumCategory = cat;
  updateForumCatUI();
  loadForumTopics();
}

function updateForumCatUI() {
  var btns = document.querySelectorAll('#forumCats .forum-cat');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === forumCategory);
  });
}

function forumSort(method) {
  forumSortMethod = method;
  applySortAndRender();
}

function openTopic(topicId) {
  currentTopic = allTopics.find(function(t) { return t.id === topicId; });
  if (currentTopic) goTo('scrForumTopic');
}

// ===== FORUM TOPIC =====

function initForumTopic() {
  if (!currentTopic) { goBack(); return; }

  var cat = getCatLabel(currentTopic.category);
  var badge = document.getElementById('topicCatBadge');
  if (badge) {
    badge.textContent = cat.label;
    badge.style.background = cat.color + '22';
    badge.style.color = cat.color;
  }

  var titleEl = document.getElementById('topicTitle');
  if (titleEl) titleEl.textContent = currentTopic.title;

  var bodyEl = document.getElementById('topicBody');
  if (bodyEl) bodyEl.textContent = currentTopic.body || '';

  var author = currentTopic.author || {};
  var avatarEl = document.getElementById('topicAuthorAvatar');
  if (avatarEl) avatarEl.src = author.avatar_url || 'assets/default-avatar.svg';

  var nameEl = document.getElementById('topicAuthorName');
  if (nameEl) nameEl.textContent = author.name || 'Участник';

  var timeEl = document.getElementById('topicTime');
  if (timeEl) timeEl.textContent = formatTimeAgo(currentTopic.created_at);

  var viewsEl = document.getElementById('topicViews');
  if (viewsEl) viewsEl.textContent = (currentTopic.views_count || 0) + 1;

  var repliesEl = document.getElementById('topicRepliesCount');
  if (repliesEl) repliesEl.textContent = currentTopic.replies_count || 0;

  loadReplies(currentTopic.id);

  window.sb.from('forum_topics').update({
    views_count: (currentTopic.views_count || 0) + 1
  }).eq('id', currentTopic.id);
}

async function loadReplies(topicId) {
  var result = await window.sb.from('forum_replies')
    .select('*, author:users(id, name, avatar_url, dna_type, level)')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });

  renderReplies(result.data || []);
}

function renderReplies(replies) {
  var container = document.getElementById('topicReplies');
  if (!container) return;

  if (!replies.length) {
    container.innerHTML = '<div class="replies-empty">Ответов пока нет</div>';
    return;
  }

  var isAuthor = currentTopic && window.currentUser && currentTopic.author_id === window.currentUser.id;

  container.innerHTML = replies.map(function(r) {
    var author = r.author || {};
    var bestClass = r.is_best ? ' reply-best' : '';
    var bestBadge = r.is_best ? '<span class="reply-best-badge">Лучший ответ</span>' : '';
    var markBtn = (isAuthor && !r.is_best) ? '<button class="reply-mark-best" onclick="forumMarkBest(\'' + r.id + '\')">Лучший</button>' : '';

    return '<div class="reply-card glass-card' + bestClass + '">' +
      bestBadge +
      '<div class="reply-header">' +
        '<img class="reply-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<div class="reply-info">' +
          '<span class="reply-name">' + escapeHtml(author.name || 'Участник') + '</span>' +
          '<span class="reply-level">Ур. ' + (author.level || 1) + '</span>' +
        '</div>' +
        '<span class="reply-time">' + formatTimeAgo(r.created_at) + '</span>' +
      '</div>' +
      '<div class="reply-text">' + escapeHtml(r.content) + '</div>' +
      '<div class="reply-actions">' + markBtn + '</div>' +
    '</div>';
  }).join('');
}

async function forumSubmitReply() {
  var input = document.getElementById('replyInput');
  var text = input ? input.value.trim() : '';
  if (!text || !currentTopic || !window.currentUser) return;

  await window.sb.from('forum_replies').insert({
    topic_id: currentTopic.id,
    author_id: window.currentUser.id,
    content: text
  });

  await window.sb.from('forum_topics').update({
    replies_count: (currentTopic.replies_count || 0) + 1,
    last_reply_at: new Date().toISOString()
  }).eq('id', currentTopic.id);

  currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
  if (input) input.value = '';
  loadReplies(currentTopic.id);
}

async function forumMarkBest(replyId) {
  if (!currentTopic || !window.currentUser) return;
  if (currentTopic.author_id !== window.currentUser.id) return;

  await window.sb.from('forum_replies')
    .update({ is_best: false })
    .eq('topic_id', currentTopic.id);

  await window.sb.from('forum_replies')
    .update({ is_best: true })
    .eq('id', replyId);

  loadReplies(currentTopic.id);
}

// ===== FORUM CREATE =====

function initForumCreate() {
  var title = document.getElementById('fcTitle');
  var body = document.getElementById('fcBody');
  var cat = document.getElementById('fcCategory');
  if (title) title.value = '';
  if (body) body.value = '';
  if (cat) cat.value = 'business';
}

async function forumCreateTopic() {
  var title = document.getElementById('fcTitle');
  var body = document.getElementById('fcBody');
  var cat = document.getElementById('fcCategory');

  var titleVal = title ? title.value.trim() : '';
  var bodyVal = body ? body.value.trim() : '';
  var catVal = cat ? cat.value : 'business';

  if (!titleVal || !bodyVal) {
    if (window.showToast) showToast('Заполните заголовок и текст');
    return;
  }
  if (!window.currentUser) return;

  await window.sb.from('forum_topics').insert({
    author_id: window.currentUser.id,
    category: catVal,
    title: titleVal,
    body: bodyVal
  });

  if (window.showToast) showToast('Тема создана!');
  goBack();
}

// ===== EXPORTS =====
window.initForum = initForum;
window.initForumTopic = initForumTopic;
window.initForumCreate = initForumCreate;
window.forumFilterCat = forumFilterCat;
window.forumSort = forumSort;
window.openTopic = openTopic;
window.forumSubmitReply = forumSubmitReply;
window.forumMarkBest = forumMarkBest;
window.forumCreateTopic = forumCreateTopic;
