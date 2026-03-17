// ===== FORUM RENDER — карточки, ОП, ответы =====
// Отделено от forum.js

function esc(s) { return window.escHtml ? window.escHtml(s) : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

var SVG_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
var SVG_BUBBLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var SVG_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var SVG_PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
var SVG_REPLY_IC = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>';
var SVG_SHARE_IC = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

var DNA_LABELS = { strategist: 'С', communicator: 'К', creator: 'Кр', analyst: 'А' };

function fu() { return window.forumUtils; }

// ===== AVATAR =====

function buildForumAvatar(user, size) {
  var u = user || {};
  var d = fu().getDnaSuffix(u.dna_type);
  var cls = 'forum-av forum-av-' + d;
  if (u.avatar_url) {
    return '<img class="' + cls + '" width="' + size + '" height="' + size +
      '" src="' + esc(u.avatar_url) + '" alt="">';
  }
  var ini = esc((u.name || u.full_name || '?')[0].toUpperCase());
  var fs = Math.round(size * 0.42);
  return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size +
    'px;font-size:' + fs + 'px">' + ini + '</div>';
}

function buildDnaBadge(dnaType) {
  var dl = DNA_LABELS[dnaType];
  if (!dl) return '';
  return ' <span class="dna-badge dna-badge-' + fu().getDnaSuffix(dnaType) + '">' + dl + '</span>';
}

// ===== FORUM CARD =====

function buildForumCard(topic, idx) {
  var cat = fu().getCatInfo(topic.category);
  var a = topic.author || {};
  var name = esc(a.name || a.full_name || 'Участник');
  var preview = esc((topic.content || '').replace(/\n/g, ' ').substring(0, 120));
  var isHot = (topic.replies_count || 0) > 10 || (topic.likes_count || 0) > 20;
  var heat = isHot ? ' <span class="heat-badge">hot</span>' : '';
  var pin = topic.is_pinned ? ' ' + SVG_PIN : '';
  var liked = fu().isLiked('topic', topic.id) ? ' liked' : '';
  return '<div class="forum-card" data-id="' + topic.id +
    '" style="animation-delay:' + (idx * 60) + 'ms">' +
    '<div class="ftc-top"><span class="cat-tag ' + cat.cls + '">' + cat.label +
    '</span>' + heat + pin + '</div>' +
    '<div class="ftc-title">' + esc(topic.title) + '</div>' +
    (preview ? '<div class="ftc-preview">' + preview + '</div>' : '') +
    '<div class="ftc-meta">' + buildForumAvatar(a, 46) +
    '<span class="ftc-author">' + name + buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="ftc-time">' + fu().formatTimeAgo(topic.created_at) + '</span></div>' +
    '<div class="ftc-stats">' +
    '<span class="ftc-stat">' + SVG_EYE + ' ' + (topic.views_count || 0) + '</span>' +
    '<span class="ftc-stat">' + SVG_BUBBLE + ' ' + (topic.replies_count || 0) + '</span>' +
    '<span class="ftc-stat forum-like-btn' + liked + '" data-type="topic" data-id="' +
    topic.id + '">' + SVG_HEART + ' <span>' + (topic.likes_count || 0) +
    '</span></span></div></div>';
}

// ===== OP BLOCK =====

function buildOpBlock(topic) {
  var a = topic.author || {};
  var name = esc(a.name || a.full_name || 'Участник');
  var cat = fu().getCatInfo(topic.category);
  var liked = fu().isLiked('topic', topic.id) ? ' liked' : '';
  return '<div class="topic-header">' +
    '<div class="topic-meta">' + buildForumAvatar(a, 44) +
    '<div class="topic-meta-info">' +
    '<span class="topic-author-name">' + name + buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="topic-time">' + fu().formatTimeAgo(topic.created_at) + '</span>' +
    '</div></div>' +
    '<div class="topic-title">' + esc(topic.title) + '</div>' +
    '<div class="topic-body">' + esc(topic.content || '') + '</div>' +
    '<span class="cat-tag ' + cat.cls + '">' + cat.label + '</span>' +
    '<div class="topic-stats">' +
    '<span class="topic-stat">' + SVG_EYE + ' ' + ((topic.views_count || 0) + 1) + '</span>' +
    '<span class="topic-stat forum-like-btn' + liked + '" data-type="topic" data-id="' +
    topic.id + '">' + SVG_HEART + ' <span>' + (topic.likes_count || 0) + '</span></span>' +
    '<span class="topic-stat topic-reply-action">' + SVG_REPLY_IC + ' Ответить</span>' +
    '<span class="topic-stat topic-share-action">' + SVG_SHARE_IC + '</span>' +
    '</div></div>';
}

// ===== REPLY BUBBLE =====

function buildReplyBubble(reply, isNested, isTopicAuthor) {
  var a = reply.author || {};
  var sz = isNested ? 26 : 34;
  var name = esc(a.name || a.full_name || 'Участник');
  var cls = isNested ? 'forum-reply-nested' : 'forum-reply';
  var bestCls = reply.is_best ? ' is-best' : '';
  var bestLabel = reply.is_best ? '<span class="best-label">Лучший ответ</span>' : '';
  var liked = fu().isLiked('reply', reply.id) ? ' liked' : '';
  var markBest = (isTopicAuthor && !reply.is_best)
    ? '<button class="reply-mark-best" data-id="' + reply.id + '">Лучший</button>' : '';
  return '<div class="' + cls + bestCls + '">' + bestLabel +
    '<div class="reply-header">' + buildForumAvatar(a, sz) +
    '<div class="reply-info"><span class="reply-name">' + name +
    buildDnaBadge(a.dna_type) + '</span>' +
    '<span class="reply-level">Ур. ' + (a.level || 1) + '</span></div>' +
    '<span class="reply-time">' + fu().formatTimeAgo(reply.created_at) + '</span></div>' +
    '<div class="reply-text">' + esc(reply.content) + '</div>' +
    '<div class="reply-actions">' +
    '<span class="forum-like-btn' + liked + '" data-type="reply" data-id="' +
    reply.id + '">' + SVG_HEART + ' <span>' + (reply.likes_count || 0) + '</span></span>' +
    '<button class="reply-reply-btn" data-id="' + reply.id + '" data-name="' +
    esc(name) + '">' + SVG_REPLY_IC + '</button>' +
    markBest + '</div></div>';
}

// ===== RENDER LISTS =====

function pluralReply(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'ответа';
  return 'ответов';
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
  list.innerHTML = topics.map(function(t, i) { return buildForumCard(t, i); }).join('');
  list.querySelectorAll('.forum-card').forEach(function(card) {
    card.addEventListener('click', function() { window.openForumTopic(card.dataset.id); });
  });
  list.querySelectorAll('.forum-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      window.toggleLike(btn.dataset.type, btn.dataset.id, btn);
    });
  });
}

function renderReplies(replies, isTopicAuthor) {
  var container = document.getElementById('forumRepliesList');
  var noReplies = document.getElementById('forumNoReplies');
  var countEl = document.getElementById('forumRepliesCount');
  if (countEl) countEl.textContent = replies.length + ' ' + pluralReply(replies.length);
  if (!container) return;
  if (!replies.length) {
    container.innerHTML = '';
    if (noReplies) noReplies.classList.remove('hidden');
    return;
  }
  if (noReplies) noReplies.classList.add('hidden');
  container.innerHTML = replies.map(function(r) {
    return buildReplyBubble(r, false, isTopicAuthor);
  }).join('');
  container.querySelectorAll('.forum-like-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      window.toggleLike(btn.dataset.type, btn.dataset.id, btn);
    });
  });
  container.querySelectorAll('.reply-mark-best').forEach(function(btn) {
    btn.addEventListener('click', function() { window.forumMarkBest(btn.dataset.id); });
  });
  container.querySelectorAll('.reply-reply-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      window.setReplyTo(btn.dataset.id, btn.dataset.name);
    });
  });
}

// ===== EXPORTS =====
window.buildForumAvatar = buildForumAvatar;
window.buildForumCard = buildForumCard;
window.buildOpBlock = buildOpBlock;
window.buildReplyBubble = buildReplyBubble;
window.renderForumList = renderForumList;
window.renderReplies = renderReplies;
