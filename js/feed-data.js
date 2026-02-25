// ===== FEED DATA — ЗАГРУЗКА ЛЕНТЫ ИЗ БД, ПОСТЫ =====

(function() {

  // ===== ЗАГРУЗКА РЕАЛЬНОЙ ЛЕНТЫ =====

  window.initFeedFromDB = async function() {
    const _u = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!_u) return;

    await loadProfile();
    updateFeedHeader();
    loadWisdomCard();
    loadQuestsBar();
    loadFeedPosts();
  };

  function updateFeedHeader() {
    const _profile = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!_profile) return;

    const nameEl = document.querySelector('.fd-name, .hdr-name, #feedUserName');
    if (nameEl) nameEl.textContent = 'Привет, ' + (_profile.name || 'Участник') + '!';

    const dnaMap = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
    const lvlMap = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь' };
    const dnaBadge = document.querySelector('.fd-dna, .hdr-dna');
    if (dnaBadge && _profile.dna_type) {
      dnaBadge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ' + (dnaMap[_profile.dna_type] || '') + ' · ♟ ' + (lvlMap[_profile.level] || 'Пешка');
    }

    const xpEl = document.querySelector('.imp-xp-val');
    if (xpEl) xpEl.textContent = (_profile.xp_total || 0) + ' XP';

    loadStreakDisplay();
  }

  async function loadStreakDisplay() {
    const _u = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!_u) return;
    const result = await window.sb.from('users').select('streak_days').eq('id', _u.id).maybeSingle();
    if (!result.data) return;
    const streakEl = document.querySelector('.imp-streak-val');
    if (streakEl) {
      streakEl.innerHTML = result.data.streak_days + ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>';
    }
  }

  async function loadWisdomCard() {
    const result = await window.sb
      .from('wisdom_cards')
      .select('text, author')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!result.data) return;

    const textEl = document.querySelector('.wis-text');
    const authorEl = document.querySelector('.wis-author');
    if (textEl) textEl.textContent = '«' + result.data.text + '»';
    if (authorEl) authorEl.textContent = '— ' + (result.data.author || 'TRAFIQO');
  }

  async function fetchQuestsData(userId) {
    const questsResult = await window.sb
      .from('task_completions').select('*, tasks(*)')
      .eq('user_id', userId).order('taken_at', { ascending: false }).limit(5);
    const streakRes = await window.sb.from('users').select('streak_days').eq('id', userId).maybeSingle();
    return { quests: questsResult.data || [], streak: streakRes.data };
  }

  async function loadQuestsBar() {
    const _u = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!_u) return;
    try {
      const data = await fetchQuestsData(_u.id);
      const streakEl = document.querySelector('.imp-streak-val');
      if (streakEl && data.streak) streakEl.textContent = data.streak.streak_days || 0;

      const _profile = window.getCurrentUser ? window.getCurrentUser() : null;
      if (_profile) {
        const xpEl = document.querySelector('.imp-xp-val');
        const xpMaxEl = document.querySelector('.imp-xp-max');
        const lvlEl = document.querySelector('.imp-lvl');
        if (xpEl) xpEl.textContent = _profile.xp_total || 0;
        const levels = { pawn: 0, knight: 500, bishop: 2000, rook: 5000, queen: 15000 };
        const levelLabels = { pawn: 'Пешка', knight: 'Конь', bishop: 'Слон', rook: 'Ладья', queen: 'Ферзь' };
        const curLvl = _profile.level || 'pawn';
        const lvlNames = Object.keys(levels);
        const nextXP = levels[lvlNames[lvlNames.indexOf(curLvl) + 1]] || 20000;
        if (xpMaxEl) xpMaxEl.textContent = nextXP;
        if (lvlEl) lvlEl.textContent = levelLabels[curLvl] || 'Пешка';
        const progressBar = document.querySelector('.imp-bar-fill');
        if (progressBar) {
          const prevXP = levels[curLvl] || 0;
          const progress = ((_profile.xp_total || 0) - prevXP) / (nextXP - prevXP) * 100;
          progressBar.style.width = Math.min(progress, 100) + '%';
        }
      }

      const questsBox = document.querySelector('.imp-quests');
      if (questsBox && data.quests.length) {
        questsBox.innerHTML = data.quests.map(function(q) {
          return '<div class="q-item imp-quest' + (q.is_completed ? ' done' : '') + '"><div class="q-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><div class="q-text">' + (q.tasks ? q.tasks.title : '') + '</div><div class="q-xp">' + (q.is_completed ? '✓ ' : '') + '+' + (q.tasks ? q.tasks.xp_reward : 0) + '</div></div>';
        }).join('');
      }
    } catch (err) {
      console.error('Error loading quests bar:', err);
    }
  }

  // SVG-иконки (только нужные)
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

  function showSkeletons(count) {
    const feed = document.getElementById('feedScroll');
    if (!feed) return;
    for (let i = 0; i < count; i++) {
      const sk = document.createElement('div');
      sk.className = 'post-card skeleton-card';
      sk.innerHTML = '<div class="sk-top"><div class="sk-ava"></div><div class="sk-info"><div class="sk-line w60"></div><div class="sk-line w40"></div></div></div><div class="sk-body"><div class="sk-line w100"></div><div class="sk-line w80"></div><div class="sk-line w50"></div></div>';
      feed.appendChild(sk);
    }
  }

  function removeSkeletons() {
    document.querySelectorAll('.skeleton-card').forEach(function(s) { s.remove(); });
  }

  let currentFilter = 'all';

  async function loadFeedPosts(filter) {
    if (filter) currentFilter = filter;
    const feed = document.getElementById('feedScroll');
    if (!feed) return;

    feed.querySelectorAll('.post-card').forEach(function(p) { p.remove(); });
    showSkeletons(3);

    const postsResult = await loadPosts(currentFilter, 20);
    const posts = postsResult.data || [];
    removeSkeletons();

    if (!posts.length) {
      const empty = document.createElement('div');
      empty.className = 'post-card';
      empty.style.cssText = 'text-align:center;padding:32px 20px;color:rgba(255,255,255,.4);';
      let emptyText = 'Лента пока пуста';
      if (currentFilter === 'cases') emptyText = 'Кейсов пока нет';
      else if (currentFilter === 'polls') emptyText = 'Опросов пока нет';
      else if (currentFilter === 'experts') emptyText = 'Экспертных советов пока нет';
      else if (currentFilter === 'companies') emptyText = 'Новостей компаний пока нет';
      empty.innerHTML = '<div style="margin-bottom:8px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div style="font-size:14px">' + emptyText + '</div>';
      feed.appendChild(empty);
      return;
    }

    posts.forEach(function(post) {
      feed.appendChild(createPostElement(post));
    });

    // Инициализировать карусели после рендера
    initCarousels();
  }

  window.loadFeedByFilter = function(filter) {
    loadFeedPosts(filter);
  };

  const POST_DNA_NAMES = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
  const POST_DNA_CLASSES = { strategist: 'dna-blue', communicator: 'dna-green', creator: 'dna-orange', analyst: 'dna-purple' };
  const POST_DNA_DOTS = { strategist: '#3b82f6', communicator: '#22c55e', creator: '#f59e0b', analyst: '#a78bfa' };
  const POST_LEVEL_ICONS = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛' };

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

  function createPostElement(post) {
    const profile = post.author || {};
    const div = document.createElement('div');
    div.className = 'post-card';
    div.setAttribute('data-post-id', post.id);
    div.setAttribute('data-author-dna', profile.dna_type || '');
    div.innerHTML = buildPostAuthor(post, profile) + buildPostImages(post) + buildPostBody(post) + buildPostActions(post);
    return div;
  }

  window.handleLike = async function(postId, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const likeResult = await toggleLike(postId);
      const countEl = btn.querySelectorAll('span')[1];
      if (likeResult.liked) {
        btn.classList.add('liked');
        countEl.textContent = likeResult.likes_count;
        spawnParticles(btn);
      } else {
        btn.classList.remove('liked');
        countEl.textContent = likeResult.likes_count;
      }
    } catch (e) {
      console.error('Like error:', e);
    }
    btn.disabled = false;
  };

  window.handleBookmark = async function(postId, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const bmResult = await toggleBookmark(postId);
      if (bmResult.bookmarked) { btn.classList.add('saved'); } else { btn.classList.remove('saved'); }
    } catch (e) {
      console.error('Bookmark error:', e);
    }
    btn.disabled = false;
  };

  function spawnParticles(el) {
    const card = el.closest('.post-card');
    const authorDna = card ? card.getAttribute('data-author-dna') : '';
    const dnaPC = { strategist: '#3b82f6', communicator: '#22c55e', creator: '#f59e0b', analyst: '#a78bfa' };
    const pColor = dnaPC[authorDna] || '#f87171';
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div'); p.className = 'like-particle';
      p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = pColor;
      const a = i * 60 * Math.PI / 180, d = 20 + Math.random() * 15;
      p.style.setProperty('--tx', Math.cos(a) * d + 'px'); p.style.setProperty('--ty', Math.sin(a) * d + 'px');
      document.body.appendChild(p); setTimeout(function(el) { el.remove(); }, 600, p);
    }
  }


  // ===== СОЗДАНИЕ ПОСТА — см. feed-publish.js =====

  // Экспорт загрузки ленты для feed-publish.js
  window.loadFeed = loadFeedPosts;

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
  function fmtViews(n) { n = n || 0; if (n < 1000) return String(n); return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; }
  function escHtml(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>') : ''; }
  window.escHtml = escHtml;

  // ===== POLL VOTING =====
  document.addEventListener('click', function(e) {
    const opt = e.target.closest('.poll-opt:not(.voted)');
    if (!opt) return;
    const postId = opt.getAttribute('data-post-id');
    const allOpts = document.querySelectorAll('.poll-opt[data-post-id="' + postId + '"]');
    allOpts.forEach(function(o) { o.classList.add('voted'); });
    opt.style.borderColor = 'rgba(139,92,246,.3)';
  });

  // ===== CAROUSEL INIT (NATIVE SCROLL) =====
  function initCarousels() {
    const carousels = document.querySelectorAll('.post-carousel');
    if (!carousels.length) return;

    carousels.forEach(function(carousel) {
      if (carousel._carouselInit) return;
      try {
        const track = carousel.querySelector('.post-carousel-track');
        const dots = carousel.querySelectorAll('.post-carousel-dot');
        const total = carousel.querySelectorAll('.post-carousel-slide').length;
        let current = 0;

        if (!track || total === 0) return;

        function updateDots(index) {
          dots.forEach(function(d, i) {
            d.classList.toggle('post-carousel-dot--active', i === index);
          });
        }

        // Native scroll listener (debounced)
        let scrollTimer;
        track.addEventListener('scroll', function() {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(function() {
            const index = Math.round(track.scrollLeft / track.offsetWidth);
            if (index !== current && index >= 0 && index < total) {
              current = index;
              updateDots(index);
            }
          }, 50);
        }, { passive: true });

        // Dot clicks → smooth scroll
        dots.forEach(function(d, i) {
          d.addEventListener('click', function() {
            track.scrollTo({ left: i * track.offsetWidth, behavior: 'smooth' });
          });
        });

        carousel._carouselInit = true;
      } catch (err) {
        console.error('[CAROUSEL] Init error:', err);
      }
    });
  }

})();
