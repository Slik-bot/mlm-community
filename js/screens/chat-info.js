// ═══════════════════════════════════════
// CHAT INFO
// Экран информации о собеседнике
// ═══════════════════════════════════════

function initChatInfo() {
  const partner = window._chatPartner?.();
  if (!partner) return;

  const avatar = document.getElementById('chatInfoAvatar');
  const name   = document.getElementById('chatInfoName');
  const meta   = document.getElementById('chatInfoMeta');

  if (avatar) {
    if (partner.avatar_url) {
      avatar.style.backgroundImage = 'url(' + partner.avatar_url + ')';
      avatar.textContent = '';
    } else {
      avatar.textContent = (partner.name || '?')[0].toUpperCase();
    }
    if (partner.dna_type && window.buildDnaRing) {
      window.buildDnaRing(partner.dna_type, 96, avatar.parentElement);
    }
  }

  if (name) {
    name.textContent = partner.name || '';
  }

  if (meta) {
    const dnaLabels = {
      strategist: 'Стратег', communicator: 'Коммуникатор',
      creator: 'Креатор', analyst: 'Аналитик',
      S: 'Стратег', C: 'Коммуникатор', K: 'Креатор', A: 'Аналитик'
    };
    meta.textContent = dnaLabels[partner.dna_type] || '';
  }
}

function chatMute() {
  window.showToast?.('Скоро: тихий режим');
}

function chatClearHistory() {
  window.showToast?.('Скоро: очистка истории');
}

function chatDelete() {
  window.showToast?.('Скоро: удаление чата');
}

// ЭКСПОРТЫ
window.initChatInfo    = initChatInfo;
window.chatMute        = chatMute;
window.chatClearHistory = chatClearHistory;
window.chatDelete      = chatDelete;
