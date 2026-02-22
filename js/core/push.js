// ═══ PUSH NOTIFICATIONS — подписка, отписка ═══

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy141c_OlJCp4xdOp1eSzy187_bKDLbIKOr5E';

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function requestPushPermission() {
  if (!isPushSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Push permission error:', err);
    return 'denied';
  }
}

async function getExistingSubscription() {
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Get subscription error:', err);
    return null;
  }
}

async function subscribeToPush() {
  if (!isPushSupported()) {
    showToast('Push-уведомления не поддерживаются');
    return false;
  }

  try {
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      showToast('Разрешение на уведомления отклонено');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    const saved = await savePushSubscription(subscription);
    if (!saved) {
      showToast('Ошибка сохранения подписки');
      return false;
    }

    showToast('Уведомления включены');
    return true;
  } catch (err) {
    console.error('Subscribe push error:', err);
    showToast('Ошибка подписки на уведомления');
    return false;
  }
}

async function unsubscribeFromPush() {
  try {
    const subscription = await getExistingSubscription();
    if (!subscription) return true;

    await subscription.unsubscribe();
    await removePushSubscription(subscription);

    showToast('Уведомления отключены');
    return true;
  } catch (err) {
    console.error('Unsubscribe push error:', err);
    showToast('Ошибка отключения уведомлений');
    return false;
  }
}

async function savePushSubscription(subscription) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) return false;

  try {
    const subJson = subscription.toJSON();
    const { error } = await window.sb.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth
    }, { onConflict: 'endpoint' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Save push subscription error:', err);
    return false;
  }
}

async function removePushSubscription(subscription) {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (!user) return;

  try {
    const subJson = subscription.toJSON();
    await window.sb.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', subJson.endpoint);
  } catch (err) {
    console.error('Remove push subscription error:', err);
  }
}

async function isPushSubscribed() {
  const subscription = await getExistingSubscription();
  return !!subscription;
}

async function initPush() {
  if (!isPushSupported()) return;
  const isSubscribed = await isPushSubscribed();
  const toggle = document.getElementById('togglePush');
  if (toggle) toggle.classList.toggle('active', isSubscribed);
}

// ═══ Экспорт ═══

window.initPush = initPush;
window.subscribeToPush = subscribeToPush;
window.unsubscribeFromPush = unsubscribeFromPush;
window.isPushSubscribed = isPushSubscribed;
window.isPushSupported = isPushSupported;
