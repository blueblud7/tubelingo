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
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) {
      if (pattern === patterns[0]) return match[1]
      // For custom URLs / handles, resolve via RSS search
      return await resolveChannelHandle(match[1])
    }
  }

  throw new Error('Invalid YouTube channel URL or ID')
}

async function resolveChannelHandle(handle: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/@${handle}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  const html = await res.text()

  // Try multiple patterns YouTube uses
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

  throw new Error(`Could not resolve channel handle: ${handle}`)
}

export function buildRssUrl(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
}
