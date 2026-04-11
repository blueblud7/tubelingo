-- TubeLingo Supabase Schema
-- Run this in Supabase SQL Editor

-- Channels
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique,
  rss_url text not null,
  name text not null,
  thumbnail_url text,
  language text not null default 'en',
  category text,
  created_at timestamptz default now()
);

-- Videos
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  youtube_video_id text not null unique,
  title text not null,
  published_at timestamptz,
  transcript text,
  processed boolean default false,
  created_at timestamptz default now()
);

-- Sentences (with full AI analysis stored as JSONB)
create table if not exists sentences (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  text text not null,
  translation text,
  timestamp float,
  difficulty int check (difficulty between 1 and 5),
  audio_url text,
  vocabulary jsonb default '[]',
  idioms jsonb default '[]',
  grammar_points jsonb default '[]',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_videos_channel on videos(channel_id);
create index if not exists idx_videos_processed on videos(processed);
create index if not exists idx_sentences_video on sentences(video_id);

-- Enable Row Level Security (adjust policies as needed)
alter table channels enable row level security;
alter table videos enable row level security;
alter table sentences enable row level security;

-- Public read policies (for MVP — tighten for production)
create policy "public read channels" on channels for select using (true);
create policy "public read videos" on videos for select using (true);
create policy "public read sentences" on sentences for select using (true);

-- Service role can do everything (API routes use service role key)

-- Lessons (date-based history tracking)
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade not null unique,
  assigned_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  score int,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_lessons_date on lessons(assigned_date desc);

alter table lessons enable row level security;
create policy "public read lessons" on lessons for select using (true);
create policy "public write lessons" on lessons for all using (true);

-- Subscriber count tracking (run this if channels table already exists)
alter table channels add column if not exists subscriber_count int default 0;

-- Auto-generate toggle (F-C04)
alter table channels add column if not exists auto_generate boolean default true;

-- ============================================================
-- Phase 3: Supabase Auth + User Profiles
-- ============================================================

-- User profiles (linked to Supabase Auth users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  native_lang text not null default 'ko',
  target_lang text not null default 'en',
  difficulty_pref text not null default 'mixed' check (difficulty_pref in ('beginner', 'intermediate', 'advanced', 'mixed')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarded boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- Trigger: auto-create profile on sign up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Add user_id to channels (nullable for backward compat; enforce per-user after migration)
alter table channels add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_channels_user on channels(user_id);

-- Update channels RLS: users see only their own channels
drop policy if exists "public read channels" on channels;
create policy "users read own channels" on channels for select using (
  auth.uid() = user_id or user_id is null
);
create policy "users write own channels" on channels for all using (
  auth.uid() = user_id or user_id is null
);

-- Add user_id to user_vocabulary
alter table user_vocabulary add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_vocab_user on user_vocabulary(user_id);

-- Update vocabulary RLS
drop policy if exists "public access vocabulary" on user_vocabulary;
create policy "users access own vocabulary" on user_vocabulary for all using (
  auth.uid() = user_id or user_id is null
);

-- Lessons: inherit user scoping via channels (no direct user_id needed)
-- But add for direct filtering:
alter table lessons add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_lessons_user on lessons(user_id);

drop policy if exists "public read lessons" on lessons;
drop policy if exists "public write lessons" on lessons;
create policy "users read own lessons" on lessons for select using (
  auth.uid() = user_id or user_id is null
);
create policy "users write own lessons" on lessons for all using (
  auth.uid() = user_id or user_id is null
);

-- ============================================================
-- Phase 4: B2B Teacher Dashboard
-- ============================================================

-- Classes: a teacher's class group
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

create index if not exists idx_classes_teacher on classes(teacher_id);
alter table classes enable row level security;
create policy "teachers manage own classes" on classes for all using (auth.uid() = teacher_id);

-- Class memberships: students in a class
create table if not exists class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(class_id, student_id)
);

create index if not exists idx_members_class on class_members(class_id);
create index if not exists idx_members_student on class_members(student_id);
alter table class_members enable row level security;
create policy "teachers see class members" on class_members for select
  using (exists (select 1 from classes where id = class_id and teacher_id = auth.uid()));
create policy "students see own memberships" on class_members for select
  using (student_id = auth.uid());
create policy "students join classes" on class_members for insert
  with check (student_id = auth.uid());

-- Class channel assignments: channels a teacher distributes to a class
create table if not exists class_channels (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade not null,
  channel_id uuid references channels(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique(class_id, channel_id)
);

alter table class_channels enable row level security;
create policy "teachers manage class channels" on class_channels for all
  using (exists (select 1 from classes where id = class_id and teacher_id = auth.uid()));

-- User Vocabulary (flashcard book)
create table if not exists user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  definition text not null,
  part_of_speech text,
  pronunciation text,
  source_sentence text,
  source_video_id uuid references videos(id) on delete set null,
  -- SM-2 spaced repetition fields
  easiness_factor float default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  next_review date default current_date,
  created_at timestamptz default now(),
  constraint unique_word unique (word)
);

create index if not exists idx_vocab_next_review on user_vocabulary(next_review);

alter table user_vocabulary enable row level security;
create policy "public access vocabulary" on user_vocabulary for all using (true);
