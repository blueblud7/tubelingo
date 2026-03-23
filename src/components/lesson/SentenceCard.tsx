'use client'

import { useState } from 'react'
import { AnalyzedSentence } from '@/types'

interface Props {
  sentence: AnalyzedSentence
  index: number
  total: number
  onGotIt: () => void
  onReview: () => void
}

export default function SentenceCard({ sentence, index, total, onGotIt, onReview }: Props) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [expandedWord, setExpandedWord] = useState<string | null>(null)

  const difficultyColor = {
    1: 'bg-green-100 text-green-700',
    2: 'bg-lime-100 text-lime-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-orange-100 text-orange-700',
    5: 'bg-red-100 text-red-700',
  }[sentence.difficulty]

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          {index + 1} / {total}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor}`}>
          Lv {sentence.difficulty}
        </span>
      </div>

      {/* Sentence */}
      <p className="text-xl font-medium leading-relaxed text-gray-900">{sentence.text}</p>

      {/* Translation toggle */}
      <button
        onClick={() => setShowTranslation(!showTranslation)}
        className="text-sm text-blue-500 underline underline-offset-2"
      >
        {showTranslation ? 'Hide translation' : 'Show translation'}
      </button>
      {showTranslation && (
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-gray-700">{sentence.translation}</p>
      )}

      {/* Vocabulary */}
      {sentence.vocabulary?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sentence.vocabulary.map((v) => (
            <button
              key={v.word}
              onClick={() => setExpandedWord(expandedWord === v.word ? null : v.word)}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {v.word}
            </button>
          ))}
        </div>
      )}

      {/* Expanded vocab detail */}
      {expandedWord && (() => {
        const v = sentence.vocabulary.find((v) => v.word === expandedWord)
        if (!v) return null
        return (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
            <p className="font-semibold text-blue-800">
              {v.word}
              {v.part_of_speech && (
                <span className="ml-2 font-normal text-blue-500">({v.part_of_speech})</span>
              )}
            </p>
            {v.pronunciation && <p className="text-gray-500">{v.pronunciation}</p>}
            <p className="mt-1 text-gray-700">{v.definition}</p>
          </div>
        )
      })()}

      {/* Idioms */}
      {sentence.idioms?.length > 0 && (
        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 text-sm">
          <p className="mb-1 font-semibold text-yellow-800">Idioms & Expressions</p>
          {sentence.idioms.map((idiom) => (
            <div key={idiom.phrase} className="mt-2">
              <p className="font-medium text-yellow-900">"{idiom.phrase}"</p>
              <p className="text-gray-600">
                <span className="text-gray-400">Meaning: </span>
                {idiom.figurative_meaning}
              </p>
              {idiom.cultural_notes && (
                <p className="text-gray-500 italic">{idiom.cultural_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex gap-3">
        <button
          onClick={onReview}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Review again
        </button>
        <button
          onClick={onGotIt}
          className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-medium text-white hover:bg-blue-600"
        >
          Got it ✓
        </button>
      </div>
    </div>
  )
}
