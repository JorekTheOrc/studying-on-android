import { db } from '../db'
import type { ImageResult } from '../types'

const LANG_MAP: Record<string, string> = {
  en: 'en', ru: 'ru', tr: 'tr', es: 'es', de: 'de', fr: 'fr', uk: 'uk',
}

// Whitelist of disambiguation tags we trust
const GOOD_TAGS = [
  'fruit', 'animal', 'color', 'colour', 'food', 'plant', 'tree', 'bird',
  'fish', 'insect', 'mammal', 'vegetable', 'drink', 'beverage', 'flower',
  'mineral', 'metal', 'instrument', 'vehicle', 'clothing', 'tool',
]

// Reject pages whose title contains these hints (they are not pictures of the object)
const REJECT_WORDS = [
  'band', 'album', 'song', 'film', 'movie', 'novel', 'book', 'series',
  'video game', 'magazine', 'company', 'corporation', 'brand', 'record label',
  'surname', 'given name', 'disambiguation', 'mythology', 'deity',
]

// Rank a Wikipedia page title against the search word.
// Lower = better. 99 = reject.
function rankTitle(title: string, word: string): number {
  const t = title.toLowerCase().trim()
  const w = word.toLowerCase().trim()

  // Hard reject obvious bad pages
  if (REJECT_WORDS.some(r => t.includes(r))) return 99

  // Exact match — best
  if (t === w) return 1

  // "Word (tag)" — usually good if tag is sensible
  const m = t.match(/^(.+?)\s*\((.+?)\)$/)
  if (m && m[1].trim() === w) {
    const tag = m[2].toLowerCase()
    if (GOOD_TAGS.some(g => tag.includes(g))) return 2
    return 5 // unknown tag — let user see it, but lower priority
  }

  // "Word Something" — might be company/person/place, but worth showing
  if (t.startsWith(w + ' ')) return 8

  return 99
}

async function urlToDataUrl(url: string): Promise<string | undefined> {
  try {
    // Use weserv.nl as a reliable CORS proxy just to get the image bytes
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=400`
    const res = await fetch(proxyUrl)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

// Search Wikipedia for candidate images with strict filtering
export async function searchImages(word: string, lang: string = 'en'): Promise<ImageResult[]> {
  const cleanWord = word.trim()
  if (!cleanWord) return []

  const subdomain = LANG_MAP[lang.toLowerCase()] || 'en'
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `intitle:${cleanWord}`,
    gsrlimit: '15',
    gsrnamespace: '0',
    prop: 'pageimages',
    pithumbsize: '400',
    origin: '*',
    format: 'json',
  })

  try {
    const res = await fetch(`https://${subdomain}.wikipedia.org/w/api.php?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const pages = data.query?.pages
    if (!pages) return []

    const candidates: Array<{ rank: number; result: ImageResult }> = []

    for (const page of Object.values(pages) as any[]) {
      if (page.missing !== undefined) continue
      const thumb = page.thumbnail?.source
      if (!thumb || !thumb.startsWith('https://')) continue

      const rank = rankTitle(page.title || '', cleanWord)
      if (rank === 99) continue

      candidates.push({
        rank,
        result: {
          url: page.original?.source || thumb,
          thumbnail: thumb,
          title: page.title,
        },
      })
    }

    // Sort by rank, then take up to 6
    candidates.sort((a, b) => a.rank - b.rank)
    return candidates.slice(0, 6).map(c => c.result)
  } catch {
    return []
  }
}

// Get the currently saved image for a word
export async function getCachedImage(word: string, lang: string = 'en'): Promise<{
  url: string
  candidates?: ImageResult[]
  currentIndex?: number
} | null> {
  const cacheKey = `${lang}:${word.toLowerCase().trim()}`
  try {
    const cached = await db.imageCache.get(cacheKey)
    if (!cached) return null
    if (cached.url === '') return null
    return {
      url: cached.dataUrl || cached.url,
      candidates: cached.candidates,
      currentIndex: cached.currentIndex,
    }
  } catch {
    return null
  }
}

// Save the image the user picked
export async function saveChosenImage(
  word: string,
  lang: string,
  url: string,
  candidates: ImageResult[],
  currentIndex: number
): Promise<void> {
  const cacheKey = `${lang}:${word.toLowerCase().trim()}`
  const dataUrl = await urlToDataUrl(url).catch(() => undefined)

  try {
    await db.imageCache.put({
      word: cacheKey,
      url,
      dataUrl,
      lang,
      fetchedAt: Date.now(),
      candidates,
      currentIndex,
    })
  } catch (e) {
    console.warn('[Image Cache] Save failed:', e)
  }
}

// Remove chosen image
export async function clearImage(word: string, lang: string = 'en'): Promise<void> {
  const cacheKey = `${lang}:${word.toLowerCase().trim()}`
  try {
    await db.imageCache.delete(cacheKey)
  } catch {}
}

// Save a manually provided image URL
export async function saveManualImage(
  word: string,
  lang: string,
  url: string
): Promise<void> {
  const cacheKey = `${lang}:${word.toLowerCase().trim()}`
  const dataUrl = await urlToDataUrl(url).catch(() => undefined)

  try {
    await db.imageCache.put({
      word: cacheKey,
      url,
      dataUrl,
      lang,
      fetchedAt: Date.now(),
      candidates: [{ url, thumbnail: url, title: 'Manual' }],
      currentIndex: 0,
    })
  } catch (e) {
    console.warn('[Image Cache] Save failed:', e)
  }
}
