// js/utils/legacy-compat.js
// Совместимость legacy-кода с новым API (js/api/)
// ВРЕМЕННЫЙ файл — потом comments.js и другие будут переписаны

// --- FIX 1: sbFormatDate (удалена вместе с supabase-api.js) ---
window.sbFormatDate = function(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
  if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// --- FIX 2: sbLoadComments (удалена вместе с supabase-api.js) ---
window.sbLoadComments = async function(postId) {
  if (window.loadComments) {
    const result = await window.loadComments(postId);
    return (result && result.data) || result || [];
  }
  return [];
};

// --- FIX 3: currentAuthUser (геттер → getCurrentUser) ---
if (!window.hasOwnProperty('currentAuthUser')) {
  Object.defineProperty(window, 'currentAuthUser', {
    get: function() {
      return window.getCurrentUser ? window.getCurrentUser() : null;
    },
    configurable: true
  });
}

// --- FIX 4: currentProfile (геттер → getCurrentUser) ---
if (!window.hasOwnProperty('currentProfile')) {
  Object.defineProperty(window, 'currentProfile', {
    get: function() {
      return window.getCurrentUser ? window.getCurrentUser() : null;
    },
    configurable: true
  });
}
