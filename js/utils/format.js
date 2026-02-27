// ═══════════════════════════════════════
// FORMAT UTILITIES
// Общие утилиты форматирования и UI
// ═══════════════════════════════════════

// ===== TOAST =====
let _toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById('toastEl');
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = 'toast show toast-' + (type || 'ok');
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, 3000);
}

// ===== HTML ESCAPING =====
function escHtml(s) {
  return s
    ? String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>')
    : '';
}

// ===== EXPORTS =====
window.showToast = showToast;
window.escHtml = escHtml;
