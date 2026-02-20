// ═══ Posts API — лента, лайки, комментарии, закладки ═══

// ═══ loadPosts ═══

async function loadPosts(filter, limit) {
  limit = limit || 20;
  var query = window.sb.from('posts')
    .select('*, author:users(id, name, avatar_url, level, dna_type, is_verified)')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter && filter !== 'all') {
    query = query.eq('type', filter);
  }

  var result = await query;
  return { data: result.data, error: result.error };
}

// ═══ createPost ═══

async function createPost(content, type, mediaUrls) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('posts').insert({
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
  var user = window.getCurrentUser();
  if (!user) return { liked: false, likes_count: 0 };

  var existing = await window.sb.from('reactions')
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

  var count = await window.sb.from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'post')
    .eq('target_id', postId)
    .eq('reaction_type', 'like');

  return { liked: !existing.data, likes_count: count.count || 0 };
}

// ═══ addComment ═══

async function addComment(postId, content, parentId) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('comments').insert({
    post_id: postId,
    author_id: user.id,
    content: content,
    parent_id: parentId || null
  }).select('*, author:users(id, name, avatar_url, dna_type)').single();

  return { data: result.data, error: result.error };
}

// ═══ loadComments ═══

async function loadComments(postId) {
  var result = await window.sb.from('comments')
    .select('*, author:users(id, name, avatar_url, dna_type)')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  return { data: result.data, error: result.error };
}

// ═══ toggleBookmark ═══

async function toggleBookmark(postId) {
  var user = window.getCurrentUser();
  if (!user) return { bookmarked: false };

  var existing = await window.sb.from('reactions')
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

// ═══ Экспорт ═══

window.loadPosts = loadPosts;
window.createPost = createPost;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.loadComments = loadComments;
window.toggleBookmark = toggleBookmark;
