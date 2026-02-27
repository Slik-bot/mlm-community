// ===== REFERRALS SCREEN — реферальная система, ссылки, статистика =====

const REFERRAL_BASE_URL = 'https://mlm-community.vercel.app/?ref=';
const REFERRAL_SHARE_TEXT = 'Присоединяйся к TRAFIQO — зарабатывай на знаниях и связях!';

// ===== INIT =====

async function initReferrals() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  renderReferralLink(user);
  bindShareButtons(user);
  await loadReferralData(user.id);
}

// ===== REFERRAL LINK =====

function renderReferralLink(user) {
  const code = user.referral_code || '';
  const url = REFERRAL_BASE_URL + code;
  const linkEl = document.getElementById('referralLinkText');
  if (linkEl) linkEl.textContent = url;

  const copyBtn = document.getElementById('referralCopyBtn');
  if (copyBtn) {
    copyBtn.onclick = function() {
      copyToClipboard(url);
    };
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Ссылка скопирована');
      if (window.haptic) haptic('success');
    });
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Ссылка скопирована');
  if (window.haptic) haptic('success');
}

// ===== SHARE BUTTONS =====

function bindShareButtons(user) {
  const code = user.referral_code || '';
  const url = REFERRAL_BASE_URL + code;
  const text = REFERRAL_SHARE_TEXT + '\n' + url;

  const tgBtn = document.getElementById('referralShareTg');
  if (tgBtn) {
    tgBtn.onclick = function() {
      const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(REFERRAL_SHARE_TEXT);
      window.open(tgUrl, '_blank');
    };
  }

  const waBtn = document.getElementById('referralShareWa');
  if (waBtn) {
    waBtn.onclick = function() {
      const waUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
      window.open(waUrl, '_blank');
    };
  }

  const moreBtn = document.getElementById('referralShareMore');
  if (moreBtn) {
    moreBtn.onclick = function() {
      if (navigator.share) {
        navigator.share({ title: 'TRAFIQO', text: REFERRAL_SHARE_TEXT, url: url });
      } else {
        copyToClipboard(url);
      }
    };
  }
}

// ===== LOAD DATA =====

async function loadReferralData(userId) {
  try {
    const [referralsResult, incomeResult] = await Promise.all([
      loadReferralsList(userId),
      loadReferralIncome(userId)
    ]);
    renderFunnel(referralsResult);
    renderIncome(incomeResult);
    renderReferralList(referralsResult);
  } catch (err) {
    console.error('loadReferralData:', err);
  }
}

async function loadReferralsList(userId) {
  const { data, error } = await window.sb
    .from('referrals')
    .select('id, referred_id, bonus_amount, bonus_frozen, monthly_rate, is_active, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || !data.length) return [];

  const refIds = data.map(function(r) { return r.referred_id; });
  const { data: profiles } = await window.sb
    .from('vw_public_profiles')
    .select('id, name, avatar_url, level, level_stars, dna_type, is_verified')
    .in('id', refIds);

  const profileMap = {};
  (profiles || []).forEach(function(p) { profileMap[p.id] = p; });

  return data.map(function(r) {
    r.profile = profileMap[r.referred_id] || null;
    return r;
  });
}

async function loadReferralIncome(userId) {
  const { data, error } = await window.sb
    .from('transactions')
    .select('amount, created_at')
    .eq('user_id', userId)
    .in('type', ['referral_bonus', 'referral_monthly'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ===== RENDER FUNNEL =====

function renderFunnel(referrals) {
  const total = referrals.length;
  const verified = referrals.filter(function(r) {
    return r.profile && r.profile.is_verified;
  }).length;
  const active = referrals.filter(function(r) { return r.is_active; }).length;

  const clicksEl = document.getElementById('referralClicks');
  const signupsEl = document.getElementById('referralSignups');
  const verifiedEl = document.getElementById('referralVerified');
  const subsEl = document.getElementById('referralSubs');

  if (clicksEl) clicksEl.textContent = '—';
  if (signupsEl) signupsEl.textContent = total;
  if (verifiedEl) verifiedEl.textContent = verified;
  if (subsEl) subsEl.textContent = active;
}

// ===== RENDER INCOME =====

function renderIncome(transactions) {
  let totalIncome = 0;
  let monthIncome = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  transactions.forEach(function(tx) {
    const amount = tx.amount || 0;
    totalIncome += amount;
    if (new Date(tx.created_at) >= monthStart) {
      monthIncome += amount;
    }
  });

  const totalEl = document.getElementById('referralIncomeTotal');
  const monthEl = document.getElementById('referralIncomeMonth');
  if (totalEl) totalEl.textContent = formatRubles(totalIncome);
  if (monthEl) monthEl.textContent = formatRubles(monthIncome);
}

function formatRubles(kopecks) {
  const rub = (kopecks || 0) / 100;
  return rub.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' руб.';
}

// ===== RENDER REFERRAL LIST =====

function renderReferralList(referrals) {
  const listEl = document.getElementById('referralList');
  const emptyEl = document.getElementById('referralEmpty');
  if (!listEl) return;

  if (!referrals.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = referrals.map(function(ref) {
    const p = ref.profile || {};
    const name = refEsc(p.name || 'Участник');
    const dnaColor = getDnaColor(p.dna_type);
    const lvl = window.Gamification
      ? window.Gamification.getUserLevel(0)
      : { level: p.level || 'pawn', stars: p.level_stars || 0, label: 'Пешка' };

    if (window.Gamification && p.level) {
      const xpLvl = window.Gamification.getUserLevel(0);
      lvl.level = p.level;
      lvl.stars = p.level_stars || 0;
      lvl.label = xpLvl.label;
    }

    const stars = '★'.repeat(lvl.stars) + '☆'.repeat(5 - lvl.stars);
    const verified = p.is_verified ? '<span class="referrals__verified-badge">✓</span>' : '';
    const bonus = ref.bonus_amount ? formatRubles(ref.bonus_amount) : '—';
    const frozen = ref.bonus_frozen ? ' referrals__item--frozen' : '';
    const date = refFormatDate(ref.created_at);

    const avatarHtml = p.avatar_url
      ? '<img class="referrals__item-avatar-img" src="' + refEsc(p.avatar_url) + '" alt="">'
      : '<div class="referrals__item-avatar-placeholder">' + (p.name || '?')[0] + '</div>';

    return '<div class="referrals__item glass-card' + frozen + '">' +
      '<div class="referrals__item-left">' +
        '<div class="referrals__item-avatar">' + avatarHtml + '</div>' +
        '<div class="referrals__item-info">' +
          '<div class="referrals__item-name">' + name + verified + '</div>' +
          '<div class="referrals__item-level">' +
            '<span class="referrals__item-chess">' + getChessIcon(lvl.level, dnaColor) + '</span>' +
            '<span class="referrals__item-stars">' + stars + '</span>' +
          '</div>' +
          '<div class="referrals__item-date">' + date + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="referrals__item-right">' +
        '<div class="referrals__item-bonus">' + bonus + '</div>' +
        '<div class="referrals__item-rate">' + (ref.monthly_rate || 0) + '%</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== HELPERS =====

function refEsc(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function refFormatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== EXPORTS =====

window.initReferrals = initReferrals;
