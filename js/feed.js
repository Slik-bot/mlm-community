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
  const filterMap = {
    'Для вас': 'all',
    'Все': 'all',
    'Кейсы': 'cases',
    'Эксперты': 'experts',
    'Компании': 'companies',
    'Опросы': 'polls'
  };
  document.querySelectorAll('.filters .flt').forEach(function(btn) {
    const text = btn.textContent.trim();
    if (filterMap[text]) {
      btn.setAttribute('data-filter', filterMap[text]);
    }
  });
  document.querySelectorAll('.filters .flt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filters .flt').forEach(function(b) { b.classList.remove('on'); });
      btn.classList.add('on');
      const filter = btn.getAttribute('data-filter') || 'all';
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
  const pop = moreEl.querySelector('.pop');
  if (!pop) return;
  const wasOpen = pop.classList.contains('show');
  closePopovers();
  if (wasOpen) return;
  const rect = moreEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  if (spaceBelow < 250 && spaceAbove > spaceBelow) {
    pop.classList.add('pop-up');
  } else {
    pop.classList.remove('pop-up');
  }
  pop.classList.add('show');
  const card = moreEl.closest('.post-card');
  if (card) card.classList.add('pop-open');
};
document.addEventListener('click', function(e) {
  if (e.target.closest('.pop') || e.target.closest('.popover')) return;
  const moreBtn = e.target.closest('.post-more');
  if (moreBtn) {
    e.preventDefault();
    e.stopPropagation();
    togglePopover(moreBtn);
    return;
  }
  if (e.target.closest('.comp-sort-btn')) return;
  closePopovers();
}, true);

// ===== COMPANIES =====
function filterCompanies(el) {
  el.parentElement.querySelectorAll('.comp-flt').forEach(function(f) { f.classList.remove('on'); });
  el.classList.add('on');
}

function toggleSortMenu(el) {
  const pop = el.querySelector('.popover');
  const isOpen = pop.classList.contains('show');
  closePopovers();
  if (!isOpen) pop.classList.add('show');
}

// ===== INIT FEED =====
function initFeed() {
  // Блокируем нативный pull-to-refresh в Telegram/мобильных браузерах
  if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    if (window.Telegram.WebApp.disableVerticalSwipes) window.Telegram.WebApp.disableVerticalSwipes();
    window.Telegram.WebApp.expand();
  }
  document.body.style.overscrollBehavior = 'none';

  initFeedFilters();
  const feedScroll = document.getElementById('feedScroll') || document.querySelector('.feed');
  if (feedScroll) feedScroll.addEventListener('scroll', closePopovers, { passive: true });

  const hdrAvatar = document.querySelector('#scrFeed .hdr-avatar');
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
