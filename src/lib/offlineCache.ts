// Offline cache utilities using localStorage (simple, no IndexedDB complexity)
// Stores up to 50 lessons for Pro users

const CACHE_KEY = 'tubelingo_offline_lessons'
const CACHE_META_KEY = 'tubelingo_offline_meta'
const MAX_LESSONS = 50

interface CachedLesson {
  id: string
  assigned_date: string
  status: string
  score: number | null
  video: {
    id: string
    youtube_video_id: string
    title: string
    channel: { id: string; name: string } | null
    sentences: unknown[]
  } | null
}

interface CacheMeta {
  cachedAt: string
  count: number
}

export function getCachedLessons(): CachedLesson[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getCacheMeta(): CacheMeta | null {
  try {
    const raw = localStorage.getItem(CACHE_META_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function saveOfflineLessons(): Promise<{ count: number }> {
  const res = await fetch('/api/lessons')
  if (!res.ok) throw new Error('Failed to fetch lessons')

  const lessons: CachedLesson[] = await res.json()
  const toCache = lessons.slice(0, MAX_LESSONS)

  localStorage.setItem(CACHE_KEY, JSON.stringify(toCache))
  const meta: CacheMeta = { cachedAt: new Date().toISOString(), count: toCache.length }
  localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta))

  return { count: toCache.length }
}

export function clearOfflineCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_META_KEY)
}
