-- 012_quest_completed.sql
-- Add quest_completed field to users table for welcome quest tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS quest_completed boolean DEFAULT false;
