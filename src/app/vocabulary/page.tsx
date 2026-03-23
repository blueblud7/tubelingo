'use client'

import { useEffect, useState } from 'react'

interface VocabEntry {
  id: string
  word: string
  definition: string
  part_of_speech?: string
  pronunciation?: string
  source_sentence?: string
  easiness_factor: number
  interval_days: number
  repetitions: number
  next_review: string
}

type View = 'list' | 'flashcard'

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [dueOnly, setDueOnly] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchWords = () =>
    fetch('/api/vocabulary')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setWords(data))
      .finally(() => setLoading(false))

  useEffect(() => { fetchWords() }, [])

  const dueWords = words.filter((w) => w.next_review <= today)
  const studyWords = dueOnly ? dueWords : words

  const removeWord = async (id: string) => {
    await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
    setWords((prev) => prev.filter((w) => w.id !== id))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Loading...</div>
  }

  if (view === 'flashcard') {
    return (
      <FlashcardMode
        words={studyWords}
        onDone={() => { setView('list'); fetchWords() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Vocabulary</h1>
        <p className="text-sm text-gray-500">{words.length} words saved</p>
      </div>

      {words.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-5xl">📖</span>
          <h2 className="text-lg font-semibold text-gray-700">No words saved yet</h2>
          <p className="text-sm text-gray-400">
            Tap the ☆ star on vocabulary words<br />during lessons to save them here.
          </p>
        </div>
      ) : (
        <>
          {/* Study buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { setDueOnly(false); setView('flashcard') }}
              className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-medium text-white"
            >
              Study all ({words.length})
            </button>
            {dueWords.length > 0 && (
              <button
                onClick={() => { setDueOnly(true); setView('flashcard') }}
                className="flex-1 rounded-xl border border-blue-300 py-3 text-sm font-medium text-blue-600"
              >
                Due today ({dueWords.length})
              </button>
            )}
          </div>

          {/* Word list */}
          <div className="flex flex-col gap-2">
            {words.map((w) => {
              const isDue = w.next_review <= today
              return (
                <div key={w.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{w.word}</span>
                      {w.part_of_speech && (
                        <span className="text-xs text-gray-400">({w.part_of_speech})</span>
                      )}
                      {isDue && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                          Due
                        </span>
                      )}
                    </div>
                    {w.pronunciation && <p className="text-xs text-gray-400">{w.pronunciation}</p>}
                    <p className="mt-0.5 text-sm text-gray-600">{w.definition}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Next review: {w.next_review} · Streak: {w.repetitions}
                    </p>
                  </div>
                  <button
                    onClick={() => removeWord(w.id)}
                    className="text-sm text-gray-300 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function FlashcardMode({ words, onDone }: { words: VocabEntry[]; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<{ id: string; quality: number }[]>([])

  const current = words[index]

  const handleAnswer = async (quality: number) => {
    const newResults = [...results, { id: current.id, quality }]
    setResults(newResults)

    // Update SM-2 in background
    fetch(`/api/vocabulary/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    })

    if (index + 1 >= words.length) {
      onDone()
    } else {
      setFlipped(false)
      setTimeout(() => setIndex((i) => i + 1), 100)
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-5xl">🎉</span>
        <h2 className="text-xl font-bold">All done!</h2>
        <button onClick={onDone} className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white">
          Back to list
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Flashcards</h1>
        <button onClick={onDone} className="text-sm text-gray-400">
          Exit
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${(index / words.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-400">{index + 1} / {words.length}</p>

      {/* Flashcard */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        className={`min-h-52 cursor-pointer rounded-2xl p-6 shadow-md transition-all ${
          flipped ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        {!flipped ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-3xl font-bold text-gray-900">{current.word}</p>
            {current.pronunciation && (
              <p className="text-gray-400">{current.pronunciation}</p>
            )}
            <p className="mt-4 text-sm text-gray-400">Tap to reveal definition</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-2xl font-bold text-blue-800">{current.word}</p>
            {current.part_of_speech && (
              <p className="text-sm text-blue-500">({current.part_of_speech})</p>
            )}
            <p className="text-gray-700">{current.definition}</p>
            {current.source_sentence && (
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm italic text-gray-500">
                "{current.source_sentence}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Answer buttons - only show after flip */}
      {flipped && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAnswer(1)}
            className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500"
          >
            Again
          </button>
          <button
            onClick={() => handleAnswer(3)}
            className="flex-1 rounded-xl border border-yellow-200 py-3 text-sm font-medium text-yellow-600"
          >
            Hard
          </button>
          <button
            onClick={() => handleAnswer(5)}
            className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-medium text-white"
          >
            Got it ✓
          </button>
        </div>
      )}
    </div>
  )
}
