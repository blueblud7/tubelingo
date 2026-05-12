import Parser from 'rss-parser'

const parser = new Parser()

export async function fetchChannelRSS(channelId: string) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const feed = await parser.parseURL(rssUrl)
  return feed
}

export async function extractChannelId(input: string): Promise<string> {
  // Handle direct channel ID
  if (/^UC[\w-]{22}$/.test(input)) return input

  // Extract from various YouTube URL formats
  const directIdPattern = /youtube\.com\/channel\/(UC[\w-]{22})/
  const directMatch = input.match(directIdPattern)
  if (directMatch) return directMatch[1]

  // Handle patterns that need handle resolution
  const handlePatterns = [
    /youtube\.com\/@([\w.-]+)/,
    /youtube\.com\/c\/([\w.-]+)/,
    /youtube\.com\/user\/([\w.-]+)/,
  ]

  for (const pattern of handlePatterns) {
    const match = input.match(pattern)
    if (match) return await resolveChannelHandle(match[1])
  }

  throw new Error('Invalid YouTube channel URL or ID')
}

async function resolveChannelHandle(handle: string): Promise<string> {
  // Try @handle first, fall back to /user/ if that fails
  const urls = [`https://www.youtube.com/@${handle}`, `https://www.youtube.com/user/${handle}`]
  for (const url of urls) {
    const channelId = await tryResolveUrl(url)
    if (channelId) return channelId
  }
  throw new Error(`Could not resolve channel handle: ${handle}`)
}

async function tryResolveUrl(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!res.ok) return null
  const html = await res.text()

  const patterns = [
    /"channelId":"(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /\/channel\/(UC[\w-]{22})/,
    /"browseId":"(UC[\w-]{22})"/,
    /channel_id=(UC[\w-]{22})/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }

  return null
}

export function buildRssUrl(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
}
