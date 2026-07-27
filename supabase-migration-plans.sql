-- [Backoffice — Phase 0] Migration du modèle de plans : solo/club → amateur/semi_pro/pro
-- + enrichissement de `subscriptions` (agnostique processeur de paiement). Idempotent.

-- 1) Remap des valeurs existantes AVANT de rétablir le CHECK
alter table subscriptions drop constraint if exists subscriptions_plan_check;
update subscriptions set plan = 'amateur'  where plan = 'solo';
update subscriptions set plan = 'semi_pro' where plan = 'club';
alter table subscriptions alter column plan set default 'amateur';
alter table subscriptions
  add constraint subscriptions_plan_check check (plan in ('amateur','semi_pro','pro'));

-- 2) Statut élargi
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions
  add constraint subscriptions_status_check
  check (status in ('active','trialing','past_due','canceled'));

-- 3) Colonnes du spec (paiement agnostique) — provider_subscription_id remplace à terme
--    stripe_subscription_id (conservé pour compat).
alter table subscriptions
  add column if not exists mrr_amount              numeric     not null default 0,
  add column if not exists currency                text        not null default 'EUR',
  add column if not exists provider                text        not null default 'none'
      check (provider in ('stripe','lemonsqueezy','manual','none')),
  add column if not exists provider_subscription_id text,
  add column if not exists started_at              timestamptz not null default now(),
  add column if not exists current_period_start    timestamptz,
  add column if not exists current_period_end      timestamptz,
  add column if not exists canceled_at             timestamptz,
  add column if not exists cancellation_reason     text;
