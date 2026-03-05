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
  window._ctxMsgId = msg.id;

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
    btn.onclick = async function() {
      closeMsgContextMenu();
      const myId = window.getCurrentUser?.()?.id;
      if (!myId || !window._ctxMsgId) return;

      const existing = await window.sb
        .from('reactions')
        .select('id')
        .eq('user_id', myId)
        .eq('target_type', 'message')
        .eq('target_id', window._ctxMsgId)
        .eq('reaction_type', em)
        .maybeSingle();

      if (existing.data) {
        await window.sb.from('reactions').delete().eq('id', existing.data.id);
        window.removeReactionFromBubble?.(window._ctxMsgId, em, myId);
      } else {
        await window.sb.from('reactions')
          .upsert({ user_id: myId, target_type: 'message', target_id: window._ctxMsgId, reaction_type: em });
        window.addReactionToBubble?.(window._ctxMsgId, em, null);
      }
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

// ── Экспорты ───────────────────────────

window.initMessageLongPress = initMessageLongPress;
window.showMsgContextMenu = showMsgContextMenu;
window.closeMsgContextMenu = closeMsgContextMenu;
