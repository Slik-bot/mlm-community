-- Разрешить участникам чата обновлять беседу
-- (нужно для закрепления/открепления сообщений)
CREATE POLICY "conversations_update_participant"
ON conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
);
