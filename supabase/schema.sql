create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  agency_name text not null default '',
  phone text not null default '',
  notes text,
  role text not null default 'agent' check (role in ('agent', 'admin', 'super_admin', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles users read own" on public.profiles;
create policy "profiles users read own"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'approved'
  )
);

drop policy if exists "profiles admins update" on public.profiles;
create policy "profiles admins update"
on public.profiles for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'approved'
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    agency_name,
    phone,
    notes,
    status,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'agency_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'notes',
    coalesce(new.raw_user_meta_data->>'status', 'pending'),
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      agency_name = excluded.agency_name,
      phone = excluded.phone,
      notes = excluded.notes,
      status = excluded.status,
      role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.operational_emails (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.management_fees (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insurance_discounts (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_centers (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_codes (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_numbers (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mortgage_release (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposit_accounts (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'operational_emails',
    'email_templates',
    'management_fees',
    'insurance_discounts',
    'service_centers',
    'institution_codes',
    'bank_numbers',
    'mortgage_release',
    'deposit_accounts'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I',
      table_name,
      table_name
    );

    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );

    execute format(
      'drop policy if exists "%s authenticated read" on public.%I',
      table_name,
      table_name
    );

    execute format(
      'create policy "%s authenticated read" on public.%I for select to authenticated using (true)',
      table_name,
      table_name
    );
  end loop;
end;
$$;
