// ===== DEAL SCREENS — список, создание, детали =====

let currentDeal = null;
let currentDealTab = 'client';
let currentDealFilter = 'all';
let allDeals = [];

const PROCESS_DEAL_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/process-deal-payment';
const ACCEPT_DEAL_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/accept-deal';

const DEAL_STATUSES = {
  pending: { label: 'Ожидает', color: '#f59e0b' },
  accepted: { label: 'Принята', color: '#3b82f6' },
  paid: { label: 'Оплачена', color: '#8b5cf6' },
  in_progress: { label: 'В работе', color: '#22c55e' },
  submitted: { label: 'На проверке', color: '#f59e0b' },
  revision: { label: 'На доработке', color: '#ef4444' },
  completed: { label: 'Завершена', color: '#22c55e' },
  disputed: { label: 'Спор', color: '#ef4444' },
  cancelled: { label: 'Отменена', color: 'rgba(255,255,255,0.3)' }
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'paid', 'in_progress', 'submitted', 'revision'];
const COMPLETED_STATUSES = ['completed', 'disputed', 'cancelled'];

// ===== DEAL LIST =====

function initDealList() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }
  currentDealTab = 'client';
  currentDealFilter = 'all';
  updateDealTabsUI();
  updateDealFilterUI();
  loadDeals();
}

async function loadDeals() {
  const user = getCurrentUser();
  if (!user) return;

  const roleField = currentDealTab === 'client' ? 'client_id' : 'executor_id';
  const query = window.sb.from('deals')
    .select('*, client:users!client_id(id,name,avatar_url), executor:users!executor_id(id,name,avatar_url)')
    .eq(roleField, user.id)
    .order('created_at', { ascending: false });

  const result = await query;
  allDeals = result.data || [];
  applyDealFilter();
}

function applyDealFilter() {
  let filtered = allDeals;
  if (currentDealFilter === 'active') {
    filtered = allDeals.filter(function(d) { return ACTIVE_STATUSES.indexOf(d.status) !== -1; });
  } else if (currentDealFilter === 'completed') {
    filtered = allDeals.filter(function(d) { return COMPLETED_STATUSES.indexOf(d.status) !== -1; });
  }
  renderDealList(filtered);
}

function renderDealList(deals) {
  const listEl = document.getElementById('dealList');
  const emptyEl = document.getElementById('dealEmpty');
  if (!listEl) return;

  if (!deals || deals.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = deals.map(function(d) {
    const st = DEAL_STATUSES[d.status] || { label: d.status, color: 'rgba(255,255,255,0.3)' };
    const total = d.total ? (d.total / 100).toLocaleString('ru-RU') : '0';
    const deadline = d.deadline_at ? new Date(d.deadline_at).toLocaleDateString('ru-RU') : '';
    const otherUser = currentDealTab === 'client' ? d.executor : d.client;
    const otherAvatar = otherUser && otherUser.avatar_url ? otherUser.avatar_url : '';
    const otherName = otherUser ? otherUser.name : '—';

    return '<div class="deal-card" onclick="openDeal(\'' + d.id + '\')">' +
      '<div class="deal-card-header">' +
        '<div class="deal-card-title">' + escHtml(d.title) + '</div>' +
        '<div class="deal-status-badge" style="background:' + st.color + '20;color:' + st.color + '">' + st.label + '</div>' +
      '</div>' +
      '<div class="deal-card-footer">' +
        '<div class="deal-amount">' + total + ' руб.</div>' +
        (deadline ? '<div class="deal-deadline">' + deadline + '</div>' : '') +
      '</div>' +
      '<div class="deal-card-user">' +
        (otherAvatar ? '<img class="deal-card-avatar" src="' + otherAvatar + '" alt="">' : '<div class="deal-card-avatar-empty"></div>') +
        '<span class="deal-card-name">' + escHtml(otherName) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function switchDealTab(tab) {
  currentDealTab = tab;
  updateDealTabsUI();
  loadDeals();
}

function updateDealTabsUI() {
  const tabs = document.querySelectorAll('.deal-tab');
  tabs.forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === currentDealTab);
  });
}

function filterDeals(filter) {
  currentDealFilter = filter;
  updateDealFilterUI();
  applyDealFilter();
}

function updateDealFilterUI() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(function(p) {
    p.classList.toggle('active', p.getAttribute('data-filter') === currentDealFilter);
  });
}

// ===== DEAL CREATE — см. deal-create-new.js =====

// ===== DEAL DETAIL =====

function openDeal(dealId) {
  currentDeal = allDeals.find(function(d) { return d.id === dealId; });
  if (!currentDeal) return;
  goTo('scrDealDetail');
}

function initDealDetail() {
  if (!currentDeal) { goBack(); return; }

  const titleEl = document.getElementById('dealDetailTitle');
  if (titleEl) titleEl.textContent = currentDeal.title || 'Сделка';

  renderDealStatus(currentDeal.status);

  const total = currentDeal.total ? (currentDeal.total / 100) : 0;
  const prepay = currentDeal.prepayment ? (currentDeal.prepayment / 100) : 0;
  const fee = currentDeal.platform_fee ? (currentDeal.platform_fee / 100) : 0;

  setTextById('dealFinanceTotal', total.toLocaleString('ru-RU') + ' руб.');
  setTextById('dealFinancePrepay', prepay.toLocaleString('ru-RU') + ' руб.');
  setTextById('dealFinanceFee', fee.toLocaleString('ru-RU') + ' руб.');
  setTextById('dealDescText', currentDeal.description || 'Без описания');

  const client = currentDeal.client;
  const executor = currentDeal.executor;
  setTextById('dealClientName', client ? client.name : '—');
  setTextById('dealExecutorName', executor ? executor.name : 'Не назначен');
  setImgById('dealClientAvatar', client && client.avatar_url ? client.avatar_url : '');
  setImgById('dealExecutorAvatar', executor && executor.avatar_url ? executor.avatar_url : '');

  renderDealActions(currentDeal);
}

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setImgById(id, src) {
  const el = document.getElementById(id);
  if (el) el.src = src;
}

function renderDealStatus(status) {
  const badge = document.getElementById('dealStatusBadge');
  if (!badge) return;
  const st = DEAL_STATUSES[status] || { label: status, color: 'rgba(255,255,255,0.3)' };
  badge.textContent = st.label;
  badge.style.background = st.color + '20';
  badge.style.color = st.color;
}

function renderDealActions(deal) {
  const actionsEl = document.getElementById('dealActions');
  if (!actionsEl) return;
  const user = getCurrentUser();
  if (!user) return;

  const isClient = deal.client_id === user.id;
  const isExecutor = deal.executor_id === user.id;
  let html = '';

  if (deal.status === 'pending' && isClient) {
    html = '<button class="btn-secondary" onclick="dealAction(\'cancel\')">Отменить</button>';
  } else if (deal.status === 'pending' && isExecutor) {
    html = '<button class="btn-primary" onclick="dealAction(\'accept\')">Принять</button>' +
           '<button class="btn-secondary" onclick="dealAction(\'cancel\')">Отклонить</button>';
  } else if (deal.status === 'accepted' && isClient) {
    html = '<button class="btn-primary" onclick="dealAction(\'pay\')">Оплатить предоплату</button>';
  } else if (deal.status === 'in_progress' && isExecutor) {
    html = '<button class="btn-primary" onclick="dealAction(\'submit\')">Сдать работу</button>';
  } else if (deal.status === 'submitted' && isClient) {
    html = '<button class="btn-primary" onclick="dealAction(\'approve\')">Принять работу</button>' +
           '<button class="btn-secondary" onclick="dealAction(\'revision\')">Доработка</button>';
  }

  actionsEl.innerHTML = html;
}

async function dealAction(action) {
  if (!currentDeal) return;

  // accept — через accept-deal EF
  if (action === 'accept') {
    await acceptDealViaEF();
    return;
  }

  // pay — через process-deal-payment EF
  if (action === 'pay') {
    await dealActionViaEF(action);
    return;
  }

  // Остальные действия — прямой update
  const statusMap = {
    cancel: 'cancelled',
    submit: 'submitted',
    approve: 'completed',
    revision: 'revision'
  };
  const newStatus = statusMap[action];
  if (!newStatus) return;

  const result = await window.sb.from('deals')
    .update({ status: newStatus })
    .eq('id', currentDeal.id);

  if (result.error) {
    showToast('Ошибка обновления');
    return;
  }
  currentDeal.status = newStatus;
  renderDealStatus(newStatus);
  renderDealActions(currentDeal);
  showToast('Статус обновлён');
}

async function acceptDealViaEF() {
  const sessionResult = await window.sb.auth.getSession();
  const token = sessionResult.data.session ? sessionResult.data.session.access_token : '';

  try {
    const resp = await fetch(ACCEPT_DEAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ deal_id: currentDeal.id })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      currentDeal.status = 'accepted';
      renderDealStatus('accepted');
      renderDealActions(currentDeal);
      showToast('Сделка принята');
    } else {
      showToast(data.error || 'Ошибка принятия');
    }
  } catch (e) {
    showToast('Ошибка сети');
  }
}

async function dealActionViaEF(action) {
  const sessionResult = await window.sb.auth.getSession();
  const token = sessionResult.data.session ? sessionResult.data.session.access_token : '';

  try {
    const resp = await fetch(PROCESS_DEAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        deal_id: currentDeal.id,
        action: action
      })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      currentDeal.status = 'paid';
      renderDealStatus('paid');
      renderDealActions(currentDeal);
      showToast('Оплата проведена');
    } else {
      showToast(data.error || 'Ошибка обработки');
    }
  } catch (e) {
    showToast('Ошибка сети');
  }
}

// ===== EXPORTS =====

window.initDealList = initDealList;
window.initDealDetail = initDealDetail;
window.switchDealTab = switchDealTab;
window.filterDeals = filterDeals;
window.dealAction = dealAction;
window.openDeal = openDeal;
