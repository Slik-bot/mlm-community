// ═══════════════════════════════════════
// DEAL SCREEN — экран активной сделки
// Hero, эскроу, таймлайн, кнопки
// ═══════════════════════════════════════

let _dealData = null;
let _dealEvents = [];
let _dealMilestones = [];
let _dealTimerInterval = null;
let _dealRealtimeSub = null;

const DNA_CLASS_MAP = {
  strategist: 'dna-s', communicator: 'dna-c',
  creator: 'dna-k', analyst: 'dna-a'
};

const SVG_CHECK_SM = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

// ═══ init / destroy ═══

function initDealScreen() {
  const params = window._screenParams || {};
  const dealId = params.dealId || (window.currentDeal && window.currentDeal.id);
  if (!dealId) { goBack(); return; }
  loadDealScreenData(dealId);
}

function destroyDealScreen() {
  if (_dealTimerInterval) { clearInterval(_dealTimerInterval); _dealTimerInterval = null; }
  if (_dealRealtimeSub) { _dealRealtimeSub.unsubscribe(); _dealRealtimeSub = null; }
  _dealData = null;
}

// ═══ Загрузка данных ═══

async function loadDealScreenData(dealId) {
  const result = await loadDealApi(dealId);
  if (!result.deal) {
    showToast('Сделка не найдена');
    goBack();
    return;
  }

  _dealData = result.deal;
  _dealEvents = result.events;
  _dealMilestones = result.milestones;

  renderDealHero();
  renderDealProgress();
  renderEscrowCards();
  renderDealTimer();
  renderDealParties();
  renderRevisions();
  renderTimeline();
  renderDealScreenActions();
  subscribeDealRealtime(dealId);
}

// ═══ Hero блок ═══

function renderDealHero() {
  const el = document.getElementById('dealHero');
  if (!el || !_dealData) return;

  const st = DEAL_STATUS_MAP[_dealData.status] || { label: _dealData.status, color: '#fff' };
  const amountStr = (_dealData.amount || 0).toLocaleString('ru') + ' TF';

  el.innerHTML =
    '<div class="deal-hero-number">' + escHtml(_dealData.deal_number || '') + '</div>' +
    '<div class="deal-hero-title">' + escHtml(_dealData.title || 'Сделка') + '</div>' +
    '<div class="deal-status-badge" style="background:' + st.color + '20;color:' + st.color + '">' + st.label + '</div>' +
    '<div class="deal-hero-amount">' + amountStr + '</div>';
}

// ═══ Progress bar + milestone dots ═══

function renderDealProgress() {
  const el = document.getElementById('dealProg');
  if (!el) return;

  const statusOrder = ['pending', 'active', 'review', 'revision', 'completed'];
  const idx = statusOrder.indexOf(_dealData.status);
  const pct = idx >= 0 ? Math.round((idx / (statusOrder.length - 1)) * 100) : 0;
  const total = _dealMilestones.length || 5;

  let dotsHtml = '<div class="ms-dots">';
  for (let i = 0; i < total; i++) {
    const ms = _dealMilestones[i];
    let cls = '';
    if (ms && ms.status === 'completed') cls = 'done';
    else if (ms && ms.status === 'active') cls = 'current';
    else if (i === 0 && pct > 0) cls = 'done';
    dotsHtml += '<div class="ms-dot ' + cls + '"></div>';
  }
  dotsHtml += '</div>';

  el.innerHTML =
    '<div class="deal-prog-bar"><div class="deal-prog-fill" style="width:' + pct + '%"></div></div>' +
    dotsHtml;
}

// ═══ Escrow cards ═══

function renderEscrowCards() {
  const el = document.getElementById('dealEscCards');
  if (!el || !_dealData) return;

  const prepay = (_dealData.prepay_amount || 0).toLocaleString('ru') + ' TF';
  const escrow = (_dealData.escrow_amount || 0).toLocaleString('ru') + ' TF';
  const fee = (_dealData.platform_fee || 0).toLocaleString('ru') + ' TF';

  el.innerHTML =
    '<div class="esc-card gold"><div class="esc-card-label">Предоплата</div><div class="esc-card-value">' + prepay + '</div></div>' +
    '<div class="esc-card purple"><div class="esc-card-label">Эскроу</div><div class="esc-card-value">' + escrow + '</div></div>' +
    '<div class="esc-card"><div class="esc-card-label">Комиссия</div><div class="esc-card-value">' + fee + '</div></div>';
}

// ═══ Countdown timer ═══

function renderDealTimer() {
  const timerEl = document.getElementById('dealTimer');
  if (!timerEl) return;

  if (!_dealData.auto_accept_at || _dealData.status !== 'review') {
    timerEl.classList.add('hidden');
    if (_dealTimerInterval) { clearInterval(_dealTimerInterval); _dealTimerInterval = null; }
    return;
  }

  timerEl.classList.remove('hidden');
  const target = new Date(_dealData.auto_accept_at).getTime();

  function updateTimer() {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      document.getElementById('dealTimerValue').textContent = '00:00:00';
      clearInterval(_dealTimerInterval);
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('dealTimerValue').textContent =
      String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  updateTimer();
  _dealTimerInterval = setInterval(updateTimer, 1000);
}

// ═══ Стороны сделки ═══

function renderDealParties() {
  const el = document.getElementById('dealParties');
  if (!el || !_dealData) return;

  const client = _dealData.client || {};
  const executor = _dealData.executor || {};
  const broker = _dealData.broker;

  let html = buildPartyHtml(client, 'Заказчик') +
    '<div class="party-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>' +
    buildPartyHtml(executor, 'Исполнитель');

  if (broker) {
    html += '<div class="party-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>' +
      buildPartyHtml(broker, 'Брокер');
  }

  el.innerHTML = html;
}

function buildPartyHtml(user, role) {
  const dnaCls = DNA_CLASS_MAP[user.dna_type] || '';
  const ava = user.avatar_url
    ? '<img src="' + escHtml(user.avatar_url) + '" alt="">'
    : '<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:16px;color:rgba(255,255,255,0.4)">' + escHtml((user.name || '?')[0]) + '</div>';
  const verified = user.passport_verified ? '<span class="party-verified">' + SVG_CHECK_SM + '</span>' : '';

  return '<div class="deal-party">' +
    '<div class="party-av ' + dnaCls + '">' + ava + '</div>' +
    '<div class="party-role">' + role + '</div>' +
    '<div class="party-name">' + escHtml(user.name || '—') + verified + '</div></div>';
}

// ═══ Счётчик правок ═══

function renderRevisions() {
  const el = document.getElementById('dealRevisions');
  if (!el || !_dealData) return;

  const total = _dealData.revisions_total || 0;
  const used = _dealData.revisions_used || 0;
  if (total <= 0) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');
  let dotsHtml = '';
  for (let i = 0; i < total; i++) {
    dotsHtml += '<div class="rev-dot' + (i < used ? ' used' : '') + '"></div>';
  }

  el.innerHTML = '<div class="rev-label">Правки: ' + used + ' / ' + total + '</div>' +
    '<div class="rev-dots">' + dotsHtml + '</div>';
}

// ═══ Timeline событий ═══

function renderTimeline() {
  const el = document.getElementById('dealTimelineList');
  if (!el) return;

  if (!_dealEvents.length) {
    el.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:13px">Нет событий</div>';
    return;
  }

  el.innerHTML = _dealEvents.map(function(ev) {
    const actor = ev.actor || {};
    const time = new Date(ev.created_at).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return '<div class="tl-item">' +
      '<div class="tl-dot ' + (ev.event_type || '') + '"></div>' +
      '<div><div class="tl-text"><span class="tl-actor">' + escHtml(actor.name || 'Система') + '</span> — ' + escHtml(ev.description || '') + '</div>' +
      '<div class="tl-time">' + time + '</div></div></div>';
  }).join('');
}

// ═══ Кнопки действий (роль + статус) ═══

function renderDealScreenActions() {
  const el = document.getElementById('dealActions');
  if (!el || !_dealData) return;

  const user = getCurrentUser();
  if (!user) return;
  const isClient = _dealData.client_id === user.id;
  const isExecutor = _dealData.executor_id === user.id;
  let html = '';

  if (_dealData.status === 'review' && isClient) {
    html = '<button class="btn-accept" onclick="dealScreenAction(\'complete\')">Принять работу</button>' +
      '<button class="btn-revise" onclick="dealScreenAction(\'revision\')">Правки</button>' +
      '<button class="btn-dispute" onclick="dealScreenAction(\'dispute\')">Спор</button>';
  } else if (_dealData.status === 'active' && isExecutor) {
    html = '<button class="btn-submit" onclick="dealScreenAction(\'submit\')">Сдать работу</button>';
  } else if (_dealData.status === 'pending' && isExecutor) {
    html = '<button class="btn-accept" onclick="dealScreenAction(\'accept\')">Принять сделку</button>';
  } else if (_dealData.status === 'pending' && isClient) {
    html = '<button class="btn-dispute" onclick="dealScreenAction(\'cancel\')">Отменить</button>';
  } else if (_dealData.status === 'revision' && isExecutor) {
    html = '<button class="btn-submit" onclick="dealScreenAction(\'submit\')">Сдать доработку</button>';
  }

  el.innerHTML = html;
}

// ═══ Обработчик действий ═══

async function dealScreenAction(action) {
  if (!_dealData) return;
  const dealId = _dealData.id;
  let result;

  if (action === 'accept') {
    result = await acceptDealApi(dealId);
  } else if (action === 'submit') {
    result = await submitDealApi(dealId, '');
  } else if (action === 'complete') {
    result = await completeDealApi(dealId);
    if (result.success) {
      showPayoutModal();
      return;
    }
  } else if (action === 'revision') {
    result = await requestRevisionApi(dealId, '');
  } else if (action === 'dispute') {
    result = await openDisputeApi(dealId, '');
  } else if (action === 'cancel') {
    result = await window.sb.from('deals').update({ status: 'cancelled' }).eq('id', dealId);
    if (!result.error) result = { success: true };
  }

  if (result && result.error) {
    showToast(result.error);
    return;
  }

  showToast('Обновлено');
  loadDealScreenData(dealId);
}

// ═══ Payout Modal + конфетти ═══

function showPayoutModal() {
  const modal = document.getElementById('payoutModal');
  if (!modal || !_dealData) return;

  const net = _dealData.executor_net || (_dealData.amount - _dealData.platform_fee);
  document.getElementById('payoutAmount').textContent = net.toLocaleString('ru') + ' TF';

  const detail = 'Предоплата: ' + (_dealData.prepay_amount || 0).toLocaleString('ru') + ' TF\n' +
    'Эскроу: ' + (_dealData.escrow_amount || 0).toLocaleString('ru') + ' TF\n' +
    'Комиссия: ' + (_dealData.platform_fee || 0).toLocaleString('ru') + ' TF';
  document.getElementById('payoutDetail').textContent = detail;

  modal.classList.add('show');
  spawnConfetti();
}

function closePayoutModal() {
  const modal = document.getElementById('payoutModal');
  if (modal) modal.classList.remove('show');
}

function spawnConfetti() {
  const colors = ['#8b5cf6', '#fbbf24', '#22c55e', '#3b82f6', '#f43f5e', '#a78bfa'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (20 + Math.random() * 60) + 'vw';
    p.style.top = (10 + Math.random() * 20) + 'vh';
    p.style.setProperty('--cf-y', (200 + Math.random() * 300) + 'px');
    p.style.setProperty('--cf-x', (-100 + Math.random() * 200) + 'px');
    p.style.setProperty('--cf-r', (360 + Math.random() * 720) + 'deg');
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    document.body.appendChild(p);
    setTimeout(function(el) { el.remove(); }, 1600, p);
  }
}

// ═══ Realtime ═══

function subscribeDealRealtime(dealId) {
  if (_dealRealtimeSub) _dealRealtimeSub.unsubscribe();
  _dealRealtimeSub = window.sb
    .channel('deal-' + dealId)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'deals',
      filter: 'id=eq.' + dealId
    }, function() {
      loadDealScreenData(dealId);
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'deal_events',
      filter: 'deal_id=eq.' + dealId
    }, function() {
      loadDealScreenData(dealId);
    })
    .subscribe();
}

function dealScreenMenu() {
  showToast('Скоро: меню сделки');
}

// ═══ Экспорт ═══

window.initDealScreen = initDealScreen;
window.destroyDealScreen = destroyDealScreen;
window.dealScreenAction = dealScreenAction;
window.closePayoutModal = closePayoutModal;
window.dealScreenMenu = dealScreenMenu;
