import { YoutubeTranscript } from 'youtube-transcript'

export type TranscriptErrorType =
  | 'disabled'      // creator disabled captions
  | 'no_captions'   // no captions exist
  | 'lang_missing'  // lang not available
  | 'blocked'       // IP/captcha blocked by YouTube
  | 'unavailable'   // video removed/private
  | 'unknown'

export class TranscriptFetchError extends Error {
  constructor(
    message: string,
    public readonly errorType: TranscriptErrorType
  ) {
    super(message)
    this.name = 'TranscriptFetchError'
  }
}

function classifyError(err: unknown): TranscriptErrorType {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('disabled')) return 'disabled'
  if (msg.includes('No transcripts are available for')) return 'no_captions'
  if (msg.includes('No transcripts are available in')) return 'lang_missing'
  if (msg.includes('captcha') || msg.includes('too many requests')) return 'blocked'
  if (msg.includes('no longer available')) return 'unavailable'
  return 'unknown'
}

export async function fetchTranscript(videoId: string, lang = 'en'): Promise<string> {
  let lastError: unknown

  // Try with requested lang first
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang })
    if (items && items.length > 0) return items.map((item) => item.text).join(' ')
  } catch (err) {
    lastError = err
    // Only fall back on lang_missing — other errors won't be helped by removing lang
    if (classifyError(err) !== 'lang_missing') {
      throw new TranscriptFetchError(
        err instanceof Error ? err.message : String(err),
        classifyError(err)
      )
    }
  }

  // Fallback: try without lang (picks first available track)
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId)
    if (items && items.length > 0) return items.map((item) => item.text).join(' ')
    throw new TranscriptFetchError('Empty transcript returned', 'no_captions')
  } catch (err) {
    if (err instanceof TranscriptFetchError) throw err
    throw new TranscriptFetchError(
      err instanceof Error ? err.message : String(err),
      classifyError(err ?? lastError)
    )
  }
}
