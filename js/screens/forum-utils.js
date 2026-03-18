// ===== FORUM UTILS — чистые хелперы без side effects =====
var FORUM_CATS = {
  business: { label: 'Бизнес', css: 'ct-biz' },
  marketing: { label: 'Маркетинг', css: 'ct-mkt' },
  tools: { label: 'Инструменты', css: 'ct-tool' },
  education: { label: 'Обучение', css: 'ct-edu' },
  newbies: { label: 'Новичкам', css: 'ct-new' },
  cases: { label: 'Кейсы', css: 'ct-case' },
  offtopic: { label: 'Оффтоп', css: 'ct-off' }
};
function fEsc(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function fDnaSuffix(dna) {
  if (dna === 'strategist' || dna === 'S') return 's';
  if (dna === 'communicator' || dna === 'C') return 'c';
  if (dna === 'creator' || dna === 'K') return 'r';
  if (dna === 'analyst' || dna === 'A') return 'a';
  return 's';
}
function fTimeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return m + ' мин';
  var h = Math.floor(m / 60);
  if (h < 24) return h + ' ч';
  var dd = Math.floor(h / 24);
  if (dd < 30) return dd + ' д';
  return Math.floor(dd / 30) + ' мес';
}
function fInitials(name) { return (name || '?')[0].toUpperCase(); }
function fEl(id, fn) { var el = document.getElementById(id); if (el) fn(el); }
function buildForumAv(author, size) {
  var suffix = fDnaSuffix(author.dna_type);
  var cls = 'forum-av forum-av-' + suffix;
  var fs = Math.round(size * 0.4);
  if (author.avatar_url) {
    return '<img class="' + cls + '" src="' + fEsc(author.avatar_url) + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;flex-shrink:0" alt="">';
  }
  return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fs + 'px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + fInitials(author.name) + '</div>';
}
window.FORUM_CATS = FORUM_CATS;
window.fEsc = fEsc;
window.fDnaSuffix = fDnaSuffix;
window.fTimeAgo = fTimeAgo;
window.fInitials = fInitials;
window.fEl = fEl;
window.buildForumAv = buildForumAv;
