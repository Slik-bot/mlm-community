// ════════════════════════════════════════
// HAPTIC — TRAFIQO
// Тактильный отклик: Telegram SDK / fallback
// ════════════════════════════════════════

function haptic(type) {
  const tg = window.Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    if (type === 'light')   tg.impactOccurred('light');
    if (type === 'medium')  tg.impactOccurred('medium');
    if (type === 'success') tg.notificationOccurred('success');
    if (type === 'error')   tg.notificationOccurred('error');
    if (type === 'warning') tg.notificationOccurred('warning');
  } else {
    if (type === 'light')   navigator.vibrate?.(8);
    if (type === 'medium')  navigator.vibrate?.(15);
    if (type === 'success') navigator.vibrate?.(20);
    if (type === 'error')   navigator.vibrate?.([30, 50, 30]);
    if (type === 'warning') navigator.vibrate?.(25);
  }
}

window.haptic = haptic;
