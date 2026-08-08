-- Supabase schema: profiles table with Row Level Security

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    role text not null check (role in ('driver', 'operator')),
    created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Remove previous policies if they exist
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

-- Users can read only their own profile
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

-- Users can insert only a profile belonging to themselves
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

-- Users can update only their own profile
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Create a secure trigger function to populate public.profiles for new auth users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  user_full_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  user_role text := new.raw_user_meta_data ->> 'role';
begin
  if user_full_name <> '' and user_role in ('driver', 'operator') then
    insert into public.profiles (id, full_name, role)
    values (new.id, user_full_name, user_role)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists handle_new_user_trigger on auth.users;
create trigger handle_new_user_trigger
after insert on auth.users
for each row execute function public.handle_new_user();