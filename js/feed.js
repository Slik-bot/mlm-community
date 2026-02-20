// =======================================
// FEED — ЯДРО
// Модули:
// - feed-create.js — FAB, создание поста, фото
// - feed-interactions.js — реакции, share, меню
// - feed-data.js — загрузка постов из БД
// - feed-publish.js — публикация поста
// =======================================

// ===== IMPULSE =====
function toggleImpulse() { document.getElementById('impulseBar').classList.toggle('open'); }

// ===== FILTERS =====
function initFeedFilters() {
  var filterMap = {
    'Для вас': 'all',
    'Все': 'all',
    'Кейсы': 'cases',
    'Эксперты': 'experts',
    'Компании': 'companies',
    'Опросы': 'polls'
  };
  document.querySelectorAll('.filters .flt').forEach(function(btn) {
    var text = btn.textContent.trim();
    if (filterMap[text]) {
      btn.setAttribute('data-filter', filterMap[text]);
    }
  });
  document.querySelectorAll('.filters .flt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filters .flt').forEach(function(b) { b.classList.remove('on'); });
      btn.classList.add('on');
      var filter = btn.getAttribute('data-filter') || 'all';
      if (typeof loadFeedByFilter === 'function') {
        loadFeedByFilter(filter);
      }
    });
  });
}

// ===== POPOVERS (event delegation) =====
window.closePopovers = function() {
  document.querySelectorAll('.pop.show,.popover.show').forEach(function(p) { p.classList.remove('show','pop-up'); });
  document.querySelectorAll('.pop-open').forEach(function(c) { c.classList.remove('pop-open'); });
};
window.togglePopover = function(moreEl) {
  var pop = moreEl.querySelector('.pop');
  if (!pop) return;
  var wasOpen = pop.classList.contains('show');
  closePopovers();
  if (wasOpen) return;
  var rect = moreEl.getBoundingClientRect();
  var spaceBelow = window.innerHeight - rect.bottom;
  var spaceAbove = rect.top;
  if (spaceBelow < 250 && spaceAbove > spaceBelow) {
    pop.classList.add('pop-up');
  } else {
    pop.classList.remove('pop-up');
  }
  pop.classList.add('show');
  var card = moreEl.closest('.post-card');
  if (card) card.classList.add('pop-open');
};
document.addEventListener('click', function(e) {
  if (e.target.closest('.pop') || e.target.closest('.popover')) return;
  var moreBtn = e.target.closest('.post-more');
  if (moreBtn) {
    e.preventDefault();
    e.stopPropagation();
    togglePopover(moreBtn);
    return;
  }
  if (e.target.closest('.comp-sort-btn')) return;
  closePopovers();
}, true);

// ===== TOAST =====
function showToast(msg) {
  var old = document.getElementById('appToast');
  if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'appToast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:100px;background:rgba(16,16,26,.95);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.8);font-size:13px;font-weight:600;z-index:9999;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:cardIn .3s cubic-bezier(.16,1,.3,1);';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2000);
}

// ===== COMPANIES =====
function filterCompanies(el) {
  el.parentElement.querySelectorAll('.comp-flt').forEach(function(f) { f.classList.remove('on'); });
  el.classList.add('on');
}

function toggleSortMenu(el) {
  var pop = el.querySelector('.popover');
  var isOpen = pop.classList.contains('show');
  closePopovers();
  if (!isOpen) pop.classList.add('show');
}

// ===== INIT FEED =====
function initFeed() {
  initFeedFilters();
  var feedScroll = document.getElementById('feedScroll') || document.querySelector('.feed');
  if (feedScroll) feedScroll.addEventListener('scroll', closePopovers, { passive: true });

  var hdrAvatar = document.querySelector('#scrFeed .hdr-avatar');
  if (hdrAvatar) {
    hdrAvatar.removeAttribute('onclick');
    hdrAvatar.style.cssText += ';min-width:44px;min-height:44px;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative;z-index:100;';
    hdrAvatar.addEventListener('click', function(e) {
      e.stopPropagation();
      if (window.showProfileMenu) window.showProfileMenu();
    });
  }
}
window.initFeed = initFeed;

// ===== CLOSE POPOVER ON SCROLL (global) =====
window.addEventListener('scroll', closePopovers, { passive: true });
