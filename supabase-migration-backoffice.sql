-- [Backoffice — Phase 0] Tables du backoffice admin. Accès service-role uniquement (RLS off,
-- comme le reste du projet). Idempotent.

create table if not exists subscription_events (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  type            text not null check (type in ('new','upgrade','downgrade','churn','reactivation')),
  mrr_delta       numeric not null default 0,
  created_at      timestamptz not null default now()
);

-- Journal d'usage (données réelles uniquement, aucun seed). metadata inclut utm_* / referrer sur
-- signup, et duration_seconds / estimated_cost_usd sur video_analysis.
create table if not exists usage_events (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid,
  user_id    text,
  event_type text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_events_created on usage_events(created_at);
create index if not exists idx_usage_events_club    on usage_events(club_id);
create index if not exists idx_usage_events_type    on usage_events(event_type);

-- Journal d'audit unique : toute mutation admin (manuelle ou système) y passe AVANT d'agir.
create table if not exists admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,             -- mon user_id ou 'system'
  action_type text not null,
  target_type text,
  target_id   text,
  payload     jsonb not null default '{}'::jsonb,   -- avant/après
  created_at  timestamptz not null default now()
);

create table if not exists account_notes (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid references clubs(id) on delete cascade,
  author     text not null,
  body       text not null,
  remind     boolean not null default false,  -- note marquée « à recontacter » (remonte dans la liste d'action)
  created_at timestamptz not null default now()
);
-- Filet idempotent si la table existait déjà sans la colonne.
alter table account_notes add column if not exists remind boolean not null default false;

-- Config des limites par plan (table plutôt que constantes en dur, pour ajuster sans redéployer).
-- max_value null = illimité ; 0/1 = booléen pour les features de périmètre.
create table if not exists plan_limits (
  plan         text not null check (plan in ('amateur','semi_pro','pro')),
  feature      text not null,
  max_value    numeric,
  reset_period text not null default 'none' check (reset_period in ('none','weekly')),
  primary key (plan, feature)
);

-- Débloque/étend une limite pour un compte précis (bêta-testeur, geste commercial) sans changer son plan.
create table if not exists account_overrides (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  feature    text not null,
  max_value  numeric,
  reason     text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_account_overrides_club on account_overrides(club_id);

-- Durée de la vidéo analysée (captée à l'upload) — pour le suivi du coût IA.
alter table video_analyses add column if not exists duration_sec numeric;

-- Seed de CONFIG (pas des données clients) — ajustable ensuite.
insert into plan_limits (plan, feature, max_value, reset_period) values
  ('amateur','video_analysis_minutes', 30,   'weekly'),
  ('amateur','extra_team',             0,    'none'),
  ('amateur','season_archive',         0,    'none'),
  ('amateur','cotisations',            0,    'none'),
  ('amateur','medical',                0,    'none'),
  ('amateur','multi_admin',            0,    'none'),
  ('amateur','pdf_export',             3,    'weekly'),
  ('amateur','session_template',       1,    'none'),
  ('semi_pro','video_analysis_minutes',180,  'weekly'),
  ('semi_pro','extra_team',            null, 'none'),
  ('semi_pro','season_archive',        null, 'none'),
  ('semi_pro','cotisations',           0,    'none'),
  ('semi_pro','medical',               0,    'none'),
  ('semi_pro','multi_admin',           0,    'none'),
  ('semi_pro','pdf_export',            null, 'none'),
  ('semi_pro','session_template',      null, 'none'),
  ('pro','video_analysis_minutes',     null, 'weekly'),
  ('pro','extra_team',                 null, 'none'),
  ('pro','season_archive',             null, 'none'),
  ('pro','cotisations',                1,    'none'),
  ('pro','medical',                    1,    'none'),
  ('pro','multi_admin',                1,    'none'),
  ('pro','pdf_export',                 null, 'none'),
  ('pro','session_template',           null, 'none')
on conflict (plan, feature) do nothing;
