'use client'

import { useState } from 'react'
import { QuizQuestion } from '@/types'

interface Props {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export default function QuizCard({ question, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [fillInput, setFillInput] = useState('')

  const handleSubmit = () => {
    if (submitted) return
    setSubmitted(true)
    const answer =
      question.type === 'fill_blank' ? fillInput.trim().toLowerCase() : selected ?? ''
    const correct = answer === question.answer.toLowerCase()
    setTimeout(() => onAnswer(correct), 1200)
  }

  if (question.type === 'matching') {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md">
        <p className="text-sm font-medium text-gray-400">Matching</p>
        <p className="text-lg font-medium text-gray-900">{question.question}</p>

        <div className="flex flex-col gap-2">
          {question.options?.map((opt) => {
            const isSelected = selected === opt
            const isCorrect = submitted && opt === question.answer
            const isWrong = submitted && isSelected && opt !== question.answer
            return (
              <button
                key={opt}
                onClick={() => !submitted && setSelected(opt)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-all
                  ${isCorrect ? 'border-green-400 bg-green-50 text-green-800' : ''}
                  ${isWrong ? 'border-red-400 bg-red-50 text-red-800' : ''}
                  ${!isCorrect && !isWrong && isSelected ? 'border-blue-400 bg-blue-50' : ''}
                  ${!isCorrect && !isWrong && !isSelected ? 'border-gray-200 hover:border-gray-300' : ''}
                `}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selected || submitted}
          className="mt-2 w-full rounded-xl bg-blue-500 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          Check
        </button>
      </div>
    )
  }

  // Fill in the blank
  const parts = question.question.split('___')
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md">
      <p className="text-sm font-medium text-gray-400">Fill in the blank</p>
      <p className="text-lg font-medium leading-relaxed text-gray-900">
        {parts[0]}
        <span className="inline-block min-w-[80px] border-b-2 border-blue-400 px-1 text-blue-600">
          {submitted ? question.answer : fillInput || '　'}
        </span>
        {parts[1]}
      </p>

      {!submitted && (
        <input
          type="text"
          value={fillInput}
          onChange={(e) => setFillInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type your answer"
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          autoFocus
        />
      )}

      {submitted && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            fillInput.trim().toLowerCase() === question.answer.toLowerCase()
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {fillInput.trim().toLowerCase() === question.answer.toLowerCase()
            ? 'Correct!'
            : `Answer: ${question.answer}`}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!fillInput.trim() || submitted}
        className="mt-2 w-full rounded-xl bg-blue-500 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        Check
      </button>
    </div>
  )
}
