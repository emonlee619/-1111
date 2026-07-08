create extension if not exists pgcrypto;

create table if not exists kb_source_registry (
  source_id text primary key,
  title text not null,
  source_type text not null check (source_type in (
    'legal_regulation',
    'standard_spec',
    'policy_notice',
    'case_report',
    'enterprise_document',
    'equipment_manual',
    'cnki_literature',
    'wos_literature',
    'data_model_evidence'
  )),
  evidence_level text not null check (evidence_level in ('L1', 'L2', 'L3', 'L4', 'L5')),
  issuing_authority text,
  document_no text,
  publish_date date,
  effective_date date,
  status text not null default 'candidate',
  version text,
  official_url text,
  database_source text,
  doi text,
  standard_no text,
  report_no text,
  copyright_status text not null,
  access_method text not null,
  can_store_fulltext boolean not null default false,
  can_use_for_ai boolean not null default false,
  can_use_for_compliance boolean not null default false,
  needs_human_review boolean not null default true,
  related_modules text[] not null,
  keywords text[] not null default '{}',
  abstract text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kb_source_registry_related_modules_check check (
    related_modules <@ array[
      'monitoring_warning',
      'source_tracing',
      'dual_prevention',
      'digital_twin',
      'data_model',
      'knowledge_intelligence',
      'report_generation',
      'system_management'
    ]::text[]
  ),
  constraint kb_source_registry_compliance_level_check check (
    can_use_for_compliance = false or evidence_level in ('L1', 'L2', 'L3', 'L4')
  )
);

create table if not exists kb_legal_documents (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  legal_category text,
  jurisdiction text default 'CN',
  article_scope text,
  compliance_use text
);

create table if not exists kb_standards (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  standard_no text not null,
  standard_category text,
  applies_to text,
  replaces_standard_no text
);

create table if not exists kb_policy_documents (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  regulator text,
  policy_theme text,
  applicable_region text,
  implementation_deadline date
);

create table if not exists kb_case_reports (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  case_id text unique not null,
  accident_name text not null,
  accident_time text,
  accident_location text,
  accident_type text,
  disaster_type text,
  casualties text,
  direct_economic_loss text,
  mine_type text,
  working_face_or_roadway text,
  accident_process text,
  direct_cause text,
  indirect_cause text,
  management_cause text,
  technical_cause text,
  violation_behaviors text,
  failed_measures text,
  missing_monitoring_indicators text[] default '{}',
  precursor_signals text[] default '{}',
  related_legal_articles text[] default '{}',
  related_standards text[] default '{}',
  corrective_measures text,
  warning_education_points text,
  mapped_knowledge_cards text[] default '{}',
  mapped_risk_chains text[] default '{}',
  suitable_for_training_or_eval boolean not null default false,
  is_desensitized boolean not null default false,
  source_level text not null default 'L3',
  source_link_or_file text,
  human_review_status text not null default 'pending'
);

create table if not exists kb_enterprise_documents (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  enterprise_scope text,
  document_owner text,
  confidentiality_level text not null default 'internal',
  requires_desensitization boolean not null default true
);

create table if not exists kb_literature (
  source_id text primary key references kb_source_registry(source_id) on delete cascade,
  literature_source text not null check (literature_source in ('CNKI', 'Web of Science', 'Scopus', 'other')),
  authors text,
  journal_or_conference text,
  publication_year int,
  citation_count int,
  research_type text,
  has_field_data boolean,
  has_engineering_application boolean,
  review_priority text
);

create table if not exists kb_source_files (
  file_id uuid primary key default gen_random_uuid(),
  source_id text not null references kb_source_registry(source_id) on delete cascade,
  file_name text not null,
  file_ext text not null,
  local_path text,
  storage_bucket text,
  storage_path text,
  file_sha256 text,
  file_size_bytes bigint,
  copyright_status text not null,
  access_method text not null,
  can_store_fulltext boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists kb_source_review_tasks (
  review_id uuid primary key default gen_random_uuid(),
  source_id text not null references kb_source_registry(source_id) on delete cascade,
  review_type text not null,
  review_status text not null default 'pending',
  reviewer text,
  due_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists kb_source_collection_logs (
  log_id uuid primary key default gen_random_uuid(),
  source_id text references kb_source_registry(source_id) on delete set null,
  title text not null,
  source_type text not null,
  database_source text,
  official_url text,
  doi text,
  standard_no text,
  report_no text,
  download_time timestamptz not null default now(),
  file_name text,
  file_ext text,
  local_path text,
  storage_bucket text,
  storage_path text,
  copyright_status text,
  access_method text,
  can_store_fulltext boolean,
  can_use_for_ai boolean,
  can_use_for_compliance boolean,
  needs_human_review boolean,
  notes text
);

create table if not exists kb_source_deduplication_logs (
  dedup_id uuid primary key default gen_random_uuid(),
  run_id uuid not null default gen_random_uuid(),
  duplicate_type text not null,
  duplicate_key text not null,
  source_ids text[] not null,
  resolution_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
