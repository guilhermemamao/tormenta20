-- Migration 004: tabela class_abilities e políticas de leitura pública para compêndio

CREATE TABLE class_abilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name text NOT NULL,
  name text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  description text NOT NULL,
  is_power boolean DEFAULT false,
  prerequisites jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE class_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_abilities visíveis para todos"
  ON class_abilities FOR SELECT
  USING (true);

-- Compêndio público: leitura livre nas tabelas de referência
CREATE POLICY "classes visíveis para todos"
  ON classes FOR SELECT
  USING (true);

CREATE POLICY "raças visíveis para todos"
  ON races FOR SELECT
  USING (true);

CREATE POLICY "origens visíveis para todos"
  ON origins FOR SELECT
  USING (true);

CREATE POLICY "poderes visíveis para todos"
  ON powers FOR SELECT
  USING (true);
