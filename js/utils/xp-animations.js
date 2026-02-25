// ═══════════════════════════════════════════════════
// XP-ANIMATIONS.JS — визуальная обратная связь
// Зависимости: gamification.js
// ═══════════════════════════════════════════════════

function showXpToast(xp, label) {
  const existing = document.getElementById('xpToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'xpToast';
  toast.className = 'xp-toast';

  const formatted = xp >= 1000
    ? '+' + (xp / 1000).toFixed(1).replace('.0', '') + 'K XP'
    : '+' + xp + ' XP';

  toast.innerHTML = '<span class="xp-toast-icon">⚡</span>'
    + '<span class="xp-toast-amount">' + formatted + '</span>'
    + (label ? '<span class="xp-toast-label">' + label + '</span>' : '');

  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    toast.classList.add('xp-toast-show');
  });

  setTimeout(function() {
    toast.classList.remove('xp-toast-show');
    toast.classList.add('xp-toast-hide');
    setTimeout(function() { toast.remove(); }, 400);
  }, 2500);
}

function showLevelUp(newLevel, dnaColor) {
  const existing = document.getElementById('levelUpOverlay');
  if (existing) existing.remove();

  const color = dnaColor || '#8B5CF6';
  const stars = newLevel.stars || 1;
  const starsHtml = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));

  const overlay = document.createElement('div');
  overlay.id = 'levelUpOverlay';
  overlay.className = 'lvlup-overlay';
  overlay.innerHTML = '<div class="lvlup-content">'
    + '<div class="lvlup-glow" style="background:' + color + '"></div>'
    + '<div class="lvlup-title">Новый уровень!</div>'
    + '<div class="lvlup-name" style="color:' + color + '">' + (newLevel.label || '') + '</div>'
    + '<div class="lvlup-stars">' + starsHtml + '</div>'
    + '<div class="lvlup-mult">Множитель заработка ×' + (newLevel.mult || 1.0) + '</div>'
    + '<button class="lvlup-btn" onclick="document.getElementById(\'levelUpOverlay\').remove()">'
    + 'Продолжить</button>'
    + '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function() { overlay.classList.add('lvlup-show'); });
}

function showStarUnlock(stars, dnaColor) {
  const color = dnaColor || '#8B5CF6';
  const toast = document.createElement('div');
  toast.className = 'star-toast';
  toast.innerHTML = '<span class="star-toast-icon" style="color:' + color + '">★</span>'
    + '<span class="star-toast-text">Звезда ' + stars + ' получена!</span>';

  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add('star-toast-show'); });

  setTimeout(function() {
    toast.classList.add('star-toast-hide');
    setTimeout(function() { toast.remove(); }, 400);
  }, 2000);
}

window.showXpToast    = showXpToast;
window.showLevelUp    = showLevelUp;
window.showStarUnlock = showStarUnlock;
