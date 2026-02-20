// ═══ Users API — профиль, ДНК, онбординг, уведомления ═══

// ═══ loadProfile ═══

async function loadProfile(userId) {
  var id = userId || (window.getCurrentUser() && window.getCurrentUser().id);
  if (!id) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('users')
    .select('*, user_stats(*), social_links(*), achievements(*)')
    .eq('id', id)
    .single();

  return { data: result.data, error: result.error };
}

// ═══ updateProfile ═══

async function updateProfile(fields) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var allowed = {};
  var keys = ['name', 'bio', 'avatar_url', 'specialization'];
  keys.forEach(function (k) {
    if (fields[k] !== undefined) allowed[k] = fields[k];
  });

  var result = await window.sb.from('users').update(allowed).eq('id', user.id).select().single();
  if (!result.error && result.data) {
    window.setState('currentUser', result.data);
    window.AppEvents.emit('user:updated', allowed);
  }
  return { data: result.data, error: result.error };
}

// ═══ saveDnaResult ═══

async function saveDnaResult(dnaType, dnaProfile) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('users').update({
    dna_type: dnaType,
    dna_profile: dnaProfile || {}
  }).eq('id', user.id).select().single();

  if (!result.error && result.data) {
    window.setState('currentUser', result.data);
  }
  return { data: result.data, error: result.error };
}

// ═══ saveOnboardingStep ═══

async function saveOnboardingStep(step, data) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var fields = {};
  if (step === 'name') fields.name = data;
  else if (step === 'interests') fields.specialization = data;
  else if (step === 'complete') fields.level = 'knight';

  var result = await window.sb.from('users').update(fields).eq('id', user.id).select().single();

  if (!result.error && result.data) {
    window.setState('currentUser', result.data);
    if (step === 'complete') {
      window.AppEvents.emit('user:updated', result.data);
    }
  }
  return { data: result.data, error: result.error };
}

// ═══ loadNotifications ═══

async function loadNotifications(limit) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit || 20);

  return { data: result.data, error: result.error };
}

// ═══ markNotificationsRead ═══

async function markNotificationsRead() {
  var user = window.getCurrentUser();
  if (!user) return;

  await window.sb.from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  window.setState('notifications', { unread: 0 });
}

// ═══ Экспорт ═══

window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.saveDnaResult = saveDnaResult;
window.saveOnboardingStep = saveOnboardingStep;
window.loadNotifications = loadNotifications;
window.markNotificationsRead = markNotificationsRead;
