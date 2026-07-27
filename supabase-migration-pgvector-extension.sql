-- Phase 2.1 (analyse tactique augmentée) — active pgvector, nécessaire pour stocker
-- les embeddings de description tactique des situations (recherche par similarité sémantique)
create extension if not exists vector;
