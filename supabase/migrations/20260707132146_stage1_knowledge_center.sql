create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto;

do $$
begin
  insert into storage.buckets (id, name, public)
  values
    ('kb-source-docs', 'kb-source-docs', false),
    ('kb-images', 'kb-images', false),
    ('kb-generated-reports', 'kb-generated-reports', false)
  on conflict (id) do update set
    name = excluded.name,
    public = false;
end $$;

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text not null,
  storage_bucket text,
  storage_path text,
  file_name text,
  file_ext text,
  file_size bigint,
  source_org text,
  author text,
  publish_year int,
  version text,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references source_documents(id) on delete cascade,
  chunk_index int not null,
  section_path text,
  page_start int,
  page_end int,
  content text not null,
  keywords text[],
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  unique (source_document_id, chunk_index)
);

create table if not exists knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  card_code text unique not null,
  title text not null,
  category text not null check (category in (
    'dynamic_indicator',
    'static_risk',
    'control_measure',
    'hidden_danger_template',
    'legal_basis',
    'threshold_rule',
    'cause_chain',
    'risk_mechanism',
    'ai_guardrail',
    'report_template',
    'faq'
  )),
  source_type text check (source_type in (
    'real_sensor',
    'physics_constrained',
    'static_prior',
    'manual_check',
    'legal_standard',
    'system_rule',
    'unknown'
  )),
  summary text,
  full_content text,
  related_channels text[],
  related_risks text[],
  related_locations text[],
  physical_meaning text,
  abnormal_signs text[],
  verification_actions text[],
  control_measures text[],
  legal_basis text[],
  threshold_rules jsonb default '{}',
  risk_level text,
  reliability_weight numeric,
  model_boundary text,
  human_review_policy text,
  source_document_ids uuid[],
  chunk_ids uuid[],
  confidence_level text default 'medium',
  needs_human_review boolean default true,
  status text default 'published',
  version text default 'v1',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint knowledge_cards_b_channel_boundary check (
    source_type <> 'physics_constrained'
    or coalesce(model_boundary, '') <> ''
    or coalesce(human_review_policy, '') <> ''
  )
);

create table if not exists knowledge_relations (
  id uuid primary key default gen_random_uuid(),
  source_card_code text not null,
  target_card_code text not null,
  relation_type text not null check (relation_type in (
    'explains',
    'supports',
    'triggers',
    'controlled_by',
    'based_on',
    'requires_verification',
    'related_to',
    'belongs_to',
    'cannot_directly_trigger',
    'used_by_module',
    'generates_report_section'
  )),
  description text,
  confidence_level text default 'medium',
  created_at timestamptz default now()
);

create table if not exists knowledge_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text unique not null,
  title text not null,
  rule_type text not null,
  applies_to_channels text[],
  condition_json jsonb default '{}',
  action_json jsonb default '{}',
  legal_basis text[],
  boundary_notes text,
  requires_human_review boolean default true,
  status text default 'published',
  version text default 'v1',
  created_at timestamptz default now()
);

create table if not exists knowledge_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text unique not null,
  title text not null,
  template_type text not null,
  trigger_source_type text,
  related_channels text[],
  fields_schema jsonb not null,
  default_content jsonb default '{}',
  status text default 'published',
  version text default 'v1',
  created_at timestamptz default now()
);

create table if not exists knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid,
  card_code text,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists knowledge_review_tasks (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid,
  card_code text,
  review_status text default 'pending',
  review_reason text,
  reviewer text,
  review_result text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists knowledge_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text not null,
  target_id uuid,
  card_code text,
  before_json jsonb,
  after_json jsonb,
  operator text,
  created_at timestamptz default now()
);

create table if not exists ai_qa_sessions (
  id uuid primary key default gen_random_uuid(),
  title text,
  module_source text,
  created_at timestamptz default now()
);

create table if not exists ai_qa_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_qa_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb default '[]',
  warnings jsonb default '[]',
  retrieved_cards jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists report_generation_records (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  title text not null,
  input_payload jsonb default '{}',
  generated_content text,
  citations jsonb default '[]',
  status text default 'draft',
  created_at timestamptz default now()
);

create index if not exists idx_knowledge_cards_category on knowledge_cards (category);
create index if not exists idx_knowledge_cards_card_code on knowledge_cards (card_code);
create index if not exists idx_knowledge_cards_source_type on knowledge_cards (source_type);
create index if not exists idx_knowledge_cards_status on knowledge_cards (status);
create index if not exists idx_knowledge_cards_related_channels on knowledge_cards using gin (related_channels);
create index if not exists idx_document_chunks_fts on document_chunks using gin (to_tsvector('simple', content));
create index if not exists idx_knowledge_cards_fts on knowledge_cards using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(full_content, '')));
create index if not exists idx_knowledge_embeddings_vector on knowledge_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists idx_knowledge_relations_source_card_code on knowledge_relations (source_card_code);
create index if not exists idx_knowledge_relations_target_card_code on knowledge_relations (target_card_code);

alter table source_documents enable row level security;
alter table document_chunks enable row level security;
alter table knowledge_cards enable row level security;
alter table knowledge_relations enable row level security;
alter table knowledge_rules enable row level security;
alter table knowledge_templates enable row level security;
alter table knowledge_embeddings enable row level security;
alter table knowledge_review_tasks enable row level security;
alter table knowledge_audit_logs enable row level security;
alter table ai_qa_sessions enable row level security;
alter table ai_qa_messages enable row level security;
alter table report_generation_records enable row level security;

drop policy if exists "published knowledge cards are readable" on knowledge_cards;
create policy "published knowledge cards are readable"
on knowledge_cards for select
to anon, authenticated
using (status = 'published');

drop policy if exists "published knowledge rules are readable" on knowledge_rules;
create policy "published knowledge rules are readable"
on knowledge_rules for select
to anon, authenticated
using (status = 'published');

drop policy if exists "published knowledge templates are readable" on knowledge_templates;
create policy "published knowledge templates are readable"
on knowledge_templates for select
to anon, authenticated
using (status = 'published');

grant select on knowledge_cards, knowledge_rules, knowledge_templates to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

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
as $$
  select
    ke.id,
    ke.target_type,
    ke.target_id,
    ke.card_code,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.metadata
  from knowledge_embeddings ke
  where ke.embedding is not null
    and (filter_metadata = '{}'::jsonb or ke.metadata @> filter_metadata)
    and 1 - (ke.embedding <=> query_embedding) >= match_threshold
  order by ke.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

revoke all on function match_knowledge_embeddings(extensions.vector(1536), float, int, jsonb) from public;
grant execute on function match_knowledge_embeddings(extensions.vector(1536), float, int, jsonb) to service_role;

insert into knowledge_cards (
  card_code,
  title,
  category,
  source_type,
  summary,
  full_content,
  related_channels,
  physical_meaning,
  verification_actions,
  control_measures,
  model_boundary,
  human_review_policy,
  confidence_level,
  needs_human_review,
  status
) values
  (
    'GUARDRAIL-63CH-001',
    '63通道口径与后端优先原则',
    'ai_guardrail',
    'system_rule',
    '当前系统通道数量必须以后端 meta、sensors/latest、stats 返回为准；附录卡口径为 22 个真实传感器指标位 + 41 个物理约束生成/估计指标。',
    'R01-R22 为 real_sensor；B01-B41 为 physics_constrained。前端和 AI 不得固定写死过期通道数，业务展示应读取后端 meta、sensors/latest、stats。',
    array['R01-R22', 'B01-B41'],
    '通道口径是业务解释边界，不是单一传感器事实。',
    array['核对后端 meta', '核对 sensors/latest', '核对 stats', '人工确认附录卡版本'],
    array['页面展示后端返回通道数', '报告保留 22+41 说明', '过期口径触发审核'],
    'B01-B41 是物理约束生成/估计指标，不是真实传感器。',
    '重大隐患、执法结论、撤人和断电必须人工审核。',
    'high',
    true,
    'published'
  ),
  (
    'GUARDRAIL-B-PHYSICS-001',
    'B01-B41 物理约束指标不可直接触发强制处置',
    'ai_guardrail',
    'physics_constrained',
    'B01-B41 不能单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。',
    'B01-B41 可作为风险提示、趋势解释、复核线索和模型辅助输入；必须结合 R01-R22、现场复核、调度研判和人工法规审核。',
    array['B01-B41'],
    '物理约束生成/估计指标用于解释模型和风险链路，不等同于传感器实测。',
    array['复核真实传感器 R01-R22', '核对现场记录', '人工安全审核', '必要时复测'],
    array['生成复核任务', '附加边界提示', '禁止输出强制处置结论'],
    '不能把 physics_constrained 指标写成真实传感器。',
    '强制处置、重大隐患和执法判断必须人工审核。',
    'high',
    true,
    'published'
  )
on conflict (card_code) do update set
  title = excluded.title,
  summary = excluded.summary,
  full_content = excluded.full_content,
  updated_at = now();

insert into knowledge_rules (
  rule_code,
  title,
  rule_type,
  applies_to_channels,
  condition_json,
  action_json,
  legal_basis,
  boundary_notes,
  requires_human_review,
  status
) values
  (
    'RULE-AI-CITATION-REQUIRED',
    'AI 问答必须引用知识库证据',
    'ai_guardrail',
    array['R01-R22', 'B01-B41'],
    '{"requires_citation": true}'::jsonb,
    '{"on_no_evidence": "refuse_or_request_review"}'::jsonb,
    array['企业知识库治理规则'],
    'AI 不允许空口生成结论；无证据时必须提示无法形成结论。',
    true,
    'published'
  ),
  (
    'RULE-HUMAN-REVIEW-MAJOR-HAZARD',
    '重大隐患最终判定必须人工审核',
    'human_review',
    array['R01-R22', 'B01-B41'],
    '{"major_hazard_candidate": true}'::jsonb,
    '{"required_action": "create_review_task"}'::jsonb,
    array['煤矿重大事故隐患判定标准', '煤矿安全规程'],
    '系统只能生成候选和证据链，最终判定必须由人工完成。',
    true,
    'published'
  )
on conflict (rule_code) do update set
  title = excluded.title,
  condition_json = excluded.condition_json,
  action_json = excluded.action_json;

insert into knowledge_templates (
  template_code,
  title,
  template_type,
  trigger_source_type,
  related_channels,
  fields_schema,
  default_content,
  status
) values
  (
    'TPL-HIDDEN-DANGER-REVIEW',
    '重大隐患人工复核闭环模板',
    'hidden_danger_template',
    'manual_check',
    array['R01-R22', 'B01-B41'],
    '{"fields":["candidate_reason","evidence_cards","sensor_snapshot","site_review","legal_review","decision","rectification","closeout"]}'::jsonb,
    '{"boundary":"系统候选不等于最终重大隐患判定。"}'::jsonb,
    'published'
  ),
  (
    'TPL-WARNING-REPORT-CITED',
    '预警报告证据引用模板',
    'report_template',
    'system_rule',
    array['R01-R22', 'B01-B41'],
    '{"fields":["summary","channel_basis","knowledge_citations","case_reference","human_review","boundary_notes"]}'::jsonb,
    '{"boundary":"报告必须展示知识库引用和人工审核状态。"}'::jsonb,
    'published'
  )
on conflict (template_code) do update set
  title = excluded.title,
  fields_schema = excluded.fields_schema,
  default_content = excluded.default_content;

insert into knowledge_relations (
  source_card_code,
  target_card_code,
  relation_type,
  description,
  confidence_level
) values
  (
    'GUARDRAIL-B-PHYSICS-001',
    'GUARDRAIL-63CH-001',
    'cannot_directly_trigger',
    'B01-B41 属于 63 通道中的物理约束生成/估计指标，不能单独触发强制处置。',
    'high'
  ),
  (
    'GUARDRAIL-63CH-001',
    'RULE-AI-CITATION-REQUIRED',
    'used_by_module',
    'AI 问答和报告生成必须引用知识库证据并保留 63 通道边界。',
    'high'
  )
on conflict do nothing;
