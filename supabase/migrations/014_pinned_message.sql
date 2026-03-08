ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;
