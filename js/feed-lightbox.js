// =======================================
// LIGHTBOX — PREMIUM IMAGE VIEWER
// Scroll-snap: swipe between all photos
// =======================================

let _lb = null;
let _lbImages = [];
let _lbIndex = 0;

// SVG icons
const LB_SVG_CLOSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const LB_SVG_DOWN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const LB_SVG_LEFT = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LB_SVG_RIGHT = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Open lightbox with scroll-snap navigation
 * @param {string|Array} urls — URL or array of URLs
 * @param {number} startIndex — starting index
 */
function openLightbox(urls, startIndex) {
  try {
    if (_lb) closeLightbox();

    if (typeof urls === 'string') urls = [urls];
    if (!urls || !urls.length) {
      console.error('[LIGHTBOX] No URLs provided');
      return;
    }

    _lbImages = urls;
    _lbIndex = startIndex || 0;

    const total = urls.length;
    const hasMultiple = total > 1;

    // Build ALL slides HTML
    let slidesHtml = '';
    for (let i = 0; i < total; i++) {
      slidesHtml += '<div class="lb-slide"><img class="lb-img" src="' + urls[i] + '" alt="" draggable="false"></div>';
    }

    // Build thumbs HTML
    let thumbsHtml = '';
    if (hasMultiple) {
      thumbsHtml = '<div class="lb-thumbs">';
      for (let t = 0; t < total; t++) {
        thumbsHtml += '<div class="lb-th' + (t === _lbIndex ? ' lb-th-on' : '') + '" data-i="' + t + '"><img src="' + urls[t] + '" alt=""></div>';
      }
      thumbsHtml += '</div>';
    }

    const el = document.createElement('div');
    el.className = 'lb';
    el.innerHTML =
      '<div class="lb-overlay"></div>' +
      '<div class="lb-hdr">' +
        '<button class="lb-btn lb-close" aria-label="Close">' + LB_SVG_CLOSE + '</button>' +
        (hasMultiple
          ? '<div class="lb-counter"><span class="lb-cur">' + (_lbIndex + 1) + '</span><span class="lb-sep">/</span><span class="lb-tot">' + total + '</span></div>'
          : '') +
        '<button class="lb-btn lb-download" aria-label="Download">' + LB_SVG_DOWN + '</button>' +
      '</div>' +
      '<div class="lb-stage">' +
        (hasMultiple ? '<button class="lb-arrow lb-arrow-l" aria-label="Previous">' + LB_SVG_LEFT + '</button>' : '') +
        '<div class="lb-track">' + slidesHtml + '</div>' +
        (hasMultiple ? '<button class="lb-arrow lb-arrow-r" aria-label="Next">' + LB_SVG_RIGHT + '</button>' : '') +
      '</div>' +
      thumbsHtml;

    document.body.appendChild(el);
    _lb = el;
    document.body.style.overflow = 'hidden';

    _lbBindEvents(el);

    // Scroll to start index (instant, before visibility animation)
    requestAnimationFrame(function() {
      const track = el.querySelector('.lb-track');
      if (track && _lbIndex > 0) {
        track.style.scrollBehavior = 'auto';
        track.scrollLeft = _lbIndex * track.offsetWidth;
        track.style.scrollBehavior = '';
      }
      el.classList.add('lb-visible');
    });
  } catch (err) {
    console.error('[LIGHTBOX] Open error:', err);
  }
}

/**
 * Bind all events
 */
function _lbBindEvents(el) {
  try {
    const close = el.querySelector('.lb-close');
    const overlay = el.querySelector('.lb-overlay');
    const download = el.querySelector('.lb-download');
    const arrowL = el.querySelector('.lb-arrow-l');
    const arrowR = el.querySelector('.lb-arrow-r');
    const track = el.querySelector('.lb-track');
    const thumbs = el.querySelectorAll('.lb-th');

    if (close) close.addEventListener('click', closeLightbox);
    if (overlay) overlay.addEventListener('click', closeLightbox);
    if (download) download.addEventListener('click', _lbDownload);
    if (arrowL) arrowL.addEventListener('click', function() { _lbNav(-1); });
    if (arrowR) arrowR.addEventListener('click', function() { _lbNav(1); });

    thumbs.forEach(function(th) {
      th.addEventListener('click', function() {
        _lbGoTo(parseInt(th.dataset.i));
      });
    });

    // Scroll listener — update counter + thumbs on native swipe
    if (track) {
      let scrollRaf = null;
      track.addEventListener('scroll', function() {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(function() {
          const w = track.offsetWidth;
          if (w === 0) return;
          const index = Math.round(track.scrollLeft / w);
          if (index !== _lbIndex && index >= 0 && index < _lbImages.length) {
            _lbIndex = index;
            _lbUpdateUI();
          }
        });
      }, { passive: true });
    }

    // Keyboard navigation
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') _lbNav(-1);
      if (e.key === 'ArrowRight') _lbNav(1);
    }
    document.addEventListener('keydown', onKey);
    el._onKey = onKey;

    // Drag-dismiss: swipe down to close
    const stageEl = el.querySelector('.lb-stage');
    if (stageEl && typeof window.addDragDismiss === 'function') {
      window.addDragDismiss(stageEl, {
        moveTarget: track,
        fadeTarget: el.querySelector('.lb-overlay'),
        threshold: 100,
        canStart: function(e) {
          if (e.target.closest('.lb-arrow')) return false;
          return true;
        },
        onDismiss: function() {
          closeLightbox();
        }
      });
    }
  } catch (err) {
    console.error('[LIGHTBOX] Bind events error:', err);
  }
}

/**
 * Navigate: -1 (prev) / +1 (next)
 */
function _lbNav(dir) {
  if (_lbImages.length <= 1) return;
  const next = _lbIndex + dir;
  if (next < 0 || next >= _lbImages.length) return;
  _lbGoTo(next);
}

/**
 * Go to specific image via scroll
 * @param {number} index — target image index
 */
function _lbGoTo(index) {
  try {
    if (index < 0 || index >= _lbImages.length) return;
    if (!_lb) return;

    const track = _lb.querySelector('.lb-track');
    if (!track) return;

    track.scrollTo({
      left: index * track.offsetWidth,
      behavior: 'smooth'
    });

    _lbIndex = index;
    _lbUpdateUI();
  } catch (err) {
    console.error('[LIGHTBOX] Navigate error:', err);
  }
}

/**
 * Update counter and thumbnails
 */
function _lbUpdateUI() {
  if (!_lb) return;

  const cur = _lb.querySelector('.lb-cur');
  if (cur) cur.textContent = _lbIndex + 1;

  const thumbs = _lb.querySelectorAll('.lb-th');
  thumbs.forEach(function(th, i) {
    th.classList.toggle('lb-th-on', i === _lbIndex);
  });

  // Scroll active thumbnail into view
  const activeTh = _lb.querySelector('.lb-th-on');
  if (activeTh) {
    activeTh.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/**
 * Download current image
 */
async function _lbDownload() {
  try {
    const url = _lbImages[_lbIndex];
    const resp = await fetch(url);
    const blob = await resp.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'image-' + (_lbIndex + 1) + '.jpg';
    link.click();
    URL.revokeObjectURL(link.href);

    if (typeof showToast === 'function') showToast('Saved');
  } catch (err) {
    console.error('[LIGHTBOX] Download error:', err);
    if (typeof showToast === 'function') showToast('Download error');
  }
}

/**
 * Close lightbox with cleanup
 */
function closeLightbox() {
  try {
    if (!_lb) return;

    const stage = _lb.querySelector('.lb-stage');
    if (stage && typeof window.removeDragDismiss === 'function') {
      window.removeDragDismiss(stage);
    }

    _lb.classList.remove('lb-visible');

    if (_lb._onKey) {
      document.removeEventListener('keydown', _lb._onKey);
    }

    const ref = _lb;
    setTimeout(function() {
      if (ref) ref.remove();
      document.body.style.overflow = '';
    }, 250);

    _lb = null;
    _lbImages = [];
    _lbIndex = 0;
  } catch (err) {
    console.error('[LIGHTBOX] Close error:', err);
  }
}

// Exports
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
