// ════════════════════════════════════════
// CHAT AUDIO — TRAFIQO
// Звуки чата: отправка + входящее
// ════════════════════════════════════════

(function() {
  let _ctx = null;

  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  function playTone(freq, type, duration, gain, fadeOut) {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.connect(vol);
      vol.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      vol.gain.setValueAtTime(gain, ctx.currentTime);
      if (fadeOut) vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  // Отправка — короткий мягкий щелчок
  function playSend() {
    playTone(600, 'sine', 0.08, 0.15, true);
    setTimeout(() => playTone(900, 'sine', 0.06, 0.08, true), 40);
  }

  // Входящее — мягкий двойной тон
  function playReceive() {
    playTone(520, 'sine', 0.12, 0.12, true);
    setTimeout(() => playTone(680, 'sine', 0.10, 0.10, true), 80);
  }

  window.chatAudio = { playSend, playReceive };
})();
