create or replace function match_knowledge_embeddings(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.78,
  match_count int default 8,
  filter_metadata jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  target_type text,
  target_id uuid,
  card_code text,
  content text,
  similarity float,
  metadata jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  select
    ke.id,
    ke.target_type,
    ke.target_id,
    ke.card_code,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.metadata
  from public.knowledge_embeddings ke
  where ke.embedding is not null
    and (filter_metadata = '{}'::jsonb or ke.metadata @> filter_metadata)
    and 1 - (ke.embedding <=> query_embedding) >= match_threshold
  order by ke.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

revoke all on function match_knowledge_embeddings(extensions.vector(1536), float, int, jsonb) from public;
grant execute on function match_knowledge_embeddings(extensions.vector(1536), float, int, jsonb) to service_role;
