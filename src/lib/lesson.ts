import { createServiceClient } from '@/lib/supabase'

// Create a lesson record after a video is processed
export async function createLesson(videoId: string) {
  const db = createServiceClient()
  await db
    .from('lessons')
    .upsert(
      {
        video_id: videoId,
        assigned_date: new Date().toISOString().split('T')[0],
        status: 'pending',
      },
      { onConflict: 'video_id' }
    )
}
