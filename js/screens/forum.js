// ===== FORUM — единый файл: список, тема, создание =====
var currentTopic = null, allTopics = [], currentCat = 'all', currentSort = 'created_at';
var searchQuery = '', searchTimer = null, selectedCreateCat = '', replyToId = null;
var CAT_MAP = {
  business: { label: 'Бизнес', cls: 'ct-biz' }, marketing: { label: 'Маркетинг', cls: 'ct-mkt' },
  tools: { label: 'Инструменты', cls: 'ct-tool' }, education: { label: 'Обучение', cls: 'ct-edu' },
  newbies: { label: 'Новичкам', cls: 'ct-new' }, cases: { label: 'Кейсы', cls: 'ct-case' },
  offtop: { label: 'Оффтоп', cls: 'ct-off' }
};
var DNA_CLS = { strategist: 's', communicator: 'c', creator: 'r', analyst: 'a' };
var DNA_LABELS = { strategist: 'С', communicator: 'К', creator: 'Кр', analyst: 'А' };
var SVG_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
var SVG_BUBBLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var SVG_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var SVG_PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
var SVG_REPLY_IC = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>';
var SVG_SHARE_IC = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
var AUTHOR_SELECT = '*, author:users!author_id(id, name, full_name, username, avatar_url, dna_type, level)';

// --- Утилиты ---
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function timeAgo(d) {
  if (!d) return '';
  var diff = Date.now() - new Date(d).getTime(), min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return min + ' мин';
  var hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + ' ч';
  var days = Math.floor(hrs / 24);
  if (days === 1) return 'Вчера';
  if (days < 30) return days + ' д';
  var dt = new Date(d), m = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return dt.getDate() + ' ' + m[dt.getMonth()];
}
function dnaSuffix(t) { return DNA_CLS[t] || 's'; }
function catInfo(c) { return CAT_MAP[c] || { label: c || '?', cls: 'ct-off' }; }
function isLiked(type, id) { return localStorage.getItem('trafiqo_liked_' + type + '_' + id) === '1'; }
function setLiked(type, id) { localStorage.setItem('trafiqo_liked_' + type + '_' + id, '1'); }
function removeLiked(type, id) { localStorage.removeItem('trafiqo_liked_' + type + '_' + id); }
function pluralReply(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'ответа';
  return 'ответов';
}

// --- Рендер: аватар + DNA бейдж ---
function buildAv(user, size) {
  var u = user || {}, d = dnaSuffix(u.dna_type), cls = 'forum-av forum-av-' + d;
  if (u.avatar_url) {
    return '<img class="' + cls + '" width="' + size + '" height="' + size +
      '" src="' + esc(u.avatar_url) + '" alt="" style="object-fit:cover">';
  }
  var ini = esc((u.name || u.full_name || '?')[0].toUpperCase()), fs = Math.round(size * 0.42);
  return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size +
    'px;font-size:' + fs + 'px;display:flex;align-items:center;justify-content:center">' + ini + '</div>';
}
function buildDnaBadge(dnaType) {
  var dl = DNA_LABELS[dnaType];
  return dl ? ' <span class="dna-badge dna-badge-' + dnaSuffix(dnaType) + '">' + dl + '</span>' : '';
}

// --- Рендер: карточка темы ---
function buildCard(t, idx) {
  var cat = catInfo(t.category), a = t.author || {};
  var name = esc(a.name || a.full_name || 'Участник');
  var preview = esc((t.content || '').replace(/\n/g, ' ').substring(0, 120));
  var isHot = (t.replies_count || 0) > 10 || (t.likes_count || 0) > 20;
  var heat = isHot ? ' <span class="heat-badge">hot</span>' : '';
  var pin = t.is_pinned ? ' ' + SVG_PIN : '';
  var liked = isLiked('topic', t.id) ? ' liked' : '';
  return '<div class="forum-card" data-id="' + t.id + '" style="animation-delay:' + (idx * 60) + 'ms">' +
    '<div class="ftc-top"><span class="cat-tag ' + cat.cls + '">' + cat.label + '</span>' + heat + pin + '</div>' +
    '<div class="ftc-title">' + esc(t.title) + '</div>' +
    (preview ? '<div class="ftc-preview">' + preview + '</div>' : '') +
    '<div class="ftc-meta">' + buildAv(a, 46) +
    '<span class="ftc-author">' + name + buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="ftc-time">' + timeAgo(t.created_at) + '</span></div>' +
    '<div class="ftc-stats">' +
    '<span class="ftc-stat">' + SVG_EYE + ' ' + (t.views_count || 0) + '</span>' +
    '<span class="ftc-stat">' + SVG_BUBBLE + ' ' + (t.replies_count || 0) + '</span>' +
    '<span class="ftc-stat forum-like-btn' + liked + '" data-type="topic" data-id="' + t.id + '">' +
    SVG_HEART + ' <span>' + (t.likes_count || 0) + '</span></span></div></div>';
}

// --- Рендер: ОП блок ---
function buildOpBlock(t) {
  var a = t.author || {}, name = esc(a.name || a.full_name || 'Участник'), cat = catInfo(t.category);
  var liked = isLiked('topic', t.id) ? ' liked' : '';
  return '<div class="topic-header"><div class="topic-meta">' + buildAv(a, 44) +
    '<div class="topic-meta-info"><span class="topic-author-name">' + name + buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="topic-time">' + timeAgo(t.created_at) + '</span></div></div>' +
    '<div class="topic-title">' + esc(t.title) + '</div>' +
    '<div class="topic-body">' + esc(t.content || '') + '</div>' +
    '<span class="cat-tag ' + cat.cls + '">' + cat.label + '</span>' +
    '<div class="topic-stats">' +
    '<span class="topic-stat">' + SVG_EYE + ' ' + ((t.views_count || 0) + 1) + '</span>' +
    '<span class="topic-stat forum-like-btn' + liked + '" data-type="topic" data-id="' + t.id + '">' +
    SVG_HEART + ' <span>' + (t.likes_count || 0) + '</span></span>' +
    '<span class="topic-stat topic-reply-action">' + SVG_REPLY_IC + ' Ответить</span>' +
    '<span class="topic-stat topic-share-action">' + SVG_SHARE_IC + '</span></div></div>';
}

// --- Рендер: ответ ---
function buildBubble(r, isTopicAuthor) {
  var a = r.author || {}, name = esc(a.name || a.full_name || 'Участник');
  var bestCls = r.is_best ? ' is-best' : '', liked = isLiked('reply', r.id) ? ' liked' : '';
  var bestLabel = r.is_best ? '<span class="best-label">Лучший ответ</span>' : '';
  var markBest = (isTopicAuthor && !r.is_best) ? '<button class="reply-mark-best" data-id="' + r.id + '">Лучший</button>' : '';
  return '<div class="forum-reply' + bestCls + '">' + bestLabel +
    '<div class="reply-header">' + buildAv(a, 34) +
    '<div class="reply-info"><span class="reply-name">' + name + buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="reply-level">Ур. ' + (a.level || 1) + '</span></div>' +
    '<span class="reply-time">' + timeAgo(r.created_at) + '</span></div>' +
    '<div class="reply-text">' + esc(r.content) + '</div>' +
    '<div class="reply-actions"><span class="forum-like-btn' + liked + '" data-type="reply" data-id="' + r.id + '">' +
    SVG_HEART + ' <span>' + (r.likes_count || 0) + '</span></span>' +
    '<button class="reply-reply-btn" data-id="' + r.id + '" data-name="' + esc(name) + '">' + SVG_REPLY_IC + '</button>' +
    markBest + '</div></div>';
}

// --- Рендер: список тем ---
function renderList(topics) {
  var list = document.getElementById('forumList'), empty = document.getElementById('forumEmpty');
  if (!list) return;
  if (!topics.length) { list.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = topics.map(function(t, i) { return buildCard(t, i); }).join('');
  list.querySelectorAll('.forum-card').forEach(function(card) {
    card.addEventListener('click', function() { openForumTopic(card.dataset.id); });
  });
  list.querySelectorAll('.forum-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleLike(btn.dataset.type, btn.dataset.id, btn); });
  });
}

// --- Рендер: ответы ---
function renderReplies(replies, isTopicAuthor) {
  var container = document.getElementById('forumRepliesList');
  var noReplies = document.getElementById('forumNoReplies');
  var countEl = document.getElementById('forumRepliesCount');
  if (countEl) countEl.textContent = replies.length + ' ' + pluralReply(replies.length);
  if (!container) return;
  if (!replies.length) { container.innerHTML = ''; if (noReplies) noReplies.classList.remove('hidden'); return; }
  if (noReplies) noReplies.classList.add('hidden');
  container.innerHTML = replies.map(function(r) { return buildBubble(r, isTopicAuthor); }).join('');
  container.querySelectorAll('.forum-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { toggleLike(btn.dataset.type, btn.dataset.id, btn); });
  });
  container.querySelectorAll('.reply-mark-best').forEach(function(btn) {
    btn.addEventListener('click', function() { forumMarkBest(btn.dataset.id); });
  });
  container.querySelectorAll('.reply-reply-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { setReplyTo(btn.dataset.id, btn.dataset.name); });
  });
}

// --- Скелетон ---
function showSkeleton() {
  var list = document.getElementById('forumList');
  if (!list) return;
  var h = '';
  for (var i = 0; i < 4; i++) h += '<div class="forum-skeleton" style="height:120px;margin-bottom:10px"></div>';
  list.innerHTML = h;
}

// --- Загрузка тем ---
async function loadTopics() {
  showSkeleton();
  try {
    var q = window.sb.from('forum_topics').select(AUTHOR_SELECT).limit(30);
    if (currentCat !== 'all') q = q.eq('category', currentCat);
    if (currentSort === 'created_at') q = q.order('created_at', { ascending: false });
    else if (currentSort === 'hot') q = q.order('last_reply_at', { ascending: false });
    else if (currentSort === 'likes_count') q = q.order('likes_count', { ascending: false });
    var res = await q;
    if (res.error) throw res.error;
    allTopics = res.data || [];
  } catch (err) {
    console.error('loadTopics:', err);
    if (window.showToast) window.showToast('Ошибка загрузки тем');
    allTopics = [];
  }
  applySortAndRender();
}
function applySortAndRender() {
  var sorted = allTopics.slice();
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    sorted = sorted.filter(function(t) { return t.title.toLowerCase().includes(q); });
  }
  renderList(sorted);
}

// ===== INIT FORUM =====
function initForum() {
  if (window.clearTemplateCache) window.clearTemplateCache(['scrForum', 'scrForumTopic', 'scrForumCreate']);
  currentCat = 'all'; currentSort = 'created_at'; searchQuery = '';
  var si = document.getElementById('forumSearchInput');
  if (si) si.value = '';
  var sb = document.getElementById('forumSearchBar');
  if (sb) sb.classList.add('hidden');
  document.querySelectorAll('#forumCats .forum-cat').forEach(function(b) { b.classList.toggle('active', b.dataset.cat === 'all'); });
  document.querySelectorAll('#forumSortTabs .forum-sort-tab').forEach(function(b) { b.classList.toggle('active', b.dataset.sort === 'created_at'); });
  var openBtn = document.getElementById('forumSearchBtn');
  var closeBtn = document.getElementById('forumSearchClose');
  if (openBtn) openBtn.onclick = function() {
    var bar = document.getElementById('forumSearchBar');
    if (bar) bar.classList.remove('hidden');
    var inp = document.getElementById('forumSearchInput');
    if (inp) inp.focus();
  };
  if (closeBtn) closeBtn.onclick = function() {
    var bar = document.getElementById('forumSearchBar');
    if (bar) bar.classList.add('hidden');
    var inp = document.getElementById('forumSearchInput');
    if (inp) { inp.value = ''; searchQuery = ''; applySortAndRender(); }
  };
  loadTopics();
  updateForumBadge();
}
function forumFilterCat(cat) {
  currentCat = cat;
  document.querySelectorAll('#forumCats .forum-cat').forEach(function(b) { b.classList.toggle('active', b.dataset.cat === cat); });
  loadTopics();
}
function forumSort(method) {
  currentSort = method;
  document.querySelectorAll('#forumSortTabs .forum-sort-tab').forEach(function(b) { b.classList.toggle('active', b.dataset.sort === method); });
  loadTopics();
}
function forumSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { searchQuery = value; applySortAndRender(); }, 300);
}
function openForumTopic(topicId) {
  currentTopic = allTopics.find(function(t) { return t.id === topicId; });
  if (currentTopic) goTo('scrForumTopic');
}

// ===== INIT FORUM TOPIC =====
function initForumTopic() {
  if (!currentTopic) { goBack(); return; }
  requestAnimationFrame(function() {
    var titleEl = document.getElementById('forumTopicTitle');
    if (titleEl) titleEl.textContent = currentTopic.title || 'Тема';
    var opEl = document.getElementById('forumOpBlock');
    if (opEl) opEl.innerHTML = buildOpBlock(currentTopic);
    if (opEl) {
      opEl.querySelectorAll('.forum-like-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { toggleLike(btn.dataset.type, btn.dataset.id, btn); });
      });
      var replyAct = opEl.querySelector('.topic-reply-action');
      if (replyAct) replyAct.addEventListener('click', function() {
        var inp = document.getElementById('forumReplyInput'); if (inp) inp.focus();
      });
      var shareAct = opEl.querySelector('.topic-share-action');
      if (shareAct) shareAct.addEventListener('click', function() {
        if (navigator.share && currentTopic) navigator.share({ title: currentTopic.title, url: location.href });
      });
    }
    var backBtn = document.getElementById('forumTopicBack');
    if (backBtn) backBtn.onclick = function() { goBack(); };
    var moreBtn = document.getElementById('forumTopicMoreBtn');
    var moreMenu = document.getElementById('forumMoreMenu'), moreOv = document.getElementById('forumMoreOverlay');
    if (moreBtn) moreBtn.onclick = function() {
      if (moreMenu) moreMenu.classList.toggle('hidden');
      if (moreOv) moreOv.classList.toggle('hidden');
    };
    if (moreOv) moreOv.onclick = function() {
      if (moreMenu) moreMenu.classList.add('hidden'); moreOv.classList.add('hidden');
    };
    var shareBtn = document.getElementById('forumShareBtn');
    if (shareBtn) shareBtn.onclick = function() {
      if (navigator.share && currentTopic) navigator.share({ title: currentTopic.title, url: location.href });
      if (moreMenu) moreMenu.classList.add('hidden'); if (moreOv) moreOv.classList.add('hidden');
    };
    var reportBtn = document.getElementById('forumReportBtn');
    if (reportBtn) reportBtn.onclick = function() {
      if (window.showToast) window.showToast('Жалоба отправлена');
      if (moreMenu) moreMenu.classList.add('hidden'); if (moreOv) moreOv.classList.add('hidden');
    };
    var sendBtn = document.getElementById('forumReplySend');
    if (sendBtn) sendBtn.onclick = function() { forumSubmitReply(); };
    var ctxClose = document.getElementById('forumReplyContextClose');
    if (ctxClose) ctxClose.onclick = function() {
      replyToId = null;
      var ctx = document.getElementById('forumReplyContext'); if (ctx) ctx.classList.add('hidden');
    };
    var barAv = document.getElementById('forumReplyBarAv');
    if (barAv && window.currentUser) barAv.innerHTML = buildAv(window.currentUser, 28);
    loadReplies(currentTopic.id);
    incrementViews(currentTopic);
  });
}
async function incrementViews(topic) {
  try { await window.sb.from('forum_topics').update({ views_count: (topic.views_count || 0) + 1 }).eq('id', topic.id); }
  catch (err) { console.error('incrementViews:', err); }
}
async function loadReplies(topicId) {
  try {
    var res = await window.sb.from('forum_replies').select(AUTHOR_SELECT)
      .eq('topic_id', topicId).order('created_at', { ascending: true });
    if (res.error) throw res.error;
    var isTA = currentTopic && window.currentUser && currentTopic.author_id === window.currentUser.id;
    renderReplies(res.data || [], isTA);
  } catch (err) { console.error('loadReplies:', err); renderReplies([], false); }
}
function setReplyTo(replyId, authorName) {
  replyToId = replyId;
  var ctx = document.getElementById('forumReplyContext'), txt = document.getElementById('forumReplyContextText');
  if (ctx) ctx.classList.remove('hidden');
  if (txt) txt.textContent = 'Ответ для ' + authorName;
  var inp = document.getElementById('forumReplyInput'); if (inp) inp.focus();
}

// --- Действия ---
async function toggleLike(type, id, btn) {
  if (!window.currentUser) return;
  var countEl = btn ? btn.querySelector('span') : null;
  var current = parseInt(countEl ? countEl.textContent : '0', 10);
  var wasLiked = isLiked(type, id), newCount = wasLiked ? Math.max(0, current - 1) : current + 1;
  if (countEl) countEl.textContent = newCount;
  btn.classList.toggle('liked', !wasLiked);
  if (wasLiked) removeLiked(type, id); else setLiked(type, id);
  try {
    var table = type === 'topic' ? 'forum_topics' : 'forum_replies';
    var res = await window.sb.from(table).update({ likes_count: newCount }).eq('id', id);
    if (res.error) throw res.error;
  } catch (err) {
    console.error('toggleLike:', err);
    if (countEl) countEl.textContent = current;
    btn.classList.toggle('liked', wasLiked);
    if (wasLiked) setLiked(type, id); else removeLiked(type, id);
  }
}
async function forumSubmitReply() {
  var input = document.getElementById('forumReplyInput'), text = input ? input.value.trim() : '';
  if (!text || !currentTopic || !window.currentUser) return;
  try {
    var payload = { topic_id: currentTopic.id, author_id: window.currentUser.id, content: text };
    if (replyToId) payload.parent_id = replyToId;
    var res = await window.sb.from('forum_replies').insert(payload);
    if (res.error) throw res.error;
    await window.sb.from('forum_topics').update({
      replies_count: (currentTopic.replies_count || 0) + 1, last_reply_at: new Date().toISOString()
    }).eq('id', currentTopic.id);
    currentTopic.replies_count = (currentTopic.replies_count || 0) + 1;
    if (input) input.value = '';
    replyToId = null;
    var ctx = document.getElementById('forumReplyContext'); if (ctx) ctx.classList.add('hidden');
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
    await window.sb.from('forum_replies').update({ is_best: false }).eq('topic_id', currentTopic.id);
    await window.sb.from('forum_replies').update({ is_best: true }).eq('id', replyId);
    loadReplies(currentTopic.id);
  } catch (err) { console.error('forumMarkBest:', err); if (window.showToast) window.showToast('Ошибка'); }
}

// ===== INIT FORUM CREATE =====
function initForumCreate() {
  selectedCreateCat = '';
  var titleIn = document.getElementById('forumTitleInput'), bodyIn = document.getElementById('forumBodyInput');
  var catText = document.getElementById('forumCatSelectText');
  if (titleIn) titleIn.value = '';
  if (bodyIn) bodyIn.value = '';
  if (catText) catText.textContent = 'Выберите категорию';
  updateCounts(); validateForm();
  var closeBtn = document.getElementById('forumCreateClose');
  if (closeBtn) closeBtn.onclick = function() { goBack(); };
  var pubBtn = document.getElementById('forumPublishBtn');
  if (pubBtn) pubBtn.onclick = function() { submitTopic(); };
  if (titleIn) titleIn.oninput = function() { updateCounts(); validateForm(); updatePreview(); };
  if (bodyIn) bodyIn.oninput = function() { updateCounts(); validateForm(); updatePreview(); };
  var catBtn = document.getElementById('forumCatSelect');
  var catSheet = document.getElementById('forumCatSheet'), catOv = document.getElementById('forumCatSheetOverlay');
  if (catBtn) catBtn.onclick = function() { if (catSheet) catSheet.classList.remove('hidden'); };
  if (catOv) catOv.onclick = function() { if (catSheet) catSheet.classList.add('hidden'); };
  document.querySelectorAll('.forum-cat-option').forEach(function(opt) {
    opt.onclick = function() {
      selectedCreateCat = opt.dataset.cat;
      var txt = document.getElementById('forumCatSelectText');
      if (txt) txt.textContent = opt.dataset.label;
      if (catSheet) catSheet.classList.add('hidden');
      validateForm();
    };
  });
  hidePreview();
}
function updateCounts() {
  var titleIn = document.getElementById('forumTitleInput'), bodyIn = document.getElementById('forumBodyInput');
  var tc = document.getElementById('forumTitleCount'), bc = document.getElementById('forumBodyCount');
  if (tc && titleIn) tc.textContent = titleIn.value.length + '/100';
  if (bc && bodyIn) bc.textContent = bodyIn.value.length + '/2000';
}
function validateForm() {
  var titleIn = document.getElementById('forumTitleInput'), bodyIn = document.getElementById('forumBodyInput');
  var pubBtn = document.getElementById('forumPublishBtn');
  var valid = selectedCreateCat && titleIn && titleIn.value.trim().length >= 10 && bodyIn && bodyIn.value.trim().length >= 20;
  if (pubBtn) { pubBtn.disabled = !valid; pubBtn.classList.toggle('disabled', !valid); }
}
function updatePreview() {
  var titleIn = document.getElementById('forumTitleInput'), bodyIn = document.getElementById('forumBodyInput');
  var block = document.getElementById('forumPreviewBlock'), pt = document.getElementById('forumPreviewTitle');
  var pb = document.getElementById('forumPreviewText'), pf = document.getElementById('forumPreviewFooter');
  var tv = titleIn ? titleIn.value.trim() : '', bv = bodyIn ? bodyIn.value.trim() : '';
  if (!tv && !bv) { hidePreview(); return; }
  if (block) block.classList.remove('hidden');
  if (pt) pt.textContent = tv;
  if (pb) pb.textContent = bv.substring(0, 200) + (bv.length > 200 ? '...' : '');
  if (pf && selectedCreateCat) pf.textContent = catInfo(selectedCreateCat).label;
}
function hidePreview() { var b = document.getElementById('forumPreviewBlock'); if (b) b.classList.add('hidden'); }
async function submitTopic() {
  var titleIn = document.getElementById('forumTitleInput'), bodyIn = document.getElementById('forumBodyInput');
  var tv = titleIn ? titleIn.value.trim() : '', bv = bodyIn ? bodyIn.value.trim() : '';
  if (!selectedCreateCat || tv.length < 10 || bv.length < 20) {
    if (window.showToast) window.showToast('Заполните все поля'); return;
  }
  if (!window.currentUser) return;
  try {
    var res = await window.sb.from('forum_topics').insert({
      author_id: window.currentUser.id, category: selectedCreateCat, title: tv, content: bv
    }).select().single();
    if (res.error) throw res.error;
    showXpToast('+15 XP — Тема опубликована!');
    if (res.data) { currentTopic = res.data; goTo('scrForumTopic'); } else goBack();
  } catch (err) {
    console.error('submitTopic:', err);
    if (window.showToast) window.showToast('Ошибка создания темы');
  }
}

// --- XP тост + бейдж ---
function showXpToast(text) {
  var el = document.createElement('div');
  el.className = 'forum-xp-toast'; el.textContent = text;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}
function updateForumBadge() {
  var lastVisit = localStorage.getItem('forum_last_visit');
  localStorage.setItem('forum_last_visit', new Date().toISOString());
  if (!lastVisit || !allTopics.length) return;
  var newCount = allTopics.filter(function(t) { return new Date(t.created_at) > new Date(lastVisit); }).length;
  var tab = document.querySelector('[data-scr="scrForum"] .tab-badge');
  if (tab) {
    if (newCount > 0) { tab.textContent = newCount; tab.classList.remove('hidden'); }
    else tab.classList.add('hidden');
  }
}

// ===== ЭКСПОРТЫ =====
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
