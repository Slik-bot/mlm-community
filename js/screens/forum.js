// ===== FORUM — список тем, тема, создание =====
// Рендер-функции — см. forum-render.js
let currentTopic = null;
let allTopics = [];
let currentCat = 'all';
let currentSort = 'created_at';
let searchQuery = '';
let searchTimer = null;
let selectedCreateCat = '';
let replyToId = null;

const CAT_MAP = {
  business: { label: 'Бизнес', cls: 'ct-biz' },
  marketing: { label: 'Маркетинг', cls: 'ct-mkt' },
  tools: { label: 'Инструменты', cls: 'ct-tool' },
  education: { label: 'Обучение', cls: 'ct-edu' },
  newbies: { label: 'Новичкам', cls: 'ct-new' },
  cases: { label: 'Кейсы', cls: 'ct-case' },
  offtop: { label: 'Оффтоп', cls: 'ct-off' }
};

const DNA_CLS = { strategist: 's', communicator: 'c', creator: 'r', analyst: 'a' };

// ===== УТИЛИТЫ =====
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return min + ' мин';
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + ' ч';
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Вчера';
  if (days < 30) return days + ' д';
  const d = new Date(dateStr);
  const m = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return d.getDate() + ' ' + m[d.getMonth()];
}

function getDnaSuffix(t) { return DNA_CLS[t] || 's'; }
function getCatInfo(c) { return CAT_MAP[c] || { label: c || '?', cls: 'ct-off' }; }
function isLiked(type, id) { return localStorage.getItem('trafiqo_liked_' + type + '_' + id) === '1'; }
function setLiked(type, id) { localStorage.setItem('trafiqo_liked_' + type + '_' + id, '1'); }
function removeLiked(type, id) { localStorage.removeItem('trafiqo_liked_' + type + '_' + id); }

window.forumUtils = { formatTimeAgo: formatTimeAgo, getDnaSuffix: getDnaSuffix, getCatInfo: getCatInfo, isLiked: isLiked };

// ===== FORUM LIST =====
function initForum() {
  if (window.clearTemplateCache) window.clearTemplateCache(['scrForum','scrForumTopic','scrForumCreate']);
  currentCat = 'all';
  currentSort = 'created_at';
  searchQuery = '';
  const si = document.getElementById('forumSearchInput');
  if (si) si.value = '';
  const sb = document.getElementById('forumSearchBar');
  if (sb) sb.classList.add('hidden');
  updateCatUI();
  updateSortUI();
  bindSearchToggle();
  loadForumTopics();
  updateForumBadge();
}

function bindSearchToggle() {
  const sb = document.getElementById('forumSearchBar');
  const si = document.getElementById('forumSearchInput');
  const openBtn = document.getElementById('forumSearchBtn');
  const closeBtn = document.getElementById('forumSearchClose');
  if (openBtn) openBtn.onclick = function() {
    if (sb) sb.classList.remove('hidden');
    if (si) si.focus();
  };
  if (closeBtn) closeBtn.onclick = function() {
    if (sb) sb.classList.add('hidden');
    if (si) { si.value = ''; searchQuery = ''; applySortAndRender(); }
  };
}

function forumFilterCat(cat) {
  currentCat = cat;
  updateCatUI();
  loadForumTopics();
}

function forumSort(method) {
  currentSort = method;
  updateSortUI();
  loadForumTopics();
}

function forumSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { searchQuery = value; applySortAndRender(); }, 300);
}

function updateCatUI() {
  document.querySelectorAll('#forumCats .forum-cat').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.cat === currentCat);
  });
}

function updateSortUI() {
  document.querySelectorAll('#forumSortTabs .forum-sort-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.sort === currentSort);
  });
}

function showForumSkeleton() {
  const list = document.getElementById('forumList');
  if (!list) return;
  let h = '';
  for (let i = 0; i < 4; i++) {
    h += '<div class="forum-skeleton" style="height:120px;margin-bottom:10px"></div>';
  }
  list.innerHTML = h;
}

async function loadForumTopics() {
  showForumSkeleton();
  try {
    let q = window.sb.from('forum_topics')
      .select('*, author:users!author_id(id, name, full_name, username, avatar_url, dna_type, level)')
      .limit(30);
    if (currentCat !== 'all') q = q.eq('category', currentCat);
    if (currentSort === 'created_at') q = q.order('created_at', { ascending: false });
    else if (currentSort === 'hot') q = q.order('last_reply_at', { ascending: false });
    else if (currentSort === 'likes_count') q = q.order('likes_count', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    allTopics = data || [];
    applySortAndRender();
  } catch (err) {
    console.error('loadForumTopics:', err);
    if (window.showToast) window.showToast('Ошибка загрузки тем');
    allTopics = [];
    applySortAndRender();
  }
}

function applySortAndRender() {
  let sorted = allTopics.slice();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    sorted = sorted.filter(function(t) { return t.title.toLowerCase().includes(q); });
  }
  window.renderForumList(sorted);
}

function openForumTopic(topicId) {
  currentTopic = allTopics.find(function(t) { return t.id === topicId; });
  if (currentTopic) goTo('scrForumTopic');
}

// ===== FORUM TOPIC =====
function initForumTopic() {
  if (!currentTopic) { goBack(); return; }
  requestAnimationFrame(function() {
    const titleEl = document.getElementById('forumTopicTitle');
    if (titleEl) titleEl.textContent = currentTopic.title || 'Тема';
    const opEl = document.getElementById('forumOpBlock');
    if (opEl) opEl.innerHTML = window.buildOpBlock(currentTopic);
    bindOpActions();
    bindTopicEvents();
    setReplyBarAvatar();
    loadReplies(currentTopic.id);
    incrementViews(currentTopic);
  });
}

function setReplyBarAvatar() {
  const el = document.getElementById('forumReplyBarAv');
  if (!el || !window.currentUser) return;
  el.innerHTML = window.buildForumAvatar(window.currentUser, 28);
}

function bindOpActions() {
  const opEl = document.getElementById('forumOpBlock');
  if (!opEl) return;
  opEl.querySelectorAll('.forum-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      toggleLike(btn.dataset.type, btn.dataset.id, btn);
    });
  });
  const replyAction = opEl.querySelector('.topic-reply-action');
  if (replyAction) replyAction.addEventListener('click', function() {
    const input = document.getElementById('forumReplyInput');
    if (input) input.focus();
  });
  const shareAction = opEl.querySelector('.topic-share-action');
  if (shareAction) shareAction.addEventListener('click', function() {
    if (navigator.share && currentTopic) {
      navigator.share({ title: currentTopic.title, url: location.href });
    }
  });
}

function bindTopicEvents() {
  const backBtn = document.getElementById('forumTopicBack');
  if (backBtn) backBtn.onclick = function() { goBack(); };
  const moreBtn = document.getElementById('forumTopicMoreBtn');
  const moreMenu = document.getElementById('forumMoreMenu');
  const moreOv = document.getElementById('forumMoreOverlay');
  if (moreBtn) moreBtn.onclick = function() {
    if (moreMenu) moreMenu.classList.toggle('hidden');
    if (moreOv) moreOv.classList.toggle('hidden');
  };
  if (moreOv) moreOv.onclick = function() {
    if (moreMenu) moreMenu.classList.add('hidden');
    moreOv.classList.add('hidden');
  };
  const sendBtn = document.getElementById('forumReplySend');
  if (sendBtn) sendBtn.onclick = function() { forumSubmitReply(); };
  const ctxClose = document.getElementById('forumReplyContextClose');
  if (ctxClose) ctxClose.onclick = function() {
    replyToId = null;
    const ctx = document.getElementById('forumReplyContext');
    if (ctx) ctx.classList.add('hidden');
  };
  const shareBtn = document.getElementById('forumShareBtn');
  if (shareBtn) shareBtn.onclick = function() {
    if (navigator.share && currentTopic) {
      navigator.share({ title: currentTopic.title, url: location.href });
    }
    if (moreMenu) moreMenu.classList.add('hidden');
    if (moreOv) moreOv.classList.add('hidden');
  };
  const reportBtn = document.getElementById('forumReportBtn');
  if (reportBtn) reportBtn.onclick = function() {
    if (window.showToast) window.showToast('Жалоба отправлена');
    if (moreMenu) moreMenu.classList.add('hidden');
    if (moreOv) moreOv.classList.add('hidden');
  };
}

async function incrementViews(topic) {
  try {
    await window.sb.from('forum_topics').update({
      views_count: (topic.views_count || 0) + 1
    }).eq('id', topic.id);
  } catch (err) {
    console.error('incrementViews:', err);
  }
}

async function loadReplies(topicId) {
  try {
    const { data, error } = await window.sb.from('forum_replies')
      .select('*, author:users!author_id(id, name, full_name, username, avatar_url, dna_type, level)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const isTA = currentTopic && window.currentUser &&
      currentTopic.author_id === window.currentUser.id;
    window.renderReplies(data || [], isTA);
  } catch (err) {
    console.error('loadReplies:', err);
    window.renderReplies([], false);
  }
}

function setReplyTo(replyId, authorName) {
  replyToId = replyId;
  const ctx = document.getElementById('forumReplyContext');
  const txt = document.getElementById('forumReplyContextText');
  if (ctx) ctx.classList.remove('hidden');
  if (txt) txt.textContent = 'Ответ для ' + authorName;
  const input = document.getElementById('forumReplyInput');
  if (input) input.focus();
}

// ===== ACTIONS =====
async function toggleLike(type, id, btn) {
  if (!window.currentUser) return;
  const countEl = btn ? btn.querySelector('span') : null;
  const current = parseInt(countEl ? countEl.textContent : '0', 10);
  const wasLiked = isLiked(type, id);
  const newCount = wasLiked ? Math.max(0, current - 1) : current + 1;
  if (countEl) countEl.textContent = newCount;
  btn.classList.toggle('liked', !wasLiked);
  if (wasLiked) removeLiked(type, id); else setLiked(type, id);
  try {
    const table = type === 'topic' ? 'forum_topics' : 'forum_replies';
    const { error } = await window.sb.from(table).update({
      likes_count: newCount
    }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('toggleLike:', err);
    if (countEl) countEl.textContent = current;
    btn.classList.toggle('liked', wasLiked);
    if (wasLiked) setLiked(type, id); else removeLiked(type, id);
  }
}

async function forumSubmitReply() {
  const input = document.getElementById('forumReplyInput');
  const text = input ? input.value.trim() : '';
  if (!text || !currentTopic || !window.currentUser) return;
  try {
    const payload = {
      topic_id: currentTopic.id,
      author_id: window.currentUser.id,
      content: text
    };
    if (replyToId) payload.parent_id = replyToId;
    const { error } = await window.sb.from('forum_replies').insert(payload);
    if (error) throw error;
    await window.sb.from('forum_topics').update({
      replies_count: (currentTopic.replies_count || 0) + 1,
      last_reply_at: new Date().toISOString()
    }).eq('id', currentTopic.id);
    currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
    if (input) input.value = '';
    replyToId = null;
    const ctx = document.getElementById('forumReplyContext');
    if (ctx) ctx.classList.add('hidden');
    loadReplies(currentTopic.id);
  } catch (err) {
    console.error('forumSubmitReply:', err);
    if (window.showToast) window.showToast('Ошибка отправки ответа');
  }
}

async function forumMarkBest(replyId) {
  if (!currentTopic || !window.currentUser) return;
  if (currentTopic.author_id !== window.currentUser.id) return;
  try {
    await window.sb.from('forum_replies')
      .update({ is_best: false }).eq('topic_id', currentTopic.id);
    await window.sb.from('forum_replies')
      .update({ is_best: true }).eq('id', replyId);
    loadReplies(currentTopic.id);
  } catch (err) {
    console.error('forumMarkBest:', err);
    if (window.showToast) window.showToast('Ошибка');
  }
}

// ===== FORUM CREATE =====
function initForumCreate() {
  selectedCreateCat = '';
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  const catText = document.getElementById('forumCatSelectText');
  if (titleIn) titleIn.value = '';
  if (bodyIn) bodyIn.value = '';
  if (catText) catText.textContent = 'Выберите категорию';
  updateCreateCounts();
  validateCreateForm();
  bindCreateEvents();
  hidePreview();
}

function bindCreateEvents() {
  const closeBtn = document.getElementById('forumCreateClose');
  if (closeBtn) closeBtn.onclick = function() { goBack(); };
  const pubBtn = document.getElementById('forumPublishBtn');
  if (pubBtn) pubBtn.onclick = function() { submitForumTopic(); };
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  if (titleIn) titleIn.oninput = function() {
    updateCreateCounts(); validateCreateForm(); updatePreview();
  };
  if (bodyIn) bodyIn.oninput = function() {
    updateCreateCounts(); validateCreateForm(); updatePreview();
  };
  const catBtn = document.getElementById('forumCatSelect');
  const catSheet = document.getElementById('forumCatSheet');
  const catOv = document.getElementById('forumCatSheetOverlay');
  if (catBtn) catBtn.onclick = function() {
    if (catSheet) catSheet.classList.remove('hidden');
  };
  if (catOv) catOv.onclick = function() {
    if (catSheet) catSheet.classList.add('hidden');
  };
  document.querySelectorAll('.forum-cat-option').forEach(function(opt) {
    opt.onclick = function() {
      selectedCreateCat = opt.dataset.cat;
      const txt = document.getElementById('forumCatSelectText');
      if (txt) txt.textContent = opt.dataset.label;
      if (catSheet) catSheet.classList.add('hidden');
      validateCreateForm();
    };
  });
}

function updateCreateCounts() {
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  const tc = document.getElementById('forumTitleCount');
  const bc = document.getElementById('forumBodyCount');
  if (tc && titleIn) tc.textContent = titleIn.value.length + '/100';
  if (bc && bodyIn) bc.textContent = bodyIn.value.length + '/2000';
}

function validateCreateForm() {
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  const pubBtn = document.getElementById('forumPublishBtn');
  const valid = selectedCreateCat &&
    titleIn && titleIn.value.trim().length >= 10 &&
    bodyIn && bodyIn.value.trim().length >= 20;
  if (pubBtn) {
    pubBtn.disabled = !valid;
    pubBtn.classList.toggle('disabled', !valid);
  }
}

function updatePreview() {
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  const block = document.getElementById('forumPreviewBlock');
  const pt = document.getElementById('forumPreviewTitle');
  const pb = document.getElementById('forumPreviewText');
  const pf = document.getElementById('forumPreviewFooter');
  const titleVal = titleIn ? titleIn.value.trim() : '';
  const bodyVal = bodyIn ? bodyIn.value.trim() : '';
  if (!titleVal && !bodyVal) { hidePreview(); return; }
  if (block) block.classList.remove('hidden');
  if (pt) pt.textContent = titleVal;
  if (pb) pb.textContent = bodyVal.substring(0, 200) + (bodyVal.length > 200 ? '...' : '');
  if (pf && selectedCreateCat) {
    const cat = getCatInfo(selectedCreateCat);
    pf.textContent = cat.label;
  }
}

function hidePreview() {
  const block = document.getElementById('forumPreviewBlock');
  if (block) block.classList.add('hidden');
}

async function submitForumTopic() {
  const titleIn = document.getElementById('forumTitleInput');
  const bodyIn = document.getElementById('forumBodyInput');
  const titleVal = titleIn ? titleIn.value.trim() : '';
  const bodyVal = bodyIn ? bodyIn.value.trim() : '';
  if (!selectedCreateCat || titleVal.length < 10 || bodyVal.length < 20) {
    if (window.showToast) window.showToast('Заполните все поля');
    return;
  }
  if (!window.currentUser) return;
  try {
    const { data, error } = await window.sb.from('forum_topics').insert({
      author_id: window.currentUser.id,
      category: selectedCreateCat,
      title: titleVal,
      content: bodyVal
    }).select().single();
    if (error) throw error;
    showXpToast('+15 XP — Тема опубликована!');
    if (data) {
      currentTopic = data;
      goTo('scrForumTopic');
    } else {
      goBack();
    }
  } catch (err) {
    console.error('submitForumTopic:', err);
    if (window.showToast) window.showToast('Ошибка создания темы');
  }
}

function showXpToast(text) {
  const el = document.createElement('div');
  el.className = 'forum-xp-toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

function updateForumBadge() {
  const lastVisit = localStorage.getItem('forum_last_visit');
  localStorage.setItem('forum_last_visit', new Date().toISOString());
  if (!lastVisit || !allTopics.length) return;
  const newCount = allTopics.filter(function(t) {
    return new Date(t.created_at) > new Date(lastVisit);
  }).length;
  const tab = document.querySelector('[data-scr="scrForum"] .tab-badge');
  if (tab) {
    if (newCount > 0) { tab.textContent = newCount; tab.classList.remove('hidden'); }
    else tab.classList.add('hidden');
  }
}

// ===== EXPORTS =====
window.initForum = initForum;
window.initForumTopic = initForumTopic;
window.initForumCreate = initForumCreate;
window.forumFilterCat = forumFilterCat;
window.forumSort = forumSort;
window.forumSearch = forumSearch;
window.openForumTopic = openForumTopic;
window.forumSubmitReply = forumSubmitReply;
window.forumMarkBest = forumMarkBest;
window.toggleLike = toggleLike;
window.setReplyTo = setReplyTo;
