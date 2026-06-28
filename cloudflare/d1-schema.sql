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
