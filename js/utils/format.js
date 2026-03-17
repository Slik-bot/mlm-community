// ═══════════════════════════════════════
// FORMAT UTILITIES
// Общие утилиты форматирования и UI
// ═══════════════════════════════════════

// ===== TOAST =====
let _toastTimer = null;
function showToast(msg, type, duration) {
  const el = document.getElementById('toastEl');
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = 'toast show toast-' + (type || 'ok');
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, duration || 3000);
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

// ===== AVATAR =====
function buildAvatar(user, cls, size) {
  var u = user || {};
  if (u.avatar_url) {
    return '<img class="' + cls + '" width="' + size + '" height="' + size +
      '" src="' + u.avatar_url + '" alt="">';
  }
  var ini = escHtml((u.name || u.full_name || '?')[0].toUpperCase());
  var fs = Math.round(size * 0.42);
  var bg = (window.getDnaColor ? window.getDnaColor(u.dna_type) : null) || '#8b5cf6';
  return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size +
    'px;font-size:' + fs + 'px;background:' + bg +
    ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;border-radius:50%">' + ini + '</div>';
}

// ===== EXPORTS =====
window.showToast = showToast;
window.escHtml = escHtml;
window.buildAvatar = buildAvatar;
