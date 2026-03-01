BEGIN;

-- =====================================================
-- TRAFIQO — USER STORIES (Instagram-like)
-- 013_stories.sql
-- Таблица user_stories + RLS + Storage bucket
-- =====================================================


-- =====================================================
-- 1. ТАБЛИЦА user_stories
-- =====================================================

CREATE TABLE user_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text CHECK (char_length(caption) <= 200),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours',
  views_count int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Индекс: быстрый поиск активных историй пользователя
CREATE INDEX idx_user_stories_active
  ON user_stories(user_id, expires_at DESC)
  WHERE is_active = true;

-- Индекс: быстрая фильтрация по expires_at для cleanup
CREATE INDEX idx_user_stories_expires
  ON user_stories(expires_at)
  WHERE is_active = true;


-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;

-- SELECT: все authenticated могут видеть активные и не истёкшие
CREATE POLICY "user_stories_select_active"
  ON user_stories FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND expires_at > now()
  );

-- INSERT: только свои истории
CREATE POLICY "user_stories_insert_own"
  ON user_stories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE: только свои (для views_count)
CREATE POLICY "user_stories_update_own"
  ON user_stories FOR UPDATE
  USING (
    auth.uid() = user_id
  );

-- DELETE: только свои
CREATE POLICY "user_stories_delete_own"
  ON user_stories FOR DELETE
  USING (
    auth.uid() = user_id
  );


-- =====================================================
-- 3. RPC: increment_story_views (SECURITY DEFINER)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_story_views(story_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_stories SET views_count = views_count + 1
  WHERE id = story_id AND is_active = true;
END;
$$;


-- =====================================================
-- 4. STORAGE BUCKET: story-media
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-media',
  'story-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Upload: только в свою папку {user_id}/filename
CREATE POLICY "story_media_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'story-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: только свои файлы
CREATE POLICY "story_media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'story-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- =====================================================
-- 5. ПРОВЕРКА
-- =====================================================
-- SELECT count(*) FROM user_stories;  -- Ожидается: 0
-- SELECT id FROM storage.buckets WHERE id = 'story-media';  -- Ожидается: 1 строка

COMMIT;
