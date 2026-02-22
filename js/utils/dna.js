// ═══════════════════════════════════════
// DNA UTILS — цвета и утилиты ДНК-типов
// Единый источник, используется в onboarding.js, profile.js и др.
// ═══════════════════════════════════════

const DNA_COLORS = {
  strategist: '#3b82f6',
  communicator: '#22c55e',
  creator: '#f59e0b',
  analyst: '#a78bfa',
  S: '#3b82f6',
  C: '#22c55e',
  K: '#f59e0b',
  A: '#a78bfa'
};

function getDnaColor(dnaType) {
  if (!dnaType) {
    dnaType = localStorage.getItem('dnaType') || 'S';
  }
  return DNA_COLORS[dnaType] || '#8b5cf6';
}

// ЭКСПОРТЫ
window.DNA_COLORS = DNA_COLORS;
window.getDnaColor = getDnaColor;
