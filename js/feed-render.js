// ═══════════════════════════════════════
// FEED RENDER — Рендеринг карточек постов
// Отделено от feed-data.js
// ═══════════════════════════════════════

(function() {
  const escHtml = window.escHtml;

  // SVG-иконки
  const SVG_DOTS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
  const SVG_HEART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const SVG_CMT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  const SVG_SHARE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
  const SVG_SAVE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  const SVG_EDIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'; const SVG_COPY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
  const SVG_LINK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>'; const SVG_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
  const SVG_HIDE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>'; const SVG_WARN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  function buildPostImages(post) {
    // Множественные фото
    if (post.images && post.images.length > 0) {
      const count = post.images.length;
      const urlsArr = '[' + post.images.map(function(u) {
        return "'" + escHtml(u).replace(/'/g, "\\'") + "'";
      }).join(',') + ']';

      // 5-10 фото → карусель
      if (count >= 5) {
        const cid = 'carousel-' + post.id;
        let html = '<div class="post-carousel" id="' + cid + '" data-count="' + count + '">';
        html += '<div class="post-carousel-track">';
        for (let i = 0; i < count; i++) {
          const url = escHtml(post.images[i]);
          html += '<div class="post-carousel-slide"><img class="post-carousel-img" src="' + url + '" alt="" loading="lazy" onclick="openLightbox(' + urlsArr + ',' + i + ')"></div>';
        }
        html += '</div>';
        html += '<div class="post-carousel-dots">';
        for (let d = 0; d < count; d++) {
          html += '<span class="post-carousel-dot' + (d === 0 ? ' post-carousel-dot--active' : '') + '"></span>';
        }
        html += '</div>';
        html += '</div>';
        return html;
      }

      // 1-4 фото → сетка
      let html = '<div class="post-gallery post-gallery-' + count + '">';
      for (let i = 0; i < count; i++) {
        const url = escHtml(post.images[i]);
        html += '<img class="post-gal-img" src="' + url + '" alt="" loading="lazy" onclick="openLightbox(' + urlsArr + ',' + i + ')">';
      }
      html += '</div>';
      return html;
    }
    // Одиночное фото (обратная совместимость)
    if (post.image_url) {
      return '<div class="post-media" onclick="openLightbox(\'' + escHtml(post.image_url).replace(/'/g, "\\'") + '\')"><img src="' + escHtml(post.image_url) + '" alt="" onload="this.classList.add(\'loaded\')"></div>';
    }
    return '';
  }

  const POST_DNA_NAMES = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
  const POST_DNA_CLASSES = { strategist: 'dna-blue', communicator: 'dna-green', creator: 'dna-orange', analyst: 'dna-purple' };
  const POST_DNA_DOTS = { strategist: '#3b82f6', communicator: '#22c55e', creator: '#f59e0b', analyst: '#a78bfa' };
  const POST_LEVEL_ICONS = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛' };

  function fmtViews(n) { n = n || 0; if (n < 1000) return String(n); return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; }

  function buildPostAuthor(post, profile) {
    let typeBadge = '';
    if (post.type === 'case') typeBadge = '<span class="post-tag t-case">Кейс</span>';
    else if (post.type === 'poll') typeBadge = '<span class="post-tag t-poll">Опрос</span>';
    else if (post.type === 'tip') typeBadge = '<span class="post-tag t-expert">Совет</span>';
    else if (post.type === 'announcement') typeBadge = '<span class="post-tag t-announce">Объявление</span>';
    const ringCls = 'post-ava-ring' + (POST_DNA_CLASSES[profile.dna_type] ? ' ' + POST_DNA_CLASSES[profile.dna_type] : '');
    const avaContent = profile.avatar_url
      ? '<img src="' + escHtml(profile.avatar_url) + '" alt="">'
      : '<span style="font-size:15px">' + escHtml((profile.name || '?')[0]) + '</span>';
    const verBadge = profile.is_verified ? '<span class="post-badge">' + SVG_CHECK + '</span>' : '';
    const levelIcon = POST_LEVEL_ICONS[profile.level] || '♟';
    const dotColor = POST_DNA_DOTS[profile.dna_type] || 'rgba(255,255,255,.15)';
    const cu = getCurrentUser(); const isOwn = cu && post.author_id === cu.id, pid = post.id;
    const popHtml = isOwn ? '<div class="pop-i" onclick="editPost(\'' + pid + '\')">' + SVG_EDIT + ' Редактировать</div><div class="pop-i" onclick="copyPostText(\'' + pid + '\')">' + SVG_COPY + ' Копировать текст</div><div class="pop-i" onclick="copyPostLink(\'' + pid + '\')">' + SVG_LINK + ' Копировать ссылку</div><div class="pop-d"></div><div class="pop-i dng" onclick="deletePost(\'' + pid + '\')">' + SVG_TRASH + ' Удалить</div>'
      : '<div class="pop-i" onclick="closePopovers();handleBookmark(\'' + pid + '\',this.closest(\'.post-card\').querySelector(\'.r-btn:last-child\'))">' + SVG_SAVE + ' Сохранить</div><div class="pop-i" onclick="copyPostText(\'' + pid + '\')">' + SVG_COPY + ' Копировать текст</div><div class="pop-i" onclick="copyPostLink(\'' + pid + '\')">' + SVG_LINK + ' Копировать ссылку</div><div class="pop-d"></div><div class="pop-i" onclick="hidePost(\'' + pid + '\')">' + SVG_HIDE + ' Скрыть</div><div class="pop-i dng" onclick="reportPost(\'' + pid + '\')">' + SVG_WARN + ' Пожаловаться</div>';
    return '<div class="post-top"><div class="' + ringCls + '"><div class="post-ava">' + avaContent + '</div></div>' +
      '<div class="post-info"><div class="post-name">' + escHtml(profile.name || 'Участник') + ' ' + verBadge + ' ' + typeBadge + '</div>' +
      '<div class="post-meta">' + sbFormatDate(post.created_at) + ' · ' + levelIcon + ' · <span class="dna-dot" style="background:' + dotColor + '"></span> ' + (POST_DNA_NAMES[profile.dna_type] || '') + '</div></div>' +
      '<div class="post-more">' + SVG_DOTS + '<div class="pop">' + popHtml + '</div></div></div>';
  }

  function buildPostBody(post) {
    let bodyHtml = escHtml(post.content || ''), bodyAttr = '';
    if (bodyHtml.length > 200) { bodyAttr = ' data-full="' + bodyHtml.replace(/"/g, '&quot;') + '"'; bodyHtml = bodyHtml.substring(0, 200) + '... <span class="more-text" onclick="expandPost(this)">Ещё</span>'; }
    bodyHtml = bodyHtml.replace(/#([a-zA-Zа-яА-ЯёЁ0-9_]+)/g, '<span class="hashtag">#$1</span>');
    let caseHtml = '';
    if (post.type === 'case' && post.case_data) {
      try {
        const cd = typeof post.case_data === 'string' ? JSON.parse(post.case_data) : post.case_data;
        caseHtml = '<div class="case-row"><div class="case-bl case-was"><div class="case-lb">БЫЛО</div><div class="case-num">' + escHtml(String(cd.was || '0')) + '</div><div class="case-desc">' + escHtml(cd.was_desc || '') + '</div></div>' +
          '<div class="case-bl case-now"><div class="case-lb">СТАЛО</div><div class="case-num">' + escHtml(String(cd.now || '0')) + '</div><div class="case-desc">' + escHtml(cd.now_desc || '') + '</div></div></div>';
      } catch(e) {}
    }
    let pollHtml = '';
    if (post.type === 'poll' && post.poll_data) {
      try {
        const opts = typeof post.poll_data === 'string' ? JSON.parse(post.poll_data) : post.poll_data;
        if (opts && opts.length) {
          let totalV = 0; opts.forEach(function(o) { totalV += (o.votes || 0); });
          pollHtml = '<div class="poll-opts">';
          opts.forEach(function(o, i) {
            const pct = totalV > 0 ? Math.round((o.votes || 0) / totalV * 100) : 0;
            pollHtml += '<div class="poll-opt" data-option="' + i + '" data-post-id="' + post.id + '"><div class="poll-fill" style="width:' + pct + '%"></div><span class="poll-tx">' + escHtml(o.text || '') + '</span><span class="poll-pct">' + pct + '%</span></div>';
          });
          pollHtml += '</div><div style="padding:0 16px 8px;font-size:12px;color:rgba(255,255,255,.2)">' + totalV + ' голосов</div>';
        }
      } catch(e) {}
    }
    return '<div class="post-body"' + bodyAttr + '>' + bodyHtml + '</div>' + caseHtml + pollHtml;
  }

  function buildPostActions(post) {
    return '<div class="post-react">' +
      '<div class="r-btn" onclick="handleLike(\'' + post.id + '\',this)"><span class="r-icon">' + SVG_HEART + '</span><span class="r-n">' + (post.likes_count || 0) + '</span></div>' +
      '<div class="r-btn" onclick="handleComment(\'' + post.id + '\')"><span class="r-icon">' + SVG_CMT + '</span><span class="r-n">' + (post.comments_count || 0) + '</span></div>' +
      '<div class="r-btn" onclick="showShareSheet(\'' + post.id + '\')"><span class="r-icon">' + SVG_SHARE + '</span></div>' +
      '<div class="r-spacer"></div>' +
      '<div class="r-views">' + fmtViews(post.views_count) + '</div>' +
      '<div class="r-btn" onclick="handleBookmark(\'' + post.id + '\',this)"><span class="r-icon">' + SVG_SAVE + '</span></div></div>';
  }

  function buildDealBadge(post) {
    let html = '';
    if (post.post_subtype === 'service_offer') {
      html += '<div style="padding:8px 16px"><button style="width:100%;padding:10px;border-radius:10px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;cursor:pointer" onclick="event.stopPropagation();goTo(\'scrDealCreate\',{executorId:\'' + post.author_id + '\'})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Предложить сделку</button></div>';
    }
    if (post.broker_reward_tf > 0) {
      html += '<div style="padding:0 16px 8px"><span style="display:inline-block;padding:4px 10px;border-radius:8px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);color:#fbbf24;font-size:12px;font-weight:600"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Брокеру: ' + post.broker_reward_tf.toLocaleString('ru') + ' TF</span></div>';
    }
    return html;
  }

  function createPostElement(post) {
    const profile = post.author || {};
    const div = document.createElement('div');
    div.className = 'post-card';
    div.setAttribute('data-post-id', post.id);
    div.setAttribute('data-author-dna', profile.dna_type || '');
    div.innerHTML = buildPostAuthor(post, profile) + buildPostImages(post) + buildPostBody(post) + buildDealBadge(post) + buildPostActions(post);
    return div;
  }

  window.expandPost = function(el) {
    const card = el.closest('.post-card'); if (!card) return;
    const body = el.closest('.post-body'), fullText = body ? body.getAttribute('data-full') : '';
    const authorName = card.querySelector('.post-name') ? card.querySelector('.post-name').textContent : '';
    const old = document.getElementById('postModal'); if (old) old.remove();
    const modal = document.createElement('div'); modal.id = 'postModal'; modal.className = 'post-modal';
    modal.innerHTML = '<div class="post-modal-overlay" onclick="closePostModal()"></div><div class="post-modal-content"><div class="post-modal-header"><span class="post-modal-title">' + escHtml(authorName) + '</span><span class="post-modal-close" onclick="closePostModal()">✕</span></div><div class="post-modal-body">' + fullText + '</div></div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add('show'); });
  };
  window.closePostModal = function() { const m = document.getElementById('postModal'); if (m) { m.classList.remove('show'); setTimeout(function() { m.remove(); }, 300); } };

  // ЭКСПОРТЫ
  window.createPostElement = createPostElement;
})();
