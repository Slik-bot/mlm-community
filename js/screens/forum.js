// ===== FORUM SCREENS — список тем, тема, создание =====

let currentTopic = null;
let allTopics = [];
let forumCategory = 'all';
let forumSortMethod = 'new';
let forumSearchQuery = '';
let forumSearchTimer = null;

const FORUM_CATS = {
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
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return min + ' мин';
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + ' ч';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + ' д';
  return Math.floor(days / 30) + ' мес';
}

function getDnaBadgeHtml(dnaType) {
  if (!dnaType || !window.getDnaColor) return '';
  const color = window.getDnaColor(dnaType);
  const labels = { strategist: 'С', communicator: 'К', creator: 'Кр', analyst: 'А' };
  const label = labels[dnaType] || '';
  return '<span class="dna-badge-mini" style="background:' + color + '22;color:' + color + '">' + label + '</span>';
}

// ===== FORUM LIST =====

function initForum() {
  forumCategory = 'all';
  forumSortMethod = 'new';
  forumSearchQuery = '';
  const sortSel = document.getElementById('forumSortSelect');
  if (sortSel) sortSel.value = 'new';
  const searchInput = document.getElementById('forumSearchInput');
  if (searchInput) searchInput.value = '';
  updateForumCatUI();
  loadForumTopics();
}

async function loadForumTopics() {
  try {
    let query = window.sb.from('forum_topics')
      .select('*, author:users!author_id(id, name, avatar_url, dna_type, level)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (forumCategory !== 'all') {
      query = query.eq('category', forumCategory);
    }

    const { data, error } = await query;
    if (error) throw error;
    allTopics = data || [];
    applySortAndRender();
  } catch (err) {
    console.error('loadForumTopics:', err);
    if (window.showToast) showToast('Ошибка загрузки тем');
    allTopics = [];
    applySortAndRender();
  }
}

function applySortAndRender() {
  let sorted = allTopics.slice();

  if (forumSearchQuery) {
    const q = forumSearchQuery.toLowerCase();
    sorted = sorted.filter(function(t) {
      return t.title.toLowerCase().includes(q);
    });
  }

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
  const list = document.getElementById('forumList');
  const empty = document.getElementById('forumEmpty');
  if (!list) return;

  if (!topics.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = topics.map(function(t) {
    const cat = getCatLabel(t.category);
    const author = t.author || {};
    const pinIcon = t.is_pinned ? '<span class="ftc-pinned"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>' : '';
    const preview = escHtml((t.content || '').replace(/\n/g, ' ').substring(0, 120));
    const dnaBadge = getDnaBadgeHtml(author.dna_type);

    return '<div class="forum-topic-card" onclick="openTopic(\'' + t.id + '\')">' +
      '<div class="ftc-top">' +
        '<span class="ftc-cat" style="background:' + cat.color + '22;color:' + cat.color + '">' + cat.label + '</span>' +
        pinIcon +
      '</div>' +
      '<div class="ftc-title">' + escHtml(t.title) + '</div>' +
      (preview ? '<div class="ftc-preview">' + preview + '</div>' : '') +
      '<div class="ftc-meta">' +
        '<img class="ftc-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<span class="ftc-author">' + escHtml(author.name || 'Участник') + '</span>' +
        dnaBadge +
        '<span class="ftc-time">' + formatTimeAgo(t.created_at) + '</span>' +
      '</div>' +
      '<div class="ftc-stats">' +
        '<span class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + (t.views_count || 0) + '</span>' +
        '<span class="ftc-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> ' + (t.replies_count || 0) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function forumFilterCat(cat) {
  forumCategory = cat;
  updateForumCatUI();
  loadForumTopics();
}

function updateForumCatUI() {
  const btns = document.querySelectorAll('#forumCats .forum-cat');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === forumCategory);
  });
}

function forumSort(method) {
  forumSortMethod = method;
  applySortAndRender();
}

function forumSearch(value) {
  clearTimeout(forumSearchTimer);
  forumSearchTimer = setTimeout(function() {
    forumSearchQuery = value;
    applySortAndRender();
  }, 300);
}

function openTopic(topicId) {
  currentTopic = allTopics.find(function(t) { return t.id === topicId; });
  if (currentTopic) goTo('scrForumTopic');
}

// ===== FORUM TOPIC =====

function initForumTopic() {
  if (!currentTopic) { goBack(); return; }

  const cat = getCatLabel(currentTopic.category);
  const badge = document.getElementById('topicCatBadge');
  if (badge) {
    badge.textContent = cat.label;
    badge.style.background = cat.color + '22';
    badge.style.color = cat.color;
  }

  const titleEl = document.getElementById('topicTitle');
  if (titleEl) titleEl.textContent = currentTopic.title;

  const bodyEl = document.getElementById('topicBody');
  if (bodyEl) bodyEl.textContent = currentTopic.content || '';

  const author = currentTopic.author || {};
  const avatarEl = document.getElementById('topicAuthorAvatar');
  if (avatarEl) avatarEl.src = author.avatar_url || 'assets/default-avatar.svg';

  const nameEl = document.getElementById('topicAuthorName');
  if (nameEl) nameEl.textContent = author.name || 'Участник';

  const dnaEl = document.getElementById('topicAuthorDna');
  if (dnaEl) dnaEl.innerHTML = getDnaBadgeHtml(author.dna_type);

  const levelEl = document.getElementById('topicAuthorLevel');
  if (levelEl) levelEl.textContent = 'Ур. ' + (author.level || 1);

  const timeEl = document.getElementById('topicTime');
  if (timeEl) timeEl.textContent = formatTimeAgo(currentTopic.created_at);

  const viewsEl = document.getElementById('topicViews');
  if (viewsEl) viewsEl.textContent = (currentTopic.views_count || 0) + 1;

  const repliesEl = document.getElementById('topicRepliesCount');
  if (repliesEl) repliesEl.textContent = currentTopic.replies_count || 0;

  const likesEl = document.getElementById('topicLikesCount');
  if (likesEl) likesEl.textContent = currentTopic.likes_count || 0;

  loadReplies(currentTopic.id);
  incrementTopicViews(currentTopic);
}

async function incrementTopicViews(topic) {
  try {
    await window.sb.from('forum_topics').update({
      views_count: (topic.views_count || 0) + 1
    }).eq('id', topic.id);
  } catch (err) {
    console.error('incrementTopicViews:', err);
  }
}

async function loadReplies(topicId) {
  try {
    const { data, error } = await window.sb.from('forum_replies')
      .select('*, author:users!author_id(id, name, avatar_url, dna_type, level)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    renderReplies(data || []);
  } catch (err) {
    console.error('loadReplies:', err);
    renderReplies([]);
  }
}

function renderReplies(replies) {
  const container = document.getElementById('topicReplies');
  if (!container) return;

  if (!replies.length) {
    container.innerHTML = '<div class="replies-empty">Ответов пока нет</div>';
    return;
  }

  const isTopicAuthor = currentTopic && window.currentUser && currentTopic.author_id === window.currentUser.id;

  container.innerHTML = replies.map(function(r) {
    const author = r.author || {};
    const bestClass = r.is_best ? ' reply-best' : '';
    const bestBadge = r.is_best ? '<span class="reply-best-badge">Лучший ответ</span>' : '';
    const markBtn = (isTopicAuthor && !r.is_best)
      ? '<button class="reply-mark-best" onclick="forumMarkBest(\'' + r.id + '\')">Лучший</button>' : '';
    const dnaBadge = getDnaBadgeHtml(author.dna_type);

    return '<div class="reply-card glass-card' + bestClass + '">' +
      bestBadge +
      '<div class="reply-header">' +
        '<img class="reply-avatar" src="' + (author.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
        '<div class="reply-info">' +
          '<span class="reply-name">' + escHtml(author.name || 'Участник') + ' ' + dnaBadge + '</span>' +
          '<span class="reply-level">Ур. ' + (author.level || 1) + '</span>' +
        '</div>' +
        '<span class="reply-time">' + formatTimeAgo(r.created_at) + '</span>' +
      '</div>' +
      '<div class="reply-text">' + escHtml(r.content) + '</div>' +
      '<div class="reply-actions">' +
        '<button class="reply-like-btn" onclick="forumLikeReply(\'' + r.id + '\', this)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">' +
            '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>' +
          '</svg> ' +
          '<span>' + (r.likes_count || 0) + '</span>' +
        '</button>' +
        markBtn +
      '</div>' +
    '</div>';
  }).join('');
}

async function forumSubmitReply() {
  const input = document.getElementById('replyInput');
  const text = input ? input.value.trim() : '';
  if (!text || !currentTopic || !window.currentUser) return;

  try {
    const { error } = await window.sb.from('forum_replies').insert({
      topic_id: currentTopic.id,
      author_id: window.currentUser.id,
      content: text
    });
    if (error) throw error;

    await window.sb.from('forum_topics').update({
      replies_count: (currentTopic.replies_count || 0) + 1,
      last_reply_at: new Date().toISOString()
    }).eq('id', currentTopic.id);

    currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
    if (input) input.value = '';
    loadReplies(currentTopic.id);
  } catch (err) {
    console.error('forumSubmitReply:', err);
    if (window.showToast) showToast('Ошибка отправки ответа');
  }
}

async function forumMarkBest(replyId) {
  if (!currentTopic || !window.currentUser) return;
  if (currentTopic.author_id !== window.currentUser.id) return;

  try {
    await window.sb.from('forum_replies')
      .update({ is_best: false })
      .eq('topic_id', currentTopic.id);

    await window.sb.from('forum_replies')
      .update({ is_best: true })
      .eq('id', replyId);

    loadReplies(currentTopic.id);
  } catch (err) {
    console.error('forumMarkBest:', err);
    if (window.showToast) showToast('Ошибка');
  }
}

async function forumLikeTopic() {
  if (!currentTopic || !window.currentUser) return;

  try {
    const newCount = (currentTopic.likes_count || 0) + 1;
    const el = document.getElementById('topicLikesCount');
    if (el) el.textContent = newCount;
    currentTopic.likes_count = newCount;

    const { error } = await window.sb.from('forum_topics').update({
      likes_count: newCount
    }).eq('id', currentTopic.id);
    if (error) throw error;
  } catch (err) {
    console.error('forumLikeTopic:', err);
  }
}

async function forumLikeReply(replyId, btn) {
  if (!window.currentUser) return;

  try {
    const countEl = btn ? btn.querySelector('span') : null;
    const current = parseInt(countEl ? countEl.textContent : '0', 10);
    const newCount = current + 1;
    if (countEl) countEl.textContent = newCount;

    const { error } = await window.sb.from('forum_replies').update({
      likes_count: newCount
    }).eq('id', replyId);
    if (error) throw error;
  } catch (err) {
    console.error('forumLikeReply:', err);
  }
}

// ===== FORUM CREATE =====

function initForumCreate() {
  const title = document.getElementById('fcTitle');
  const body = document.getElementById('fcBody');
  const cat = document.getElementById('fcCategory');
  if (title) title.value = '';
  if (body) body.value = '';
  if (cat) cat.value = 'business';
}

async function forumCreateTopic() {
  const title = document.getElementById('fcTitle');
  const body = document.getElementById('fcBody');
  const cat = document.getElementById('fcCategory');

  const titleVal = title ? title.value.trim() : '';
  const bodyVal = body ? body.value.trim() : '';
  const catVal = cat ? cat.value : 'business';

  if (!titleVal || !bodyVal) {
    if (window.showToast) showToast('Заполните заголовок и текст');
    return;
  }
  if (!window.currentUser) return;

  try {
    const { error } = await window.sb.from('forum_topics').insert({
      author_id: window.currentUser.id,
      category: catVal,
      title: titleVal,
      content: bodyVal
    });
    if (error) throw error;

    if (window.showToast) showToast('Тема создана!');
    goBack();
  } catch (err) {
    console.error('forumCreateTopic:', err);
    if (window.showToast) showToast('Ошибка создания темы');
  }
}

// ===== EXPORTS =====
window.initForum = initForum;
window.initForumTopic = initForumTopic;
window.initForumCreate = initForumCreate;
window.forumFilterCat = forumFilterCat;
window.forumSort = forumSort;
window.forumSearch = forumSearch;
window.openTopic = openTopic;
window.forumSubmitReply = forumSubmitReply;
window.forumMarkBest = forumMarkBest;
window.forumLikeTopic = forumLikeTopic;
window.forumLikeReply = forumLikeReply;
window.forumCreateTopic = forumCreateTopic;
