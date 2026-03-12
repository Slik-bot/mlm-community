// ════════════════════════════════════════
// CHAT AUDIO — TRAFIQO
// Звуки чата: отправка + входящее
// ════════════════════════════════════════

(function() {
  let _ctx = null;

  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  document.addEventListener('touchstart', () => getCtx(), { once: true });
  document.addEventListener('click', () => getCtx(), { once: true });

  function playSend() {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;

      // Основной тон — мягкий удар
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1000, t);
      osc1.frequency.exponentialRampToValueAtTime(400, t + 0.08);
      gain1.gain.setValueAtTime(0.3, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc1.start(t); osc1.stop(t + 0.12);

      // Щелчок — шум
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      const gain2 = ctx.createGain();
      src.buffer = buf;
      src.connect(gain2); gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0.08, t);
      src.start(t);
    } catch(e) {}
  }

  function playReceive() {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(700, t);
      osc1.frequency.exponentialRampToValueAtTime(900, t + 0.06);
      gain1.gain.setValueAtTime(0.001, t);
      gain1.gain.linearRampToValueAtTime(0.2, t + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc1.start(t); osc1.stop(t + 0.18);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1050, t + 0.1);
      gain2.gain.setValueAtTime(0.001, t + 0.1);
      gain2.gain.linearRampToValueAtTime(0.15, t + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.start(t + 0.1); osc2.stop(t + 0.25);
    } catch(e) {}
  }

  window.chatAudio = { playSend, playReceive };
})();
