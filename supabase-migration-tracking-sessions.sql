-- Phase 4.1 (analyse tactique augmentée) — schéma canonique de données de tracking réelles.
-- Créé maintenant en fondation architecturale : `computePitchControl` (lib/tactics/pitch-control.ts)
-- consomme déjà des PlayerPosition{x,y,team,dirX,dirY,speed} sans savoir d'où elles viennent —
-- tracking_frames alimente le même type via un adaptateur (lib/tracking/), sans jamais toucher
-- au moteur de calcul.
--
-- ⚠️ Non activé pour des données réelles de mineurs tant que le cadre de consentement/gouvernance
-- n'a pas été explicitement étendu à ce type de donnée (position/mouvement nominatif) — voir la
-- vigilance RGPD du document source Phase 4.4. Cette migration ne fait que poser le schéma.
--
-- FK vers `players` (pas `club_players`, table vestigiale sans aucune référence dans le code de
-- l'app — confirmé par grep + inspection du Table Editor le 2026-07-27). `supabase-schema.sql`
-- est un schéma de base obsolète ; `players` est la vraie table de roster utilisée partout.
create table if not exists tracking_sessions (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid references clubs(id) on delete cascade,
  source       text not null check (source in ('gps_csv', 'video_vision', 'manual_replay')),
  session_date date,
  created_at   timestamptz not null default now()
);
create index if not exists tracking_sessions_club_id_idx on tracking_sessions(club_id);

create table if not exists tracking_frames (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references tracking_sessions(id) on delete cascade,
  player_id    uuid references players(id) on delete set null, -- nullable si joueur non identifié (vision sans reconnaissance)
  team         text not null check (team in ('A', 'B')),
  timestamp_ms integer not null,
  x            numeric not null,
  y            numeric not null,
  dir_x        numeric,
  dir_y        numeric,
  speed        numeric
);
create index if not exists tracking_frames_session_timestamp_idx on tracking_frames(session_id, timestamp_ms);
