-- TubeLingo Migration v3: Transcript failure monitoring
-- Run this in Supabase SQL Editor

alter table videos
  add column if not exists transcript_error text
    check (transcript_error in ('disabled', 'no_captions', 'lang_missing', 'blocked', 'unavailable', 'unknown')),
  add column if not exists transcript_error_msg text;

create index if not exists idx_videos_transcript_error on videos(transcript_error)
  where transcript_error is not null;
