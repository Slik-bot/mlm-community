// ═══════════════════════════════════════
// MORE HUB — Навигация к разделам
// ═══════════════════════════════════════

const MORE_SECTIONS = [
  {
    id: 'scrForum',
    label: 'Форум',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8M8 13h5"/></svg>'
  },
  {
    id: 'scrTasks',
    label: 'Задания',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>'
  },
  {
    id: 'scrContests',
    label: 'Конкурсы',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 9a6 6 0 0012 0V3H6v6z"/><path d="M6 3H4v3a2 2 0 002 2"/><path d="M18 3h2v3a2 2 0 01-2 2"/><path d="M12 15v3"/><path d="M8 21h8"/></svg>'
  },
  {
    id: 'scrExperts',
    label: 'Эксперты',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.7l-6.2 4.6 2.4-7.4L2 9.4h7.6z"/></svg>'
  },
  {
    id: 'scrMatch',
    label: 'Матч',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
  },
  {
    id: 'scrAcademy',
    label: 'Академия',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>'
  },
  {
    id: 'scrWebinars',
    label: 'Вебинары',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><polygon points="10,8 16,10.5 10,13"/></svg>'
  },
  {
    id: 'scrAlliances',
    label: 'Альянсы',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><ellipse cx="12" cy="12" rx="5" ry="10"/></svg>'
  },
  {
    id: 'scrDealList',
    label: 'Сделки',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 1v4M12 19v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M1 12h4M19 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>'
  }
];

function initMore() {
  const grid = document.getElementById('moreGrid');
  if (!grid) return;
  grid.textContent = '';

  MORE_SECTIONS.forEach(function(section) {
    const card = document.createElement('div');
    card.className = 'more-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.onclick = function() { goTo(section.id); };

    const iconWrap = document.createElement('div');
    iconWrap.className = 'more-card__icon';
    iconWrap.innerHTML = section.icon;

    const label = document.createElement('div');
    label.className = 'more-card__label';
    label.textContent = section.label;

    card.appendChild(iconWrap);
    card.appendChild(label);
    grid.appendChild(card);
  });
}

window.initMore = initMore;
