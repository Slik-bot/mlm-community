// ═══════════════════════════════════════
// CHAT LIST RENDER
// Отделено от chat-list-new.js — 04.03.2026
// Визуальные функции: DOM карточек, рендер списка
// ═══════════════════════════════════════

const CL_DEAL_STATUS = {
  pending: { label: 'Ожидает', color: '#fbbf24', pct: 20 },
  active: { label: 'В работе', color: '#22c55e', pct: 50 },
  review: { label: 'Проверка', color: '#8b5cf6', pct: 80 },
  completed: { label: 'Завершена', color: '#6b7280', pct: 100 },
  disputed: { label: 'Спор', color: '#f43f5e', pct: 50 }
};

// ═══ Render list ═══

function renderClList(convs, tab, query) {
  const list = document.getElementById('clList');
  const skel = document.getElementById('clSkeleton');
  const empty = document.getElementById('clEmpty');
  if (!list) return;

  let filtered = convs;
  if (tab && tab !== 'all') {
    filtered = filtered.filter(function(c) { return c.type === tab; });
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(function(c) {
      const name = c.other ? (c.other.name || '') : (c.title || '');
      return name.toLowerCase().indexOf(q) !== -1;
    });
  }

  if (skel) skel.classList.add('hidden');
  list.innerHTML = '';

  if (!filtered.length) {
    list.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  list.classList.remove('hidden');
  filtered.forEach(function(conv) {
    const el = conv.type === 'deal' ? buildClDealItem(conv) : buildClItem(conv);
    list.appendChild(el);
  });
}

// ═══ Private helpers ═══

const CL_DNA_CLASS = { strategist: 'dna-s', communicator: 'dna-c', creator: 'dna-r', analyst: 'dna-a' };

function clWrapItem(convId, ava, body, meta, onClick, extraClass, conv) {
  const item = document.createElement('div');
  const cls = 'cl-item' + (extraClass ? ' ' + extraClass : '') + (conv.is_pinned ? ' cl-item--pinned' : '');
  item.className = cls;
  item.setAttribute('data-conv-id', convId);
  const inner = document.createElement('div');
  inner.className = 'cl-inner';
  inner.appendChild(ava);
  inner.appendChild(body);
  inner.appendChild(meta);
  inner.onclick = onClick;
  const left = clBuildActionsLeft(conv);
  item.appendChild(left.el);
  item.appendChild(inner);
  item.appendChild(clBuildActions(conv));
  clInitSwipe(item);
  left.readBtn.onclick = function(e) { e.stopPropagation(); window.clMarkAsRead?.(conv, item); };
  left.pinBtn.onclick = function(e) { e.stopPropagation(); window.clTogglePin?.(conv, item, left.pinBtn); };
  return item;
}

function clBuildAvatar(user, conv) {
  const dnaClass = CL_DNA_CLASS[user.dna_type] || '';
  const ava = document.createElement('div');
  ava.className = 'cl-ava' + (dnaClass ? ' ' + dnaClass : '');
  if (user.avatar_url) {
    const img = document.createElement('img');
    img.src = user.avatar_url;
    img.alt = '';
    ava.appendChild(img);
  } else {
    ava.textContent = (user.name || 'U').charAt(0).toUpperCase();
  }
  const isOnline = user.last_active_at &&
    (Date.now() - new Date(user.last_active_at).getTime()) < 5 * 60 * 1000;
  if (isOnline) {
    const dot = document.createElement('div');
    dot.className = 'cl-online';
    ava.appendChild(dot);
  }
  return ava;
}

function clBuildPreview(conv) {
  const prev = document.createElement('div');
  prev.className = 'cl-preview';
  const myId = window.getCurrentUser?.()?.id;
  const isMe = conv.lastMsg?.sender_id === myId;
  const txt = conv.lastMsg ? (conv.lastMsg.content || '') : '';
  const display = isMe ? 'Вы: ' + txt : txt;
  prev.textContent = display.length > 40 ? display.substring(0, 40) + '...' : display;
  return prev;
}

function clBuildBadge(unread) {
  if (!unread || unread <= 0) return null;
  const badge = document.createElement('div');
  badge.className = 'cl-badge';
  badge.textContent = unread > 99 ? '99+' : unread;
  return badge;
}

function clBuildDealBody(d, st) {
  const body = document.createElement('div');
  body.className = 'cl-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'cl-name';
  nameEl.textContent = d.title || 'Сделка';
  const info = document.createElement('div');
  info.className = 'cl-deal-info';
  const amtSpan = document.createElement('span');
  amtSpan.className = 'cl-deal-amount';
  amtSpan.textContent = (d.amount || 0).toLocaleString('ru') + ' TF';
  const stSpan = document.createElement('span');
  stSpan.className = 'cl-deal-status';
  stSpan.style.color = st.color;
  stSpan.textContent = st.label;
  info.appendChild(amtSpan);
  info.appendChild(stSpan);
  const bar = document.createElement('div');
  bar.className = 'cl-deal-bar';
  const fill = document.createElement('div');
  fill.className = 'cl-deal-fill';
  fill.style.width = st.pct + '%';
  fill.style.background = st.color;
  bar.appendChild(fill);
  body.appendChild(nameEl);
  body.appendChild(info);
  body.appendChild(bar);
  return body;
}

// ═══ Build personal/broker item ═══

function buildClItem(conv) {
  const o = conv.other || { name: 'Пользователь', avatar_url: '', dna_type: '' };

  const body = document.createElement('div');
  body.className = 'cl-body';
  const nameRow = document.createElement('div');
  nameRow.style.cssText = 'display:flex;align-items:center';
  const nameEl = document.createElement('div');
  nameEl.className = 'cl-name';
  nameEl.textContent = o.name || 'Пользователь';
  nameRow.appendChild(nameEl);
  if (conv.is_muted) {
    const muteIcon = document.createElement('span');
    muteIcon.className = 'cl-mute-icon';
    muteIcon.textContent = '\uD83D\uDD07';
    nameRow.appendChild(muteIcon);
  }
  if (conv.is_pinned) nameRow.insertAdjacentHTML('beforeend', '<span class="cl-pin-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg></span>');
  body.appendChild(nameRow);
  body.appendChild(clBuildPreview(conv));

  const typingEl = document.createElement('div');
  typingEl.className = 'cl-typing';
  typingEl.innerHTML =
    '<span class="cl-typing-text">печатает</span>' +
    '<span class="cl-typing-dots">' +
    '<span></span><span></span><span></span>' +
    '</span>';
  body.appendChild(typingEl);

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  const time = document.createElement('div');
  time.className = 'cl-time';
  time.textContent = conv.lastMsg ? clFormatTime(conv.lastMsg.created_at) : '';
  meta.appendChild(time);
  const badge = clBuildBadge(conv.unread);
  if (badge) meta.appendChild(badge);

  const extraCls = conv.is_muted ? 'cl-item--muted' : '';
  return clWrapItem(conv.id, clBuildAvatar(o, conv), body, meta,
    function() { window.openChat(conv.id, o); }, extraCls || undefined, conv);
}

// ═══ Build deal item ═══

function buildClDealItem(conv) {
  const d = conv.deal || { title: 'Сделка', status: 'pending', amount: 0 };
  const st = CL_DEAL_STATUS[d.status] || CL_DEAL_STATUS.pending;

  const ava = document.createElement('div');
  ava.className = 'cl-ava cl-ava--deal';
  ava.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  if (d.status === 'review') {
    const act = document.createElement('div');
    act.className = 'cl-action-badge';
    act.textContent = 'Действие!';
    meta.appendChild(act);
  }
  const badge = clBuildBadge(conv.unread);
  if (badge) meta.appendChild(badge);

  return clWrapItem(conv.id, ava, clBuildDealBody(d, st), meta,
    function() { window.openDeal ? window.openDeal(conv.deal_id) : window.openChat(conv.id); },
    'cl-item--deal', conv);
}

// ═══ Format time ═══

function clFormatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const dayMs = 86400000;
  if (diff < dayMs && d.getDate() === now.getDate()) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  if (diff < dayMs * 2 && now.getDate() - d.getDate() === 1) return 'Вчера';
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

// ═══ Swipe actions ═══

function clBuildActions(conv) {
  const wrap = document.createElement('div');
  wrap.className = 'cl-actions';
  wrap.innerHTML = '<button class="cl-swipe-btn cl-swipe-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.36 19.36L5.64 6.64"/><path d="M12 2a10 10 0 000 20"/></svg></button>' +
    '<button class="cl-swipe-btn cl-swipe-del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>';
  const muteBtn = wrap.querySelector('.cl-swipe-mute');
  const muteLabel = document.createElement('span');
  muteLabel.textContent = 'Без звука';
  muteBtn.appendChild(muteLabel);
  const delBtn = wrap.querySelector('.cl-swipe-del');
  const delLabel = document.createElement('span');
  delLabel.textContent = 'Удалить';
  delBtn.appendChild(delLabel);
  muteBtn.onclick = function(e) {
    e.stopPropagation();
    const item = wrap.closest('.cl-item');
    if (!item) return;
    const convId = item.getAttribute('data-conv-id');
    window.toggleClMute?.(convId, item);
  };
  delBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const item = wrap.closest('.cl-item');
    if (!item) return;
    clShowDeleteConfirm(conv, item);
  });
  return wrap;
}

function clBuildActionsLeft(conv) {
  const wrap = document.createElement('div');
  wrap.className = 'cl-actions-left';
  wrap.innerHTML = '<button class="cl-swipe-btn cl-swipe-read"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>Прочитать</span></button>' +
    '<button class="cl-swipe-btn cl-swipe-pin"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg><span>' + (conv.is_pinned ? 'Открепить' : 'Закрепить') + '</span></button>';
  return { el: wrap, readBtn: wrap.querySelector('.cl-swipe-read'), pinBtn: wrap.querySelector('.cl-swipe-pin') };
}

function clInitSwipe(item) {
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  const actionsLeft = item.querySelector('.cl-actions-left');
  let startX = 0;
  inner.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    if (window._clSwipeOpen && window._clSwipeOpen !== item) clCloseSwipe(window._clSwipeOpen);
  }, { passive: true });
  inner.addEventListener('touchend', function(e) {
    const dx = startX - e.changedTouches[0].clientX;
    const isOpenRight = inner.classList.contains('cl-inner--swiped');
    const isOpenLeft = inner.classList.contains('cl-inner--swiped-right');
    if (isOpenRight) { if (dx < -20) clCloseSwipe(item); return; }
    if (isOpenLeft) { if (dx > 20) clCloseSwipe(item); return; }
    if (dx > 50) {
      inner.classList.add('cl-inner--swiped');
      actions.classList.add('cl-actions--open');
      window._clSwipeOpen = item;
    } else if (dx < -50) {
      inner.classList.add('cl-inner--swiped-right');
      if (actionsLeft) actionsLeft.classList.add('cl-actions-left--open');
      window._clSwipeOpen = item;
    } else { clCloseSwipe(item); }
  }, { passive: true });
  inner.addEventListener('click', function(e) {
    if (window._clSwipeOpen === item) { e.stopPropagation(); clCloseSwipe(item); }
  });
}

function clCloseSwipe(item) {
  if (!item) return;
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  const actionsLeft = item.querySelector('.cl-actions-left');
  if (inner) { inner.classList.remove('cl-inner--swiped'); inner.classList.remove('cl-inner--swiped-right'); }
  if (actions) actions.classList.remove('cl-actions--open');
  if (actionsLeft) actionsLeft.classList.remove('cl-actions-left--open');
  if (window._clSwipeOpen === item) window._clSwipeOpen = null;
}

// ═══ DNA Ring — arc segments ═══

function createArcPath(cx, cy, r, startDeg, endDeg) {
  const startRad = (startDeg - 90) * Math.PI / 180;
  const endRad = (endDeg - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
  return 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r +
    ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2;
}

function getDnaSegments(dnaType) {
  const typeMap = { S: 'strategist', C: 'communicator', K: 'creator', A: 'analyst' };
  const type = typeMap[dnaType] || dnaType;
  const GAP = 8;
  const patterns = {
    strategist: [82, 82, 82, 82],
    communicator: [82, 82, 82, 82],
    creator: [82, 82, 82, 82],
    analyst: [82, 82, 82, 82]
  };
  const arcs = patterns[type];
  if (!arcs) return [[0, 355]];
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < arcs.length; i++) {
    segments.push([cursor, cursor + arcs[i]]);
    cursor += arcs[i] + GAP;
  }
  return segments;
}

function buildDnaRing(dnaType, size) {
  const full = size + 8;
  const cx = full / 2;
  const cy = full / 2;
  const r = size / 2 - 1;
  const color = window.getDnaColor(dnaType);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + full + ' ' + full);
  svg.setAttribute('width', full);
  svg.setAttribute('height', full);
  svg.setAttribute('class', 'dna-ring');
  const segments = getDnaSegments(dnaType);
  segments.forEach(function(seg) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', createArcPath(cx, cy, r, seg[0], seg[1]));
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
  });
  return svg;
}

// ═══ Mute toggle ═══

async function toggleClMute(convId, item) {
  const user = window.getCurrentUser?.();
  if (!user || !convId) return;
  const isMuted = item.classList.contains('cl-item--muted');
  const newVal = !isMuted;
  item.classList.toggle('cl-item--muted', newVal);
  try {
    const { error } = await window.sb
      .from('conversation_members')
      .update({ is_muted: newVal })
      .eq('conversation_id', convId)
      .eq('user_id', user.id);
    if (error) throw error;
    window.showToast?.(newVal ? 'Чат замьючен' : 'Уведомления включены');
  } catch (err) {
    console.error('toggleClMute:', err);
    item.classList.toggle('cl-item--muted', isMuted);
    window.showToast?.('Ошибка');
  }
}

// ═══ Delete confirm ═══

function clShowDeleteConfirm(conv, item) {
  const other = conv.other || {};
  const name = other.name || 'Собеседник';
  const avatar = other.avatar_url;
  const overlay = document.createElement('div');
  overlay.className = 'cl-confirm-overlay';
  const card = document.createElement('div');
  card.className = 'cl-confirm';
  if (avatar) {
    const img = document.createElement('img');
    img.className = 'cl-confirm-ava';
    img.src = avatar;
    img.alt = name;
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'cl-confirm-ava-placeholder';
    ph.textContent = name[0].toUpperCase();
    card.appendChild(ph);
  }
  const title = document.createElement('div');
  title.className = 'cl-confirm-title';
  const b = document.createElement('b');
  b.textContent = name;
  title.appendChild(document.createTextNode('Удалить чат с '));
  title.appendChild(b);
  title.appendChild(document.createTextNode('?'));
  title.appendChild(document.createElement('br'));
  const small = document.createElement('small');
  small.style.cssText = 'opacity:.6;font-size:12px';
  small.textContent = 'Без возможности восстановления';
  title.appendChild(small);
  card.appendChild(title);
  const btns = document.createElement('div');
  btns.className = 'cl-confirm-btns';
  const delMeBtn = document.createElement('button');
  delMeBtn.className = 'cl-confirm-btn cl-confirm-btn--danger';
  delMeBtn.textContent = 'Удалить только у себя';
  const delBothBtn = document.createElement('button');
  delBothBtn.className = 'cl-confirm-btn cl-confirm-btn--danger';
  delBothBtn.textContent = 'Удалить у меня и у ' + name;
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cl-confirm-btn cl-confirm-btn--cancel';
  cancelBtn.textContent = 'Отмена';
  btns.appendChild(delMeBtn);
  btns.appendChild(delBothBtn);
  btns.appendChild(cancelBtn);
  card.appendChild(btns);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  delMeBtn.addEventListener('click', function() {
    overlay.remove();
    clDeleteConversation(conv.id, item, false);
  });
  delBothBtn.addEventListener('click', function() {
    overlay.remove();
    clDeleteConversation(conv.id, item, true);
  });
  cancelBtn.addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

async function clDeleteConversation(convId, item, both) {
  item.style.transition = 'opacity 0.25s, transform 0.25s';
  item.style.opacity = '0';
  item.style.transform = 'translateX(40px)';
  try {
    const myId = window.getCurrentUser?.()?.id;
    let q = window.sb.from('conversation_members').delete().eq('conversation_id', convId);
    if (!both) q = q.eq('user_id', myId);
    const { error } = await q;
    if (error) throw error;
    setTimeout(function() { item.remove(); }, 250);
    window.showToast?.('Чат удалён');
  } catch (err) {
    console.error('deleteConv:', err);
    item.style.opacity = '1';
    item.style.transform = '';
    window.showToast?.('Ошибка удаления');
  }
}

// ═══ Exports ═══

window.renderClList = renderClList;
window.buildClItem = buildClItem;
window.buildClDealItem = buildClDealItem;
window.clFormatTime = clFormatTime;
window.clBuildActions = clBuildActions;
window.clBuildActionsLeft = clBuildActionsLeft;
window.clInitSwipe = clInitSwipe;
window.clCloseSwipe = clCloseSwipe;
window.buildDnaRing = buildDnaRing;
window.toggleClMute = toggleClMute;
window.clShowDeleteConfirm = clShowDeleteConfirm;
window.clDeleteConversation = clDeleteConversation;
