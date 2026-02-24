/* comments.js — комментарии TRAFIQO (premium) */
(function(){
'use strict';

let _postId = null;
let _postAuthorId = null;
let _replyTo = null;

// ОТКРЫТЬ ЭКРАН КОММЕНТАРИЕВ
window.openPostDetail = async function(postId) {
  _postId = postId;
  _replyTo = null;
  _postAuthorId = null;

  await ensureTemplate('scrDetail');

  const scroll = document.querySelector('#scrDetail .detail-scroll');
  if (!scroll) return;
  scroll.innerHTML = '<div class="cmt-loading">Загрузка...</div>';

  const title = document.querySelector('#scrDetail .detail-title');
  if (title) title.textContent = 'Комментарии';

  await goTo('scrDetail');
  const nav = document.querySelector('.nav');
  if (nav) nav.style.display = 'none';

  try {
    const postResult = await sb.from('posts')
      .select('*, users(id, name, avatar_url, dna_type, level, is_verified)')
      .eq('id', postId).single();
    const post = postResult.data;
    if (!post) { scroll.innerHTML = '<div class="cmt-loading">Пост не найден</div>'; return; }

    _postAuthorId = post.author_id;
    sb.from('posts').update({ views_count: (post.views_count || 0) + 1 }).eq('id', postId);

    const comments = await sbLoadComments(postId);
    renderDetailScreen(scroll, post, comments);
    initCommentInput();
  } catch(e) {
    scroll.innerHTML = '<div class="cmt-loading">Ошибка загрузки</div>';
  }
};

window.handleComment = function(postId) { if (postId) openPostDetail(postId); };

// ШАПКА ПОСТА
function renderPostHeader(post) {
  const p = post.users || {};
  const authorName = p.name || 'Аноним';
  const authorAva = p.avatar_url || '';
  const letter = authorName.charAt(0).toUpperCase();
  const avaHtml = authorAva
    ? '<img src="' + escHtml(authorAva) + '" alt="">' : '<span>' + letter + '</span>';
  const shortText = escHtml(post.content || '');
  const displayText = shortText.length > 150 ? shortText.substring(0, 150) + '...' : shortText;
  return '<div class="dt-post"><div class="dt-ava">' + avaHtml + '</div>' +
    '<div class="dt-info"><span class="dt-name">' + escHtml(authorName) + '</span>' +
    '<p class="dt-text">' + displayText + '</p></div></div>';
}

// ОТРИСОВКА ЭКРАНА
function renderDetailScreen(scroll, post, comments) {
  let html = renderPostHeader(post);
  html += '<div class="cmt-list" id="cmtList">';
  const roots = [];
  const replies = {};
  const sorted = (comments || []).slice().reverse();
  sorted.forEach(function(c) {
    if (c.parent_id) {
      if (!replies[c.parent_id]) replies[c.parent_id] = [];
      replies[c.parent_id].push(c);
    } else { roots.push(c); }
  });
  roots.forEach(function(c) {
    html += renderComment(c, false);
    const reps = replies[c.id];
    if (reps && reps.length) {
      const rootName = (c.author || {}).name || 'Аноним';
      reps.forEach(function(r) { r._parentName = rootName; });
      html += '<div class="cmt-show-replies" onclick="toggleReplies(this)">Показать ' + reps.length + ' ответ' + pluralEnd(reps.length) + '</div>';
      html += '<div class="cmt-replies-box" style="display:none">';
      reps.forEach(function(r) { html += renderComment(r, true); });
      html += '</div>';
    }
  });
  if (!roots.length) html += '<div class="cmt-empty">Пока нет комментариев.<br>Будьте первым!</div>';
  html += '</div>';
  scroll.innerHTML = html;
}

// ОДИН КОММЕНТАРИЙ
function renderComment(c, isReply) {
  const p = c.author || {};
  const name = p.name || 'Аноним';
  const ava = p.avatar_url || '';
  const dna = p.dna_type || '';
  const letter = name.charAt(0).toUpperCase();
  const isOwn = currentAuthUser && c.author_id === currentAuthUser.id;
  const time = sbFormatDate(c.created_at);
  const mention = (isReply && c._parentName) ? '<span class="mention">@' + escHtml(c._parentName) + '</span> ' : '';

  let dnaClass = '';
  if (dna === 'strategist') dnaClass = 'dna-blue';
  else if (dna === 'communicator') dnaClass = 'dna-green';
  else if (dna === 'creator') dnaClass = 'dna-orange';
  else if (dna === 'analyst') dnaClass = 'dna-purple';

  const avaColor = dnaClass === 'dna-blue' ? 'rgba(59,130,246,.1);color:#3b82f6'
    : dnaClass === 'dna-green' ? 'rgba(34,197,94,.1);color:#22c55e'
    : dnaClass === 'dna-orange' ? 'rgba(245,158,11,.1);color:#f59e0b'
    : dnaClass === 'dna-purple' ? 'rgba(139,92,246,.1);color:#8b5cf6'
    : 'rgba(255,255,255,.05);color:rgba(255,255,255,.3)';

  const cls = 'cmt' + (isReply ? ' cmt-reply' : '') + (isOwn ? ' cmt-own' : '') + (dnaClass ? ' ' + dnaClass : '');
  const safeName = escHtml(name).replace(/'/g, '&#39;');
  const safeId = String(c.id || '');

  return '<div class="' + cls + '" data-id="' + safeId + '" data-user="' + (c.author_id || '') + '">' +
    '<div class="cmt-ava" style="background:' + avaColor + '">' + (ava ? '<img src="' + escHtml(ava) + '" alt="">' : letter) + '</div>' +
    '<div class="cmt-body">' +
      '<div class="cmt-top">' +
        '<span class="cmt-name">' + escHtml(name) + '</span>' +
        '<span class="cmt-dot">\u00B7</span>' +
        '<span class="cmt-time">' + time + '</span>' +
      '</div>' +
      '<div class="cmt-text">' + mention + escHtml(c.content || '') + '</div>' +
      '<div class="cmt-actions">' +
        '<span class="cmt-act" onclick="replyToComment(\'' + safeId + '\',\'' + safeName + '\')">Ответить</span>' +
      '</div>' +
    '</div>' +
    '<div class="cmt-like" onclick="likeComment(\'' + safeId + '\',this)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' +
    '</div>' +
  '</div>';
}

// ОТВЕТИТЬ НА КОММЕНТАРИЙ
window.replyToComment = function(id, name) {
  if(id&&id.indexOf('t-')===0){const el=document.querySelector('.cmt[data-id="'+id+'"]');if(el){const r=el.getAttribute('data-id');if(r.indexOf('t-')!==0)id=r;}}
  _replyTo = { id: id, name: name };
  const bar = document.querySelector('#scrDetail .cmt-bar');
  if (!bar) return;
  const old = bar.querySelector('.reply-bar');
  if (old) old.remove();
  const div = document.createElement('div');
  div.className = 'reply-bar';
  div.innerHTML = '<div class="reply-line"></div>' +
    '<div class="reply-info"><span class="reply-label">Ответ</span>' +
    '<span class="reply-name">' + escHtml(name) + '</span></div>' +
    '<span class="reply-x" onclick="cancelReply()">\u2715</span>';
  bar.insertBefore(div, bar.firstChild);
  const f = bar.querySelector('.cmt-field');
  if (f) f.focus();
};

window.cancelReply = function() {
  _replyTo = null;
  const b = document.querySelector('.reply-bar');
  if (b) { b.style.opacity = '0'; setTimeout(function(){ b.remove(); }, 150); }
};

// ПОКАЗАТЬ / СКРЫТЬ ОТВЕТЫ
window.toggleReplies = function(btn) {
  const box = btn.nextElementSibling;
  if (!box || !box.classList.contains('cmt-replies-box')) return;
  const hidden = box.style.display === 'none';
  box.style.display = hidden ? 'block' : 'none';
  const count = box.querySelectorAll('.cmt').length;
  btn.textContent = hidden ? 'Скрыть ответы' : 'Показать ' + count + ' ответ' + pluralEnd(count);
};

// ЛАЙК КОММЕНТАРИЯ
window.likeComment = async function(id, el) {
  if (!currentAuthUser || !id || id.indexOf('t-') === 0) return;
  if (!el.classList.contains('cmt-like')) el = el.closest('.cmt-like');
  if (!el) return;
  const liked = el.classList.toggle('liked');
  el.style.transform = 'scale(1.3)';
  setTimeout(function(){ el.style.transform = ''; }, 150);
  try {
    if (liked) {
      await sb.from('reactions').insert({ user_id: currentAuthUser.id, target_type: 'comment', target_id: id, reaction_type: 'like' });
    } else {
      await sb.from('reactions').delete().match({ user_id: currentAuthUser.id, target_type: 'comment', target_id: id });
    }
  } catch(e) {}
};

// LONG PRESS / RIGHT CLICK — МЕНЮ
(function() {
  let timer = null, moved = false;
  document.addEventListener('touchstart', function(e) {
    const c = e.target.closest('.cmt');
    if (!c || !c.getAttribute('data-id')) return;
    moved = false;
    timer = setTimeout(function() { if (!moved) showCmtMenu(c); }, 500);
  });
  ['touchmove','touchend','touchcancel'].forEach(function(ev) { document.addEventListener(ev, function() { if(ev==='touchmove') moved=true; clearTimeout(timer); }); });
  document.addEventListener('contextmenu', function(e) { const c = e.target.closest('.cmt'); if (!c) return; e.preventDefault(); showCmtMenu(c); });
})();

function showCmtMenu(el) {
  const id = el.getAttribute('data-id');
  const uid = el.getAttribute('data-user');
  if (!id || id.indexOf('t-') === 0) return;
  const own = currentAuthUser && uid === currentAuthUser.id;
  const old = document.getElementById('cmtMenu');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'cmtMenu';
  m.className = 'cmt-menu';
  const items = own
    ? '<div class="cm-i cm-d" onclick="delComment(\'' + id + '\')">Удалить</div><div class="cm-sep"></div>'
    : '<div class="cm-i cm-d" onclick="reportCmt()">Пожаловаться</div><div class="cm-sep"></div>';
  m.innerHTML = '<div class="cm-bg" onclick="closeCmtMenu()"></div>' +
    '<div class="cm-sheet">' + items + '<div class="cm-i" onclick="closeCmtMenu()">Отмена</div></div>';
  document.body.appendChild(m);
  requestAnimationFrame(function() { m.classList.add('show'); });
}

window.closeCmtMenu = function() {
  const m = document.getElementById('cmtMenu');
  if (m) { m.classList.remove('show'); setTimeout(function(){ m.remove(); }, 300); }
};

window.delComment = async function(id) {
  closeCmtMenu();
  await sb.from('comments').delete().eq('id', id);
  const el = document.querySelector('.cmt[data-id="' + id + '"]');
  if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(-20px)'; setTimeout(function(){ el.remove(); }, 250); }
  showToast('Комментарий удалён');
};

window.reportCmt = function() { closeCmtMenu(); showToast('Жалоба отправлена'); };

// ПОДГОТОВКА ДАННЫХ КОММЕНТАРИЯ
let _cmtField = null, _cmtBtn = null;

function prepareCommentData() {
  let text = _cmtField.value.trim();
  if (!text || !currentAuthUser || !_postId) return null;
  if (text.length > 2000) text = text.substring(0, 2000);
  let parentId = _replyTo ? _replyTo.id : null;
  const parentName = _replyTo ? _replyTo.name : null;
  if (parentId) {
    if(parentId.indexOf('t-')===0){const pe=document.querySelector('.cmt[data-id="'+parentId+'"]');if(pe){const ri=pe.getAttribute('data-id');if(ri.indexOf('t-')!==0)parentId=ri;}}
    if(parentId.indexOf('t-')===0) parentId=null;
    if(parentId){const pe2=document.querySelector('.cmt[data-id="'+parentId+'"]');if(pe2&&pe2.classList.contains('cmt-reply')){const bx=pe2.closest('.cmt-replies-box');if(bx){let rt=bx.previousElementSibling;while(rt&&!rt.classList.contains('cmt'))rt=rt.previousElementSibling;if(rt)parentId=rt.getAttribute('data-id');}}}
  }
  return { text: text, parentId: parentId, parentName: parentName };
}

// ОТПРАВКА КОММЕНТАРИЯ
async function doSendComment() {
  const data = prepareCommentData();
  if (!data) return;
  _cmtField.value=''; _cmtField.style.height=''; _cmtBtn.classList.remove('active');
  cancelReply();
  try {
    const res = await sb.from('comments').insert({
      post_id:_postId, author_id:currentAuthUser.id, content:data.text, parent_id:data.parentId||null
    }).select('id,created_at').single();
    if(!res||!res.data) return;
    const prof = currentProfile||{name:'Вы',avatar_url:'',dna_type:''};
    const nc = {id:res.data.id, author_id:currentAuthUser.id, content:data.text, created_at:res.data.created_at||new Date().toISOString(), parent_id:data.parentId, author:prof};
    if(data.parentName) nc._parentName=data.parentName;
    insertCommentDom(nc, data.parentId);
  } catch(e){}
  const card=document.querySelector('.post-card[data-post-id="'+_postId+'"]');
  if(card){const n=card.querySelector('.r-btn:nth-child(2) .r-n');if(n)n.textContent=(parseInt(n.textContent)||0)+1;}
}

// ВСТАВКА КОММЕНТАРИЯ В DOM
function insertCommentDom(nc, parentId) {
  const list = document.getElementById('cmtList');
  if(!list) return;
  const empty=list.querySelector('.cmt-empty'); if(empty) empty.remove();
  if(parentId) {
    let parentEl=null;
    const allC=list.querySelectorAll('.cmt');
    for(let i=0;i<allC.length;i++){if(allC[i].getAttribute('data-id')===parentId){parentEl=allC[i];break;}}
    if(parentEl) {
      let nx=parentEl.nextElementSibling, rBox=null, sBtn=null;
      while(nx) {
        if(nx.classList.contains('cmt-replies-box')){rBox=nx;break;}
        if(nx.classList.contains('cmt-show-replies')) sBtn=nx;
        if(nx.classList.contains('cmt')&&!nx.classList.contains('cmt-reply')) break;
        nx=nx.nextElementSibling;
      }
      if(rBox) {
        rBox.style.display='block';
        rBox.insertAdjacentHTML('beforeend',renderComment(nc,true));
        if(sBtn) sBtn.textContent='Скрыть ответы';
      } else {
        parentEl.insertAdjacentHTML('afterend',
          '<div class="cmt-show-replies" onclick="toggleReplies(this)">Скрыть ответы</div>'+
          '<div class="cmt-replies-box" style="display:block">'+renderComment(nc,true)+'</div>');
      }
    } else { list.insertAdjacentHTML('afterbegin',renderComment(nc,false)); }
  } else { list.insertAdjacentHTML('afterbegin',renderComment(nc,false)); }
  const newEl=list.querySelector('.cmt[data-id="'+nc.id+'"]');
  if(newEl) newEl.scrollIntoView({block:'nearest',behavior:'smooth'});
}

// НАСТРОЙКА ФОРМЫ
function setupCommentForm() {
  const bar = document.querySelector('#scrDetail .cmt-bar');
  if (!bar) return null;
  const oldReply = bar.querySelector('.reply-bar');
  if (oldReply) oldReply.remove();
  const oldField = bar.querySelector('.cmt-field');
  const oldBtn = bar.querySelector('.send-btn');
  if (!oldField || !oldBtn) return null;
  const f = oldField.cloneNode(true);
  oldField.parentNode.replaceChild(f, oldField);
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);
  f.value = ''; f.removeAttribute('oninput');
  btn.removeAttribute('onclick'); btn.classList.remove('active');
  return { field: f, btn: btn };
}

// ПОЛЕ ВВОДА
function initCommentInput() {
  const form = setupCommentForm();
  if (!form) return;
  _cmtField = form.field;
  _cmtBtn = form.btn;
  _cmtField.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    _cmtBtn.classList.toggle('active', this.value.trim().length > 0);
  });
  _cmtField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSendComment(); }
  });
  _cmtBtn.addEventListener('click', doSendComment);
}

// ХЕЛПЕРЫ
function pluralEnd(n) {
  if (n % 10 === 1 && n % 100 !== 11) return '';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
  return 'ов';
}

const _origGoBack = window.goBack;
window.goBack = function() {
  _replyTo = null;
  _postId = null;
  if (typeof navHistory !== 'undefined' && navHistory.length && navHistory[navHistory.length - 1] === 'scrDetail') {
    const n = document.querySelector('.nav');
    if (n) n.style.display = '';
  }
  if (typeof _origGoBack === 'function') _origGoBack();
};

})();
