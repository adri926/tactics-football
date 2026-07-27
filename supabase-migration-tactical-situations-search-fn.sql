-- Phase 2.4 (analyse tactique augmentée) — recherche par similarité sémantique.
-- pgvector n'est pas requêtable (ORDER BY <=>) via le client JS Supabase sans fonction RPC.
-- Scope : bibliothèque curatée (is_curated) + situations du compte courant (org_id si présent,
-- sinon owner_id — même logique que getClubScope()). exclude_id sert à retirer la situation
-- qu'on vient d'analyser de ses propres suggestions de situations similaires.
create or replace function match_tactical_situations(
  query_embedding vector(1536),
  match_owner_id text,
  match_org_id text default null,
  match_count int default 3,
  exclude_id uuid default null
)
returns table (
  id uuid,
  title text,
  ai_description text,
  ai_tags text[],
  phase_of_play text,
  similarity float
)
language sql stable
as $$
  select
    ts.id,
    ts.title,
    ts.ai_description,
    ts.ai_tags,
    ts.phase_of_play,
    1 - (ts.embedding <=> query_embedding) as similarity
  from tactical_situations ts
  where ts.embedding is not null
    and (exclude_id is null or ts.id <> exclude_id)
    and (
      ts.is_curated
      or (match_org_id is not null and ts.org_id = match_org_id)
      or (match_org_id is null and ts.org_id is null and ts.owner_id = match_owner_id)
    )
  order by ts.embedding <=> query_embedding
  limit match_count;
$$;
