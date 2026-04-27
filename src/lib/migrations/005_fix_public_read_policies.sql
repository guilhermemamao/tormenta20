-- Migration 005: garante policies de leitura pública nas tabelas de referência
-- Seguro para executar mesmo que 004 já tenha sido aplicado (usa DROP IF EXISTS)

DO $$
BEGIN
  -- classes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes visíveis para todos'
  ) THEN
    CREATE POLICY "classes visíveis para todos" ON classes FOR SELECT USING (true);
  END IF;

  -- class_abilities
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'class_abilities' AND policyname = 'class_abilities visíveis para todos'
  ) THEN
    CREATE POLICY "class_abilities visíveis para todos" ON class_abilities FOR SELECT USING (true);
  END IF;

  -- races
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'races' AND policyname = 'raças visíveis para todos'
  ) THEN
    CREATE POLICY "raças visíveis para todos" ON races FOR SELECT USING (true);
  END IF;

  -- origins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'origins' AND policyname = 'origens visíveis para todos'
  ) THEN
    CREATE POLICY "origens visíveis para todos" ON origins FOR SELECT USING (true);
  END IF;

  -- powers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'powers' AND policyname = 'poderes visíveis para todos'
  ) THEN
    CREATE POLICY "poderes visíveis para todos" ON powers FOR SELECT USING (true);
  END IF;
END $$;
