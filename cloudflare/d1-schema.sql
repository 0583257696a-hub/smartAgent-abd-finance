create table if not exists ops_records (
  module text not null,
  record_id text not null,
  dedupe_key text not null,
  data text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  primary key (module, record_id)
);

create unique index if not exists idx_ops_records_dedupe
on ops_records(module, dedupe_key);

create table if not exists ops_users (
  id text primary key,
  email text not null unique,
  password text not null,
  full_name text not null,
  agency_name text not null,
  phone text not null,
  notes text,
  role text not null default 'agent',
  status text not null default 'pending',
  permissions text not null default '{}',
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists ops_audit_log (
  id text primary key,
  actor_id text,
  action text not null,
  target_id text,
  details text,
  created_at text not null default current_timestamp
);
