// ===== SUPABASE INTEGRATION FOR MLM COMMUNITY =====
// Подключается к существующему app.js, заменяя localStorage на реальную базу

var sb = window.sb;

// Текущий пользователь
let currentAuthUser = null;
let currentProfile = null;

// ===== АВТОРИЗАЦИЯ =====

// Регистрация по email
async function sbSignUp(email, password, name) {
  try {
    email = email.replace(/[^\x20-\x7E]/g, '').trim().toLowerCase();

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name: name || '' } }
    });

    if (error) return { ok: false, msg: error.message };

    currentAuthUser = data.user;

    if (name && data.user) {
      await sb.from('profiles').update({ name }).eq('id', data.user.id);
    }

    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, msg: err.message || 'Ошибка регистрации' };
  }
}

// Вход по email
async function sbSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, msg: error.message };

  currentAuthUser = data.user;
  await loadProfile();

  return { ok: true, user: data.user, profile: currentProfile };
}

// Выход
async function sbSignOut() {
  await sb.auth.signOut();
  currentAuthUser = null;
  currentProfile = null;
  localStorage.clear();
}

// Проверка текущей сессии (автологин)
async function sbCheckSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  currentAuthUser = session.user;
  await loadProfile();

  return currentProfile;
}

// Загрузка профиля
async function loadProfile() {
  if (!currentAuthUser) return;
  const { data } = await sb.from('profiles').select('*').eq('id', currentAuthUser.id).single();
  if (data) {
    currentProfile = data;
    // Синхронизируем с localStorage для совместимости со старым кодом
    if (data.dna_type) {
      const dnaMap = { strategist: 'S', communicator: 'C', creator: 'K', analyst: 'A' };
      localStorage.setItem('dnaType', dnaMap[data.dna_type] || 'S');
    }
    if (data.name) localStorage.setItem('userName', data.name);
    if (data.interests && data.interests.length) localStorage.setItem('userInterests', JSON.stringify(data.interests));
    if (data.goal) localStorage.setItem('userGoal', data.goal);
  }
}


// ===== СОХРАНЕНИЕ ДАННЫХ =====

// Сохранить результат ДНК-теста
async function sbSaveDnaResult(dnaType, answers) {
  if (!currentAuthUser) return;

  const typeMap = { S: 'strategist', C: 'communicator', K: 'creator', A: 'analyst' };
  const fullType = typeMap[dnaType] || 'strategist';

  // Сохраняем в dna_results
  await sb.from('dna_results').upsert({
    user_id: currentAuthUser.id,
    dna_type: fullType,
    answers: answers || {}
  }, { onConflict: 'user_id' });

  // Обновляем профиль
  await sb.from('profiles').update({ dna_type: fullType }).eq('id', currentAuthUser.id);

  // Начисляем XP за ДНК-тест (если ещё не начисляли)
  await sbAddXp(20, 'dna_test');
}

// Сохранить профиль (имя, аватар)
async function sbSaveProfileName(name) {
  if (!currentAuthUser) return;
  await sb.from('profiles').update({ name }).eq('id', currentAuthUser.id);
  if (currentProfile) currentProfile.name = name;
}

// Сохранить интересы
async function sbSaveInterests(interests) {
  if (!currentAuthUser) return;
  await sb.from('profiles').update({ interests }).eq('id', currentAuthUser.id);
  if (currentProfile) currentProfile.interests = interests;
}

// Сохранить цель
async function sbSaveGoal(goal) {
  if (!currentAuthUser) return;
  await sb.from('profiles').update({ goal }).eq('id', currentAuthUser.id);
  if (currentProfile) currentProfile.goal = goal;
}

// Завершить онбординг — начислить стартовые XP
async function sbCompleteOnboarding() {
  if (!currentAuthUser) return;
  await sbAddXp(20, 'onboarding_complete');

  // Создать стрик
  await sb.from('user_streaks').upsert({
    user_id: currentAuthUser.id,
    current_streak: 1,
    longest_streak: 1,
    last_active_date: new Date().toISOString().split('T')[0]
  }, { onConflict: 'user_id' });

  // Создать user_stats
  await sb.from('user_stats').upsert({
    user_id: currentAuthUser.id
  }, { onConflict: 'user_id' });

  // Создать user_settings
  await sb.from('user_settings').upsert({
    user_id: currentAuthUser.id
  }, { onConflict: 'user_id' });
}


// ===== XP СИСТЕМА =====

async function sbAddXp(amount, actionType, sourceId) {
  if (!currentAuthUser) return;

  // Получаем множитель стрика
  const { data: streak } = await sb.from('user_streaks').select('current_streak').eq('user_id', currentAuthUser.id).single();
  let multiplier = 1.0;
  if (streak) {
    const s = streak.current_streak;
    if (s >= 90) multiplier = 3.0;
    else if (s >= 30) multiplier = 2.0;
    else if (s >= 14) multiplier = 1.5;
    else if (s >= 7) multiplier = 1.3;
    else if (s >= 3) multiplier = 1.1;
  }

  const finalAmount = Math.round(amount * multiplier);

  // Логируем
  await sb.from('user_xp_log').insert({
    user_id: currentAuthUser.id,
    amount: finalAmount,
    action_type: actionType,
    source_id: sourceId || null,
    multiplier: multiplier
  });

  // Обновляем XP в профиле
  const { data: profile } = await sb.from('profiles').select('xp').eq('id', currentAuthUser.id).single();
  const newXp = (profile?.xp || 0) + finalAmount;

  // Определяем новый уровень
  let newLevel = 'pawn';
  if (newXp >= 15000) newLevel = 'queen';
  else if (newXp >= 5000) newLevel = 'rook';
  else if (newXp >= 2000) newLevel = 'bishop';
  else if (newXp >= 500) newLevel = 'knight';

  await sb.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', currentAuthUser.id);

  if (currentProfile) {
    currentProfile.xp = newXp;
    currentProfile.level = newLevel;
  }

  return { xp: newXp, level: newLevel, added: finalAmount };
}

