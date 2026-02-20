// =======================================
// ОПРОСЫ В ПОСТАХ
// createPoll(), votePoll(), showPollResults()
// =======================================

(function() {

  var MIN_OPTIONS = 2, MAX_OPTIONS = 4;
  var SVG_PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var SVG_X = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // ===== СОЗДАНИЕ ОПРОСА (UI в модалке создания поста) =====

  window.createPoll = function(container) {
    if (!container) return null;

    var wrap = document.createElement('div');
    wrap.className = 'poll-builder';
    wrap.innerHTML =
      '<div class="poll-builder-head">Опрос</div>' +
      '<div class="poll-builder-list"></div>' +
      '<button class="poll-builder-add">' + SVG_PLUS + ' Добавить вариант</button>';
    container.appendChild(wrap);

    var list = wrap.querySelector('.poll-builder-list');
    var addBtn = wrap.querySelector('.poll-builder-add');

    addOption(list, 0);
    addOption(list, 1);
    updateAddBtn(list, addBtn);

    addBtn.addEventListener('click', function() {
      var count = list.querySelectorAll('.poll-builder-item').length;
      if (count >= MAX_OPTIONS) return;
      addOption(list, count);
      updateAddBtn(list, addBtn);
    });

    // Геттер данных для публикации
    return {
      getData: function() {
        var items = list.querySelectorAll('.poll-builder-input');
        var options = [];
        items.forEach(function(inp) {
          var text = inp.value.trim();
          if (text) options.push({ text: text, votes: 0 });
        });
        return options.length >= MIN_OPTIONS ? options : null;
      },
      destroy: function() { wrap.remove(); }
    };
  };

  function addOption(list, index) {
    var item = document.createElement('div');
    item.className = 'poll-builder-item';
    item.innerHTML =
      '<input class="poll-builder-input" type="text" placeholder="Вариант ' + (index + 1) + '" maxlength="80">' +
      '<button class="poll-builder-rm" title="Удалить">' + SVG_X + '</button>';

    item.querySelector('.poll-builder-rm').addEventListener('click', function() {
      if (list.querySelectorAll('.poll-builder-item').length <= MIN_OPTIONS) return;
      item.remove();
      reindexOptions(list);
      updateAddBtn(list, list.parentElement.querySelector('.poll-builder-add'));
    });

    list.appendChild(item);
  }

  function reindexOptions(list) {
    list.querySelectorAll('.poll-builder-input').forEach(function(inp, i) {
      inp.placeholder = 'Вариант ' + (i + 1);
    });
  }

  function updateAddBtn(list, btn) {
    btn.style.display = list.querySelectorAll('.poll-builder-item').length >= MAX_OPTIONS ? 'none' : '';
  }

  // ===== ГОЛОСОВАНИЕ =====

  window.votePoll = async function(postId, optionIndex) {
    if (!postId) return;

    var key = 'poll_voted_' + postId;
    if (localStorage.getItem(key)) {
      showPollResults(postId);
      return;
    }

    try {
      var resp = await sb.from('posts')
        .select('poll_options').eq('id', postId).single();
      if (!resp.data || !resp.data.poll_options) return;

      var opts = typeof resp.data.poll_options === 'string'
        ? JSON.parse(resp.data.poll_options) : resp.data.poll_options;
      if (!opts[optionIndex]) return;

      opts[optionIndex].votes = (opts[optionIndex].votes || 0) + 1;

      var upd = await sb.from('posts')
        .update({ poll_options: opts }).eq('id', postId);
      if (upd.error) throw upd.error;

      localStorage.setItem(key, String(optionIndex));
      renderPollUI(postId, opts, optionIndex);
    } catch (err) {
      console.error('votePoll error:', err);
    }
  };

  // ===== ПОКАЗАТЬ РЕЗУЛЬТАТЫ =====

  window.showPollResults = async function(postId) {
    if (!postId) return;
    try {
      var resp = await sb.from('posts')
        .select('poll_options').eq('id', postId).single();
      if (!resp.data || !resp.data.poll_options) return;

      var opts = typeof resp.data.poll_options === 'string'
        ? JSON.parse(resp.data.poll_options) : resp.data.poll_options;

      var votedIndex = localStorage.getItem('poll_voted_' + postId);
      renderPollUI(postId, opts, votedIndex !== null ? parseInt(votedIndex, 10) : -1);
    } catch (err) {
      console.error('showPollResults error:', err);
    }
  };

  // ===== РЕНДЕР UI ОПРОСА В КАРТОЧКЕ =====

  function renderPollUI(postId, opts, votedIndex) {
    var card = document.querySelector('[data-post-id="' + postId + '"]');
    if (!card) return;
    var pollWrap = card.querySelector('.poll-opts');
    if (!pollWrap) return;

    var totalV = 0;
    opts.forEach(function(o) { totalV += (o.votes || 0); });

    var html = '';
    opts.forEach(function(o, i) {
      var pct = totalV > 0 ? Math.round((o.votes || 0) / totalV * 100) : 0;
      var cls = 'poll-opt voted' + (i === votedIndex ? ' my-vote' : '');
      html +=
        '<div class="' + cls + '" data-option="' + i + '" data-post-id="' + postId + '">' +
          '<div class="poll-fill" style="width:' + pct + '%"></div>' +
          '<span class="poll-tx">' + escHtml(o.text || '') + '</span>' +
          '<span class="poll-pct">' + pct + '%</span>' +
        '</div>';
    });
    pollWrap.innerHTML = html;

    // Обновляем счётчик голосов
    var counter = pollWrap.nextElementSibling;
    if (counter && counter.style.fontSize === '12px') {
      counter.textContent = totalV + ' голосов';
    }
  }

  // ===== ДЕЛЕГИРОВАНИЕ КЛИКОВ ПО ОПРОСАМ =====

  document.addEventListener('click', function(e) {
    var opt = e.target.closest('.poll-opt');
    if (!opt || opt.classList.contains('voted')) return;

    var postId = opt.getAttribute('data-post-id');
    var optionIndex = parseInt(opt.getAttribute('data-option'), 10);
    if (postId && !isNaN(optionIndex)) {
      votePoll(postId, optionIndex);
    }
  });

})();
