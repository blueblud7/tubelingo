'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QuizCard from '@/components/quiz/QuizCard'
import { AnalyzedSentence, QuizQuestion } from '@/types'

interface VideoLesson {
  id: string
  title: string
  channel: { name: string } | null
  sentences: (AnalyzedSentence & { id: string })[]
}

function buildQuizQuestions(sentences: AnalyzedSentence[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  for (const s of sentences) {
    // Fill-in-the-blank: blank out a key vocabulary word
    if (s.vocabulary?.length > 0) {
      const vocab = s.vocabulary[0]
      const blanked = s.text.replace(new RegExp(`\\b${vocab.word}\\b`, 'i'), '___')
      if (blanked !== s.text) {
        questions.push({
          type: 'fill_blank',
          sentence: s,
          question: blanked,
          answer: vocab.word,
        })
      }
    }

    // Matching: match word to definition
    if (s.vocabulary?.length >= 2) {
      const vocab = s.vocabulary[1]
      const distractors = sentences
        .flatMap((x) => x.vocabulary ?? [])
        .filter((v) => v.word !== vocab.word)
        .slice(0, 3)
        .map((v) => v.definition)

      const options = [...distractors, vocab.definition].sort(() => Math.random() - 0.5)
      questions.push({
        type: 'matching',
        sentence: s,
        question: `What does "${vocab.word}" mean?`,
        options,
        answer: vocab.definition,
      })
    }
  }

  return questions.slice(0, 10)
}

export default function QuizPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data: VideoLesson[]) => {
        const found = data.find((v) => v.id === lessonId)
        if (found?.sentences) {
          setQuestions(buildQuizQuestions(found.sentences))
        }
      })
  }, [lessonId])

  if (questions.length === 0) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Preparing quiz...</div>
  }

  if (done) {
    const score = Math.round((correct / questions.length) * 100)
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-20 text-center">
        <span className="text-6xl">{score >= 70 ? '🏆' : '📚'}</span>
        <h2 className="text-2xl font-bold">Quiz complete!</h2>
        <p className="text-gray-500">
          {correct} of {questions.length} correct ({score}%)
        </p>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white"
        >
          Home
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">Quiz</h1>
      </div>

      {/* Progress */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <QuizCard
        question={questions[index]}
        onAnswer={(isCorrect) => {
          if (isCorrect) setCorrect((c) => c + 1)
          if (index + 1 >= questions.length) setDone(true)
          else setIndex((i) => i + 1)
        }}
      />
    </div>
  )
}
