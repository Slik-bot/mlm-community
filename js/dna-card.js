// ═══════════════════════════════════════
// DNA CARD — js/dna-card.js
// Карточка результата ДНК-теста
// ═══════════════════════════════════════

function dcApplyDNA(type) {
  const types = window.DNA_TYPES;
  if (!types || !types[type]) return;
  const d = types[type];
  const root = document.documentElement;
  root.style.setProperty('--dna-c',  d.color);
  root.style.setProperty('--dna-cl', d.light);
  root.style.setProperty('--dna-cg', d.glow);
}

function initDnaResult() {
  const type = localStorage.getItem('dnaType') || 'S';
  const safe = ['S','C','K','A'].includes(type) ? type : 'S';
  dcApplyDNA(safe);

  const btn = document.getElementById('dnrBtnContinue');
  if (btn) btn.addEventListener('click', () => window.goTo('scrFeed'));
}

window.initDnaResult = initDnaResult;
