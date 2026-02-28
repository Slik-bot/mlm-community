// ═══════════════════════════════════════
// WEEKLY REPORT — Spotify Wrapped style
// ═══════════════════════════════════════

const MONTH_NAMES_RU = [
  'января', 'февраля', 'марта', 'апреля',
  'мая', 'июня', 'июля', 'августа',
  'сентября', 'октября', 'ноября', 'декабря'
];

let wrReports = [];
let wrCurrentIndex = 0;

function wrFormatNumber(n) {
  if (!n) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

function wrGetMonthName(monthIndex) {
  return MONTH_NAMES_RU[monthIndex] || '';
}

function wrFormatWeekLabel(report) {
  const start = new Date(report.week_start);
  const end = new Date(report.week_end);
  const sDay = start.getDate();
  const eDay = end.getDate();
  const eMonth = wrGetMonthName(end.getMonth());
  const year = end.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return sDay + ' \u2013 ' + eDay + ' ' + eMonth + ' ' + year;
  }
  const sMonth = wrGetMonthName(start.getMonth());
  return sDay + ' ' + sMonth + ' \u2013 ' + eDay + ' ' + eMonth + ' ' + year;
}

function renderReport(report) {
  const container = document.getElementById('wr-report');
  if (!container) return;
  const streakHtml = buildStreakRow(report);
  const levelHtml = buildLevelRow(report);
  container.innerHTML =
    '<div class="wr-card">' +
      '<div class="wr-highlight">' +
        '<div class="wr-highlight-value">+' + wrFormatNumber(report.xp_earned) + ' XP</div>' +
        '<div class="wr-highlight-label">за неделю</div>' +
      '</div>' +
      '<div class="wr-metrics">' +
        wrMetricHtml(report.tasks_completed, 'Заданий') +
        wrMetricHtml(report.deals_completed, 'Сделок') +
        wrMetricHtml(report.posts_created, 'Постов') +
        wrMetricHtml(report.comments_created, 'Комментариев') +
        wrMetricHtml(report.likes_received, 'Лайков') +
        wrMetricHtml(report.referrals_gained, 'Рефералов') +
      '</div>' +
      streakHtml +
      levelHtml +
    '</div>';
}

function wrMetricHtml(value, label) {
  return '<div class="wr-metric">' +
    '<div class="wr-metric-value">' + wrFormatNumber(value) + '</div>' +
    '<div class="wr-metric-label">' + label + '</div>' +
  '</div>';
}

function buildStreakRow(report) {
  const s = report.streak_start || 0;
  const e = report.streak_end || 0;
  if (!s && !e) return '';
  const arrow = e > s ? ' \u2192 ' + e : '';
  return '<div class="wr-streak-row">' +
    '<svg class="wr-streak-fire" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/>' +
    '</svg>' +
    '<span class="wr-streak-text">' + s + arrow + ' дней</span>' +
  '</div>';
}

function buildLevelRow(report) {
  const ls = report.level_start || '';
  const le = report.level_end || '';
  if (!ls || ls === le) return '';
  return '<div class="wr-level-change wr-level-up">' +
    '<span class="wr-level-text">' + ls + '</span>' +
    '<svg class="wr-level-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">' +
      '<path d="M5 12h14M12 5l7 7-7 7"/>' +
    '</svg>' +
    '<span class="wr-level-text">' + le + '</span>' +
  '</div>';
}

function renderHistory(reports, activeIndex) {
  const container = document.getElementById('wr-history');
  if (!container || reports.length < 2) {
    if (container) container.innerHTML = '';
    return;
  }
  let html = '<div class="wr-history-title">История отчётов</div>';
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const activeCls = i === activeIndex ? ' wr-active' : '';
    html += '<div class="wr-history-item' + activeCls + '" data-wr-idx="' + i + '">' +
      '<span class="wr-history-date">' + wrFormatWeekLabel(r) + '</span>' +
      '<span class="wr-history-xp">+' + wrFormatNumber(r.xp_earned) + ' XP</span>' +
    '</div>';
  }
  container.innerHTML = html;
  container.querySelectorAll('.wr-history-item').forEach(function(el) {
    el.addEventListener('click', function() {
      const idx = parseInt(el.dataset.wrIdx, 10);
      wrCurrentIndex = idx;
      wrUpdateView();
    });
  });
}

function wrUpdateView() {
  const report = wrReports[wrCurrentIndex];
  if (!report) return;
  renderReport(report);
  renderHistory(wrReports, wrCurrentIndex);
  const label = document.getElementById('wr-week-label');
  if (label) label.textContent = wrFormatWeekLabel(report);
  wrUpdateNavButtons();
}

function wrUpdateNavButtons() {
  const prevBtn = document.getElementById('wr-prev');
  const nextBtn = document.getElementById('wr-next');
  if (prevBtn) prevBtn.disabled = wrCurrentIndex >= wrReports.length - 1;
  if (nextBtn) nextBtn.disabled = wrCurrentIndex <= 0;
}

function setupNavigation() {
  const prevBtn = document.getElementById('wr-prev');
  const nextBtn = document.getElementById('wr-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (wrCurrentIndex < wrReports.length - 1) {
        wrCurrentIndex++;
        wrUpdateView();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (wrCurrentIndex > 0) {
        wrCurrentIndex--;
        wrUpdateView();
      }
    });
  }
}

function wrShowEmpty() {
  const empty = document.getElementById('wr-empty');
  const report = document.getElementById('wr-report');
  const history = document.getElementById('wr-history');
  if (empty) empty.classList.remove('hidden');
  if (report) report.innerHTML = '';
  if (history) history.innerHTML = '';
}

function wrHideEmpty() {
  const empty = document.getElementById('wr-empty');
  if (empty) empty.classList.add('hidden');
}

async function initWeeklyReport() {
  wrCurrentIndex = 0;
  wrReports = [];
  setupNavigation();
  try {
    const uid = localStorage.getItem('userId');
    if (!uid) { wrShowEmpty(); return; }
    const sb = window.supabase;
    const { data, error } = await sb
      .from('weekly_reports')
      .select('*')
      .eq('user_id', uid)
      .order('week_start', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) { wrShowEmpty(); return; }
    wrReports = data;
    wrHideEmpty();
    wrUpdateView();
  } catch (err) {
    console.error('Weekly report load error:', err);
    wrShowEmpty();
  }
}

window.initWeeklyReport = initWeeklyReport;
