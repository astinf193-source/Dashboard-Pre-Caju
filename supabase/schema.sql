-- Pré-Caju | Banco operacional Supabase
-- Execute no SQL Editor do projeto Supabase antes de publicar o site.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'reader' check (role in ('admin','operator','reader')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.personnel (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,
  full_name text not null,
  rank text not null default '',
  zone text not null default '',
  function_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.daily_assignments (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  personnel_id uuid not null references public.personnel(id),
  duty_status text not null default 'planned' check (duty_status in ('planned','present','absent','pending')),
  zone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique(service_date, personnel_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  category text not null check (category in ('Terrestre','Drone','Aquática')),
  status text not null default 'operational' check (status in ('operational','standby','maintenance','unavailable')),
  location text not null default '',
  notes text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  occurrence_date timestamptz not null default now(),
  type text not null,
  reference_point text not null default '',
  sector text not null default '',
  severity text not null default 'Leve' check (severity in ('Grave','Moderada','Leve')),
  report text not null default '',
  prevention_class text not null default '' check (prevention_class in ('','ativa','reativa')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin','operator'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'reader', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.personnel enable row level security;
alter table public.daily_assignments enable row level security;
alter table public.vehicles enable row level security;
alter table public.occurrences enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read personnel" on public.personnel;
create policy "authenticated read personnel" on public.personnel for select to authenticated using (true);
drop policy if exists "operators insert personnel" on public.personnel;
create policy "operators insert personnel" on public.personnel for insert to authenticated with check (public.is_operator());
drop policy if exists "operators update personnel" on public.personnel;
create policy "operators update personnel" on public.personnel for update to authenticated using (public.is_operator()) with check (public.is_operator());
drop policy if exists "admins delete personnel" on public.personnel;
create policy "admins delete personnel" on public.personnel for delete to authenticated using (public.is_admin());

drop policy if exists "authenticated read assignments" on public.daily_assignments;
create policy "authenticated read assignments" on public.daily_assignments for select to authenticated using (true);
drop policy if exists "operators insert assignments" on public.daily_assignments;
create policy "operators insert assignments" on public.daily_assignments for insert to authenticated with check (public.is_operator());
drop policy if exists "operators update assignments" on public.daily_assignments;
create policy "operators update assignments" on public.daily_assignments for update to authenticated using (public.is_operator()) with check (public.is_operator());
drop policy if exists "admins delete assignments" on public.daily_assignments;
create policy "admins delete assignments" on public.daily_assignments for delete to authenticated using (public.is_admin());

drop policy if exists "authenticated read vehicles" on public.vehicles;
create policy "authenticated read vehicles" on public.vehicles for select to authenticated using (true);
drop policy if exists "operators insert vehicles" on public.vehicles;
create policy "operators insert vehicles" on public.vehicles for insert to authenticated with check (public.is_operator());
drop policy if exists "operators update vehicles" on public.vehicles;
create policy "operators update vehicles" on public.vehicles for update to authenticated using (public.is_operator()) with check (public.is_operator());
drop policy if exists "admins delete vehicles" on public.vehicles;
create policy "admins delete vehicles" on public.vehicles for delete to authenticated using (public.is_admin());

drop policy if exists "authenticated read occurrences" on public.occurrences;
create policy "authenticated read occurrences" on public.occurrences for select to authenticated using (true);
drop policy if exists "operators insert occurrences" on public.occurrences;
create policy "operators insert occurrences" on public.occurrences for insert to authenticated with check (public.is_operator());
drop policy if exists "operators update occurrences" on public.occurrences;
create policy "operators update occurrences" on public.occurrences for update to authenticated using (public.is_operator()) with check (public.is_operator());
drop policy if exists "admins delete occurrences" on public.occurrences;
create policy "admins delete occurrences" on public.occurrences for delete to authenticated using (public.is_admin());

drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit" on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists "authenticated insert audit" on public.audit_log;
create policy "authenticated insert audit" on public.audit_log for insert to authenticated with check (actor_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.personnel, public.daily_assignments, public.vehicles, public.occurrences to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.audit_log to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated;

create index if not exists idx_occurrences_date on public.occurrences(occurrence_date desc);
create index if not exists idx_assignments_date on public.daily_assignments(service_date);
create index if not exists idx_vehicles_category on public.vehicles(category, status);
create index if not exists idx_personnel_registration on public.personnel(registration);
