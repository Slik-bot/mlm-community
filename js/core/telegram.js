// ═══════════════════════════════════════
// TELEGRAM MINI APP — интеграция
// js/core/telegram.js
// ═══════════════════════════════════════

const tg = window.Telegram?.WebApp;

// Инициализация при запуске
function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#06060b');
  tg.setBackgroundColor('#06060b');
}

// Определение платформы
function getPlatform() {
  if (tg) return 'telegram';
  if (window.Capacitor?.isNativePlatform()) return 'native';
  return 'web';
}

function isTelegram() { return getPlatform() === 'telegram'; }

// Haptic feedback
function haptic(type) {
  if (!tg?.HapticFeedback) return;
  if (type === 'light') tg.HapticFeedback.impactOccurred('light');
  if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
  if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
  if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
  if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
}

// MainButton (кнопка внизу экрана)
function showMainButton(text, onClick) {
  if (!tg?.MainButton) return;
  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
}

function hideMainButton() {
  if (!tg?.MainButton) return;
  tg.MainButton.hide();
  tg.MainButton.offClick();
}

// BackButton
function showBackButton(onClick) {
  if (!tg?.BackButton) return;
  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
}

function hideBackButton() {
  if (!tg?.BackButton) return;
  tg.BackButton.hide();
  tg.BackButton.offClick();
}

// Получить данные пользователя из Telegram
function getTelegramUser() {
  if (!tg?.initDataUnsafe?.user) return null;
  return tg.initDataUnsafe.user;
}

// Закрыть приложение
function closeTelegramApp() {
  if (tg) tg.close();
}

// Экспорты
window.initTelegram = initTelegram;
window.getPlatform = getPlatform;
window.isTelegram = isTelegram;
window.haptic = haptic;
window.showMainButton = showMainButton;
window.hideMainButton = hideMainButton;
window.showBackButton = showBackButton;
window.hideBackButton = hideBackButton;
window.getTelegramUser = getTelegramUser;
window.closeTelegramApp = closeTelegramApp;
