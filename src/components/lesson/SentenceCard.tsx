'use client'

import { useEffect, useRef, useState } from 'react'
import { AnalyzedSentence } from '@/types'

interface Props {
  sentence: AnalyzedSentence & { id: string }
  index: number
  total: number
  youtubeVideoId?: string
  targetLanguage?: string
  onGotIt: () => void
  onReview: () => void
}

export default function SentenceCard({ sentence, index, total, youtubeVideoId, targetLanguage = 'en', onGotIt, onReview }: Props) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [expandedWord, setExpandedWord] = useState<string | null>(null)
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set())
  const [savingWord, setSavingWord] = useState<string | null>(null)
  const [vocabLimitHit, setVocabLimitHit] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // STT state
  const [sttState, setSttState] = useState<'idle' | 'listening' | 'result'>('idle')
  const [sttTranscript, setSttTranscript] = useState('')
  const [sttScore, setSttScore] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Reset video/STT when sentence changes
  useEffect(() => {
    setShowTranslation(false)
    setExpandedWord(null)
    setShowVideo(false)
    setSttState('idle')
    setSttTranscript('')
    setSttScore(null)
  }, [sentence.text])

  const difficultyColor = {
    1: 'bg-green-100 text-green-700',
    2: 'bg-lime-100 text-lime-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-orange-100 text-orange-700',
    5: 'bg-red-100 text-red-700',
  }[sentence.difficulty] ?? 'bg-gray-100 text-gray-700'

  const saveWord = async (word: string) => {
    const v = sentence.vocabulary.find((v) => v.word === word)
    if (!v) return
    setSavingWord(word)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: v.word,
          definition: v.definition,
          part_of_speech: v.part_of_speech,
          pronunciation: v.pronunciation,
          source_sentence: sentence.text,
        }),
      })
      if (res.status === 403) {
        setVocabLimitHit(true)
        return
      }
      setSavedWords((prev) => new Set(prev).add(word))
    } finally {
      setSavingWord(null)
    }
  }

  // ── STT ─────────────────────────────────────────────────────────────────────

  const startSTT = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!SR) {
      alert('This browser does not support speech recognition.')
      return
    }

    const recognition = new SR()
    recognition.lang = targetLanguage.startsWith('en') ? 'en-US'
      : targetLanguage.startsWith('ja') ? 'ja-JP'
      : targetLanguage.startsWith('es') ? 'es-ES'
      : targetLanguage.startsWith('zh') ? 'zh-CN'
      : targetLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setSttState('listening')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript.trim()
      setSttTranscript(spoken)
      setSttScore(calcSimilarity(spoken, sentence.text, targetLanguage))
      setSttState('result')
    }
    recognition.onerror = () => setSttState('idle')
    recognition.onend = () => {
      if (sttState === 'listening') setSttState('idle')
    }
    recognition.start()
  }

  const stopSTT = () => {
    recognitionRef.current?.stop()
    setSttState('idle')
  }

  // ── YouTube iframe ───────────────────────────────────────────────────────────

  const hasTimestamp = youtubeVideoId && sentence.timestamp != null && sentence.timestamp > 0
  const videoSrc = hasTimestamp
    ? `https://www.youtube.com/embed/${youtubeVideoId}?start=${Math.floor(sentence.timestamp!)}&autoplay=1`
    : youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`
    : null

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{index + 1} / {total}</span>
        <div className="flex items-center gap-2">
          {/* Video play button — F-L05 */}
          {videoSrc && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 hover:bg-red-100"
              title="Play video clip"
            >
              ▶ Clip
            </button>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor}`}>
            Lv {sentence.difficulty}
          </span>
        </div>
      </div>

      {/* YouTube clip — F-L05 */}
      {showVideo && videoSrc && (
        <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={videoSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

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
        const isSaved = savedWords.has(v.word)
        const isSaving = savingWord === v.word
        return (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-blue-800">
                {v.word}
                {v.part_of_speech && (
                  <span className="ml-2 font-normal text-blue-500">({v.part_of_speech})</span>
                )}
              </p>
              <button
                onClick={() => !isSaved && saveWord(v.word)}
                disabled={isSaved || isSaving}
                className={`ml-3 shrink-0 text-lg transition-transform active:scale-90 ${
                  isSaved ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                }`}
                title={isSaved ? 'Saved to vocabulary' : 'Save to vocabulary'}
              >
                {isSaved ? '★' : isSaving ? '...' : '☆'}
              </button>
            </div>
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

      {/* Grammar Points */}
      {sentence.grammar_points?.length > 0 && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm">
          <p className="mb-2 font-semibold text-green-800">Grammar Points</p>
          {sentence.grammar_points.map((gp, i) => (
            <div key={i} className={i > 0 ? 'mt-3 border-t border-green-100 pt-3' : ''}>
              <p className="font-medium text-green-900">{gp.pattern}</p>
              <p className="mt-0.5 text-gray-600">{gp.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vocab limit banner */}
      {vocabLimitHit && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm">
          <p className="font-medium text-orange-700">Vocabulary limit reached (Free: 100 words)</p>
          <a href="/subscribe" className="text-orange-600 underline text-xs">Upgrade to Pro for unlimited →</a>
        </div>
      )}

      {/* Pronunciation practice — F-L06 */}
      <div className="flex flex-col gap-2">
        {sttState === 'idle' && (
          <button
            onClick={startSTT}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            🎤 Practice pronunciation
          </button>
        )}
        {sttState === 'listening' && (
          <button
            onClick={stopSTT}
            className="flex w-full animate-pulse items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600"
          >
            ⏹ Listening... tap to stop
          </button>
        )}
        {sttState === 'result' && sttScore !== null && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-gray-700">Your pronunciation</span>
              <span className={`font-bold ${sttScore >= 80 ? 'text-green-600' : sttScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                {sttScore}%
              </span>
            </div>
            <p className="italic text-gray-500">"{sttTranscript}"</p>
            <button
              onClick={() => { setSttState('idle'); setSttTranscript(''); setSttScore(null) }}
              className="mt-2 text-xs text-blue-500 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9　-鿿가-힯\s]/g, '').trim()
}

function calcSimilarity(spoken: string, target: string, language = 'en'): number {
  const a = normalize(spoken)
  const b = normalize(target)

  // Japanese / Chinese: character-level matching (no spaces between words)
  if (language.startsWith('ja') || language.startsWith('zh')) {
    const aSet = new Set(a.split('').filter((c) => c.trim()))
    const bChars = b.split('').filter((c) => c.trim())
    const matches = bChars.filter((c) => aSet.has(c)).length
    return Math.round((matches / Math.max(bChars.length, 1)) * 100)
  }

  // Korean / Latin / others: word-level matching
  const aWords = a.split(/\s+/).filter(Boolean)
  const bWords = b.split(/\s+/).filter(Boolean)
  const setB = new Set(bWords)
  const matches = aWords.filter((w) => setB.has(w)).length
  return Math.round((matches / Math.max(bWords.length, 1)) * 100)
}
