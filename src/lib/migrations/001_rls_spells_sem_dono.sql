-- Permite que qualquer usuário autenticado edite magias importadas (created_by = null).
-- Execute este script no Supabase SQL Editor.

create policy "Usuários logados editam magias sem dono"
  on spells for update
  using (created_by is null and auth.uid() is not null);
