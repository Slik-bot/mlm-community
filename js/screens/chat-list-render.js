// ═══════════════════════════════════════
// CHAT LIST RENDER
// Отделено от chat-list-new.js — 04.03.2026
// Визуальные функции: DOM карточек, рендер списка
// ═══════════════════════════════════════

const CL_DNA = {
  strategist: '#3b82f6', communicator: '#22c55e',
  creator: '#f59e0b', analyst: '#a78bfa'
};

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

// ═══ Build personal/broker item ═══

function buildClItem(conv) {
  const o = conv.other || { name: 'Пользователь', avatar_url: '', dna_type: '' };
  const item = document.createElement('div');
  item.className = 'cl-item';
  item.setAttribute('data-conv-id', conv.id);

  const CL_DNA_CLASS = { strategist: 'dna-s', communicator: 'dna-c', creator: 'dna-r', analyst: 'dna-a' };
  const dnaClass = CL_DNA_CLASS[o.dna_type] || '';
  const ava = document.createElement('div');
  ava.className = 'cl-ava' + (dnaClass ? ' ' + dnaClass : '');
  if (o.avatar_url) {
    const img = document.createElement('img');
    img.src = o.avatar_url;
    img.alt = '';
    ava.appendChild(img);
  } else {
    ava.textContent = (o.name || 'U').charAt(0).toUpperCase();
  }
  ava.appendChild(buildDnaRing(o.dna_type, 48));

  const body = document.createElement('div');
  body.className = 'cl-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'cl-name';
  nameEl.textContent = o.name || 'Пользователь';
  const prev = document.createElement('div');
  prev.className = 'cl-preview';
  const txt = conv.lastMsg ? (conv.lastMsg.content || '') : '';
  prev.textContent = txt.length > 40 ? txt.substring(0, 40) + '...' : txt;
  body.appendChild(nameEl);
  body.appendChild(prev);

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  const time = document.createElement('div');
  time.className = 'cl-time';
  time.textContent = conv.lastMsg ? clFormatTime(conv.lastMsg.created_at) : '';
  meta.appendChild(time);
  if (conv.unread > 0) {
    const badge = document.createElement('div');
    badge.className = 'cl-badge';
    badge.textContent = conv.unread > 99 ? '99+' : conv.unread;
    meta.appendChild(badge);
  }

  const inner = document.createElement('div');
  inner.className = 'cl-inner';
  inner.appendChild(ava);
  inner.appendChild(body);
  inner.appendChild(meta);
  inner.onclick = function() { window.openChat(conv.id, o); };

  item.appendChild(inner);
  item.appendChild(clBuildActions());
  clInitSwipe(item);

  return item;
}

// ═══ Build deal item ═══

function buildClDealItem(conv) {
  const d = conv.deal || { title: 'Сделка', status: 'pending', amount: 0 };
  const st = CL_DEAL_STATUS[d.status] || CL_DEAL_STATUS.pending;
  const item = document.createElement('div');
  item.className = 'cl-item cl-item--deal';
  item.setAttribute('data-conv-id', conv.id);

  const ava = document.createElement('div');
  ava.className = 'cl-ava cl-ava--deal';
  ava.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

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

  const meta = document.createElement('div');
  meta.className = 'cl-meta';
  if (d.status === 'review') {
    const act = document.createElement('div');
    act.className = 'cl-action-badge';
    act.textContent = 'Действие!';
    meta.appendChild(act);
  }
  if (conv.unread > 0) {
    const badge = document.createElement('div');
    badge.className = 'cl-badge';
    badge.textContent = conv.unread > 99 ? '99+' : conv.unread;
    meta.appendChild(badge);
  }

  const inner = document.createElement('div');
  inner.className = 'cl-inner';
  inner.appendChild(ava);
  inner.appendChild(body);
  inner.appendChild(meta);
  inner.onclick = function() { window.openDeal ? window.openDeal(conv.deal_id) : window.openChat(conv.id); };

  item.appendChild(inner);
  item.appendChild(clBuildActions());
  clInitSwipe(item);

  return item;
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

function clBuildActions() {
  const wrap = document.createElement('div');
  wrap.className = 'cl-actions';
  wrap.innerHTML = '<button class="cl-swipe-btn cl-swipe-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.36 19.36L5.64 6.64"/><path d="M12 2a10 10 0 000 20"/></svg></button>' +
    '<button class="cl-swipe-btn cl-swipe-del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>';
  wrap.querySelector('.cl-swipe-mute').onclick = function(e) {
    e.stopPropagation();
    window.showToast('Уведомления обновлены');
  };
  wrap.querySelector('.cl-swipe-del').onclick = function(e) {
    e.stopPropagation();
    window.showToast('Скоро: удаление');
  };
  return wrap;
}

function clInitSwipe(item) {
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  let startX = 0;

  inner.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    if (window._clSwipeOpen && window._clSwipeOpen !== item) clCloseSwipe(window._clSwipeOpen);
  }, { passive: true });

  inner.addEventListener('touchend', function(e) {
    const dx = startX - e.changedTouches[0].clientX;
    if (dx > 50) {
      inner.style.transform = 'translateX(-80px)';
      actions.classList.add('cl-actions--open');
      window._clSwipeOpen = item;
    } else if (dx < -30) {
      clCloseSwipe(item);
    }
  }, { passive: true });
}

function clCloseSwipe(item) {
  if (!item) return;
  const inner = item.querySelector('.cl-inner');
  const actions = item.querySelector('.cl-actions');
  if (inner) inner.style.transform = '';
  if (actions) actions.classList.remove('cl-actions--open');
  if (window._clSwipeOpen === item) window._clSwipeOpen = null;
}

// ═══ DNA Ring — arc segments ═══

const DNA_COLORS = {
  strategist: '#3b82f6', communicator: '#22c55e',
  creator: '#f59e0b', analyst: '#a78bfa', default: '#94a3b8'
};

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
  const GAP = 8;
  const patterns = {
    strategist: [82, 82, 82, 82],
    communicator: [37, 37, 37, 37, 37, 37, 37, 37],
    creator: [70, 45, 60, 35, 50],
    analyst: [52, 52, 52, 52, 52, 52]
  };
  const arcs = patterns[dnaType];
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
  const color = DNA_COLORS[dnaType] || DNA_COLORS.default;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + full + ' ' + full);
  svg.setAttribute('width', full);
  svg.setAttribute('height', full);
  svg.setAttribute('class', 'dna-ring dna-ring--animated');
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

// ═══ Exports ═══

window.renderClList = renderClList;
window.buildClItem = buildClItem;
window.buildClDealItem = buildClDealItem;
window.clFormatTime = clFormatTime;
window.clBuildActions = clBuildActions;
window.clInitSwipe = clInitSwipe;
window.clCloseSwipe = clCloseSwipe;
window.buildDnaRing = buildDnaRing;
