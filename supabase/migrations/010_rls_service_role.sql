-- Allow service_role full access (Edge Functions use service_role key)
CREATE POLICY "service_role_all" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
