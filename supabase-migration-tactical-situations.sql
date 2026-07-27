-- Phase 2.1 (analyse tactique augmentée) — schéma de la bibliothèque de situations tactiques.
-- Pas de RLS (sécurité via Clerk + filtres owner_id/org_id, comme le reste du projet) ni de
-- référence à auth.users (owner_id est un Clerk user ID, pas un user Supabase Auth).
-- Table créée à vide ici : aucune donnée n'est encore générée (pas d'appel API dans cette phase).

create table if not exists tactical_situations (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null,        -- Clerk user ID (créateur)
  org_id         text,                 -- null = situation de bibliothèque curatée globale
  club_id        uuid references clubs(id) on delete cascade,
  title          text,
  raw_positions  jsonb not null,       -- pions + ballon normalisés (voir lib/tactics/normalize-situation.ts)
  phase_of_play  text,                 -- 'build-up' | 'transition' | 'pressing' | 'set-piece' ...
  ai_description text,                 -- généré par Claude (phase ultérieure)
  ai_tags        text[] default '{}',
  embedding      vector(1536),
  created_at     timestamptz default now()
);

create index if not exists tactical_situations_org_id_idx on tactical_situations(org_id);
create index if not exists tactical_situations_embedding_idx
  on tactical_situations using ivfflat (embedding vector_cosine_ops);
