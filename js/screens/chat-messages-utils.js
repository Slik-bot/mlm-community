// ════════════════════════════════════════
// CHAT MESSAGES UTILS — чистые хелперы
// ════════════════════════════════════════

function applyChatDnaTheme(dnaType) {
  var color = window.getDnaColor(dnaType);
  var wrap = document.getElementById('scrChat');
  if (!wrap) return;
  wrap.style.setProperty('--dna-color', color);
}

function isSameGroup(a, b) {
  if (!a || !b) return false;
  if (a.sender_id !== b.sender_id) return false;
  if (new Date(a.created_at).toDateString() !== new Date(b.created_at).toDateString()) return false;
  return Math.abs(new Date(b.created_at) - new Date(a.created_at)) < 5 * 60 * 1000;
}

function applyDnaFallback(box) {
  var partnerDna = window._chatPartner?.()?.dna_type;
  var fallbackColor = partnerDna ? window.getDnaColor(partnerDna) : null;
  if (!fallbackColor) return;
  var rgb = window.hexToRgb(fallbackColor);
  box.querySelectorAll('.msg:not(.msg-out) .bbl').forEach(function(b) {
    if (!b.style.getPropertyValue('--msg-dna-rgb')) {
      b.style.setProperty('--msg-dna-rgb', rgb);
    }
  });
}

window.applyChatDnaTheme = applyChatDnaTheme;
window.isSameGroup = isSameGroup;
window.applyDnaFallback = applyDnaFallback;
