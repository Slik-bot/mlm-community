// ─── my-dna.js ───────────────────────────────────
// Экран "Моё ДНК" — карточка + 3 таба
// Зависимости: dna.js, dna-card.js, profile.js,
//   gamification.js, supabase-client.js, users.js

(function() {
  'use strict';

  const DNA_KEY_MAP = {
    strategist: 'S', communicator: 'C',
    creator: 'K', analyst: 'A'
  };

  // ─── Загрузка данных ───────────────────

  async function loadMyDnaData() {
    const user = window.getCurrentUser();
    if (!user) return null;
    const result = await window.loadProfile(user.id);
    return result.data || null;
  }

  // ─── Карточка ──────────────────────────

  function renderMyDnaCard(user) {
    const wrap = document.getElementById('myDnaCardWrap');
    if (!wrap) return;

    const dnaKey = DNA_KEY_MAP[user.dna_type] || 'S';
    const typeData = window.DNA_TYPES[dnaKey];
    if (!typeData) return;

    const xp = user.xp_total || 0;
    const lvl = window.Gamification.getUserLevel(xp);
    const progress = window.Gamification.getLevelProgress(xp);

    window.applyDnaTheme(dnaKey);

    const stars = Array.from({ length: 5 }, function(_, i) {
      const cls = i < lvl.stars ? 'my-dna-star active' : 'my-dna-star';
      return '<span class="' + cls + '">\u2605</span>';
    }).join('');

    const pct = progress.needed > 0
      ? Math.min(100, Math.round((progress.current / progress.needed) * 100))
      : 100;

    wrap.innerHTML =
      '<div class="my-dna-card">' +
        '<div class="my-dna-figure">' +
          window.getChessIcon(lvl.level, typeData.color) +
        '</div>' +
        '<div class="my-dna-badge">' + lvl.label + '</div>' +
        '<div class="my-dna-stars">' + stars + '</div>' +
        '<div class="my-dna-type">' + typeData.name + '</div>' +
        '<div class="my-dna-desc">' + typeData.desc + '</div>' +
        '<div class="my-dna-xp">' +
          '<div class="my-dna-xp-header">' +
            '<span>XP</span>' +
            '<span>' + progress.current.toLocaleString() +
              ' / ' + progress.needed.toLocaleString() + '</span>' +
          '</div>' +
          '<div class="my-dna-xp-track">' +
            '<div class="my-dna-xp-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ─── Сильные стороны ───────────────────

  function renderMyStrengths(dnaKey) {
    const list = document.getElementById('myDnaStrengthsList');
    if (!list || list.children.length > 0) return;
    const data = window.DNA_EXTRA[dnaKey];
    if (!data) return;

    data.strengths.forEach(function(text) {
      const li = document.createElement('li');
      li.className = 'dnr-strength-item';
      li.textContent = text;
      list.appendChild(li);
    });
  }

  // ─── Задания ───────────────────────────

  function renderMyQuests(dnaKey) {
    const container = document.getElementById('myDnaQuestsList');
    if (!container || container.children.length > 0) return;
    const data = window.DNA_EXTRA[dnaKey];
    if (!data) return;

    data.quests.forEach(function(text) {
      const card = document.createElement('div');
      card.className = 'dnr-quest-item';
      const txt = document.createElement('span');
      txt.textContent = text;
      const btn = document.createElement('button');
      btn.className = 'dnr-quest-btn';
      btn.textContent = 'Взять';
      card.appendChild(txt);
      card.appendChild(btn);
      container.appendChild(card);
    });
  }

  // ─── Табы ───────────────────────────────

  function initMyDnaTabs(dnaKey) {
    const scr = document.getElementById('scrMyDna');
    const tabBar = scr ? scr.querySelector('.dnr-tabs') : null;
    if (!tabBar) return;

    const panels = {
      archetype: 'myDnaPanelArchetype',
      strengths: 'myDnaPanelStrengths',
      quests: 'myDnaPanelQuests'
    };

    tabBar.addEventListener('click', function(e) {
      const btn = e.target.closest('.dnr-tab');
      if (!btn) return;
      const tab = btn.dataset.tab;

      tabBar.querySelectorAll('.dnr-tab').forEach(function(t) {
        t.classList.remove('dnr-tab--active');
      });
      btn.classList.add('dnr-tab--active');

      Object.values(panels).forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('dnr-panel--active');
      });
      const panel = document.getElementById(panels[tab]);
      if (panel) panel.classList.add('dnr-panel--active');

      if (tab === 'strengths') renderMyStrengths(dnaKey);
      if (tab === 'quests') renderMyQuests(dnaKey);
    });
  }

  // ─── Init ──────────────────────────────

  async function initMyDna() {
    const wrap = document.getElementById('myDnaCardWrap');
    if (wrap) {
      wrap.innerHTML = '<div class="my-dna-loader">Загрузка...</div>';
    }

    try {
      const user = await loadMyDnaData();
      if (!user || !user.dna_type) {
        if (wrap) wrap.innerHTML = '<div class="my-dna-empty">ДНК-тест не пройден</div>';
        return;
      }

      const dnaKey = DNA_KEY_MAP[user.dna_type] || 'S';
      renderMyDnaCard(user);

      const archPanel = document.getElementById('myDnaPanelArchetype');
      const typeData = window.DNA_TYPES[dnaKey];
      if (archPanel && typeData) {
        archPanel.innerHTML =
          '<div class="dnr-arch-desc">' + typeData.desc + '</div>';
      }

      initMyDnaTabs(dnaKey);
    } catch (err) {
      console.error('initMyDna error:', err);
      if (wrap) wrap.innerHTML = '<div class="my-dna-empty">Ошибка загрузки</div>';
    }
  }

  window.initMyDna = initMyDna;
})();
