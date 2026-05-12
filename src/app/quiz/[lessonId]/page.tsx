'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QuizCard from '@/components/quiz/QuizCard'
import { AnalyzedSentence, QuizQuestion } from '@/types'

interface LessonEntry {
  id: string
  video: {
    title: string
    channel: { name: string } | null
    sentences: (AnalyzedSentence & { id: string })[]
  } | null
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildQuizQuestions(sentences: AnalyzedSentence[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  // Collect all vocab definitions for distractors
  const allVocabDefs = sentences.flatMap((s) => s.vocabulary ?? []).map((v) => v.definition)
  const allIdiomMeanings = sentences.flatMap((s) => s.idioms ?? []).map((i) => i.figurative_meaning)

  for (const s of sentences) {
    // Vocab fill-in-the-blank
    if (s.vocabulary?.length > 0) {
      const vocab = s.vocabulary[0]
      const blanked = s.text.replace(new RegExp(`\\b${vocab.word}\\b`, 'i'), '___')
      if (blanked !== s.text) {
        questions.push({ type: 'fill_blank', sentence: s, question: blanked, answer: vocab.word })
      }
    }

    // Vocab definition matching
    if (s.vocabulary?.length >= 2) {
      const vocab = s.vocabulary[1]
      const distractors = allVocabDefs.filter((d) => d !== vocab.definition).slice(0, 3)
      if (distractors.length >= 2) {
        questions.push({
          type: 'matching',
          sentence: s,
          question: `What does "${vocab.word}" mean?`,
          options: shuffle([...distractors, vocab.definition]),
          answer: vocab.definition,
        })
      }
    }

    // Idiom meaning matching
    if (s.idioms?.length > 0) {
      const idiom = s.idioms[0]
      const distractors = allIdiomMeanings.filter((m) => m !== idiom.figurative_meaning).slice(0, 3)
      if (distractors.length >= 2) {
        questions.push({
          type: 'matching',
          sentence: s,
          question: `What does "${idiom.phrase}" mean?`,
          options: shuffle([...distractors, idiom.figurative_meaning]),
          answer: idiom.figurative_meaning,
        })
      }
    }

    // Grammar fill-in-the-blank (use translation as hint)
    if (s.grammar_points?.length > 0) {
      const gp = s.grammar_points[0]
      // Build a question about the grammar pattern
      const otherPatterns = sentences
        .flatMap((x) => x.grammar_points ?? [])
        .filter((g) => g.pattern !== gp.pattern)
        .slice(0, 3)
        .map((g) => g.explanation)
      if (otherPatterns.length >= 2) {
        questions.push({
          type: 'matching',
          sentence: s,
          question: `The pattern "${gp.pattern}" means:`,
          options: shuffle([...otherPatterns, gp.explanation]),
          answer: gp.explanation,
        })
      }
    }
  }

  return shuffle(questions).slice(0, 10)
}

export default function QuizPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const router = useRouter()
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrongIndices, setWrongIndices] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [isRetry, setIsRetry] = useState(false)

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}`)
      .then((r) => r.json())
      .then((data: LessonEntry) => {
        if (data?.video?.sentences) {
          const q = buildQuizQuestions(data.video.sentences)
          setAllQuestions(q)
          setQuestions(q)
        }
      })
  }, [lessonId])

  const handleAnswer = (isCorrect: boolean) => {
    const newWrong = isCorrect ? wrongIndices : [...wrongIndices, index]
    const newCorrect = isCorrect ? correct + 1 : correct
    if (isCorrect) setCorrect(newCorrect)
    setWrongIndices(newWrong)

    if (index + 1 >= questions.length) {
      const score = Math.round((newCorrect / questions.length) * 100)
      if (!isRetry) {
        fetch(`/api/lessons/${lessonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', score }),
        })
      }
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const handleRetry = () => {
    const wrongQs = wrongIndices.map((i) => questions[i])
    setQuestions(wrongQs)
    setIndex(0)
    setCorrect(0)
    setWrongIndices([])
    setDone(false)
    setIsRetry(true)
  }

  const handleRetryAll = () => {
    setQuestions(allQuestions)
    setIndex(0)
    setCorrect(0)
    setWrongIndices([])
    setDone(false)
    setIsRetry(true)
  }

  if (questions.length === 0) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Preparing quiz...</div>
  }

  if (done) {
    const score = Math.round((correct / questions.length) * 100)
    const wrongCount = wrongIndices.length
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-20 text-center">
        <span className="text-6xl">{score >= 70 ? '🏆' : '📚'}</span>
        <h2 className="text-2xl font-bold">Quiz complete!</h2>
        <p className="text-gray-500">{correct} of {questions.length} correct ({score}%)</p>

        {/* Wrong answers summary */}
        {wrongCount > 0 && (
          <div className="w-full rounded-2xl bg-red-50 p-4 text-left">
            <p className="mb-3 text-sm font-semibold text-red-700">{wrongCount} missed question{wrongCount > 1 ? 's' : ''}</p>
            {wrongIndices.map((i) => (
              <div key={i} className="mb-2 rounded-lg bg-white p-3 text-sm">
                <p className="font-medium text-gray-700">{questions[i].question}</p>
                <p className="mt-0.5 text-green-600">✓ {questions[i].answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full flex-col gap-3">
          {/* F-Q04: Retry wrong only */}
          {wrongCount > 0 && (
            <button
              onClick={handleRetry}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-medium text-white"
            >
              Retry {wrongCount} wrong answer{wrongCount > 1 ? 's' : ''} ↩
            </button>
          )}
          {isRetry && (
            <button
              onClick={handleRetryAll}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
            >
              Retry all questions
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {isRetry ? 'Retry' : 'Quiz'}
        </h1>
        <span className="text-sm text-gray-400">{index + 1} / {questions.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>
      <QuizCard
        question={questions[index]}
        onAnswer={handleAnswer}
      />
    </div>
  )
}
