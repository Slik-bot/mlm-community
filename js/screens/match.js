// ===== MATCH SCREEN =====

var matchCandidates = [];
var currentMatchIndex = 0;
var isMatchAnimating = false;

var DNA_COLORS = {
  strategist: '#3b82f6',
  communicator: '#22c55e',
  creator: '#f59e0b',
  analyst: '#a78bfa'
};

var DNA_LABELS = {
  strategist: 'Стратег',
  communicator: 'Коммуникатор',
  creator: 'Креатор',
  analyst: 'Аналитик'
};

// ===== INIT =====

function initMatch() {
  var stack = document.getElementById('matchStack');
  if (stack) stack.innerHTML = '';
  var empty = document.getElementById('matchEmpty');
  if (empty) empty.classList.add('hidden');
  var actions = document.getElementById('matchActions');
  if (actions) actions.style.display = '';
  currentMatchIndex = 0;
  matchCandidates = [];
  loadMatchCandidates();
}

// ===== LOAD CANDIDATES =====

function loadMatchCandidates() {
  var sb = window.supabase;
  if (!sb || !window.currentUser) {
    renderMatchStack();
    return;
  }

  sb.from('matches')
    .select('user2_id')
    .eq('user1_id', window.currentUser.id)
    .then(function(res) {
      var seen = [window.currentUser.id];
      if (res.data) {
        res.data.forEach(function(r) { seen.push(r.user2_id); });
      }
      return sb.from('users')
        .select('id, name, avatar_url, dna_type, level, bio, company')
        .not('id', 'in', '(' + seen.join(',') + ')')
        .eq('is_active', true)
        .limit(20);
    })
    .then(function(res) {
      matchCandidates = res.data || [];
      currentMatchIndex = 0;
      renderMatchStack();
    });
}

// ===== RENDER STACK =====

function renderMatchStack() {
  var stack = document.getElementById('matchStack');
  var empty = document.getElementById('matchEmpty');
  var actions = document.getElementById('matchActions');
  if (!stack) return;

  stack.innerHTML = '';
  var remaining = matchCandidates.slice(currentMatchIndex);

  if (remaining.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (actions) actions.style.display = 'none';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (actions) actions.style.display = '';

  var count = Math.min(remaining.length, 3);
  for (var i = count - 1; i >= 0; i--) {
    var card = renderMatchCard(remaining[i], i);
    stack.appendChild(card);
  }
}

// ===== RENDER CARD =====

function renderMatchCard(user, index) {
  var card = document.createElement('div');
  card.className = 'match-card';
  card.setAttribute('data-index', index);
  card.style.zIndex = 10 - index;

  if (index === 1) {
    card.style.transform = 'scale(0.95) translateY(10px)';
  } else if (index === 2) {
    card.style.transform = 'scale(0.90) translateY(20px)';
  }

  var avatar = user.avatar_url || 'assets/default-avatar.png';
  var dna = user.dna_type || 'strategist';
  var dnaColor = DNA_COLORS[dna] || '#8b5cf6';
  var dnaLabel = DNA_LABELS[dna] || dna;
  var bio = user.bio || '';
  if (bio.length > 80) bio = bio.substring(0, 80) + '...';

  card.innerHTML =
    '<img class="match-card-img" src="' + avatar + '" alt="">' +
    '<div class="match-card-gradient"></div>' +
    '<div class="match-card-info">' +
      '<div class="match-dna-badge" style="background:' + dnaColor + '20;color:' + dnaColor + ';border:1px solid ' + dnaColor + '40">' + dnaLabel + '</div>' +
      '<div class="match-card-name">' + (user.name || 'Участник') + '</div>' +
      '<div class="match-card-level">Уровень ' + (user.level || 1) + (user.company ? ' · ' + user.company : '') + '</div>' +
      (bio ? '<div class="match-card-bio">' + bio + '</div>' : '') +
    '</div>';

  return card;
}

// ===== LIKE =====

function matchLike() {
  if (isMatchAnimating) return;
  var stack = document.getElementById('matchStack');
  if (!stack) return;
  var top = stack.querySelector('.match-card[data-index="0"]');
  if (!top) return;

  isMatchAnimating = true;
  top.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  top.style.transform = 'translateX(120%) rotate(15deg)';
  top.style.opacity = '0';

  setTimeout(function() {
    processMatch('like');
    isMatchAnimating = false;
  }, 300);
}

// ===== SKIP =====

function matchSkip() {
  if (isMatchAnimating) return;
  var stack = document.getElementById('matchStack');
  if (!stack) return;
  var top = stack.querySelector('.match-card[data-index="0"]');
  if (!top) return;

  isMatchAnimating = true;
  top.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  top.style.transform = 'translateX(-120%) rotate(-15deg)';
  top.style.opacity = '0';

  setTimeout(function() {
    processMatch('skip');
    isMatchAnimating = false;
  }, 300);
}

// ===== PROCESS =====

function processMatch(action) {
  var candidate = matchCandidates[currentMatchIndex];
  currentMatchIndex++;

  if (action === 'like' && candidate && window.supabase && window.currentUser) {
    var sb = window.supabase;
    sb.from('matches').insert({
      user1_id: window.currentUser.id,
      user2_id: candidate.id,
      status: 'pending'
    }).then(function() {
      return sb.from('matches')
        .select('id')
        .eq('user1_id', candidate.id)
        .eq('user2_id', window.currentUser.id)
        .eq('status', 'pending');
    }).then(function(res) {
      if (res.data && res.data.length > 0) {
        sb.from('matches')
          .update({ status: 'matched', matched_at: new Date().toISOString() })
          .or('and(user1_id.eq.' + window.currentUser.id + ',user2_id.eq.' + candidate.id + '),and(user1_id.eq.' + candidate.id + ',user2_id.eq.' + window.currentUser.id + ')')
          .then(function() {
            showMatchModal(candidate);
          });
      }
    });
  }

  if (currentMatchIndex >= matchCandidates.length) {
    var empty = document.getElementById('matchEmpty');
    var actions = document.getElementById('matchActions');
    if (empty) empty.classList.remove('hidden');
    if (actions) actions.style.display = 'none';
  } else {
    renderMatchStack();
  }
}

// ===== MATCH MODAL =====

function showMatchModal(user) {
  var existing = document.getElementById('matchModalOverlay');
  if (existing) existing.remove();

  var avatar = user.avatar_url || 'assets/default-avatar.png';
  var myAvatar = (window.currentUser && window.currentUser.avatar_url) || 'assets/default-avatar.png';

  var overlay = document.createElement('div');
  overlay.className = 'match-modal';
  overlay.id = 'matchModalOverlay';
  overlay.innerHTML =
    '<div class="match-modal-title">Это мэтч!</div>' +
    '<div class="match-modal-subtitle">Вы понравились друг другу</div>' +
    '<div class="match-modal-avatars">' +
      '<img class="match-modal-avatar" src="' + myAvatar + '" alt="">' +
      '<img class="match-modal-avatar" src="' + avatar + '" alt="">' +
    '</div>' +
    '<div class="match-modal-name">' + (user.name || 'Участник') + '</div>' +
    '<div class="match-modal-btns">' +
      '<button class="btn-primary" onclick="closeMatchModal();goTo(\'scrChatList\')">Написать</button>' +
      '<button class="btn-ghost" onclick="closeMatchModal()">Продолжить</button>' +
    '</div>';

  document.body.appendChild(overlay);
  setTimeout(function() { overlay.classList.add('active'); }, 10);

  setTimeout(function() {
    closeMatchModal();
  }, 5000);
}

function closeMatchModal() {
  var overlay = document.getElementById('matchModalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(function() { overlay.remove(); }, 300);
  }
}

// ===== MATCH LIST =====

function initMatchList() {
  loadMatches();
}

function loadMatches() {
  var sb = window.supabase;
  if (!sb || !window.currentUser) {
    renderMatchList([]);
    return;
  }

  sb.from('matches')
    .select('*, partner:users!user2_id(id, name, avatar_url, dna_type, level, bio)')
    .eq('user1_id', window.currentUser.id)
    .eq('status', 'matched')
    .order('matched_at', { ascending: false })
    .then(function(res) {
      renderMatchList(res.data || []);
    });
}

function renderMatchList(matches) {
  var list = document.getElementById('mlList');
  var empty = document.getElementById('mlEmpty');
  var count = document.getElementById('mlCount');
  if (!list) return;

  if (matches.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (count) count.textContent = '';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (count) count.textContent = matches.length + ' ' + pluralMatch(matches.length);

  list.innerHTML = matches.map(function(m) {
    var p = m.partner || {};
    var avatar = p.avatar_url || 'assets/default-avatar.png';
    var dna = p.dna_type || 'strategist';
    var dnaColor = DNA_COLORS[dna] || '#8b5cf6';
    var bio = p.bio || '';
    if (bio.length > 50) bio = bio.substring(0, 50) + '...';

    return '<div class="ml-item">' +
      '<img class="ml-avatar" src="' + avatar + '" alt="">' +
      '<div class="ml-info">' +
        '<div class="ml-name">' + (p.name || 'Участник') + ' <span class="ml-dna-dot" style="background:' + dnaColor + '"></span></div>' +
        (bio ? '<div class="ml-bio">' + bio + '</div>' : '') +
      '</div>' +
      '<button class="ml-write-btn" onclick="goTo(\'scrChatList\')">Написать</button>' +
    '</div>';
  }).join('');
}

function pluralMatch(n) {
  var mod10 = n % 10;
  var mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'мэтч';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'мэтча';
  return 'мэтчей';
}

// ===== EXPORTS =====

window.initMatch = initMatch;
window.initMatchList = initMatchList;
window.matchLike = matchLike;
window.matchSkip = matchSkip;
window.closeMatchModal = closeMatchModal;
