// ═══════════════════════════════════════
// COMPANIES — КАРТОЧКА КОМПАНИИ
// Отделено от companies.js
// ═══════════════════════════════════════

let _ccIsMember = false;
let _ccJoining = false;

// ═══ Company Card: init ═══

async function initCompanyCard() {
  if (!_companyId) { goBack(); return; }

  const result = await window.loadCompanyDetail(_companyId);
  if (result.error || !result.data) {
    if (window.showToast) showToast('Компания не найдена');
    goBack();
    return;
  }

  ccRenderHero(result.data);
  ccWireTabs();
  ccWireJoin();
  ccWireShare(result.data);
  ccWireReviewBtn();

  const [membersRes, reviewsRes, membershipRes] = await Promise.all([
    window.loadCompanyMembers(_companyId, 20),
    window.loadCompanyReviews(_companyId, 20),
    window.checkMembership(_companyId)
  ]);

  ccRenderMembers(membersRes.data || []);
  ccRenderReviews(reviewsRes.data || []);
  ccUpdateJoinBtn(membershipRes.member, membershipRes.role);
}

// ═══ Company Card: render hero ═══

function ccRenderHero(c) {
  const esc = window.escHtml;
  const logoEl = document.getElementById('ccLogo');
  if (logoEl && c.logo_url) {
    logoEl.innerHTML = '<img src="' + esc(c.logo_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px">';
  }
  compSetText('ccName', c.name || '');
  const verEl = document.getElementById('ccVerified');
  if (verEl) verEl.classList.toggle('hidden', !c.is_verified);
  compSetText('ccCategory', c.category || '');
  ccRenderMeta(c);
}

function ccRenderMeta(c) {
  const esc = window.escHtml;
  const cityEl = document.getElementById('ccCity');
  const dotEl = document.getElementById('ccCityDot');
  if (cityEl && c.city) {
    cityEl.textContent = c.city;
    if (dotEl) dotEl.style.display = '';
  }
  compSetText('ccRating', c.rating ? parseFloat(c.rating).toFixed(1) : '0.0');
  const rcEl = document.getElementById('ccRatingCount');
  if (rcEl) {
    const n = c.reviews_count || 0;
    rcEl.textContent = '(' + n + ' ' + compPlural(n, 'отзыв', 'отзыва', 'отзывов') + ')';
  }
  compSetText('ccMembers', compFmtNum(c.members_count));
  compSetText('ccReviewsNum', String(c.reviews_count || 0));
  compSetText('ccSince', compYear(c.created_at));
  compSetText('ccDesc', c.description || '');

  if (c.website) {
    const sec = document.getElementById('ccWebsiteSection');
    const link = document.getElementById('ccWebsite');
    const txt = document.getElementById('ccWebsiteText');
    if (sec) sec.classList.remove('hidden');
    if (link) link.href = c.website;
    if (txt) txt.textContent = c.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  if (c.meta && c.meta.tags && c.meta.tags.length) {
    const tagsEl = document.getElementById('ccTags');
    if (tagsEl) {
      tagsEl.classList.remove('hidden');
      tagsEl.innerHTML = c.meta.tags.map(function(t) {
        return '<span class="comp-tag">' + esc(t) + '</span>';
      }).join('');
    }
  }
}

// ═══ Company Card: render members ═══

function ccRenderMembers(members) {
  const listEl = document.getElementById('ccMembersList');
  const emptyEl = document.getElementById('ccMembersEmpty');
  if (!listEl) return;

  if (!members.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = members.map(function(m) {
    const u = m.user || {};
    const esc = window.escHtml;
    const ava = u.avatar_url
      ? '<img src="' + esc(u.avatar_url) + '" alt="">'
      : '<span>' + esc((u.name || '?')[0]) + '</span>';
    const dna = u.dna_type ? ' cc-member-' + u.dna_type : '';
    return '<div class="cc-member">' +
      '<div class="cc-member-ava' + dna + '">' + ava + '</div>' +
      '<div class="cc-member-info">' +
        '<div class="cc-member-name">' + esc(u.name || 'Участник') + '</div>' +
        '<div class="cc-member-level">' + esc(u.level || '') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ═══ Company Card: render reviews ═══

function ccRenderReviews(reviews) {
  const listEl = document.getElementById('ccReviewsList');
  const emptyEl = document.getElementById('ccReviewsEmpty');
  const writeBtn = document.getElementById('ccWriteReviewBtn');
  if (!listEl) return;

  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (writeBtn && user) writeBtn.classList.remove('hidden');

  if (!reviews.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  listEl.innerHTML = reviews.map(function(r) {
    const u = r.reviewer || {};
    const esc = window.escHtml;
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : '';
    return '<div class="cc-review">' +
      '<div class="cc-review-top">' +
        '<span class="cc-review-name">' + esc(u.name || 'Участник') + '</span>' +
        '<span class="cc-review-date">' + date + '</span>' +
      '</div>' +
      '<div class="cc-review-stars">' + compStars(r.rating) + '</div>' +
      '<div class="cc-review-text">' + esc(r.content || '') + '</div>' +
    '</div>';
  }).join('');
}

// ═══ Company Card: tabs ═══

function ccWireTabs() {
  const box = document.getElementById('ccTabs');
  if (!box) return;
  box.querySelectorAll('.cc-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      box.querySelectorAll('.cc-tab').forEach(function(t) { t.classList.remove('on'); });
      tab.classList.add('on');
      const name = tab.getAttribute('data-tab');
      const panels = { members: 'ccPanelMembers', reviews: 'ccPanelReviews' };
      Object.keys(panels).forEach(function(k) {
        const el = document.getElementById(panels[k]);
        if (el) el.classList.toggle('hidden', k !== name);
      });
    });
  });
}

// ═══ Company Card: join / leave ═══

function ccWireJoin() {
  const btn = document.getElementById('ccJoinBtn');
  if (btn) btn.addEventListener('click', ccToggleJoin);
}

function ccUpdateJoinBtn(isMember, role) {
  _ccIsMember = isMember;
  const btn = document.getElementById('ccJoinBtn');
  const txt = document.getElementById('ccJoinText');
  if (!btn || !txt) return;
  if (isMember) {
    txt.textContent = role === 'admin' ? 'Вы администратор' : 'Вы участник';
    btn.classList.add('cc-joined');
  } else {
    txt.textContent = 'Вступить';
    btn.classList.remove('cc-joined');
  }
}

async function ccToggleJoin() {
  if (_ccJoining || !_companyId) return;
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }

  _ccJoining = true;
  const btn = document.getElementById('ccJoinBtn');
  if (btn) btn.disabled = true;

  if (_ccIsMember) {
    const res = await window.leaveCompany(_companyId);
    if (!res.error) {
      ccUpdateJoinBtn(false, null);
      if (window.showToast) showToast('Вы вышли из компании');
    }
  } else {
    const res = await window.joinCompany(_companyId);
    if (!res.error) {
      ccUpdateJoinBtn(true, 'member');
      if (window.showToast) showToast('Вы вступили!');
    } else {
      if (window.showToast) showToast(res.error.message || 'Ошибка');
    }
  }

  if (btn) btn.disabled = false;
  _ccJoining = false;
}

// ═══ Company Card: share ═══

function ccWireShare(company) {
  const btn = document.getElementById('ccShareBtn');
  if (!btn || !company) return;
  btn.addEventListener('click', function() {
    if (navigator.share) {
      navigator.share({ title: company.name, text: company.description || '' });
    } else if (window.showToast) {
      showToast('Поделиться пока недоступно');
    }
  });
}

// ═══ Company Card: write review ═══

function ccWireReviewBtn() {
  const btn = document.getElementById('ccWriteReviewBtn');
  if (!btn) return;
  btn.addEventListener('click', ccShowReviewForm);
}

function ccShowReviewForm() {
  const existing = document.getElementById('ccReviewForm');
  if (existing) { existing.remove(); return; }
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) { if (window.showToast) showToast('Войдите в аккаунт'); return; }

  const form = document.createElement('div');
  form.id = 'ccReviewForm';
  form.className = 'cc-review-form';
  form.innerHTML =
    '<div class="cc-rf-stars" id="ccRfStars">' +
      '<span class="cc-rf-star" data-v="1">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="2">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="3">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="4">&#9733;</span>' +
      '<span class="cc-rf-star" data-v="5">&#9733;</span>' +
    '</div>' +
    '<textarea class="cc-rf-text" id="ccRfText" placeholder="Ваш отзыв..." rows="3"></textarea>' +
    '<button class="cc-rf-submit" id="ccRfSubmit">Отправить</button>';

  const panel = document.getElementById('ccPanelReviews');
  const writeBtn = document.getElementById('ccWriteReviewBtn');
  if (panel && writeBtn) panel.insertBefore(form, writeBtn);

  let selectedRating = 0;
  form.querySelectorAll('.cc-rf-star').forEach(function(star) {
    star.addEventListener('click', function() {
      selectedRating = parseInt(star.getAttribute('data-v'));
      ccUpdateFormStars(selectedRating);
    });
  });

  document.getElementById('ccRfSubmit').addEventListener('click', async function() {
    const text = document.getElementById('ccRfText').value.trim();
    if (!selectedRating) { if (window.showToast) showToast('Поставьте оценку'); return; }
    if (!text) { if (window.showToast) showToast('Напишите отзыв'); return; }

    this.disabled = true;
    this.textContent = 'Отправка...';
    const res = await window.addCompanyReview(_companyId, selectedRating, text);
    if (!res.error) {
      if (window.showToast) showToast('Отзыв отправлен!');
      form.remove();
      const revRes = await window.loadCompanyReviews(_companyId, 20);
      ccRenderReviews(revRes.data || []);
    } else {
      if (window.showToast) showToast(res.error.message || 'Ошибка');
      this.disabled = false;
      this.textContent = 'Отправить';
    }
  });
}

function ccUpdateFormStars(rating) {
  document.querySelectorAll('#ccRfStars .cc-rf-star').forEach(function(s) {
    const v = parseInt(s.getAttribute('data-v'));
    s.style.color = v <= rating ? '#fbbf24' : 'rgba(255,255,255,.15)';
  });
}

// ═══ Exports ═══

window.initCompanyCard = initCompanyCard;
