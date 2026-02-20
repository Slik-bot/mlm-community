BEGIN;

-- ═══════════════════════════════════════════════════
-- MLM COMMUNITY — STORAGE BUCKETS v1.0
-- 003_storage.sql
-- 9 бакетов + политики доступа к файлам
-- НЕ содержит DROP, изменения схемы/RLS
-- ═══════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- СОЗДАНИЕ 9 БАКЕТОВ
-- ═══════════════════════════════════════════════════

-- 1. avatars (публичный, до 5 МБ, только изображения)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']);

-- 2. post-media (публичный, до 10 МБ, изображения + видео)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-media', 'post-media', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4']);

-- 3. portfolio (публичный, до 10 МБ, только PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 10485760,
  ARRAY['application/pdf']);

-- 4. product-covers (публичный, до 5 МБ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('product-covers', 'product-covers', true, 5242880);

-- 5. company-logos (публичный, до 3 МБ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('company-logos', 'company-logos', true, 3145728);

-- 6. task-screenshots (приватный, до 10 МБ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-screenshots', 'task-screenshots', false, 10485760);

-- 7. chat-files (приватный, до 20 МБ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-files', 'chat-files', false, 20971520);

-- 8. products (приватный, до 50 МБ — файлы товаров, только для покупателей)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('products', 'products', false, 52428800);

-- 9. verification-docs (строго приватный, до 15 МБ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('verification-docs', 'verification-docs', false, 15728640);


-- ═══════════════════════════════════════════════════
-- STORAGE POLICIES
-- Структура путей: {user_id}/{filename}
-- ═══════════════════════════════════════════════════


-- ═══ avatars: загрузка/замена/удаление только в свою папку ═══

CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══ post-media: загрузка авторизованными, удаление своих ═══

CREATE POLICY "post_media_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "post_media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══ portfolio: загрузка/удаление только своя папка ═══

CREATE POLICY "portfolio_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'portfolio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══ product-covers: загрузка авторизованными ═══

CREATE POLICY "product_covers_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-covers' AND auth.role() = 'authenticated'
  );


-- ═══ company-logos: загрузка авторизованными ═══

CREATE POLICY "company_logos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos' AND auth.role() = 'authenticated'
  );


-- ═══ task-screenshots: загрузка своя, чтение только автор ═══

CREATE POLICY "task_screenshots_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "task_screenshots_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══ chat-files: загрузка авторизованными, чтение только автор ═══

CREATE POLICY "chat_files_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "chat_files_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══ products: загрузка продавцом, скачивание через service_role ═══

CREATE POLICY "products_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' AND auth.role() = 'authenticated'
  );


-- ═══ verification-docs: ТОЛЬКО через service_role (Edge Functions) ═══
-- Клиентских политик нет — полностью закрыт для прямого доступа


-- ═══ ПРОВЕРКА ═══
-- SELECT count(*) FROM storage.buckets;
-- Ожидается: 9

COMMIT;
