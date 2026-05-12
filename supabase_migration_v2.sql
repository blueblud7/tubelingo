-- TubeLingo Migration v2: Multi-user unique constraints
-- Run this in Supabase SQL Editor if upgrading from initial schema

-- 1. lessons: allow multiple users to have a lesson for the same video
alter table lessons drop constraint if exists lessons_video_id_key;
alter table lessons add constraint if not exists lessons_video_id_user_id_key unique (video_id, user_id);

-- 2. user_vocabulary: allow multiple users to save the same word
alter table user_vocabulary drop constraint if exists unique_word;
alter table user_vocabulary add constraint if not exists unique_word_per_user unique (word, user_id);
