import { YoutubeTranscript } from 'youtube-transcript'

export async function fetchTranscript(videoId: string, lang = 'en'): Promise<string> {
  const items = await YoutubeTranscript.fetchTranscript(videoId, { lang }).catch(async () => {
    // Fallback: try without lang specifier
    return YoutubeTranscript.fetchTranscript(videoId)
  })

  if (!items || items.length === 0) {
    throw new Error('No transcript available for this video')
  }

  return items.map((item) => item.text).join(' ')
}
