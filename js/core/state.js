// ═══ AppState — глобальное состояние приложения ═══

const AppState = {
  currentUser: null,
  session: null,
  platform: null,
  isLoading: false,
  notifications: {
    unread: 0
  }
};

const _defaults = JSON.parse(JSON.stringify(AppState));

function setState(key, value) {
  if (!(key in AppState)) return;
  const old = AppState[key];
  AppState[key] = value;
  if (window.AppEvents) {
    window.AppEvents.emit('state:changed', { key, value, old });
  }
}

function getState(key) {
  return key ? AppState[key] : AppState;
}

function resetState() {
  Object.keys(_defaults).forEach(function (key) {
    AppState[key] = JSON.parse(JSON.stringify(_defaults[key]));
  });
  if (window.AppEvents) {
    window.AppEvents.emit('state:changed', { key: '*', value: null });
  }
}

window.AppState = AppState;
window.setState = setState;
window.getState = getState;
window.resetState = resetState;
