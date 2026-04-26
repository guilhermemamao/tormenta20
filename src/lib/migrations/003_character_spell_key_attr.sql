-- Add spell_key_attr column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS spell_key_attr text DEFAULT '';
