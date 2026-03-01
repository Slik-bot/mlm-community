// ===== FEED DATA — ЗАГРУЗКА ЛЕНТЫ ИЗ БД, ПОСТЫ =====

(function() {
  const escHtml = window.escHtml;

  // ===== ЗАГРУЗКА РЕАЛЬНОЙ ЛЕНТЫ =====

  window.initFeedFromDB = async function() {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!user) return;

    const profile = window._cachedProfile || user;
    updateFeedHeader(profile);
    Promise.all([
      loadWisdomCard(),
      loadQuestsBar(profile),
      loadFeedPosts(),
      loadStories(profile)
    ]);
  };

  function updateFeedHeader(profile) {
    if (!profile) return;

    const nameEl = document.querySelector('.fd-name, .hdr-name, #feedUserName');
    if (nameEl) nameEl.textContent = 'Привет, ' + (profile.name || 'Участник') + '!';

    const dnaMap = { strategist: 'Стратег', communicator: 'Коммуникатор', creator: 'Креатор', analyst: 'Аналитик' };
    const hdrLevel = window.Gamification.getUserLevel(profile.xp_total || 0);
    const dnaBadge = document.querySelector('.fd-dna, .hdr-dna');
    if (dnaBadge && profile.dna_type) {
      dnaBadge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ' + (dnaMap[profile.dna_type] || '') + ' · ♟ ' + hdrLevel.label;
    }

    const bal = profile.balance || 0;
    const balEl = document.getElementById('feedBalance');
    if (balEl) balEl.textContent = (bal / 100).toLocaleString('ru-RU') + ' ₽';

    const xpEl = document.querySelector('.imp-xp-val');
    if (xpEl) xpEl.textContent = (profile.xp_total || 0) + ' XP';

    const streakEl = document.querySelector('.imp-streak-val');
    if (streakEl) {
      streakEl.innerHTML = (profile.streak_days || 0) + ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>';
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

    const textEl = document.querySelector('.wisdom-text');
    const authorEl = document.querySelector('.wisdom-author');
    if (textEl) textEl.textContent = '«' + result.data.text + '»';
    if (authorEl) authorEl.textContent = '— ' + (result.data.author || 'TRAFIQO');
  }

  async function loadQuestsBar(profile) {
    if (!profile) return;
    try {
      const questsResult = await window.sb
        .from('task_completions').select('*, tasks(*)')
        .eq('user_id', profile.id).order('taken_at', { ascending: false }).limit(5);
      const quests = questsResult.data || [];

      const xpEl = document.querySelector('.imp-xp-val');
      const xpMaxEl = document.querySelector('.imp-xp-max');
      const lvlEl = document.querySelector('.imp-lvl');
      if (xpEl) xpEl.textContent = profile.xp_total || 0;
      const gLevel = window.Gamification.getUserLevel(profile.xp_total || 0);
      const gProgress = window.Gamification.getLevelProgress(profile.xp_total || 0);
      if (xpMaxEl) xpMaxEl.textContent = gLevel.xpNext || '∞';
      if (lvlEl) lvlEl.textContent = gLevel.label;
      const progressBar = document.querySelector('.imp-bar-fill');
      if (progressBar) {
        progressBar.style.width = gProgress.percent + '%';
      }

      const questsBox = document.querySelector('.imp-quests');
      if (questsBox && quests.length) {
        questsBox.innerHTML = quests.map(function(q) {
          return '<div class="q-item imp-quest' + (q.is_completed ? ' done' : '') + '"><div class="q-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><div class="q-text">' + (q.tasks ? q.tasks.title : '') + '</div><div class="q-xp">' + (q.is_completed ? '✓ ' : '') + '+' + (q.tasks ? q.tasks.xp_reward : 0) + '</div></div>';
        }).join('');
      }
    } catch (err) {
      console.error('Error loading quests bar:', err);
    }
  }

  // ===== STORIES — друзья из БД =====

  const STORY_DNA_CLS = { strategist: 'dna-blue', communicator: 'dna-green', creator: 'dna-orange', analyst: 'dna-purple' };

  async function fetchFriendsList(uid) {
    const [r1, r2] = await Promise.all([
      window.sb.from('friends')
        .select('friend:vw_public_profiles!user_b_id(id,name,avatar_url,dna_type)')
        .eq('user_a_id', uid).eq('status', 'accepted').limit(10),
      window.sb.from('friends')
        .select('friend:vw_public_profiles!user_a_id(id,name,avatar_url,dna_type)')
        .eq('user_b_id', uid).eq('status', 'accepted').limit(10)
    ]);
    return (r1.data || []).concat(r2.data || [])
      .map(function(f) { return f.friend; }).filter(Boolean).slice(0, 10);
  }

  async function fetchStoryUserIds(friendIds) {
    if (!friendIds.length) return [];
    const stRes = await window.sb.from('user_stories')
      .select('user_id')
      .in('user_id', friendIds)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());
    return (stRes.data || []).map(function(s) { return s.user_id; });
  }

  function renderStoryItems(row, friends, storyUserIds, profile, myHasStory) {
    row.querySelectorAll('.story-sk').forEach(function(s) { s.remove(); });
    if (myHasStory && profile) {
      const myDiv = document.createElement('div');
      myDiv.className = 'story';
      myDiv.onclick = function() {
        window._storyViewUserId = profile.id;
        window._storyViewProfile = { name: profile.name, avatar_url: profile.avatar_url };
        goTo('scrStoryViewer');
      };
      const myAva = profile.avatar_url
        ? '<img src="' + escHtml(profile.avatar_url) + '" alt="">' : escHtml((profile.name || '?')[0].toUpperCase());
      myDiv.innerHTML = '<div class="story-ring has-story"><div class="story-ava">' +
        myAva + '</div></div><div class="story-nm">Моя</div>';
      row.appendChild(myDiv);
    }
    friends.forEach(function(f) {
      const hasStory = storyUserIds.indexOf(f.id) !== -1;
      const cls = hasStory ? 'has-story' : (STORY_DNA_CLS[f.dna_type] || '');
      const nm = f.name || '?';
      const shortName = nm.length > 8 ? nm.substring(0, 8) + '\u2026' : nm;
      const avaHtml = f.avatar_url
        ? '<img src="' + escHtml(f.avatar_url) + '" alt="">'
        : escHtml(nm[0].toUpperCase());
      const div = document.createElement('div');
      div.className = 'story';
      div.onclick = function() {
        if (hasStory) {
          window._storyViewUserId = f.id;
          window._storyViewProfile = { name: f.name, avatar_url: f.avatar_url };
          goTo('scrStoryViewer');
        } else {
          goTo('scrProfile');
        }
      };
      div.innerHTML = '<div class="story-ring ' + cls + '"><div class="story-ava">' +
        avaHtml + '</div></div><div class="story-nm">' + escHtml(shortName) + '</div>';
      row.appendChild(div);
    });
  }

  async function loadStories(profile) {
    const row = document.getElementById('storiesRow');
    if (!row || !profile) return;
    for (let i = 0; i < 4; i++) {
      const sk = document.createElement('div');
      sk.className = 'story story-sk';
      sk.innerHTML = '<div class="story-ring"><div class="story-ava"></div></div><div class="story-nm">\u00a0\u00a0\u00a0\u00a0</div>';
      row.appendChild(sk);
    }
    try {
      const friends = await fetchFriendsList(profile.id);
      const friendIds = friends.map(function(f) { return f.id; });
      const myQ = window.sb.from('user_stories').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_active', true).gt('expires_at', new Date().toISOString());
      const [storyUserIds, myRes] = await Promise.all([fetchStoryUserIds(friendIds), myQ]);
      renderStoryItems(row, friends, storyUserIds, profile, (myRes.count || 0) > 0);
    } catch (err) {
      console.error('Stories load error:', err);
      row.querySelectorAll('.story-sk').forEach(function(s) { s.remove(); });
    }
  }

  // ═══════════════════════════════════════
  // РЕНДЕР ПОСТОВ — см. feed-render.js
  // ═══════════════════════════════════════

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
      feed.appendChild(window.createPostElement(post));
    });

    // Инициализировать карусели после рендера
    initCarousels();
  }

  window.loadFeedByFilter = function(filter) {
    loadFeedPosts(filter);
  };

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
