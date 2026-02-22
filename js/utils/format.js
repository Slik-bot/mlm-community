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

// ===== EXPORTS =====
window.showToast = showToast;
