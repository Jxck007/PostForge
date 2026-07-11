import { XMLParser } from 'fast-xml-parser'

type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type Topic = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  matchedKeywords: string[]
  score: number
  publishedAt: string
}

const feeds = [
  { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/rss/' },
  { name: 'DEV Community', url: 'https://dev.to/feed' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
]

function bodyAsObject(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
}

function stripMarkup(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
  }

  return value && typeof value === 'object' ? [value as Record<string, unknown>] : []
}

function feedItems(xml: string, source: string) {
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml) as Record<string, unknown>
  const rss = parsed.rss as Record<string, unknown> | undefined
  const channel = rss?.channel as Record<string, unknown> | undefined
  const atom = parsed.feed as Record<string, unknown> | undefined
  const rawItems = channel ? asArray(channel.item) : asArray(atom?.entry)

  return rawItems.map((item) => {
    const links = asArray(item.link)
    const atomLink = links.find((link) => link['@_href'])?.['@_href']
    return {
      title: stripMarkup(item.title),
      summary: stripMarkup(item.description || item.summary || item.content).slice(0, 500),
      url: stripMarkup(item.link) || (typeof atomLink === 'string' ? atomLink : ''),
      publishedAt: stripMarkup(item.pubDate || item.published || item.updated),
      source,
    }
  })
}

async function readFeed(feed: { name: string; url: string }) {
  const result = await fetch(feed.url, { signal: AbortSignal.timeout(8_000) })
  if (!result.ok) {
    throw new Error(`RSS status ${result.status}`)
  }

  return feedItems(await result.text(), feed.name)
}

function freshnessScore(publishedAt: string) {
  const timestamp = Date.parse(publishedAt)
  if (Number.isNaN(timestamp)) {
    return 0
  }

  const ageInHours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60))
  if (ageInHours <= 24) {
    return 6
  }
  if (ageInHours <= 24 * 7) {
    return 4
  }
  if (ageInHours <= 24 * 30) {
    return 2
  }
  return 0
}

function publishedTimestamp(publishedAt: string) {
  const timestamp = Date.parse(publishedAt)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Use POST to fetch topics.' })
    return
  }

  const body = bodyAsObject(request.body)
  const rawInterests = body.interests
  const interests = Array.isArray(rawInterests)
    ? rawInterests
        .filter((interest): interest is string => typeof interest === 'string')
        .map((interest) => interest.trim().toLowerCase().slice(0, 80))
        .filter(Boolean)
        .slice(0, 12)
    : []

  if (interests.length === 0) {
    response.status(400).json({ error: 'Add at least one interest before fetching topics.' })
    return
  }

  const rawLimit = body.limit
  if (rawLimit !== undefined && (!Number.isInteger(rawLimit) || typeof rawLimit !== 'number')) {
    response.status(400).json({ error: 'Limit must be a whole number.' })
    return
  }
  const limit = Math.min(Math.max(rawLimit ?? 10, 1), 10)

  try {
    const results = await Promise.allSettled(feeds.map(readFeed))
    const successfulFeeds = results.filter((result) => result.status === 'fulfilled')
    if (successfulFeeds.length === 0) {
      response.status(502).json({ error: 'Could not reach the topic feeds right now. Please try again.' })
      return
    }

    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('RSS feed failed', result.reason)
      }
    }

    const items = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    const topics: Topic[] = items
      .map((item) => {
        const haystack = `${item.title} ${item.summary}`.toLowerCase()
        const matchedKeywords = interests.filter((interest) => haystack.includes(interest))
        const score = matchedKeywords.length * 10 + freshnessScore(item.publishedAt)
        return {
          id: `${item.source}-${item.url || item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120),
          ...item,
          matchedKeywords,
          score,
        }
      })
      .filter((topic) => topic.title && isHttpUrl(topic.url) && topic.matchedKeywords.length > 0)
      .sort((a, b) => b.score - a.score || publishedTimestamp(b.publishedAt) - publishedTimestamp(a.publishedAt))
      .slice(0, limit)

    response.status(200).json({ topics })
  } catch (error) {
    console.error('RSS topic fetch failed', error)
    response.status(502).json({ error: 'Could not reach the topic feeds right now. Please try again.' })
  }
}
