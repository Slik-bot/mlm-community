// ═══════════════════════════════════════
// ROADMAP — Дорожная карта уровней
// ═══════════════════════════════════════

const RM_CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg>';

const RM_FIGURES = [
  { level: 'pawn', label: 'Пешка', mult: '×1.0' },
  { level: 'knight', label: 'Конь', mult: '×1.0' },
  { level: 'bishop', label: 'Слон', mult: '×1.3' },
  { level: 'rook', label: 'Ладья', mult: '×1.6' },
  { level: 'queen', label: 'Ферзь', mult: '×2.0' },
  { level: 'king', label: 'Король', mult: '×2.5' }
];

// ═══ Утилиты ═══

function rmFormatXP(n) {
  if (n >= 1000000) {
    const val = n / 1000000;
    return (n % 1000000 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'M';
  }
  if (n >= 1000) return Math.floor(n / 1000) + 'K';
  return String(n);
}

function rmStars(current, max) {
  return '★'.repeat(current) + '☆'.repeat(max - current);
}

// ═══ Рендер: текущий уровень ═══

function rmRenderCurrent(lvl, progress, xp) {
  const el = document.getElementById('rmCurrent');
  if (!el) return;
  const dnaType = window.currentUser ? window.currentUser.dna_type : null;
  const dnaColor = window.getDnaColor ? getDnaColor(dnaType) : '#8b5cf6';
  const icon = window.getChessIcon ? getChessIcon(lvl.level, dnaColor) : '';
  const maxS = lvl.level === 'king' ? 1 : 5;
  const stars = rmStars(lvl.stars, maxS);
  const xpText = progress.needed > 0
    ? rmFormatXP(progress.current) + ' / ' + rmFormatXP(progress.needed) + ' XP'
    : rmFormatXP(xp) + ' XP (MAX)';
  el.innerHTML =
    '<div class="rm-current-icon">' + icon + '</div>' +
    '<div class="rm-current-info">' +
      '<div class="rm-current-label">' + lvl.label + ' ' + stars + '</div>' +
      '<div class="rm-progress-bar"><div class="rm-progress-fill" style="width:' + progress.percent + '%"></div></div>' +
      '<div class="rm-progress-text">' + xpText + '</div>' +
    '</div>';
}

// ═══ Рендер: таймлайн (26 уровней) ═══

function rmRenderTimeline(xp) {
  const el = document.getElementById('rmTimeline');
  if (!el) return;
  const table = window.Gamification.XP_TABLE;
  const currentLvl = window.Gamification.getUserLevel(xp);
  const currentIdx = table.indexOf(currentLvl);
  const dnaType = window.currentUser ? window.currentUser.dna_type : null;
  const dnaColor = window.getDnaColor ? getDnaColor(dnaType) : '#8b5cf6';
  let html = '';
  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    const isPassed = i < currentIdx;
    const isCurrent = i === currentIdx;
    const cls = isPassed ? 'rm-passed' : (isCurrent ? 'rm-active' : 'rm-locked');
    const iconColor = isPassed ? '#22c55e' : (isCurrent ? dnaColor : 'rgba(255,255,255,0.2)');
    const icon = window.getChessIcon ? getChessIcon(row.level, iconColor) : '';
    const maxS = row.level === 'king' ? 1 : 5;
    const stars = rmStars(row.stars, maxS);
    html += '<div class="rm-node ' + cls + '">' +
      '<div class="rm-node-card">' +
        '<div class="rm-node-icon">' + icon + '</div>' +
        '<div class="rm-node-info">' +
          '<div class="rm-node-name">' + row.label + ' ' + stars + '</div>' +
          '<div class="rm-node-xp">' + rmFormatXP(row.xpMin) + ' XP</div>' +
        '</div>' +
        (isPassed ? '<div class="rm-node-status">' + RM_CHECK_SVG + '</div>' : '') +
      '</div>' +
    '</div>';
  }
  el.innerHTML = html;
}

// ═══ Рендер: легенда множителей ═══

function rmRenderLegend() {
  const el = document.getElementById('rmLegend');
  if (!el) return;
  let html = '<div class="rm-legend-title">Множители XP</div>' +
    '<div class="rm-legend-grid">';
  for (const fig of RM_FIGURES) {
    const icon = window.getChessIcon ? getChessIcon(fig.level, '#8b5cf6') : '';
    html += '<div class="rm-legend-item">' +
      '<div class="rm-legend-icon">' + icon + '</div>' +
      '<div class="rm-legend-name">' + fig.label + '</div>' +
      '<div class="rm-legend-mult">' + fig.mult + '</div>' +
    '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ═══ Init ═══

function initRoadmap() {
  const user = window.currentUser || (window.getCurrentUser ? getCurrentUser() : null);
  if (!user) return;
  const xp = user.xp_total || 0;
  const lvl = window.Gamification.getUserLevel(xp);
  const progress = window.Gamification.getLevelProgress(xp);
  rmRenderCurrent(lvl, progress, xp);
  rmRenderTimeline(xp);
  rmRenderLegend();
  const activeNode = document.querySelector('.rm-active');
  if (activeNode) {
    setTimeout(function() {
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }
}

window.initRoadmap = initRoadmap;
