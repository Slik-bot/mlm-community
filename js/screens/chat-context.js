// ═══════════════════════════════════════
// CHAT — КОНТЕКСТНОЕ МЕНЮ + РЕАКЦИИ
// Отделено от chat-messages.js
// ═══════════════════════════════════════

let _ctxLongPress = null;

// ===== Long press =====
function initMessageLongPress(el, msg, isOwn) {
  el.addEventListener('touchstart', function(e) {
    _ctxLongPress = setTimeout(function() {
      showMsgContextMenu(msg, isOwn, e.touches[0]);
    }, 400);
  }, { passive: true });

  el.addEventListener('touchend', function() {
    clearTimeout(_ctxLongPress);
  });

  el.addEventListener('touchmove', function() {
    clearTimeout(_ctxLongPress);
  });
}

// ===== Show context menu =====
function showMsgContextMenu(msg, isOwn, touch) {
  closeMsgContextMenu();

  const ov = document.createElement('div');
  ov.className = 'chat-ctx-overlay';
  ov.id = 'chatCtxOverlay';

  const box = document.createElement('div');
  box.className = 'chat-ctx-box';

  // Reactions row
  const rxRow = document.createElement('div');
  rxRow.className = 'chat-ctx-reactions';
  const emojis = ['\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDC4D', '\uD83D\uDD25', '\uD83D\uDE2E', '\uD83D\uDC4E'];
  emojis.forEach(function(em) {
    const btn = document.createElement('button');
    btn.className = 'chat-ctx-rx';
    btn.textContent = em;
    btn.onclick = function() {
      closeMsgContextMenu();
      window.showToast('Реакция: ' + em);
    };
    rxRow.appendChild(btn);
  });
  box.appendChild(rxRow);

  // Action rows
  const actions = [
    { label: 'Ответить', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6', fn: function() { window.startReply(msg); } },
    { label: 'Копировать', icon: 'M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v6M8 4a2 2 0 012-2h4a2 2 0 012 2v0M8 4v0', fn: function() {
      navigator.clipboard.writeText(msg.content || '');
      window.showToast('Скопировано');
    }},
    { label: 'Переслать', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z', fn: function() {
      window.showToast('Скоро: пересылка');
    }}
  ];

  if (isOwn) {
    actions.push({
      label: 'Удалить', icon: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
      fn: function() { window.deleteMessage(msg.id); }, danger: true
    });
  }

  actions.forEach(function(a) {
    const row = document.createElement('button');
    row.className = 'chat-ctx-row' + (a.danger ? ' chat-ctx-row--danger' : '');
    row.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="' + a.icon + '"/></svg>';
    const span = document.createElement('span');
    span.textContent = a.label;
    row.appendChild(span);
    row.addEventListener('click', function() { closeMsgContextMenu(); a.fn(); });
    box.appendChild(row);
  });

  ov.appendChild(box);
  document.body.appendChild(ov);

  // Position
  const bx = box.getBoundingClientRect();
  const x = Math.min(touch.clientX - 96, window.innerWidth - bx.width - 12);
  const y = Math.min(touch.clientY - 60, window.innerHeight - bx.height - 20);
  box.style.left = Math.max(12, x) + 'px';
  box.style.top = Math.max(20, y) + 'px';

  // Animate in
  requestAnimationFrame(function() { ov.classList.add('on'); });

  // Close on overlay tap
  ov.addEventListener('click', function(e) {
    if (e.target === ov) closeMsgContextMenu();
  });
}

// ===== Close context menu =====
function closeMsgContextMenu() {
  const ov = document.getElementById('chatCtxOverlay');
  if (!ov) return;
  ov.classList.remove('on');
  setTimeout(function() { ov.remove(); }, 230);
}

// ── ДНК-рамка SVG ─────────────────────

const CHAT_DNA_SEGS = {
  s: [[0,60],[90,150],[180,240],[270,330]],
  c: [[0,25],[45,70],[90,115],[135,160],
      [180,205],[225,250],[270,295],[315,340]],
  r: [[0,40],[72,100],[144,190],[216,250],[288,320]],
  a: [[0,40],[60,100],[120,160],[180,220],
      [240,280],[300,340]]
};
const CHAT_DNA_CLR = {
  s:'#3b82f6', c:'#22c55e', r:'#f59e0b', a:'#a78bfa'
};

function buildDnaRing(dnaType, size) {
  const t = dnaType ? dnaType.charAt(0).toLowerCase() : 's';
  const color = CHAT_DNA_CLR[t] || CHAT_DNA_CLR.s;
  const segs = CHAT_DNA_SEGS[t] || CHAT_DNA_SEGS.s;
  const sz = size || 54;
  const cx = sz / 2, cy = sz / 2, r = cx - 3;
  const arcs = segs.map(function(seg) {
    const s = (seg[0] - 90) * Math.PI / 180;
    const e = (seg[1] - 90) * Math.PI / 180;
    const x1 = (cx + r * Math.cos(s)).toFixed(2);
    const y1 = (cy + r * Math.sin(s)).toFixed(2);
    const x2 = (cx + r * Math.cos(e)).toFixed(2);
    const y2 = (cy + r * Math.sin(e)).toFixed(2);
    const lg = (seg[1] - seg[0]) > 180 ? 1 : 0;
    return '<path d="M' + x1 + ',' + y1 +
      'A' + r + ',' + r + ' 0 ' + lg + ',1 ' +
      x2 + ',' + y2 + '"' +
      ' stroke="' + color + '" stroke-width="2.5"' +
      ' fill="none" stroke-linecap="round"/>';
  }).join('');
  return '<svg class="dna-ring" width="' + sz + '" height="' + sz +
    '" viewBox="0 0 ' + sz + ' ' + sz + '"' +
    ' style="position:absolute;inset:-3px;pointer-events:none;' +
    'animation:dna-rotate 8s linear infinite">' +
    arcs + '</svg>';
}

// ── Экспорты ───────────────────────────

window.initMessageLongPress = initMessageLongPress;
window.showMsgContextMenu = showMsgContextMenu;
window.closeMsgContextMenu = closeMsgContextMenu;
window.buildDnaRing = buildDnaRing;
