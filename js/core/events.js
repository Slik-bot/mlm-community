// ═══ AppEvents — шина событий (pub/sub) ═══

var _listeners = {};

function on(event, callback) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(callback);
}

function off(event, callback) {
  if (!_listeners[event]) return;
  _listeners[event] = _listeners[event].filter(function (cb) {
    return cb !== callback;
  });
}

function emit(event, data) {
  if (!_listeners[event]) return;
  _listeners[event].forEach(function (cb) {
    try {
      cb(data);
    } catch (err) {
      console.error('AppEvents [' + event + ']:', err);
    }
  });
}

window.AppEvents = { on: on, off: off, emit: emit };
