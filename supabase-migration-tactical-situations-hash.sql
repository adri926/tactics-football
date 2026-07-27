-- Phase 2.3 (analyse tactique augmentée) — hash des positions normalisées, pour éviter de
-- rappeler Claude/Gemini quand une situation géométriquement identique a déjà été analysée.
alter table tactical_situations add column if not exists positions_hash text;

create index if not exists tactical_situations_positions_hash_idx
  on tactical_situations(positions_hash);

-- Corrige une ambiguïté du schéma Phase 2.1 : `org_id is null` devait signifier "bibliothèque
-- curatée globale", mais un compte legacy sans org (scope owner_id) a aussi org_id null — les deux
-- cas étaient indistinguables. is_curated lève l'ambiguïté explicitement (aucune ligne curatée
-- n'existe encore, ce sera un ajout manuel/admin ultérieur).
alter table tactical_situations add column if not exists is_curated boolean not null default false;

-- Le principe tactique (troisième champ de la sortie Claude, avec description/tags) n'avait pas
-- de colonne dédiée dans le schéma Phase 2.1 — nécessaire pour que le cache par hash puisse le
-- restituer sans rappeler Claude.
alter table tactical_situations add column if not exists ai_principle text;
