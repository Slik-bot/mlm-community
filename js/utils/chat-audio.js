// ════════════════════════════════════════
// CHAT AUDIO — TRAFIQO
// Звуки чата: отправка + входящее
// ════════════════════════════════════════

(function() {
  let _ctx = null;
  let _unlocked = false;

  function getCtx() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // Разблокировать AudioContext при первом касании
  function unlock() {
    if (_unlocked) return;
    _unlocked = true;
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  }

  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });

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
      if (fadeOut) {
        vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      }
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  // Отправка — Telegram-стиль: высокий короткий свист
  function playSend() {
    playTone(1200, 'sine', 0.06, 0.2, true);
    setTimeout(() => playTone(1400, 'sine', 0.05, 0.12, true), 30);
  }

  // Входящее — мягкий нисходящий тон
  function playReceive() {
    playTone(880, 'sine', 0.15, 0.15, true);
    setTimeout(() => playTone(660, 'sine', 0.12, 0.10, true), 100);
  }

  window.chatAudio = { playSend, playReceive };
})();
