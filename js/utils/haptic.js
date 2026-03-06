// ════════════════════════════════════════
// HAPTIC — TRAFIQO
// Тактильный отклик: Telegram SDK / fallback
// ════════════════════════════════════════

function haptic(type) {
  const tg = window.Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    if (type === 'light')   tg.impactOccurred('light');
    if (type === 'medium')  tg.impactOccurred('medium');
    if (type === 'warning') tg.notificationOccurred('warning');
  } else {
    if (type === 'light')   navigator.vibrate?.(8);
    if (type === 'medium')  navigator.vibrate?.(15);
    if (type === 'warning') navigator.vibrate?.(25);
  }
}

window.haptic = haptic;
