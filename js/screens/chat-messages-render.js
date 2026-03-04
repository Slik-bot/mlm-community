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
  if (status) { status.textContent = 'В сети'; status.className = 'ch-status'; }
  if (dot) dot.classList.remove('hidden');
  if (tfRecipient) tfRecipient.textContent = p.name || '';
}

// ── Построить пузырь ───────────────────

function buildBubble(msg, isGrp) {
  const isOut = msg.sender_id === window._chatMyId?.();
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + (isOut ? 'msg-out' : 'msg-in') + (isGrp ? ' grp' : '');
  wrapper.dataset.msgId = msg.id;
  if (!isOut) {
    const av = document.createElement('div');
    av.className = 'msg-av-w';
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

// ── Мета сообщения ─────────────────────

function buildMeta(msg, isOut) {
  const meta = document.createElement('div');
  meta.className = 'bbl-meta';
  const t = document.createElement('span');
  t.className = 'bbl-t';
  t.textContent = formatMsgTime(msg.created_at);
  meta.appendChild(t);
  if (isOut) {
    const chk = document.createElement('span');
    chk.className = 'chk chk-sent';
    chk.innerHTML = '<svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    meta.appendChild(chk);
  }
  return meta;
}

// ── Галочки прочтения ───────────────────

function markOutgoingAsRead() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  const SVG_READ = '<svg width="15" height="8" fill="none" viewBox="0 0 15 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4l2.5 2.5L14 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  box.querySelectorAll('.msg-out:not(.msg-sending) .chk').forEach(chk => {
    if (!chk.classList.contains('chk-read')) {
      chk.className = 'chk chk-read';
      chk.innerHTML = SVG_READ;
    }
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
window.buildBubble = buildBubble;
window.buildMeta = buildMeta;
window.markOutgoingAsRead = markOutgoingAsRead;
window.buildDateDivider = buildDateDivider;
window.buildUnreadDivider = buildUnreadDivider;
window.formatMsgTime = formatMsgTime;
