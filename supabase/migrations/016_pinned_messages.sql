-- Таблица для множественных закреплённых сообщений
CREATE TABLE IF NOT EXISTS pinned_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  pinned_at       timestamptz DEFAULT now(),
  position        int NOT NULL DEFAULT 0,
  UNIQUE(conversation_id, message_id)
);

ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinned_messages_select"
ON pinned_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = pinned_messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);

CREATE POLICY "pinned_messages_insert"
ON pinned_messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = pinned_messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);

CREATE POLICY "pinned_messages_delete"
ON pinned_messages FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = pinned_messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS pinned_messages_conv_idx
  ON pinned_messages(conversation_id, position);
