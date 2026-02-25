// ═══════════════════════════════════════
// DNA REVEAL — js/dna-reveal.js
// Reveal-анимация ДНК-карточки
// Выделено из dna-card.js
// ═══════════════════════════════════════

(function() {
  'use strict';

  // ─── LEVEL UP ───────────────────────────

  function closeLevelUp() {
    document.getElementById('luOverlay').classList.remove('active');
    document.querySelectorAll('.confetti').forEach(c => c.remove());
  }

  function spawnConfetti() {
    const dnaType = localStorage.getItem('dnaType') || 'S';
    const d = window.DNA_TYPES[dnaType];
    if (!d) return;
    const colors = [d.color, d.light, '#fbbf24', '#fff'];
    for (let i = 0; i < 50; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-12px';
      c.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      c.style.setProperty('--d',
        (1.5 + Math.random() * 2) + 's');
      c.style.setProperty('--delay',
        Math.random() * 0.8 + 's');
      c.style.setProperty('--dx',
        (Math.random() * 200 - 100) + 'px');
      c.style.width = (6 + Math.random() * 6) + 'px';
      c.style.height = (6 + Math.random() * 6) + 'px';
      document.body.appendChild(c);
    }
    setTimeout(() => {
      document.querySelectorAll('.confetti').forEach(c => c.remove());
    }, 5000);
  }

  // ─── REVEAL HELPERS ─────────────────────

  function dnrvTone(f, dur, v) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, a.currentTime);
      g.gain.linearRampToValueAtTime(v || .025, a.currentTime + .025);
      g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch(e) {}
  }

  async function dnrvProg(to, dur) {
    const fill = document.getElementById('dnrvFill');
    const num = document.getElementById('dnrvNum');
    if (!fill || !num) return;
    const from = parseFloat(fill.style.width) || 0;
    const t0 = Date.now();
    return new Promise(r => {
      (function tick() {
        const t = Math.min((Date.now() - t0) / dur, 1);
        const e = t < .5 ? 2*t*t : (4-2*t)*t-1;
        const val = from + (to - from) * e;
        fill.style.width = val + '%';
        num.textContent = Math.round(val) + '%';
        t < 1 ? requestAnimationFrame(tick) : r();
      })();
    });
  }

  // ─── REVEAL MAIN ────────────────────────

  async function runNewReveal() {
    const wrap = document.getElementById('dnrReveal');
    const p1 = document.getElementById('dnrvP1');
    const p2 = document.getElementById('dnrvP2');
    const flash = document.getElementById('dnrvFlash');
    if (!wrap) { window.goTo('scrDnaResult'); return; }

    const dnaType = localStorage.getItem('dnaType') || 'K';
    const nameMap = { S:'СТРАТЕГ', C:'КОММУНИКАТОР', K:'КРЕАТОР', A:'АНАЛИТИК' };

    p1.classList.add('on');
    dnrvTone(160, 2.5, .02);

    await new Promise(r => setTimeout(r, 600));

    ['dnrv-ring1','dnrv-ring2'].forEach(c => {
      const el = wrap.querySelector('.'+c); if(el) el.style.opacity='1';
    });
    document.getElementById('dnrvP1').querySelectorAll(
      '.dnrv-orb,.dnrv-core-glow,.dnrv-hex,.dnrv-icon'
    ).forEach(el => el.classList.add('on'));
    const beam = wrap.querySelector('.dnrv-beam');
    if (beam) beam.classList.add('on');

    const dl = ms => new Promise(r => setTimeout(r, ms));

    await dl(500);
    document.getElementById('dnrvR1').classList.add('in');
    dnrvTone(220, .35, .018);
    await dl(650);
    document.getElementById('dnrvV1').classList.add('in');

    await dl(350);
    document.getElementById('dnrvR2').classList.add('in');
    dnrvTone(275, .35, .018);
    await dl(550);
    document.getElementById('dnrvV2').classList.add('in');
    document.getElementById('dnrvProg').classList.add('in');
    dnrvProg(44, 900);

    await dl(400);
    document.getElementById('dnrvR3').classList.add('in');
    dnrvTone(330, .35, .018);
    await dl(550);
    document.getElementById('dnrvV3').classList.add('in');
    dnrvProg(79, 700);

    await dl(600);
    await dnrvProg(100, 450);
    dnrvTone(440, .6, .025);
    await dl(350);

    p1.classList.remove('on');
    await dl(300);
    p2.classList.add('on');
    document.getElementById('dnrvArchLabel').classList.add('in');
    dnrvTone(190, 2.2, .02);

    await dl(900);
    ['S','C','K','A'].forEach((t, i) => {
      setTimeout(() => {
        document.getElementById('dnrv' + 'A' + t).classList.add('lit');
        dnrvTone(200 + i*80, .2, .012);
      }, i * 130);
    });

    await dl(1000);
    ['S','C','K','A'].forEach(t => {
      const el = document.getElementById('dnrvA' + t);
      if (t === dnaType) {
        el.className = 'dnrv-acard lit';
      } else {
        setTimeout(() => {
          el.classList.remove('lit');
          el.classList.add('dim');
        }, Math.random() * 200 + 50);
      }
    });
    dnrvTone(440, .8, .03);

    await dl(950);
    document.getElementById('dnrvResultName').textContent =
      nameMap[dnaType] || dnaType;
    document.getElementById('dnrvResult').classList.add('in');
    [440,550,660].forEach((n,i) =>
      setTimeout(() => dnrvTone(n,.4,.02), i*110));

    await dl(1400);

    p2.classList.remove('on');
    await dl(200);
    flash.style.transition = 'opacity .09s';
    flash.style.opacity = '.4';
    dnrvTone(900, .55, .05);
    await dl(90);
    flash.style.transition = 'opacity .7s ease';
    flash.style.opacity = '0';

    await dl(300);
    wrap.style.opacity = '0';
    wrap.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      wrap.classList.remove('active');
      wrap.style.opacity = '';
      wrap.style.transition = '';
    }, 500);
    document.querySelectorAll('#scrDnaResult .hidden')
      .forEach(el => el.classList.remove('hidden'));
  }

  // ─── EXPORTS ────────────────────────────
  window.runDnaReveal = runNewReveal;
  window.closeLevelUp = closeLevelUp;
  window.spawnConfetti = spawnConfetti;

})();
