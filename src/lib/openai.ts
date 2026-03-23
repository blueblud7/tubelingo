import OpenAI from 'openai'
import { AnalyzedSentence } from '@/types'

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const MODEL = 'gpt-4o-mini' // update to gpt-5-nano when available

export async function analyzeTranscript(
  transcript: string,
  targetLanguage: string,
  nativeLanguage: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
): Promise<AnalyzedSentence[]> {
  const difficultyGuide = {
    beginner: 'simple S+V+O structures, top 1000 frequency words (CEFR A1-A2)',
    intermediate: 'compound sentences, common idioms, top 3000 words (CEFR B1-B2)',
    advanced: 'complex clauses, nuanced expressions, specialized vocabulary (CEFR C1-C2)',
    mixed: '3 beginner + 4 intermediate + 3 advanced sentences',
  }

  const openai = getClient()
  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a language learning content analyzer. Given a YouTube video transcript in ${targetLanguage}, extract exactly 10 sentences optimized for language learning at the ${difficulty} level (${difficultyGuide[difficulty]}).

For each sentence provide:
- text: original sentence
- translation: translation to ${nativeLanguage}
- timestamp: approximate position in transcript (seconds, estimate if unknown)
- difficulty: rating 1-5
- vocabulary: array of {word, definition, pronunciation, part_of_speech}
- idioms: array of {phrase, literal_meaning, figurative_meaning, cultural_notes}
- grammar_points: array of {pattern, explanation}

Respond with JSON: {"sentences": [...]}`,
      },
      {
        role: 'user',
        content: `Transcript:\n\n${transcript.slice(0, 12000)}`,
      },
    ],
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No response from OpenAI')

  const parsed = JSON.parse(content)
  return parsed.sentences as AnalyzedSentence[]
}
