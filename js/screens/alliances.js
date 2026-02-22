// ===== ALLIANCES SCREEN — список альянсов =====

let allAlliances = [];

// ===== ALLIANCES LIST =====

function initAlliances() {
  loadAlliances();
}

async function loadAlliances() {
  try {
    const result = await window.sb.from('alliances')
      .select('*, leader:users!alliances_leader_id_fkey(id, name, avatar_url, dna_type, level), members:alliance_members(user_id)')
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    allAlliances = result.data || [];
    renderAlliancesList(allAlliances);
  } catch (err) {
    console.error('Load alliances error:', err);
    if (window.showToast) showToast('Ошибка загрузки альянсов');
  }
}

function renderAlliancesList(alliances) {
  const list = document.getElementById('alList');
  const empty = document.getElementById('alEmpty');
  if (!list) return;

  if (!alliances.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  const myId = window.currentUser ? window.currentUser.id : null;

  list.innerHTML = alliances.map(function(a) {
    const leader = a.leader || {};
    const memberCount = a.members ? a.members.length : 0;
    const isMember = myId && a.members && a.members.some(function(m) { return m.user_id === myId; });
    const isLeader = myId && a.leader_id === myId;
    const dnaColor = leader.dna_type && window.getDnaColor ? window.getDnaColor(leader.dna_type) : '#8b5cf6';

    let actionHtml = '';
    if (isLeader) {
      actionHtml = '<span class="al-card-role">Лидер</span>';
    } else if (isMember) {
      actionHtml = '<button class="al-card-btn al-card-btn--leave" onclick="event.stopPropagation();allianceLeave(\'' + a.id + '\')">Выйти</button>';
    } else {
      actionHtml = '<button class="al-card-btn al-card-btn--join" onclick="event.stopPropagation();allianceJoin(\'' + a.id + '\')">Вступить</button>';
    }

    return '<div class="al-card glass-card">' +
      '<div class="al-card-top">' +
        '<div class="al-card-logo" style="border-color:' + dnaColor + '40">' +
          (a.logo_url
            ? '<img src="' + a.logo_url + '" alt="">'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="' + dnaColor + '" stroke-width="1.5" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>') +
        '</div>' +
        '<div class="al-card-info">' +
          '<div class="al-card-name">' + escHtml(a.name) + '</div>' +
          '<div class="al-card-leader">' +
            '<img class="al-card-leader-ava" src="' + (leader.avatar_url || 'assets/default-avatar.svg') + '" alt="">' +
            '<span>' + escHtml(leader.name || 'Лидер') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="al-card-desc">' + escHtml(a.description || '') + '</div>' +
      '<div class="al-card-footer">' +
        '<span class="al-card-members">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ' +
          memberCount + ' участников' +
        '</span>' +
        actionHtml +
      '</div>' +
    '</div>';
  }).join('');
}

async function allianceJoin(allianceId) {
  if (!window.currentUser) return;

  try {
    const result = await window.sb.from('alliance_members').insert({
      alliance_id: allianceId,
      user_id: window.currentUser.id,
      role: 'member'
    });

    if (result.error) throw result.error;
    if (window.showToast) showToast('Вы вступили в альянс!');
    loadAlliances();
  } catch (err) {
    console.error('Alliance join error:', err);
    if (window.showToast) showToast('Ошибка вступления');
  }
}

async function allianceLeave(allianceId) {
  if (!window.currentUser) return;

  try {
    const result = await window.sb.from('alliance_members')
      .delete()
      .eq('alliance_id', allianceId)
      .eq('user_id', window.currentUser.id);

    if (result.error) throw result.error;
    if (window.showToast) showToast('Вы покинули альянс');
    loadAlliances();
  } catch (err) {
    console.error('Alliance leave error:', err);
    if (window.showToast) showToast('Ошибка выхода');
  }
}

// ===== EXPORTS =====
window.initAlliances = initAlliances;
window.allianceJoin = allianceJoin;
window.allianceLeave = allianceLeave;
