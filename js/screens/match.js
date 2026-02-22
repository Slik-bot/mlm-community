// ===== MATCH SCREEN =====

let matchCandidates = [];
let currentMatchIndex = 0;
let isMatchAnimating = false;
let matchPartners = {};

const DNA_LABELS = {
  strategist: 'Стратег',
  communicator: 'Коммуникатор',
  creator: 'Креатор',
  analyst: 'Аналитик'
};

// ===== INIT =====

function initMatch() {
  const stack = document.getElementById('matchStack');
  if (stack) stack.innerHTML = '';
  const empty = document.getElementById('matchEmpty');
  if (empty) empty.classList.add('hidden');
  const actions = document.getElementById('matchActions');
  if (actions) actions.style.display = '';
  currentMatchIndex = 0;
  matchCandidates = [];
  loadMatchCandidates();
}

// ===== LOAD CANDIDATES =====

function loadMatchCandidates() {
  const sb = window.sb;
  if (!sb || !window.currentUser) {
    renderMatchStack();
    return;
  }

  sb.from('matches')
    .select('user_b_id')
    .eq('user_a_id', window.currentUser.id)
    .then(function(res) {
      const seen = [window.currentUser.id];
      if (res.data) {
        res.data.forEach(function(r) { seen.push(r.user_b_id); });
      }
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return sb.from('vw_public_profiles')
        .select('id, name, avatar_url, dna_type, level, bio, company_id')
        .not('id', 'in', '(' + seen.join(',') + ')')
        .gte('last_active_at', thirtyDaysAgo)
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
  const stack = document.getElementById('matchStack');
  const empty = document.getElementById('matchEmpty');
  const actions = document.getElementById('matchActions');
  if (!stack) return;

  stack.innerHTML = '';
  const remaining = matchCandidates.slice(currentMatchIndex);

  if (remaining.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (actions) actions.style.display = 'none';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (actions) actions.style.display = '';

  const count = Math.min(remaining.length, 3);
  for (let i = count - 1; i >= 0; i--) {
    const card = renderMatchCard(remaining[i], i);
    stack.appendChild(card);
  }
}

// ===== RENDER CARD =====

function renderMatchCard(user, index) {
  const card = document.createElement('div');
  card.className = 'match-card';
  card.setAttribute('data-index', index);
  card.style.zIndex = 10 - index;

  if (index === 1) {
    card.style.transform = 'scale(0.95) translateY(10px)';
  } else if (index === 2) {
    card.style.transform = 'scale(0.90) translateY(20px)';
  }

  const avatar = user.avatar_url || 'assets/default-avatar.png';
  const dna = user.dna_type || 'strategist';
  const dnaColor = window.DNA_COLORS[dna] || '#8b5cf6';
  const dnaLabel = DNA_LABELS[dna] || dna;
  let bio = user.bio || '';
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
  const stack = document.getElementById('matchStack');
  if (!stack) return;
  const top = stack.querySelector('.match-card[data-index="0"]');
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
  const stack = document.getElementById('matchStack');
  if (!stack) return;
  const top = stack.querySelector('.match-card[data-index="0"]');
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

// ===== GET OR CREATE DIRECT CONVERSATION =====

async function getOrCreateDirectChat(userAId, userBId) {
  const sb = window.sb;
  if (!sb) return null;

  try {
    const { data: myDirects, error: e1 } = await sb
      .from('conversations')
      .select('id, conversation_members!inner(user_id)')
      .eq('type', 'personal')
      .eq('conversation_members.user_id', userAId);

    if (e1) throw e1;

    if (myDirects && myDirects.length > 0) {
      const ids = myDirects.map(function(c) { return c.id; });
      const { data: shared, error: e2 } = await sb
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userBId)
        .in('conversation_id', ids)
        .limit(1);

      if (e2) throw e2;
      if (shared && shared.length > 0) return shared[0].conversation_id;
    }

    const { data: conv, error: e3 } = await sb
      .from('conversations')
      .insert({ type: 'personal' })
      .select('id')
      .single();

    if (e3) throw e3;

    const { error: e4 } = await sb
      .from('conversation_members')
      .insert([
        { conversation_id: conv.id, user_id: userAId },
        { conversation_id: conv.id, user_id: userBId }
      ]);

    if (e4) throw e4;
    return conv.id;
  } catch (err) {
    console.error('getOrCreateDirectChat error:', err);
    return null;
  }
}

// ===== PROCESS =====

async function processMatch(action) {
  const candidate = matchCandidates[currentMatchIndex];
  currentMatchIndex++;

  if (action === 'like' && candidate && window.sb && window.currentUser) {
    try {
      const sb = window.sb;
      const myId = window.currentUser.id;

      await sb.from('matches').insert({
        user_a_id: myId,
        user_b_id: candidate.id,
        user_a_action: 'like',
        status: 'pending'
      });

      const { data: mutual } = await sb.from('matches')
        .select('id')
        .eq('user_a_id', candidate.id)
        .eq('user_b_id', myId)
        .eq('user_a_action', 'like');

      if (mutual && mutual.length > 0) {
        const ts = new Date().toISOString();
        sb.from('matches')
          .update({ status: 'matched', matched_at: ts })
          .eq('user_a_id', myId)
          .eq('user_b_id', candidate.id);
        await sb.from('matches')
          .update({ user_b_action: 'like', status: 'matched', matched_at: ts })
          .eq('user_a_id', candidate.id)
          .eq('user_b_id', myId);

        const convId = await getOrCreateDirectChat(myId, candidate.id);
        showMatchModal(candidate, convId);
      }
    } catch (err) {
      console.error('processMatch error:', err);
    }
  }

  if (currentMatchIndex >= matchCandidates.length) {
    const empty = document.getElementById('matchEmpty');
    const actions = document.getElementById('matchActions');
    if (empty) empty.classList.remove('hidden');
    if (actions) actions.style.display = 'none';
  } else {
    renderMatchStack();
  }
}

// ===== MATCH MODAL =====

function showMatchModal(user, conversationId) {
  const existing = document.getElementById('matchModalOverlay');
  if (existing) existing.remove();

  const avatar = user.avatar_url || 'assets/default-avatar.png';
  const myAvatar = (window.currentUser && window.currentUser.avatar_url) || 'assets/default-avatar.png';

  const overlay = document.createElement('div');
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
      '<button class="btn-primary" id="matchWriteBtn">Написать</button>' +
      '<button class="btn-ghost" onclick="closeMatchModal()">Продолжить</button>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById('matchWriteBtn').onclick = function() {
    closeMatchModal();
    if (conversationId) {
      openChat(conversationId, { id: user.id, name: user.name, avatar_url: user.avatar_url, dna_type: user.dna_type });
    } else {
      goTo('scrChatList');
    }
  };

  setTimeout(function() { overlay.classList.add('active'); }, 10);
  setTimeout(function() { closeMatchModal(); }, 5000);
}

function closeMatchModal() {
  const overlay = document.getElementById('matchModalOverlay');
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
  const sb = window.sb;
  if (!sb || !window.currentUser) {
    renderMatchList([]);
    return;
  }

  sb.from('matches')
    .select('*, partner:vw_public_profiles!user_b_id(id, name, avatar_url, dna_type, level)')
    .eq('user_a_id', window.currentUser.id)
    .eq('status', 'matched')
    .order('matched_at', { ascending: false })
    .then(function(res) {
      renderMatchList(res.data || []);
    });
}

function renderMatchList(matches) {
  const list = document.getElementById('mlList');
  const empty = document.getElementById('mlEmpty');
  const count = document.getElementById('mlCount');
  if (!list) return;

  matchPartners = {};

  if (matches.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (count) count.textContent = '';
    return;
  }

  if (empty) empty.classList.add('hidden');
  if (count) count.textContent = matches.length + ' ' + pluralMatch(matches.length);

  list.innerHTML = matches.map(function(m) {
    const p = m.partner || {};
    matchPartners[p.id] = p;
    const avatar = p.avatar_url || 'assets/default-avatar.png';
    const dna = p.dna_type || 'strategist';
    const dnaColor = window.DNA_COLORS[dna] || '#8b5cf6';
    let bio = p.bio || '';
    if (bio.length > 50) bio = bio.substring(0, 50) + '...';

    return '<div class="ml-item">' +
      '<img class="ml-avatar" src="' + avatar + '" alt="">' +
      '<div class="ml-info">' +
        '<div class="ml-name">' + (p.name || 'Участник') + ' <span class="ml-dna-dot" style="background:' + dnaColor + '"></span></div>' +
        (bio ? '<div class="ml-bio">' + bio + '</div>' : '') +
      '</div>' +
      '<button class="ml-write-btn" onclick="matchWriteTo(\'' + p.id + '\')">Написать</button>' +
    '</div>';
  }).join('');
}

// ===== MATCH WRITE TO =====

async function matchWriteTo(partnerId) {
  if (!window.currentUser) return;
  const convId = await getOrCreateDirectChat(window.currentUser.id, partnerId);
  const partner = matchPartners[partnerId] || {};
  if (convId) {
    openChat(convId, partner);
  } else {
    goTo('scrChatList');
  }
}

function pluralMatch(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
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
window.matchWriteTo = matchWriteTo;
