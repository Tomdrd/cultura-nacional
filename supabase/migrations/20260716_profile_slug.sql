-- Adiciona coluna profile_slug para URL amigável personalizada (CN Pro)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_slug TEXT;

-- Índice único (ignora NULLs automaticamente no Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_unique
  ON profiles (profile_slug);

-- Formato válido: 3-30 chars, letras minúsculas/números/hífens, sem hífens no início/fim
ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_slug_format
  CHECK (
    profile_slug IS NULL OR (
      profile_slug ~ '^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$'
      AND length(profile_slug) BETWEEN 3 AND 30
    )
  );
