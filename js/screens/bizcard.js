// ═══════════════════════════════════════
// BIZCARD — Моя визитка
// ═══════════════════════════════════════

const BC_APP_URL = 'https://mlm-community.vercel.app';
const BC_QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

const BC_DNA_LABELS = {
  S: 'Стратег', C: 'Коммуникатор', K: 'Креатор', A: 'Аналитик',
  strategist: 'Стратег', communicator: 'Коммуникатор',
  creator: 'Креатор', analyst: 'Аналитик'
};

let bcRefUrl = '';

// ═══ Init ═══

function initBizcard() {
  const user = window.currentUser;
  if (!user) return;
  bcRefUrl = BC_APP_URL + '/?ref=' + (user.referral_code || '');
  bcRenderCard(user);
  bcGenerateQR(user.referral_code);
  const s = window.sb;
  if (s) {
    s.from('social_links')
      .select('platform, url')
      .eq('user_id', user.id)
      .then(function(res) {
        bcRenderSocial(res.data || []);
      })
      .catch(function(err) {
        console.error('Bizcard social load error:', err);
      });
  }
}

// ═══ Render Card ═══

function bcRenderCard(user) {
  const dnaColor = window.getDnaColor ? getDnaColor(user.dna_type) : '#8b5cf6';
  const avatarWrap = document.getElementById('bcAvatarWrap');
  if (avatarWrap) {
    if (user.avatar_url) {
      avatarWrap.innerHTML = '<img class="bc-avatar" src="' + escHtml(user.avatar_url) + '" alt="" style="border-color:' + dnaColor + '">';
    } else {
      avatarWrap.innerHTML = '<div class="bc-avatar-placeholder" style="border-color:' + dnaColor + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
    }
  }
  const nameEl = document.getElementById('bcName');
  if (nameEl) nameEl.textContent = user.name || 'Участник';
  bcRenderDna(user.dna_type);
  bcRenderLevel(user, dnaColor);
  const bioEl = document.getElementById('bcBio');
  if (bioEl) {
    const bio = (user.bio || '').substring(0, 80);
    bioEl.textContent = bio;
  }
}

// ═══ DNA Badge ═══

function bcRenderDna(dnaType) {
  const el = document.getElementById('bcDna');
  if (!el) return;
  const label = BC_DNA_LABELS[dnaType] || '';
  if (!label) { el.textContent = ''; return; }
  const color = window.getDnaColor ? getDnaColor(dnaType) : '#8b5cf6';
  el.textContent = label;
  el.style.background = color + '20';
  el.style.color = color;
}

// ═══ Level ═══

function bcRenderLevel(user, dnaColor) {
  const el = document.getElementById('bcLevel');
  if (!el) return;
  const xp = user.xp_total || 0;
  const lvl = window.Gamification ? Gamification.getUserLevel(xp) : { level: 'pawn', label: 'Пешка', stars: 1 };
  const icon = window.getChessIcon ? getChessIcon(lvl.level, dnaColor) : '';
  const maxS = lvl.level === 'king' ? 1 : 5;
  const stars = '\u2605'.repeat(lvl.stars) + '\u2606'.repeat(maxS - lvl.stars);
  el.innerHTML = icon + '<span>' + lvl.label + ' ' + stars + '</span>';
}

// ═══ QR Code ═══

function bcGenerateQR(refCode) {
  const img = document.getElementById('bcQr');
  const codeEl = document.getElementById('bcRefCode');
  if (!refCode) {
    if (img) img.style.display = 'none';
    if (codeEl) codeEl.textContent = '';
    return;
  }
  const url = BC_APP_URL + '/?ref=' + encodeURIComponent(refCode);
  if (img) {
    img.src = BC_QR_API + '?size=140x140&bgcolor=FFFFFF&color=06060b&data=' + encodeURIComponent(url);
    img.alt = 'QR: ' + refCode;
  }
  if (codeEl) codeEl.textContent = refCode;
}

// ═══ Social Links ═══

function bcRenderSocial(links) {
  const el = document.getElementById('bcSocial');
  if (!el || !links.length) return;
  el.innerHTML = links.map(function(link) {
    const icon = bcGetSocialIcon(link.platform);
    return '<a class="bc-social-link" href="' + escHtml(link.url) + '" target="_blank" rel="noopener">' + icon + '</a>';
  }).join('');
}

function bcGetSocialIcon(platform) {
  const p = (platform || '').toLowerCase();
  const icons = {
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.2-.04-.28-.02-.12.02-2.02 1.28-5.69 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.41-.27-2.1-.5-.85-.28-1.52-.43-1.46-.91.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.65-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .37z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>',
    vk: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.162 18.994c.609 0 .858-.406.851-.915-.019-1.68.46-1.93 1.482-.957 1.14 1.088 1.997 1.872 2.997 1.872h2.162c.479 0 .853-.189.696-.721-.248-.837-1.776-2.477-2.367-3.036-.727-.688-.498-.564.21-1.73 1.149-1.893 2.231-4.149 1.2-4.507-.457-.16-3.258-.006-3.258-.006s-.326.028-.478.165c-.137.124-.204.408-.204.408s-.361 1.029-.846 1.905c-1.016 1.837-1.403 1.937-1.564 1.822-.375-.268-.279-1.075-.279-1.649 0-1.792.272-2.541-.532-2.735-.267-.064-.462-.106-1.143-.113-.874-.009-1.614.003-2.033.208-.279.136-.494.439-.363.456.162.022.528.099.722.364.25.342.241 1.111.241 1.111s.144 2.108-.335 2.369c-.329.179-.78-.186-1.746-1.858-.495-.857-.869-1.804-.869-1.804s-.072-.176-.2-.272c-.155-.116-.372-.153-.372-.153l-1.918.012s-.288.008-.394.134c-.094.113-.008.346-.008.346s1.694 3.964 3.612 5.963c1.758 1.833 3.754 1.712 3.754 1.712h.904z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
  };
  return icons[p] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
}

// ═══ Share & Copy ═══

function bcHandleShare() {
  if (navigator.share) {
    navigator.share({
      title: 'TRAFIQO',
      text: 'Присоединяйся к TRAFIQO!',
      url: bcRefUrl
    }).catch(function() {});
  } else {
    bcHandleCopy();
  }
}

function bcHandleCopy() {
  if (!bcRefUrl) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(bcRefUrl).then(function() {
      if (window.showToast) showToast('Ссылка скопирована');
    }).catch(function() {
      if (window.showToast) showToast('Не удалось скопировать');
    });
  }
}

// ═══ Exports ═══

window.initBizcard = initBizcard;
window.bcHandleShare = bcHandleShare;
window.bcHandleCopy = bcHandleCopy;
