export interface Channel {
  id: string
  youtube_id: string
  rss_url: string
  name: string
  thumbnail_url?: string
  language: string
  category?: string
  created_at: string
}

export interface Video {
  id: string
  channel_id: string
  youtube_video_id: string
  title: string
  published_at: string
  transcript?: string
  processed: boolean
}

export interface Sentence {
  id: string
  video_id: string
  text: string
  translation: string
  timestamp?: number
  difficulty: 1 | 2 | 3 | 4 | 5
  audio_url?: string
}

export interface VocabItem {
  word: string
  definition: string
  pronunciation?: string
  part_of_speech?: string
}

export interface IdiomItem {
  phrase: string
  literal_meaning: string
  figurative_meaning: string
  cultural_notes?: string
}

export interface GrammarPoint {
  pattern: string
  explanation: string
}

export interface AnalyzedSentence {
  text: string
  translation: string
  timestamp?: number
  difficulty: 1 | 2 | 3 | 4 | 5
  vocabulary: VocabItem[]
  idioms: IdiomItem[]
  grammar_points: GrammarPoint[]
}

export interface Lesson {
  id: string
  user_id: string
  video_id: string
  date: string
  sentences: AnalyzedSentence[]
  status: 'pending' | 'in_progress' | 'completed'
  score?: number
  channel?: Channel
  video?: Video
}

export interface UserProfile {
  id: string
  email: string
  native_lang: string
  target_langs: string[]
  difficulty_pref: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  notification_time?: string
}

export type QuizType = 'fill_blank' | 'matching'

export interface QuizQuestion {
  type: QuizType
  sentence: AnalyzedSentence
  question: string
  options?: string[]
  answer: string
}
