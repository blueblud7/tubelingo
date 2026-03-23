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
