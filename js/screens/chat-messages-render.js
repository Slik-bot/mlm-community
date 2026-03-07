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
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
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

// ── Построить пузырь ───────────────────

function buildBubble(msg, isGrp) {
  const isOut = msg.sender_id === window._chatMyId?.();
  const dnaType = !isOut ? (msg.sender?.dna_type || window._chatPartner?.()?.dna_type) : null;
  const dnaColor = dnaType ? window.getDnaColor(dnaType) : null;
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + (isOut ? 'msg-out' : 'msg-in') + (isGrp ? ' grp' : '');
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
  if (msg.reply_to?.content) {
    const replyDiv = document.createElement('div');
    replyDiv.className = 'bbl-reply';
    replyDiv.textContent = msg.reply_to.content.slice(0, 60);
    replyDiv.addEventListener('click', () => window.scrollToMsg?.(msg.reply_to.id));
    bbl.appendChild(replyDiv);
  }
  const content = document.createElement('div');
  content.textContent = msg.content || '';
  bbl.appendChild(content);
  const meta = buildMeta(msg, isOut);
  bbl.appendChild(meta);
  wrapper.appendChild(bbl);
  window.bindBubbleEvents(wrapper, bbl, msg, isOut);
  return wrapper;
}

// ── Таблетки реакций на пузыре ────────────

window.addReactionToBubble = function(msgId, emoji, count) {
  const bubble = document.querySelector('[data-msg-id="' + msgId + '"] .bbl');
  if (!bubble) return;
  let pill = bubble.querySelector('.bbl-rx[data-emoji="' + CSS.escape(emoji) + '"]');
  if (pill) {
    const cnt = pill.querySelector('.rx-cnt');
    if (count !== null) cnt.textContent = count;
    else cnt.textContent = parseInt(cnt.textContent || '0') + 1;
  } else {
    pill = document.createElement('div');
    pill.className = 'bbl-rx';
    pill.dataset.emoji = emoji;
    const displayCount = count !== null ? count : 1;
    pill.innerHTML = emoji + ' <span class="rx-cnt">' + displayCount + '</span>';
    bubble.appendChild(pill);
  }
};

window.removeReactionFromBubble = function(msgId, emoji, userId) {
  const bubble = document.querySelector('[data-msg-id="' + msgId + '"] .bbl');
  if (!bubble) return;
  const pill = bubble.querySelector('.bbl-rx[data-emoji="' + emoji + '"]');
  if (!pill) return;
  const cnt = pill.querySelector('.rx-cnt');
  const count = parseInt(cnt.textContent || '1') - 1;
  if (count <= 0) pill.remove();
  else cnt.textContent = count;
};

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
