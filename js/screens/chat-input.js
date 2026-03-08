// ═══════════════════════════════════════
// CHAT INPUT — поле ввода, отправка, TF-перевод
// Отделено от chat-messages.js — 06.03.2026
// ═══════════════════════════════════════

const CHAR_LIMIT = 4000;
const CHAR_SHOW = 3500;
const CHAR_WARN = 3800;

// ── Отправка: хелперы ────────────────────

function buildTempMessage(text, myId, replyRef) {
  const user = window.getCurrentUser() || {};
  return {
    id: 'temp_' + Date.now(),
    content: text,
    sender_id: myId,
    sender: { id: myId, name: user.name || '' },
    created_at: new Date().toISOString(),
    reply_to: replyRef ? { id: replyRef.id, content: replyRef.content } : null,
    _temp: true
  };
}

function insertOptimisticBubble(tempMsg, box) {
  const el = window.buildBubble(tempMsg, false);
  el.dataset.tempId = tempMsg.id;
  el.classList.add('msg-new', 'msg-sending');
  box?.appendChild(el);
  window.scrollToBottom();
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }
}

function handleSendSuccess(data, tempId, convId, box) {
  window._chatPagination.msgMap[data.id] = data;
  const tmp = box?.querySelector('[data-temp-id="' + tempId + '"]');
  if (tmp) {
    tmp.dataset.msgId = data.id;
    tmp.dataset.tempId = '';
    tmp.classList.remove('msg-sending');
    const stEl = tmp.querySelector('.msg-status');
    if (stEl) {
      stEl.dataset.msgId = data.id;
      stEl.className = 'msg-status msg-status--sent';
      stEl.innerHTML = window.buildTicksSVG?.('sent') || '';
    }
  }
  window.sb.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convId)
    .then(function(res) {
      if (res.error) console.error('update last_message_at:', res.error);
    });
}

function handleSendError(err, tempId, text, box) {
  console.error('chatSend:', err);
  const tmp = box?.querySelector('[data-temp-id="' + tempId + '"]');
  if (tmp) {
    tmp.classList.remove('msg-sending');
    tmp.classList.add('msg-error');
    tmp.addEventListener('click', function() {
      tmp.remove();
      const inp = document.getElementById('chatInput');
      if (inp) { inp.value = text; chatToggleSend(); }
      window.showToast?.('Текст возвращён — отправьте снова');
    }, { once: true });
  }
}

// ── Отправка ───────────────────────────

async function chatSend() {
  const editState = window.getEditState?.();
  if (editState) {
    const input = document.getElementById('chatInput');
    const newText = input?.value.trim();
    if (!newText) return;
    const ok = await window.updateMessage?.(editState.msgId, newText);
    if (ok) {
      window.closeEdit?.();
      input.value = '';
      chatToggleSend();
      chatInputResize(input);
    }
    return;
  }
  const input = document.getElementById('chatInput');
  const text = input?.value.trim();
  if (!text || text.length > CHAR_LIMIT) return;
  const convId = window._chatPagination?.convId;
  const myId = window._chatMyId();
  if (!convId || !myId) return;
  const box = document.getElementById('chatMessages');
  input.value = '';
  chatToggleSend();
  chatInputResize(input);
  const replyRef = window.getChatReplyTo();
  if (replyRef) window.cancelReply();
  const tempMsg = buildTempMessage(text, myId, replyRef);
  insertOptimisticBubble(tempMsg, box);
  const payload = { conversation_id: convId, sender_id: myId, content: text, type: 'text' };
  if (replyRef) payload.reply_to_id = replyRef.id;
  try {
    const { data, error } = await window.sb
      .from('messages').insert(payload)
      .select('*, sender:users!sender_id(id,name,avatar_url,dna_type), reply_to:messages!reply_to_id(id,content,sender_id)')
      .single();
    if (error) throw error;
    handleSendSuccess(data, tempMsg.id, convId, box);
  } catch (err) {
    handleSendError(err, tempMsg.id, text, box);
  }
}

// ── Input хелперы ──────────────────────

function chatInputResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function chatToggleSend() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  if (!input || !btn) return;
  if (input.value.trim()) btn.classList.add('visible');
  else btn.classList.remove('visible');
  updateCharCount();
}

function updateCharCount() {
  const input = document.getElementById('chatInput');
  const counter = document.getElementById('chatCharCount');
  const btn = document.getElementById('chatSendBtn');
  if (!input || !counter) return;
  const len = input.value.length;
  if (len < CHAR_SHOW) {
    counter.classList.add('hidden');
    counter.classList.remove('char-count--warn', 'char-count--limit');
    if (btn) btn.disabled = false;
    return;
  }
  counter.classList.remove('hidden');
  counter.textContent = len + ' / ' + CHAR_LIMIT;
  if (len >= CHAR_LIMIT) {
    counter.classList.add('char-count--limit');
    counter.classList.remove('char-count--warn');
    if (btn) btn.disabled = true;
  } else if (len >= CHAR_WARN) {
    counter.classList.add('char-count--warn');
    counter.classList.remove('char-count--limit');
    if (btn) btn.disabled = false;
  } else {
    counter.classList.remove('char-count--warn', 'char-count--limit');
    if (btn) btn.disabled = false;
  }
}

function chatInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); chatSend();
  }
}

function bindChatInput() {
  const btn = document.getElementById('chatSendBtn');
  if (btn) btn.classList.remove('visible');
  if (btn) {
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      chatSend();
    }, { passive: false });
    btn.addEventListener('click', (e) => {
      if (e.isTrusted && !('ontouchstart' in window)) chatSend();
    });
  }
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = '';
    chatInputResize(input);
    input.addEventListener('input', () => window.handleTyping?.());
  }
  window.cancelReply();
  bindTgViewport();
}

function bindTgViewport() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  const update = () => {
    const h = tg.viewportHeight;
    if (h && h > 100) {
      document.documentElement.style.setProperty(
        '--tg-viewport-height', h + 'px'
      );
    }
  };
  tg.onEvent('viewportChanged', update);
  update();
}

// ── TF перевод ─────────────────────────

function chatTransfer() {
  document.getElementById('chatTfOv')?.classList.add('on');
  setTimeout(() => document.getElementById('tfInput')?.focus(), 380);
}

function hideTfModal() {
  document.getElementById('chatTfOv')?.classList.remove('on');
}

function calcTf(v) {
  const el = document.getElementById('tfConvert');
  if (el) el.textContent = '≈ $' + ((parseFloat(v) || 0) * 0.01).toFixed(2);
}

async function sendTf() {
  window.showToast?.('Скоро: TF перевод');
  hideTfModal();
}

// ── Экспорты ───────────────────────────

window.chatSend = chatSend;
window.chatInputResize = chatInputResize;
window.chatToggleSend = chatToggleSend;
window.chatInputKeydown = chatInputKeydown;
window.bindChatInput = bindChatInput;
window.updateCharCount = updateCharCount;
window.chatTransfer = chatTransfer;
window.hideTfModal = hideTfModal;
window.calcTf = calcTf;
window.sendTf = sendTf;
