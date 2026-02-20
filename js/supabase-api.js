// ===== SUPABASE API — ЛЕНТА, КОМПАНИИ, СОЦИАЛЬНОЕ, УТИЛИТЫ =====


// ===== ЛЕНТА (ПОСТЫ) =====

async function sbLoadPosts(filter, limit) {
  try {
    limit = limit || 20;
    let query = sb.from('posts')
      .select('*, profiles(id, name, avatar_url, dna_type, level, is_verified, plan)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filter && filter !== 'all' && filter !== 'foryou') {
      if (filter === 'cases') query = query.eq('post_type', 'case');
      else if (filter === 'polls') query = query.eq('post_type', 'poll');
      else if (filter === 'experts') query = query.eq('post_type', 'tip');
      else if (filter === 'companies') query = query.eq('post_type', 'company_news');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('sbLoadPosts error:', err);
    return [];
  }
}

// Создать пост
async function sbCreatePost(content, postType, imageUrl, pollOptions, images) {
  try {
    if (!currentAuthUser) return null;

    const post = {
      user_id: currentAuthUser.id,
      content: content,
      post_type: postType || 'post',
      is_published: true
    };

    if (imageUrl) post.image_url = imageUrl;
    if (images && images.length) post.images = images;
    if (pollOptions) post.poll_options = pollOptions;

    const { data, error } = await sb.from('posts').insert(post).select().single();
    if (error) { console.error('Create post error:', error); return null; }

    // XP и статистика — ошибки не должны ломать создание поста
    try {
      var xpMap = { post: 15, case: 30, poll: 20, tip: 15 };
      await sbAddXp(xpMap[postType] || 15, 'post', data.id);
      await sb.rpc('increment_stat', { uid: currentAuthUser.id, field: 'posts_count' });
    } catch (xpErr) { console.error('XP/stats failed (post still created):', xpErr); }

    return data;
  } catch (err) {
    console.error('sbCreatePost error:', err);
    return null;
  }
}

// Загрузить фото поста
async function sbUploadImage(file) {
  try {
    if (!currentAuthUser || !file) return null;
    var ext = file.name.split('.').pop().toLowerCase();
    var path = currentAuthUser.id + '/' + Date.now() + '.' + ext;
    var { error } = await sb.storage.from('posts').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    var { data } = sb.storage.from('posts').getPublicUrl(path);
    return data ? data.publicUrl : null;
  } catch (err) {
    console.error('sbUploadImage error:', err);
    return null;
  }
}

// Лайкнуть пост
async function sbLikePost(postId) {
  try {
    if (!currentAuthUser) return;

    // Проверяем, есть ли лайк
    const { data: existing } = await sb.from('post_likes').select('id').eq('post_id', postId).eq('user_id', currentAuthUser.id).single();

    if (existing) {
      // Убираем лайк
      await sb.from('post_likes').delete().eq('id', existing.id);
      await sb.from('posts').update({ likes_count: sb.rpc ? undefined : 0 }).eq('id', postId);
      // Ручной декремент
      const { data: p } = await sb.from('posts').select('likes_count').eq('id', postId).single();
      await sb.from('posts').update({ likes_count: Math.max(0, (p?.likes_count || 1) - 1) }).eq('id', postId);
      return false;
    } else {
      // Ставим лайк
      await sb.from('post_likes').insert({ post_id: postId, user_id: currentAuthUser.id });
      const { data: p } = await sb.from('posts').select('likes_count').eq('id', postId).single();
      await sb.from('posts').update({ likes_count: (p?.likes_count || 0) + 1 }).eq('id', postId);
      return true;
    }
  } catch (err) {
    console.error('sbLikePost error:', err);
    return false;
  }
}

// Добавить комментарий
async function sbAddComment(postId, content) {
  try {
    if (!currentAuthUser) return null;

    const { data, error } = await sb.from('post_comments').insert({
      post_id: postId,
      user_id: currentAuthUser.id,
      content: content
    }).select('*, profiles(name, avatar_url, dna_type)').single();

    if (error) throw error;

    // Обновляем счётчик
    const { data: p } = await sb.from('posts').select('comments_count').eq('id', postId).single();
    await sb.from('posts').update({ comments_count: (p?.comments_count || 0) + 1 }).eq('id', postId);
    // XP
    await sbAddXp(3, 'comment', data.id);

    return data;
  } catch (err) {
    console.error('sbAddComment error:', err);
    return null;
  }
}

// Загрузить комментарии
async function sbLoadComments(postId) {
  try {
    const { data, error } = await sb.from('post_comments')
      .select('*, profiles(name, avatar_url, dna_type, level, is_verified)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('sbLoadComments error:', err);
    return [];
  }
}

// Закладки
async function sbToggleBookmark(postId) {
  try {
    if (!currentAuthUser) return;
    const { data: existing } = await sb.from('post_bookmarks').select('id').eq('post_id', postId).eq('user_id', currentAuthUser.id).single();
    if (existing) {
      await sb.from('post_bookmarks').delete().eq('id', existing.id);
      return false;
    } else {
      await sb.from('post_bookmarks').insert({ post_id: postId, user_id: currentAuthUser.id });
      return true;
    }
  } catch (err) {
    console.error('sbToggleBookmark error:', err);
    return false;
  }
}


// ===== КОМПАНИИ =====

async function sbLoadCompanies() {
  try {
    const { data, error } = await sb.from('companies').select('*').eq('is_active', true).order('rating', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('sbLoadCompanies error:', err);
    return [];
  }
}

async function sbLoadCompanyDetail(id) {
  try {
    const { data, error } = await sb.from('companies').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('sbLoadCompanyDetail error:', err);
    return null;
  }
}

async function sbSendApplication(companyId, message) {
  try {
    if (!currentAuthUser) return null;
    const { data, error } = await sb.from('applications').insert({
      user_id: currentAuthUser.id,
      company_id: companyId,
      message: message || ''
    }).select().single();
    if (error) throw error;
    await sbAddXp(10, 'application', data.id);
    return data;
  } catch (err) {
    console.error('sbSendApplication error:', err);
    return null;
  }
}


// ===== СОЦИАЛЬНОЕ =====

// Друзья
async function sbSendFriendRequest(friendId) {
  try {
    if (!currentAuthUser) return;
    await sb.from('friends').insert({
      user_id: currentAuthUser.id,
      friend_id: friendId,
      status: 'pending'
    });
    await sbAddXp(5, 'friend_add', friendId);
  } catch (err) {
    console.error('sbSendFriendRequest error:', err);
  }
}

async function sbAcceptFriend(requestId) {
  try {
    const { error } = await sb.from('friends').update({ status: 'accepted' }).eq('id', requestId);
    if (error) throw error;
  } catch (err) {
    console.error('sbAcceptFriend error:', err);
  }
}

async function sbLoadFriends() {
  try {
    if (!currentAuthUser) return [];
    const { data, error } = await sb.from('friends')
      .select('*, profiles!friends_friend_id_fkey(id, name, avatar_url, dna_type, level)')
      .eq('user_id', currentAuthUser.id)
      .eq('status', 'accepted');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('sbLoadFriends error:', err);
    return [];
  }
}


// ===== МУДРОСТЬ ДНЯ =====

async function sbLoadWisdom() {
  try {
    const dnaType = currentProfile?.dna_type;
    let query = sb.from('wisdom_cards').select('*').eq('is_active', true);

    // Берём случайную карточку (для ДНК-типа или общую)
    const { data, error } = await query;
    if (error) throw error;
    if (!data || !data.length) return null;

    // Фильтруем: приоритет карточкам для своего ДНК
    const typed = data.filter(w => w.dna_type === dnaType);
    const general = data.filter(w => !w.dna_type);
    const pool = typed.length ? [...typed, ...typed, ...general] : general;

    return pool[Math.floor(Math.random() * pool.length)] || null;
  } catch (err) {
    console.error('sbLoadWisdom error:', err);
    return null;
  }
}


// ===== ЕЖЕДНЕВНЫЕ КВЕСТЫ =====

async function sbLoadDailyQuests() {
  try {
    if (!currentAuthUser) return [];

    const today = new Date().toISOString().split('T')[0];
    let { data, error } = await sb.from('daily_quests')
      .select('*, quest_templates(*)')
      .eq('user_id', currentAuthUser.id)
      .eq('date', today);
    if (error) throw error;

    // Если квестов на сегодня нет — генерируем
    if (!data || !data.length) {
      data = await sbGenerateDailyQuests();
    }

    return data || [];
  } catch (err) {
    console.error('sbLoadDailyQuests error:', err);
    return [];
  }
}

async function sbGenerateDailyQuests() {
  try {
    if (!currentAuthUser) return [];

    const dnaType = currentProfile?.dna_type || 'strategist';
    const today = new Date().toISOString().split('T')[0];

    // Берём шаблоны: 2 для ДНК-типа + 1 универсальный
    const { data: typed } = await sb.from('quest_templates').select('*').eq('dna_type', dnaType).eq('is_active', true);
    const { data: general } = await sb.from('quest_templates').select('*').is('dna_type', null).eq('is_active', true);

    const picked = [];
    if (typed && typed.length >= 2) {
      const shuffled = typed.sort(() => 0.5 - Math.random());
      picked.push(shuffled[0], shuffled[1]);
    } else if (typed) {
      picked.push(...typed);
    }
    if (general && general.length) {
      const shuffled = general.sort(() => 0.5 - Math.random());
      picked.push(shuffled[0]);
    }

    // Заполняем до 3
    while (picked.length < 3 && general && general.length) {
      const r = general[Math.floor(Math.random() * general.length)];
      if (!picked.find(p => p.id === r.id)) picked.push(r);
      if (picked.length >= general.length) break;
    }

    // Создаём записи
    const quests = picked.map(q => ({
      user_id: currentAuthUser.id,
      quest_template_id: q.id,
      progress: 0,
      is_completed: false,
      date: today
    }));

    if (quests.length) {
      await sb.from('daily_quests').insert(quests);
      const { data } = await sb.from('daily_quests')
        .select('*, quest_templates(*)')
        .eq('user_id', currentAuthUser.id)
        .eq('date', today);
      return data || [];
    }

    return [];
  } catch (err) {
    console.error('sbGenerateDailyQuests error:', err);
    return [];
  }
}


// ===== УВЕДОМЛЕНИЯ =====

async function sbLoadNotifications() {
  try {
    if (!currentAuthUser) return [];
    const { data, error } = await sb.from('notifications')
      .select('*')
      .eq('user_id', currentAuthUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('sbLoadNotifications error:', err);
    return [];
  }
}

async function sbMarkNotificationsRead() {
  try {
    if (!currentAuthUser) return;
    const { error } = await sb.from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentAuthUser.id)
      .eq('is_read', false);
    if (error) throw error;
  } catch (err) {
    console.error('sbMarkNotificationsRead error:', err);
  }
}


// ===== УТИЛИТЫ =====

// Форматирование даты
function sbFormatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'только что';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' мин';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' д';
  return d.toLocaleDateString('ru');
}
