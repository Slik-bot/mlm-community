// ═══════════════════════════════════════
// PROFILE STATS — Моя статистика
// ═══════════════════════════════════════

const PS_DONUT_R = 15.915;
const PS_CIRCUMFERENCE = 100;

const PS_CHART_SEGMENTS = [
  { key: 'posts_count',    label: 'Посты',    color: '#8b5cf6' },
  { key: 'tasks_completed', label: 'Задания',  color: '#22c55e' },
  { key: 'deals_completed', label: 'Сделки',   color: '#f59e0b' },
  { key: 'referrals_count', label: 'Рефералы', color: '#3b82f6' }
];

const PS_METRICS = [
  { key: 'posts_count',     label: 'Посты',            goal: 100,  color: '#8b5cf6' },
  { key: 'comments_count',  label: 'Комментарии',      goal: 200,  color: '#a78bfa' },
  { key: 'likes_given',     label: 'Лайки отданы',     goal: 500,  color: '#ec4899' },
  { key: 'likes_received',  label: 'Лайки получены',   goal: 500,  color: '#f43f5e' },
  { key: 'friends_count',   label: 'Друзья',           goal: 50,   color: '#22c55e' },
  { key: 'deals_completed', label: 'Сделки',           goal: 20,   color: '#f59e0b' },
  { key: 'tasks_completed', label: 'Задания',          goal: 100,  color: '#3b82f6' },
  { key: 'referrals_count', label: 'Рефералы',         goal: 10,   color: '#06b6d4' }
];

// ═══ Init ═══

function initProfileStats() {
  const user = window.currentUser;
  if (!user) return;
  const s = window.sb;
  if (!s) return;
  s.from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()
    .then(function(res) {
      const stats = res.data || {};
      psRenderChart(stats);
      psRenderMetrics(stats);
      psRenderLevel(user);
    })
    .catch(function(err) {
      console.error('Profile stats load error:', err);
      showToast('Ошибка загрузки статистики');
    });
}

// ═══ Donut Chart ═══

function psRenderChart(stats) {
  const el = document.getElementById('psChart');
  const legendEl = document.getElementById('psLegend');
  if (!el) return;

  const values = PS_CHART_SEGMENTS.map(function(seg) {
    return { value: stats[seg.key] || 0, color: seg.color, label: seg.label };
  });
  const total = values.reduce(function(sum, v) { return sum + v.value; }, 0);
  const segments = psCalcSegments(values, total);

  let svg = '<svg viewBox="0 0 36 36">';
  svg += '<circle cx="18" cy="18" r="' + PS_DONUT_R + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>';
  segments.forEach(function(seg) {
    svg += '<circle cx="18" cy="18" r="' + PS_DONUT_R + '" fill="none"' +
      ' stroke="' + seg.color + '" stroke-width="3"' +
      ' stroke-dasharray="' + seg.dash + ' ' + (PS_CIRCUMFERENCE - seg.dash) + '"' +
      ' stroke-dashoffset="' + seg.offset + '" stroke-linecap="round"/>';
  });
  svg += '</svg>';
  svg += '<div class="ps-chart-center">' +
    '<div class="ps-chart-total">' + total + '</div>' +
    '<div class="ps-chart-label">активностей</div></div>';
  el.innerHTML = svg;

  if (legendEl) {
    legendEl.innerHTML = values.map(function(v) {
      return '<div class="ps-legend-item">' +
        '<div class="ps-legend-dot" style="background:' + v.color + '"></div>' +
        '<span class="ps-legend-label">' + v.label + '</span>' +
        '<span class="ps-legend-value">' + v.value + '</span></div>';
    }).join('');
  }
}

function psCalcSegments(values, total) {
  if (!total) return [];
  let offset = 0;
  return values.filter(function(v) { return v.value > 0; }).map(function(v) {
    const dash = (v.value / total) * PS_CIRCUMFERENCE;
    const seg = { dash: dash, offset: -offset, color: v.color };
    offset += dash;
    return seg;
  });
}

// ═══ Metrics ═══

function psRenderMetrics(stats) {
  const el = document.getElementById('psMetrics');
  if (!el) return;
  el.innerHTML = PS_METRICS.map(function(m, i) {
    const val = stats[m.key] || 0;
    const pct = Math.min(Math.round((val / m.goal) * 100), 100);
    const delay = 'animation-delay:' + (i * 0.05) + 's';
    return '<div class="ps-metric" style="' + delay + '">' +
      '<div class="ps-metric-icon">' + psGetMetricIcon(m.key, m.color) + '</div>' +
      '<div class="ps-metric-info">' +
        '<div class="ps-metric-name">' + m.label + '</div>' +
        '<div class="ps-metric-row">' +
          '<span class="ps-metric-value">' + val + '</span>' +
          '<span class="ps-metric-goal">/ ' + m.goal + '</span>' +
        '</div>' +
        '<div class="ps-metric-bar">' +
          '<div class="ps-metric-bar-fill" style="width:' + pct + '%;background:' + m.color + '"></div>' +
        '</div>' +
      '</div></div>';
  }).join('');
}

// ═══ Metric Icons ═══

function psGetMetricIcon(key, color) {
  const c = color || '#8b5cf6';
  const icons = {
    posts_count: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    comments_count: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    likes_given: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>',
    likes_received: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    friends_count: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    deals_completed: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    tasks_completed: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    referrals_count: '<svg viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
  };
  return icons[key] || '';
}

// ═══ Level Card ═══

function psRenderLevel(user) {
  const el = document.getElementById('psLevel');
  if (!el) return;
  const xp = user.xp_total || 0;
  const dnaColor = window.getDnaColor ? getDnaColor(user.dna_type) : '#8b5cf6';
  const lvl = window.Gamification ? Gamification.getUserLevel(xp) : { level: 'pawn', label: 'Пешка', stars: 1 };
  const progress = window.Gamification ? Gamification.getLevelProgress(xp) : { percent: 0, current: 0, needed: 0 };
  const icon = window.getChessIcon ? getChessIcon(lvl.level, dnaColor) : '';
  const maxS = lvl.level === 'king' ? 1 : 5;
  const stars = '\u2605'.repeat(lvl.stars) + '\u2606'.repeat(maxS - lvl.stars);
  const streak = user.streak_days || 0;
  const streakMult = window.Gamification ? Gamification.getStreakMultiplier(streak) : 1.0;
  const xpText = progress.needed > 0
    ? progress.current + ' / ' + progress.needed + ' XP'
    : xp + ' XP (MAX)';

  el.innerHTML =
    '<div class="ps-level-icon">' + icon + '</div>' +
    '<div class="ps-level-info">' +
      '<div class="ps-level-name">' + lvl.label + ' ' + stars + '</div>' +
      '<div class="ps-level-xp">' + xpText + '</div>' +
      '<div class="ps-level-bar"><div class="ps-level-bar-fill" style="width:' + progress.percent + '%"></div></div>' +
      (streak > 0 ? '<div class="ps-streak">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/></svg>' +
        streak + ' дн \u00b7 x' + streakMult.toFixed(1) +
      '</div>' : '') +
    '</div>';
}

// ═══ Exports ═══

window.initProfileStats = initProfileStats;
