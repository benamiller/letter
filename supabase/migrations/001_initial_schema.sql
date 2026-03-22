-- Letter — Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  timezone text not null default 'UTC',
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'cancelled')),
  trial_ends_at timestamptz not null default (now() + interval '28 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Letters
create table public.letters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  delivered_at timestamptz not null,
  week_start date not null,
  created_at timestamptz not null default now()
);

-- Entries (what users share with Nia throughout the week)
create table public.entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  type text not null default 'text' check (type in ('text', 'voice')),
  transcript text,
  week_start date not null default date_trunc('week', current_date)::date,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.letters enable row level security;
alter table public.entries enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can view own letters"
  on public.letters for select using (auth.uid() = user_id);

create policy "Users can view own entries"
  on public.entries for select using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert with check (auth.uid() = user_id);

-- Indexes
create index letters_user_id_delivered_at on public.letters(user_id, delivered_at desc);
create index entries_user_id_week_start on public.entries(user_id, week_start desc);
