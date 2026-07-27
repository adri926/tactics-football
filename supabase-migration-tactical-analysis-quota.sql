-- Garde-fou coût analyse tactique IA (Claude + embedding Gemini) : quota hebdomadaire par plan,
-- même principe que video_analysis_minutes (lib/rate-limit.ts, supabase-migration-backoffice.sql).
-- Coût réel ~0.002 $/analyse (Claude Haiku + embedding Gemini) : ces plafonds bornent l'abus,
-- pas la marge.
insert into plan_limits (plan, feature, max_value, reset_period) values
  ('amateur','tactical_analysis_requests',  20,   'weekly'),
  ('semi_pro','tactical_analysis_requests', 100,  'weekly'),
  ('pro','tactical_analysis_requests',      null, 'weekly')
on conflict (plan, feature) do nothing;
