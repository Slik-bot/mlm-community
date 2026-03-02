// ═══════════════════════════════════════
// WALLET API — запросы к Supabase
// Только данные, без UI
// ═══════════════════════════════════════

const WALLET_EDGE_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/request-withdrawal';
const TF_RATE_DEFAULT = { usd: 0.01 };
const TF_MIN_WITHDRAWAL = 1000;
const RUB_PER_USD = 92;

// ═══ getWalletData ═══
// Баланс + статистика за 30 дней (3 параллельных запроса)

async function getWalletData(userId) {
  try {
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [userRes, incomeRes, wdRes] = await Promise.all([
      window.sb.from('users').select('balance').eq('id', userId).single(),
      window.sb.from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .gt('amount', 0)
        .gte('created_at', ago30),
      window.sb.from('withdrawals')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', ago30)
    ]);

    if (userRes.error) throw userRes.error;

    const balance = (userRes.data && userRes.data.balance) || 0;
    const received = (incomeRes.data || []).reduce((s, t) => s + (t.amount || 0), 0);
    const withdrawn = (wdRes.data || []).reduce((s, w) => s + (w.amount || 0), 0);

    return {
      balance_tf: balance / 100,
      received_month: received / 100,
      withdrawn_month: withdrawn / 100
    };
  } catch (err) {
    console.error('[getWalletData]', err);
    return { balance_tf: 0, received_month: 0, withdrawn_month: 0, error: err.message };
  }
}

// ═══ getTfRate ═══
// Курс из platform_settings или дефолт

async function getTfRate() {
  try {
    const { data, error } = await window.sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'tf_rate')
      .maybeSingle();

    if (error || !data || !data.value) return TF_RATE_DEFAULT;
    return data.value;
  } catch (err) {
    console.error('[getTfRate]', err);
    return TF_RATE_DEFAULT;
  }
}

// ═══ getTransactions ═══
// filter: 'all' | 'income' | 'outcome'
// Запрашивает limit+1 для определения hasMore

async function getTransactions(userId, filter, limit, offset) {
  try {
    const lim = limit || 20;
    const off = offset || 0;

    let query = window.sb.from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter === 'income') query = query.gt('amount', 0);
    if (filter === 'outcome') query = query.lt('amount', 0);

    query = query.range(off, off + lim);

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).slice(0, lim),
      hasMore: (data || []).length > lim
    };
  } catch (err) {
    console.error('[getTransactions]', err);
    return { data: [], hasMore: false, error: err.message };
  }
}

// ═══ createWithdrawal ═══
// Вызывает Edge Function request-withdrawal (атомарное списание через service_role)
// RLS: transactions INSERT только service_role → прямой INSERT невозможен

async function createWithdrawal(userId, amountTf, method, address) {
  try {
    if (amountTf < TF_MIN_WITHDRAWAL) {
      return { success: false, error: 'Минимум ' + TF_MIN_WITHDRAWAL + ' TF' };
    }
    if (!address || !address.trim()) {
      return { success: false, error: 'Укажите адрес кошелька' };
    }

    const { data: user } = await window.sb
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (!user || (user.balance || 0) < amountTf * 100) {
      return { success: false, error: 'Недостаточно средств' };
    }

    const sessionRes = await window.sb.auth.getSession();
    const token = sessionRes.data.session
      ? sessionRes.data.session.access_token
      : '';

    const resp = await fetch(WALLET_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        amount: amountTf,
        requisites: method + ': ' + address.trim()
      })
    });

    const result = await resp.json();

    if (resp.ok && result.success) {
      return { success: true, withdrawal_id: result.withdrawal_id };
    }
    return { success: false, error: result.error || 'Ошибка вывода' };
  } catch (err) {
    console.error('[createWithdrawal]', err);
    return { success: false, error: err.message };
  }
}

// ═══ convertTf ═══
// Чистая функция конвертации (без async)

function convertTf(amountTf, rate) {
  const r = rate || TF_RATE_DEFAULT;
  const usd = Math.round(amountTf * r.usd * 100) / 100;
  const rub = Math.round(usd * RUB_PER_USD * 100) / 100;
  const usdt = usd;
  return { usd, rub, usdt };
}

// ═══ getWithdrawals ═══
// История заявок на вывод (последние 20)

async function getWithdrawals(userId) {
  try {
    const { data, error } = await window.sb
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getWithdrawals]', err);
    return { data: [], error: err.message };
  }
}

// ═══ Экспорт ═══

window.getWalletData = getWalletData;
window.getTfRate = getTfRate;
window.getTransactions = getTransactions;
window.createWithdrawal = createWithdrawal;
window.convertTf = convertTf;
window.getWithdrawals = getWithdrawals;
