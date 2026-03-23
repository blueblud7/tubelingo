'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SentenceCard from '@/components/lesson/SentenceCard'
import { AnalyzedSentence } from '@/types'

interface VideoLesson {
  id: string
  youtube_video_id: string
  title: string
  channel: { name: string } | null
  sentences: (AnalyzedSentence & { id: string })[]
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<VideoLesson | null>(null)
  const [index, setIndex] = useState(0)
  const [gotIt, setGotIt] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data: VideoLesson[]) => {
        const found = data.find((v) => v.id === id)
        if (found) setLesson(found)
      })
  }, [id])

  if (!lesson) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Loading...</div>
  }

  const sentences = lesson.sentences ?? []

  if (done) {
    const score = Math.round((gotIt.size / sentences.length) * 100)
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-20 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold">Lesson complete!</h2>
        <p className="text-gray-500">
          {gotIt.size} of {sentences.length} understood ({score}%)
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/quiz/${lesson.id}`)}
            className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white"
          >
            Take quiz
          </button>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  const sentence = sentences[index]

  const handleGotIt = () => {
    setGotIt((prev) => new Set(prev).add(sentence.id))
    if (index + 1 >= sentences.length) setDone(true)
    else setIndex(index + 1)
  }

  const handleReview = () => {
    if (index + 1 >= sentences.length) setDone(true)
    else setIndex(index + 1)
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="pt-4">
        <p className="text-xs font-medium text-blue-500">{lesson.channel?.name}</p>
        <h1 className="mt-0.5 line-clamp-1 text-lg font-bold text-gray-900">{lesson.title}</h1>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${((index + 1) / sentences.length) * 100}%` }}
        />
      </div>

      {sentence && (
        <SentenceCard
          sentence={sentence}
          index={index}
          total={sentences.length}
          onGotIt={handleGotIt}
          onReview={handleReview}
        />
      )}
    </div>
  )
}
