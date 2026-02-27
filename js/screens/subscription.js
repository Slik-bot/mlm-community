// ===== SUBSCRIPTION SCREEN — подписка, тарифы, покупка =====

const PURCHASE_SUB_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/purchase-subscription';

const PLAN_NAMES = { basic: 'PRO', pro: 'BUSINESS', vip: 'ACADEMY' };
const PLAN_PRICES = { basic: '599₽', pro: '1 490₽', vip: '2 990₽' };
const TARIFF_TO_PLAN = { pro: 'basic', business: 'pro', academy: 'vip' };
const TARIFF_RANK = { free: 0, pro: 1, business: 2, academy: 3 };

// ===== INIT =====

async function initSubscription() {
  const skeleton = document.getElementById('subSkeleton');
  const content = document.getElementById('subContent');
  if (skeleton) skeleton.classList.remove('hidden');
  if (content) content.classList.add('hidden');

  try {
    const data = await loadSubscriptionData();
    renderCurrentPlan(data.tariff, data.expiresAt);
    renderPlanCards(data.tariff);
    renderBalance(data.balance);
  } catch (err) {
    console.error('initSubscription error:', err);
    showToast('Ошибка загрузки подписки');
  }

  if (skeleton) skeleton.classList.add('hidden');
  if (content) content.classList.remove('hidden');
}

// ===== LOAD DATA =====

async function loadSubscriptionData() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return { tariff: 'free', balance: 0, expiresAt: null }; }

  const { data: userData, error: userErr } = await window.sb
    .from('users')
    .select('tariff, balance')
    .eq('id', user.id)
    .single();

  if (userErr) throw userErr;

  const { data: subData } = await window.sb
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();

  return {
    tariff: (userData && userData.tariff) || 'free',
    balance: (userData && userData.balance) || 0,
    expiresAt: subData ? subData.expires_at : null
  };
}

// ===== RENDER CURRENT PLAN =====

function renderCurrentPlan(tariff, expiresAt) {
  const nameEl = document.getElementById('subCurrentName');
  const expiresEl = document.getElementById('subCurrentExpires');

  if (nameEl) nameEl.textContent = tariff.toUpperCase();

  if (expiresEl) {
    if (expiresAt && tariff !== 'free') {
      const d = new Date(expiresAt);
      expiresEl.textContent = 'до ' + d.toLocaleDateString('ru-RU');
      expiresEl.classList.remove('hidden');
    } else {
      expiresEl.classList.add('hidden');
    }
  }
}

// ===== RENDER PLAN CARDS =====

function renderPlanCards(currentTariff) {
  const currentRank = TARIFF_RANK[currentTariff] || 0;
  const cards = [
    { el: 'subCardBasic', plan: 'basic', tariff: 'pro' },
    { el: 'subCardPro', plan: 'pro', tariff: 'business' },
    { el: 'subCardVip', plan: 'vip', tariff: 'academy' }
  ];

  cards.forEach(function(card) {
    const cardEl = document.getElementById(card.el);
    if (!cardEl) return;
    const btn = cardEl.querySelector('.subscription__buy-btn');
    const cardRank = TARIFF_RANK[card.tariff] || 0;

    cardEl.classList.remove('subscription__card--active');

    if (card.tariff === currentTariff) {
      cardEl.classList.add('subscription__card--active');
      if (btn) { btn.textContent = 'Активен'; btn.disabled = true; }
    } else if (cardRank < currentRank) {
      if (btn) { btn.textContent = 'Текущий тариф выше'; btn.disabled = true; }
    } else {
      if (btn) {
        btn.textContent = 'Купить ' + PLAN_NAMES[card.plan];
        btn.disabled = false;
      }
    }
  });
}

// ===== RENDER BALANCE =====

function renderBalance(balanceKopecks) {
  const el = document.getElementById('subBalance');
  if (!el) return;
  const rub = (balanceKopecks || 0) / 100;
  el.textContent = rub.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' руб.';
}

// ===== PURCHASE =====

async function purchaseSubscription(planType) {
  const user = getCurrentUser();
  if (!user) { showToast('Требуется авторизация'); return; }

  const name = PLAN_NAMES[planType];
  const price = PLAN_PRICES[planType];
  if (!name || !price) return;

  const confirmed = confirm('Купить ' + name + ' за ' + price + '/мес?');
  if (!confirmed) return;

  const btn = document.querySelector('.subscription__buy-btn[data-plan="' + planType + '"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Оплата...'; }

  try {
    const sessionResult = await window.sb.auth.getSession();
    const token = sessionResult.data.session ? sessionResult.data.session.access_token : '';

    const resp = await fetch(PURCHASE_SUB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ plan_type: planType })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      showToast('Подписка ' + data.tariff.toUpperCase() + ' активирована!');
      await initSubscription();
    } else {
      const msg = data.error === 'Недостаточно средств'
        ? 'Недостаточно средств на балансе'
        : (data.error || 'Ошибка оформления подписки');
      showToast(msg);
    }
  } catch (err) {
    console.error('purchaseSubscription error:', err);
    showToast('Ошибка сети');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Купить ' + name; }
}

// ===== EXPORTS =====

window.initSubscription = initSubscription;
window.purchaseSubscription = purchaseSubscription;
