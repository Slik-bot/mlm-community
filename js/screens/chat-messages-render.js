// ═══════════════════════════════════════
// CHAT MESSAGES RENDER
// Отделено от chat-messages.js — 04.03.2026
// Визуальные функции: DOM пузырей, скелетоны, разделители
// ═══════════════════════════════════════

// ── Шапка чата ────────────────────────

function renderChatHead() {
  const ph = document.getElementById('chAvPh');
  const dot = document.getElementById('chAvDot');
  const name = document.getElementById('chName');
  const status = document.getElementById('chStatus');
  const tfRecipient = document.getElementById('tfRecipient');
  if (!ph || !name) return;
  const p = window._chatPartner?.() || {};
  const dnaMap = {
    strategist: 'dna-s', communicator: 'dna-c',
    creator: 'dna-r', analyst: 'dna-a'
  };
  ph.className = 'ch-av-ph' + (dnaMap[p.dna_type] ? ' ' + dnaMap[p.dna_type] : '');
  ph.innerHTML = '';
  if (p.avatar_url) {
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.alt = '';
    img.className = 'ch-av-img';
    ph.appendChild(img);
  } else {
    ph.textContent = (p.name || 'П')[0].toUpperCase();
  }
  if (name) name.textContent = p.name || 'Пользователь';
  const isOnline = p.last_active_at &&
    (Date.now() - new Date(p.last_active_at).getTime()) < 5 * 60 * 1000;
  if (status) {
    status.textContent = isOnline ? 'В сети' : 'Не в сети';
    status.className = 'ch-status' + (isOnline ? '' : ' offline');
  }
  if (dot) { isOnline ? dot.classList.remove('hidden') : dot.classList.add('hidden'); }
  if (tfRecipient) tfRecipient.textContent = p.name || '';
}

// ── HEX → R,G,B ─────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + ',' + g + ',' + b;
}

// ── Построить пузырь — обёртка + аватар + bbl ───

function buildBubbleShell(msg, grpPos, isOut, dnaType, dnaColor) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + (isOut ? 'msg-out' : 'msg-in') + ' msg--' + grpPos;
  if (grpPos === 'mid' || grpPos === 'last') wrapper.classList.add('grp');
  wrapper.dataset.msgId = msg.id;
  wrapper.dataset.createdAt = msg.created_at;
  const convType = window._chatConvType?.() || 'personal';
  if (!isOut && convType !== 'personal') {
    const av = document.createElement('div');
    av.className = 'msg-av-w';
    if (dnaColor) {
      av.style.color = dnaColor;
      av.style.background = 'rgba(' + hexToRgb(dnaColor) + ',0.15)';
      av.style.borderColor = 'rgba(' + hexToRgb(dnaColor) + ',0.35)';
    }
    if (msg.sender?.avatar_url) {
      const img = document.createElement('img');
      img.src = msg.sender.avatar_url;
      img.alt = (msg.sender?.name || 'П')[0].toUpperCase();
      av.appendChild(img);
    } else {
      av.textContent = (msg.sender?.name || 'П')[0].toUpperCase();
    }
    wrapper.appendChild(av);
  }
  const bbl = document.createElement('div');
  bbl.className = 'bbl';
  if (!isOut && dnaColor) {
    bbl.style.setProperty('--msg-dna-rgb', hexToRgb(dnaColor));
  }
  const dnaHueMap = {
    strategist: '200deg',
    communicator: '270deg',
    creator: '330deg',
    analyst: '0deg'
  };
  const resolvedDna = dnaType || window._chatPartner?.()?.dna_type || 'analyst';
  const scrChat = document.getElementById('scrChat');
  if (scrChat) {
    scrChat.style.setProperty('--msg-dna-rgb', dnaColor ? hexToRgb(dnaColor) : '139,92,246');
    scrChat.style.setProperty('--dna-hue', dnaHueMap[resolvedDna] || '0deg');
  }
  wrapper.appendChild(bbl);
  return { wrapper, bbl };
}

// ── Построить пузырь — контент ───────────

function buildBubbleContent(bbl, msg, isOut) {
  if (msg.forwarded_from_id) {
    const name = msg.forwarded_sender_name
      ?? 'Неизвестно';
    const fwd = document.createElement('div');
    fwd.className = 'bbl-forward';
    fwd.dataset.origId = msg.forwarded_from_id;
    fwd.innerHTML =
      '<span class="bbl-forward__icon">\u21AA</span>' +
      '<span class="bbl-forward__text">' +
      'Переслано от <b>' + name + '</b></span>';
    bbl.appendChild(fwd);
  }
  if (msg.reply_to?.content) {
    const replyDiv = document.createElement('div');
    replyDiv.className = 'bbl-reply';
    replyDiv.textContent = msg.reply_to.content.slice(0, 60);
    replyDiv.addEventListener('click', () => window.scrollToMsg?.(msg.reply_to.id));
    bbl.appendChild(replyDiv);
  }
  const content = document.createElement('span');
  content.className = 'bbl-text';
  content.textContent = msg.content || '';
  bbl.appendChild(content);
  const meta = buildMeta(msg, isOut);
  if (msg.is_edited) {
    const editedMark = document.createElement('span');
    editedMark.className = 'bbl-edited';
    editedMark.textContent = 'изменено';
    meta.prepend(editedMark);
    bbl.classList.add('bbl--edited');
  }
  bbl.appendChild(meta);
}

// ── Построить пузырь — события ──

function buildBubbleFooter(wrapper, bbl, msg) {
  const isOut = msg.sender_id === window._chatMyId?.();
  window.bindBubbleEvents(wrapper, bbl, msg, isOut);
  let pressTimer;
  bbl.addEventListener('contextmenu', (e) => e.preventDefault());
  const startPress = () => {
    pressTimer = setTimeout(() => {
      window.haptic?.('medium');
      const own = msg.sender_id === window._chatMyId?.();
      const ctx = window.showCtx || window.showMsgContextMenu;
      if (ctx) ctx(bbl, wrapper.dataset.msgId, own, msg.created_at);
    }, 480);
  };
  const cancelPress = () => clearTimeout(pressTimer);
  bbl.addEventListener('touchstart', startPress, { passive: true });
  bbl.addEventListener('touchend', cancelPress);
  bbl.addEventListener('touchmove', cancelPress);
  bbl.addEventListener('touchcancel', cancelPress);
  bbl.addEventListener('mousedown', (e) => { if (e.button === 0) startPress(); });
  bbl.addEventListener('mouseup', cancelPress);
  bbl.addEventListener('mouseleave', cancelPress);
}

// ── Построить пузырь — оркестратор ────────

function buildBubble(msg, grpPos) {
  const isOut = msg.sender_id === window._chatMyId?.();
  const dnaType = !isOut ? (msg.sender?.dna_type || window._chatPartner?.()?.dna_type) : null;
  const dnaColor = dnaType ? window.getDnaColor(dnaType) : null;
  const { wrapper, bbl } = buildBubbleShell(msg, grpPos, isOut, dnaType, dnaColor);
  buildBubbleContent(bbl, msg, isOut);
  buildBubbleFooter(wrapper, bbl, msg);
  return wrapper;
}

// ── SVG галочек ──────────────────────────

function buildTicksSVG(type) {
  const color = type === 'read' ? '#8b5cf6' : '#94a3b8';
  if (type === 'sent') {
    return '<svg width="12" height="8" viewBox="0 0 12 8">' +
      '<path d="M1 4 L4 7 L11 1" stroke="' + color +
      '" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
  }
  return '<svg width="16" height="8" viewBox="0 0 16 8">' +
    '<path d="M1 4 L4 7 L11 1" stroke="' + color +
    '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M5 4 L8 7 L15 1" stroke="' + color +
    '" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
}

// ── Мета сообщения ─────────────────────

function buildMeta(msg, isOut) {
  const meta = document.createElement('div');
  meta.className = 'bbl-meta';
  const t = document.createElement('span');
  t.className = 'bbl-t';
  t.textContent = formatMsgTime(msg.created_at);
  meta.appendChild(t);
  const status = buildMsgStatus(msg, isOut);
  if (status) meta.appendChild(status);
  return meta;
}

// ── Статус сообщения ─────────────────────

function buildMsgStatus(msg, isMine) {
  if (!isMine) return null;
  const wrap = document.createElement('span');
  wrap.className = 'msg-status';
  wrap.dataset.msgId = msg.id;
  if (msg._temp) {
    const spinner = document.createElement('span');
    spinner.className = 'msg-status__spinner';
    wrap.appendChild(spinner);
    return wrap;
  }
  if (msg.is_read) {
    wrap.classList.add('msg-status--read');
    wrap.innerHTML = buildTicksSVG('read');
  } else if (msg.delivered_at) {
    wrap.classList.add('msg-status--delivered');
    wrap.innerHTML = buildTicksSVG('delivered');
  } else {
    wrap.classList.add('msg-status--sent');
    wrap.innerHTML = buildTicksSVG('sent');
  }
  return wrap;
}

// ── Обновление статуса ───────────────────

function updateMsgStatus(msgId, status) {
  const el = document.querySelector('.msg-status[data-msg-id="' + msgId + '"]');
  if (!el) return;
  el.className = 'msg-status msg-status--' + status;
  el.innerHTML = buildTicksSVG(status);
  if (status === 'read') {
    el.style.transform = 'scale(1.2)';
    setTimeout(() => { el.style.transform = ''; }, 300);
  }
}

// ── Галочки прочтения (bulk) ─────────────

function markOutgoingAsRead() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.querySelectorAll('.msg-out .msg-status:not(.msg-status--read)').forEach(el => {
    el.className = 'msg-status msg-status--read';
    el.innerHTML = buildTicksSVG('read');
  });
}

// ── Дата разделитель ───────────────────

function buildDateDivider(dateStr) {
  const d = document.createElement('div');
  d.className = 'msg-date';
  const s = document.createElement('span');
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) s.textContent = 'Сегодня';
  else if (date.toDateString() === yesterday.toDateString()) s.textContent = 'Вчера';
  else s.textContent = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  d.appendChild(s);
  return d;
}

// ── Разделитель непрочитанных ─────────

function buildUnreadDivider() {
  const el = document.createElement('div');
  el.className = 'msg-unread-divider';
  el.id = 'msgUnreadDivider';
  el.innerHTML = '<span>Новые сообщения</span>';
  return el;
}

// ── Форматирование времени ─────────────

function formatMsgTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Экспорты ───────────────────────────

window.renderChatHead = renderChatHead;
window.hexToRgb = hexToRgb;
window.buildBubble = buildBubble;
window.buildMeta = buildMeta;
window.buildTicksSVG = buildTicksSVG;
window.buildMsgStatus = buildMsgStatus;
window.updateMsgStatus = updateMsgStatus;
window.markOutgoingAsRead = markOutgoingAsRead;
window.buildDateDivider = buildDateDivider;
window.buildUnreadDivider = buildUnreadDivider;
window.formatMsgTime = formatMsgTime;
