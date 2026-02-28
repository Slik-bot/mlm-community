// ===== REFERRALS SCREEN — реферальная система, ссылки, статистика =====

const REFERRAL_BASE_URL = 'https://t.me/trafiqo_bot?start=ref_';
const REFERRAL_SHARE_TEXT = 'Присоединяйся к TRAFIQO — зарабатывай на знаниях и связях!';

// ===== INIT =====

async function initReferrals() {
  const user = getCurrentUser();
  if (!user) { goTo('scrLanding'); return; }

  renderReferralLink(user);
  bindShareButtons(user);
  await loadReferralData(user);
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

async function loadReferralData(user) {
  try {
    const [referrals, inviter] = await Promise.all([
      loadMyReferrals(user.id),
      loadWhoInvitedMe(user.referred_by)
    ]);
    renderStats(referrals);
    renderReferralList(referrals);
    renderInviter(inviter);
  } catch (err) {
    console.error('loadReferralData:', err);
  }
}

async function loadMyReferrals(userId) {
  try {
    const { data, error } = await window.sb
      .from('referrals')
      .select('id, referred_id, bonus_amount, bonus_xp, bonus_frozen, monthly_rate, is_active, created_at')
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
  } catch (err) {
    console.error('loadMyReferrals:', err);
    return [];
  }
}

async function loadWhoInvitedMe(referredBy) {
  if (!referredBy) return null;
  try {
    const { data, error } = await window.sb
      .from('vw_public_profiles')
      .select('id, name, avatar_url, dna_type, level')
      .eq('id', referredBy)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('loadWhoInvitedMe:', err);
    return null;
  }
}

// ===== RENDER STATS (4 карточки: приглашено, активных, XP, деньги) =====

function renderStats(referrals) {
  const el = document.getElementById('refStats');
  if (!el) return;

  const total = referrals.length;
  const active = referrals.filter(function(r) { return r.is_active; }).length;
  let sumXp = 0;
  let sumMoney = 0;

  referrals.forEach(function(r) {
    sumXp += (r.bonus_xp || 0);
    sumMoney += (r.bonus_amount || 0);
  });

  el.innerHTML =
    statCard(total, 'Приглашено') +
    statCard(active, 'Активных') +
    statCard(sumXp.toLocaleString('ru-RU') + ' XP', 'Заработано XP') +
    statCard(formatRubles(sumMoney), 'Заработано');
}

function statCard(value, label) {
  return '<div class="referrals__stat-card glass-card">' +
    '<div class="referrals__stat-value">' + value + '</div>' +
    '<div class="referrals__stat-label">' + label + '</div>' +
  '</div>';
}

// ===== RENDER INVITER =====

function renderInviter(inviter) {
  const el = document.getElementById('refInviter');
  if (!el) return;

  if (!inviter) {
    el.classList.add('hidden');
    return;
  }

  const dnaColor = getDnaColor(inviter.dna_type);
  const name = escHtml(inviter.name || 'Участник');
  const avatarHtml = inviter.avatar_url
    ? '<img class="referrals__inviter-img" src="' + escHtml(inviter.avatar_url) + '" alt="">'
    : '<div class="referrals__inviter-placeholder" style="color:' + dnaColor + '">' + escHtml((inviter.name || '?')[0]) + '</div>';

  el.classList.remove('hidden');
  el.innerHTML =
    '<div class="referrals__inviter-label">Вас пригласил</div>' +
    '<div class="referrals__inviter-body">' +
      '<div class="referrals__inviter-ava">' + avatarHtml + '</div>' +
      '<div class="referrals__inviter-info">' +
        '<div class="referrals__inviter-name">' + name + '</div>' +
        '<div class="referrals__inviter-dna" style="color:' + dnaColor + '">' +
          getChessIcon(inviter.level || 'pawn', dnaColor) +
        '</div>' +
      '</div>' +
    '</div>';
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
    return renderReferralRow(ref);
  }).join('');
}

function renderReferralRow(ref) {
  const p = ref.profile || {};
  const name = escHtml(p.name || 'Участник');
  const dnaColor = getDnaColor(p.dna_type);
  const verified = p.is_verified ? '<span class="referrals__verified-badge">&#10003;</span>' : '';
  const bonus = ref.bonus_amount ? formatRubles(ref.bonus_amount) : '—';
  const frozen = ref.bonus_frozen ? ' referrals__item--frozen' : '';
  const date = refFormatDate(ref.created_at);

  const avatarHtml = p.avatar_url
    ? '<img class="referrals__item-avatar-img" src="' + escHtml(p.avatar_url) + '" alt="">'
    : '<div class="referrals__item-avatar-placeholder" style="color:' + dnaColor + '">' + escHtml((p.name || '?')[0]) + '</div>';

  return '<div class="referrals__item glass-card' + frozen + '">' +
    '<div class="referrals__item-left">' +
      '<div class="referrals__item-avatar">' + avatarHtml + '</div>' +
      '<div class="referrals__item-info">' +
        '<div class="referrals__item-name">' + name + verified + '</div>' +
        '<div class="referrals__item-level">' +
          '<span class="referrals__item-chess">' + getChessIcon(p.level || 'pawn', dnaColor) + '</span>' +
        '</div>' +
        '<div class="referrals__item-date">' + date + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="referrals__item-right">' +
      '<div class="referrals__item-bonus">' + bonus + '</div>' +
      '<div class="referrals__item-rate">' + (ref.monthly_rate || 0) + '%</div>' +
    '</div>' +
  '</div>';
}

// ===== HELPERS =====

function formatRubles(kopecks) {
  const rub = (kopecks || 0) / 100;
  return rub.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' \u20BD';
}

function refFormatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== EXPORTS =====

window.initReferrals = initReferrals;
