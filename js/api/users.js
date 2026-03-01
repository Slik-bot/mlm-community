// ═══ Users API — профиль, ДНК, онбординг, уведомления ═══

async function resolveUserId() {
  // Попытка 1: AppState
  let user = window.getCurrentUser ? window.getCurrentUser() : null;
  if (user && user.id) return user.id;

  // Попытка 2: window.currentUser (алиас)
  if (window.currentUser && window.currentUser.id) return window.currentUser.id;

  // Попытка 3: живая сессия Supabase
  try {
    const sess = await window.sb.auth.getSession();
    const uid = sess.data && sess.data.session && sess.data.session.user
      ? sess.data.session.user.id
      : null;
    if (uid) {
      // Найти и обновить AppState чтобы следующий вызов был быстрее
      const resp = await window.sb.from('users').select('*').eq('id', uid).maybeSingle();
      if (resp.data && window.setState) {
        window.setState('currentUser', resp.data);
        window.currentUser = resp.data;
      }
      return uid;
    }
  } catch (e) {
    console.error('[resolveUserId]', e);
  }
  return null;
}

// ═══ loadProfile ═══

async function loadProfile(userId) {
  const id = userId || (window.getCurrentUser() && window.getCurrentUser().id);
  if (!id) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('users')
    .select('*, user_stats(*), social_links(*), achievements(*)')
    .eq('id', id)
    .single();

  return { data: result.data, error: result.error };
}

// ═══ loadProfileLight (без JOIN — для фида и хедера) ═══

async function loadProfileLight(userId) {
  const id = userId || (window.getCurrentUser() && window.getCurrentUser().id);
  if (!id) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('users')
    .select('id, name, avatar_url, dna_type, xp_total, level, streak_days, subscription_type, is_verified, bio, specialization, city')
    .eq('id', id)
    .single();

  return { data: result.data, error: result.error };
}

// ═══ updateProfile ═══

async function updateProfile(fields) {
  const uid = await resolveUserId();
  if (!uid) return { data: null, error: { message: 'Не авторизован' } };

  const allowed = {};
  const keys = ['name', 'bio', 'avatar_url', 'specialization', 'city'];
  keys.forEach(function (k) {
    if (fields[k] !== undefined) allowed[k] = fields[k];
  });

  const upd = await window.sb.from('users').update(allowed).eq('id', uid);
  if (upd.error) return { data: null, error: upd.error };
  const result = await window.sb.from('users').select('*').eq('id', uid).single();
  if (!result.error && result.data) {
    window.setState('currentUser', result.data);
    window.AppEvents.emit('user:updated', allowed);
  }
  return { data: result.data, error: result.error };
}

// ═══ saveDnaResult ═══

async function saveDnaResult(dnaType, dnaProfile) {
  const uid = await resolveUserId();
  const dnaTypeMap = {
    'S': 'strategist', 'C': 'communicator', 'K': 'creator', 'A': 'analyst',
    'strategist': 'strategist', 'communicator': 'communicator',
    'creator': 'creator', 'analyst': 'analyst'
  };
  const reverseMap = { strategist: 'S', communicator: 'C', creator: 'K', analyst: 'A' };
  dnaType = dnaTypeMap[dnaType] || dnaType;
  if (!uid) return { data: null, error: { message: 'Не авторизован' } };

  try {
    // Критичный update — dna_type в таблице users
    const upd = await window.sb.from('users').update({
      dna_type: dnaType,
      dna_profile: dnaProfile || {}
    }).eq('id', uid);
    if (upd.error) {
      console.error('[saveDnaResult] update error:', upd.error.message);
      return { data: null, error: upd.error };
    }

    // Синхронизируем localStorage сразу после успешного update
    localStorage.setItem('dnaType', reverseMap[dnaType] || 'S');

    // Перечитываем профиль
    const result = await window.sb.from('users').select('*').eq('id', uid).single();
    if (!result.error && result.data) {
      window.setState('currentUser', result.data);
    }
    return { data: result.data, error: result.error };
  } catch (err) {
    console.error('[saveDnaResult] critical error:', err);
    // Даже при ошибке сети — сохраняем в localStorage как fallback
    localStorage.setItem('dnaType', reverseMap[dnaType] || 'S');
    return { data: null, error: { message: err.message } };
  }
}

// ═══ saveOnboardingStep ═══

async function saveOnboardingStep(step, data) {
  const uid = await resolveUserId();
  if (!uid) {
    console.error('[saveOnboardingStep] uid is null, step:', step);
    return { data: null, error: { message: 'Не авторизован' } };
  }

  const fields = {};
  if (step === 'name') {
    fields.name = data.name;
  } else if (step === 'interests') {
    fields.specialization = data.interests;
  } else if (step === 'complete') {
    fields.level = 'knight';
    fields.xp_total = 50;
  }

  if (Object.keys(fields).length === 0) {
    return { data: null, error: null };
  }

  const upd = await window.sb.from('users').update(fields).eq('id', uid);
  if (upd.error) {
    console.error('[saveOnboardingStep] update error:', upd.error.message, 'step:', step);
    return { data: null, error: upd.error };
  }

  const result = await window.sb.from('users').select('*').eq('id', uid).single();
  if (result.error) {
    console.error('[saveOnboardingStep] select error:', result.error.message);
    return { data: null, error: result.error };
  }

  if (result.data) {
    window.setState('currentUser', result.data);
    window.currentUser = result.data;
    if (step === 'complete') {
      window.AppEvents.emit('user:updated', result.data);
    }
  }

  return { data: result.data, error: null };
}

// ═══ loadNotifications ═══

async function loadNotifications(limit) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit || 20);

  return { data: result.data, error: result.error };
}

// ═══ markNotificationsRead ═══

async function markNotificationsRead() {
  const user = window.getCurrentUser();
  if (!user) return;

  await window.sb.from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  window.setState('notifications', { unread: 0 });
}

// ═══ searchUsers ═══

async function searchUsers(query, limit = 20) {
  try {
    const { data, error } = await window.sb
      .from('vw_public_profiles')
      .select('id, name, avatar_url, dna_type, level, specialization')
      .or(`name.ilike.%${query}%,specialization.ilike.%${query}%`)
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('searchUsers error:', err);
    return { data: [], error: err };
  }
}

// ═══ Экспорт ═══

window.loadProfile = loadProfile;
window.loadProfileLight = loadProfileLight;
window.updateProfile = updateProfile;
window.saveDnaResult = saveDnaResult;
window.saveOnboardingStep = saveOnboardingStep;
window.loadNotifications = loadNotifications;
window.markNotificationsRead = markNotificationsRead;
window.searchUsers = searchUsers;
