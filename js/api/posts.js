// ═══ Posts API — лента, лайки, комментарии, закладки ═══

// ═══ loadPosts ═══

async function loadPosts(filter, limit) {
  limit = limit || 20;
  let query = window.sb.from('posts')
    .select('*, author:users(id, name, avatar_url, level, dna_type, is_verified)')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter && filter !== 'all') {
    query = query.eq('type', filter);
  }

  const result = await query;
  return { data: result.data, error: result.error };
}

// ═══ createPost ═══

async function createPost(content, type, mediaUrls) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('posts').insert({
    author_id: user.id,
    content: content,
    type: type || 'post',
    images: mediaUrls || [],
    moderation_status: 'approved'
  }).select().single();

  return { data: result.data, error: result.error };
}

// ═══ toggleLike ═══

async function toggleLike(postId) {
  const user = window.getCurrentUser();
  if (!user) return { liked: false, likes_count: 0 };

  const existing = await window.sb.from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', 'post')
    .eq('target_id', postId)
    .eq('reaction_type', 'like')
    .maybeSingle();

  if (existing.data) {
    await window.sb.from('reactions').delete().eq('id', existing.data.id);
  } else {
    await window.sb.from('reactions').insert({
      user_id: user.id,
      target_type: 'post',
      target_id: postId,
      reaction_type: 'like'
    });
  }

  const count = await window.sb.from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'post')
    .eq('target_id', postId)
    .eq('reaction_type', 'like');

  return { liked: !existing.data, likes_count: count.count || 0 };
}

// ═══ addComment ═══

async function addComment(postId, content, parentId) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('comments').insert({
    post_id: postId,
    author_id: user.id,
    content: content,
    parent_id: parentId || null
  }).select('*, author:users(id, name, avatar_url, dna_type)').single();

  return { data: result.data, error: result.error };
}

// ═══ loadComments ═══

async function loadComments(postId) {
  const result = await window.sb.from('comments')
    .select('*, author:users(id, name, avatar_url, dna_type)')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  return { data: result.data, error: result.error };
}

// ═══ toggleBookmark ═══

async function toggleBookmark(postId) {
  const user = window.getCurrentUser();
  if (!user) return { bookmarked: false };

  const existing = await window.sb.from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', 'bookmark')
    .eq('target_id', postId)
    .maybeSingle();

  if (existing.data) {
    await window.sb.from('reactions').delete().eq('id', existing.data.id);
  } else {
    await window.sb.from('reactions').insert({
      user_id: user.id,
      target_type: 'bookmark',
      target_id: postId,
      reaction_type: 'bookmark'
    });
  }

  return { bookmarked: !existing.data };
}

// ═══ searchPosts ═══

async function searchPosts(query, limit = 20) {
  try {
    const { data, error } = await window.sb
      .from('posts')
      .select('id, content, type, author_id, created_at, images, likes_count')
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('searchPosts error:', err);
    return { data: [], error: err };
  }
}

// ═══ searchForum ═══

async function searchForum(query, limit = 20) {
  try {
    const { data, error } = await window.sb
      .from('forum_topics')
      .select('id, title, category, author_id, views_count, replies_count, created_at')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('searchForum error:', err);
    return { data: [], error: err };
  }
}

// ═══ searchExperts ═══

async function searchExperts(query, limit = 20) {
  try {
    const { data, error } = await window.sb
      .from('expert_cards')
      .select('id, user_id, title, specialization, hourly_rate, rating, skills')
      .or(`title.ilike.%${query}%,specialization.ilike.%${query}%`)
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('searchExperts error:', err);
    return { data: [], error: err };
  }
}

// ═══ sbCreatePost ═══

async function sbCreatePost(content, postType, imageUrl, pollData, imageUrls) {
  try {
    const user = window.getCurrentUser();
    if (!user) return null;
    const postData = {
      author_id: user.id,
      content: content,
      type: postType || 'post',
      images: imageUrls || [],
      moderation_status: 'approved'
    };
    if (pollData) postData.poll_data = pollData;
    const { data, error } = await window.sb.from('posts')
      .insert(postData).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('sbCreatePost error:', err);
    return null;
  }
}

// ═══ sbUploadImage ═══

async function sbUploadImage(file, bucket) {
  bucket = bucket || 'posts';
  try {
    const ext = file.type ? file.type.split('/')[1] : 'jpg';
    const fileName = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    const { data, error } = await window.sb.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = window.sb.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error('sbUploadImage error:', err);
    return null;
  }
}

// ═══ Экспорт ═══

window.loadPosts = loadPosts;
window.createPost = createPost;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.loadComments = loadComments;
window.toggleBookmark = toggleBookmark;
window.searchPosts = searchPosts;
window.searchForum = searchForum;
window.searchExperts = searchExperts;
window.sbCreatePost = sbCreatePost;
window.sbUploadImage = sbUploadImage;
