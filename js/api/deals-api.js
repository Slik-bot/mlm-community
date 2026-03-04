// ═══════════════════════════════════════
// DEALS API — бизнес-логика сделок
// Только данные и расчёты, без UI
// ═══════════════════════════════════════

const EDGE_BASE = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1';

const BROKER_LEVELS = [
  { name: 'Стартер',  min: 0,   max: 5,   feePct: 20 },
  { name: 'Активный', min: 6,   max: 20,  feePct: 17 },
  { name: 'Профи',    min: 21,  max: 50,  feePct: 15 },
  { name: 'Эксперт',  min: 51,  max: 100, feePct: 12 },
  { name: 'Мастер',   min: 101, max: 200, feePct: 10 },
  { name: 'Легенда',  min: 201, max: Infinity, feePct: 7 }
];

const DEAL_STATUS_MAP = {
  draft:     { label: 'Черновик',    color: 'rgba(255,255,255,0.3)' },
  pending:   { label: 'Ожидает',     color: '#f59e0b' },
  active:    { label: 'В работе',    color: '#3b82f6' },
  review:    { label: 'На проверке', color: '#8b5cf6' },
  revision:  { label: 'Доработка',   color: '#f59e0b' },
  completed: { label: 'Завершена',   color: '#22c55e' },
  disputed:  { label: 'Спор',        color: '#f43f5e' },
  cancelled: { label: 'Отменена',    color: 'rgba(255,255,255,0.3)' }
};

// ═══ Расчёт разбивки сделки ═══
// Предоплата 50%, эскроу = остаток, платформа feePct%

function calcDealSplit(amount, brokerPct, feePct) {
  const fee = feePct || 20;
  const platformFee = Math.round(amount * fee / 100);
  const prepay = Math.round(amount * 50 / 100);
  const escrow = amount - prepay - platformFee;
  const executorTotal = prepay + escrow;
  const brokerFee = brokerPct ? Math.round(executorTotal * brokerPct / 100) : 0;
  const executorNet = executorTotal - brokerFee;

  return {
    amount: amount,
    platformFee: platformFee,
    prepay: prepay,
    escrow: escrow,
    executorTotal: executorTotal,
    brokerFee: brokerFee,
    brokerPct: brokerPct || 0,
    executorNet: executorNet,
    feePct: fee
  };
}

// ═══ Уровень брокера по количеству сделок ═══

function getBrokerLevel(dealsCount) {
  const count = dealsCount || 0;
  for (let i = 0; i < BROKER_LEVELS.length; i++) {
    if (count >= BROKER_LEVELS[i].min && count <= BROKER_LEVELS[i].max) {
      return BROKER_LEVELS[i];
    }
  }
  return BROKER_LEVELS[0];
}

// ═══ Токен авторизации для Edge Functions ═══

async function getAuthToken() {
  const res = await window.sb.auth.getSession();
  return (res.data.session && res.data.session.access_token) || '';
}

// ═══ Список сделок пользователя ═══

async function loadDealsApi(filters) {
  const user = getCurrentUser();
  if (!user) return { data: [], error: 'Нет авторизации' };

  try {
    let query = window.sb.from('deals')
      .select('*, client:users!client_id(id,name,avatar_url,dna_type,passport_verified), executor:users!executor_id(id,name,avatar_url,dna_type,passport_verified), broker:users!broker_id(id,name,avatar_url,dna_type)')
      .or('client_id.eq.' + user.id + ',executor_id.eq.' + user.id + ',broker_id.eq.' + user.id)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (filters && filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [] };
  } catch (err) {
    console.error('[loadDealsApi]', err);
    return { data: [], error: err.message };
  }
}

// ═══ Одна сделка с событиями и этапами ═══

async function loadDealApi(dealId) {
  try {
    const [dealRes, eventsRes, msRes] = await Promise.all([
      window.sb.from('deals')
        .select('*, client:users!client_id(id,name,avatar_url,dna_type,passport_verified), executor:users!executor_id(id,name,avatar_url,dna_type,passport_verified), broker:users!broker_id(id,name,avatar_url,dna_type,passport_verified)')
        .eq('id', dealId)
        .single(),
      window.sb.from('deal_events')
        .select('*, actor:users!actor_id(id,name,avatar_url)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true }),
      window.sb.from('deal_milestones')
        .select('*')
        .eq('deal_id', dealId)
        .order('sort_order', { ascending: true })
    ]);

    if (dealRes.error) throw dealRes.error;
    return {
      deal: dealRes.data,
      events: eventsRes.data || [],
      milestones: msRes.data || []
    };
  } catch (err) {
    console.error('[loadDealApi]', err);
    return { deal: null, events: [], milestones: [], error: err.message };
  }
}

// ═══ Создать сделку + conversation + events ═══

async function createDealApi(params) {
  const user = getCurrentUser();
  if (!user) return { error: 'Нет авторизации' };

  try {
    const now = new Date();
    const dealNumber = 'DEAL-' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(Math.floor(Math.random() * 9000) + 1000);

    const feePct = params.feePct || 20;
    const split = calcDealSplit(params.amount, params.brokerPct || 0, feePct);

    const dealData = {
      deal_number: dealNumber,
      client_id: user.id,
      executor_id: params.executorId,
      broker_id: params.brokerId || null,
      deal_type: params.brokerId ? 'broker' : 'direct',
      title: params.title,
      description: params.description || '',
      category: params.category || 'other',
      amount: split.amount,
      prepay_amount: split.prepay,
      escrow_amount: split.escrow,
      platform_fee: split.platformFee,
      broker_fee: split.brokerFee,
      broker_pct: split.brokerPct,
      executor_net: split.executorNet,
      status: 'pending',
      revisions_total: params.revisionsTotal || 3,
      revisions_used: 0,
      deadline: params.deadline || null,
      client_signed: true,
      executor_signed: false,
      broker_signed: params.brokerId ? false : null
    };

    const { data: deal, error: dealErr } = await window.sb
      .from('deals').insert(dealData).select('id').single();
    if (dealErr) throw dealErr;

    // Conversation для сделки
    const { data: conv } = await window.sb
      .from('conversations')
      .insert({ type: 'deal', deal_id: deal.id })
      .select('id').single();

    if (conv) {
      await window.sb.from('deals')
        .update({ conversation_id: conv.id }).eq('id', deal.id);

      const members = [
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: params.executorId }
      ];
      if (params.brokerId) {
        members.push({ conversation_id: conv.id, user_id: params.brokerId });
      }
      await window.sb.from('conversation_participants').insert(members);
    }

    // Milestones
    if (params.milestones && params.milestones.length) {
      const msData = params.milestones.map(function(m, i) {
        return {
          deal_id: deal.id,
          title: m.title,
          deadline: m.deadline || null,
          pct: m.pct || Math.round(100 / params.milestones.length),
          status: 'pending',
          sort_order: i
        };
      });
      await window.sb.from('deal_milestones').insert(msData);
    }

    // Событие создания
    await window.sb.from('deal_events').insert({
      deal_id: deal.id,
      event_type: 'created',
      actor_id: user.id,
      description: 'Сделка создана',
      amount_tf: split.amount
    });

    return { dealId: deal.id, dealNumber: dealNumber };
  } catch (err) {
    console.error('[createDealApi]', err);
    return { error: err.message };
  }
}

// ═══ Подписать договор ═══

async function signDealApi(dealId, role) {
  const user = getCurrentUser();
  if (!user) return { error: 'Нет авторизации' };

  try {
    const update = {};
    update[role + '_signed'] = true;

    const { error } = await window.sb.from('deals')
      .update(update).eq('id', dealId);
    if (error) throw error;

    const { data: deal } = await window.sb.from('deals')
      .select('client_signed, executor_signed, broker_signed, broker_id')
      .eq('id', dealId).single();

    if (deal) {
      const allSigned = deal.client_signed && deal.executor_signed &&
        (!deal.broker_id || deal.broker_signed);
      if (allSigned) {
        await window.sb.from('deals')
          .update({ contract_signed_at: new Date().toISOString() })
          .eq('id', dealId);
      }
    }

    await window.sb.from('deal_events').insert({
      deal_id: dealId, event_type: 'signed',
      actor_id: user.id, description: 'Договор подписан'
    });

    return { success: true };
  } catch (err) {
    console.error('[signDealApi]', err);
    return { error: err.message };
  }
}

// ═══ Исполнитель принимает сделку ═══

async function acceptDealApi(dealId) {
  try {
    const token = await getAuthToken();
    const resp = await fetch(EDGE_BASE + '/accept-deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ deal_id: dealId })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) return { error: data.error || 'Ошибка принятия' };

    const user = getCurrentUser();
    if (user) {
      await window.sb.from('deal_events').insert({
        deal_id: dealId, event_type: 'accepted',
        actor_id: user.id, description: 'Сделка принята исполнителем'
      });
    }
    return { success: true };
  } catch (err) {
    console.error('[acceptDealApi]', err);
    return { error: err.message };
  }
}

// ═══ Сдать работу ═══

async function submitDealApi(dealId, note) {
  const user = getCurrentUser();
  if (!user) return { error: 'Нет авторизации' };
  try {
    const { error } = await window.sb.from('deals')
      .update({ status: 'review' }).eq('id', dealId);
    if (error) throw error;

    await window.sb.from('deal_events').insert({
      deal_id: dealId, event_type: 'submitted',
      actor_id: user.id, description: note || 'Работа сдана на проверку'
    });
    return { success: true };
  } catch (err) {
    console.error('[submitDealApi]', err);
    return { error: err.message };
  }
}

// ═══ Заказчик принимает работу, завершение ═══

async function completeDealApi(dealId) {
  try {
    const token = await getAuthToken();
    const resp = await fetch(EDGE_BASE + '/process-deal-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ deal_id: dealId, action: 'complete' })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) return { error: data.error || 'Ошибка завершения' };

    await window.sb.from('deals').update({
      status: 'completed', escrow_released: true,
      completed_at: new Date().toISOString()
    }).eq('id', dealId);

    const user = getCurrentUser();
    if (user) {
      await window.sb.from('deal_events').insert({
        deal_id: dealId, event_type: 'completed',
        actor_id: user.id, description: 'Сделка завершена, эскроу выплачен'
      });
    }
    return { success: true };
  } catch (err) {
    console.error('[completeDealApi]', err);
    return { error: err.message };
  }
}

// ═══ Запросить правки ═══

async function requestRevisionApi(dealId, comment) {
  const user = getCurrentUser();
  if (!user) return { error: 'Нет авторизации' };
  try {
    const { data: deal } = await window.sb.from('deals')
      .select('revisions_used, revisions_total')
      .eq('id', dealId).single();
    if (!deal) return { error: 'Сделка не найдена' };
    if (deal.revisions_total > 0 && deal.revisions_used >= deal.revisions_total) {
      return { error: 'Лимит правок исчерпан' };
    }

    const { error } = await window.sb.from('deals').update({
      status: 'revision',
      revisions_used: (deal.revisions_used || 0) + 1
    }).eq('id', dealId);
    if (error) throw error;

    await window.sb.from('deal_events').insert({
      deal_id: dealId, event_type: 'revision',
      actor_id: user.id, description: comment || 'Запрошена доработка'
    });
    return { success: true, revisionsUsed: (deal.revisions_used || 0) + 1 };
  } catch (err) {
    console.error('[requestRevisionApi]', err);
    return { error: err.message };
  }
}

// ═══ Открыть спор ═══

async function openDisputeApi(dealId, reason) {
  const user = getCurrentUser();
  if (!user) return { error: 'Нет авторизации' };
  try {
    const { error } = await window.sb.from('deals').update({
      status: 'disputed',
      disputed_at: new Date().toISOString(),
      dispute_reason: reason || ''
    }).eq('id', dealId);
    if (error) throw error;

    await window.sb.from('deal_events').insert({
      deal_id: dealId, event_type: 'disputed',
      actor_id: user.id, description: reason || 'Открыт спор по сделке'
    });
    return { success: true };
  } catch (err) {
    console.error('[openDisputeApi]', err);
    return { error: err.message };
  }
}

// ═══ Экспорт ═══

window.BROKER_LEVELS = BROKER_LEVELS;
window.DEAL_STATUS_MAP = DEAL_STATUS_MAP;
window.calcDealSplit = calcDealSplit;
window.getBrokerLevel = getBrokerLevel;
window.loadDealsApi = loadDealsApi;
window.loadDealApi = loadDealApi;
window.createDealApi = createDealApi;
window.signDealApi = signDealApi;
window.acceptDealApi = acceptDealApi;
window.submitDealApi = submitDealApi;
window.completeDealApi = completeDealApi;
window.requestRevisionApi = requestRevisionApi;
window.openDisputeApi = openDisputeApi;
