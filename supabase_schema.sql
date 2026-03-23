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
