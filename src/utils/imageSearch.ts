import { db } from '../db'
import type { ImageResult } from '../types'

const LANG_MAP: Record<string, string> = {
  en: 'en', ru: 'ru', tr: 'tr', es: 'es', de: 'de', fr: 'fr', uk: 'uk',
}

async function urlToDataUrl(url: string): Promise<string | undefined> {
  try {
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

// Search Wikimedia Commons for images
async function fetchFromCommons(word: string, _lang: string): Promise<ImageResult[]> {
  // Use Commons search (huge database of real photos)
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: word,
    gsrnamespace: '6', // File namespace
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '400',
    origin: '*',
    format: 'json',
  })

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const pages = data.query?.pages
    if (!pages) return []

    const results: ImageResult[] = []

    for (const page of Object.values(pages) as any[]) {
      const info = page.imageinfo?.[0]
      if (!info || !info.thumburl) continue

      // Skip SVGs and PDFs
      const urlLower = (info.url || '').toLowerCase()
      if (urlLower.endsWith('.svg') || urlLower.endsWith('.pdf') || urlLower.endsWith('.tif')) continue

      // Clean up title (remove "File:" prefix and extension)
      let title = page.title || ''
      title = title.replace(/^File:/, '').replace(/\.[^.]+$/, '')

      results.push({
        url: info.url,
        thumbnail: info.thumburl,
        title,
      })
    }

    return results.slice(0, 6)
  } catch {
    return []
  }
}

// Fallback to Wikipedia PageImages if Commons fails (rare)
async function fetchFromWikipedia(word: string, lang: string): Promise<ImageResult[]> {
  const subdomain = LANG_MAP[lang.toLowerCase()] || 'en'
  const params = new URLSearchParams({
    action: 'query',
    titles: word,
    prop: 'pageimages',
    pithumbsize: '400',
    redirects: '1',
    origin: '*',
    format: 'json',
  })

  try {
    const res = await fetch(`https://${subdomain}.wikipedia.org/w/api.php?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const pages = data.query?.pages
    if (!pages) return []

    const results: ImageResult[] = []
    for (const page of Object.values(pages) as any[]) {
      if (page.missing !== undefined) continue
      const thumb = page.thumbnail?.source
      if (!thumb || !thumb.startsWith('https://')) continue
      results.push({
        url: page.original?.source || thumb,
        thumbnail: thumb,
        title: page.title,
      })
    }
    return results
  } catch {
    return []
  }
}

export async function searchImages(word: string, lang: string = 'en'): Promise<ImageResult[]> {
  const cleanWord = word.trim()
  if (!cleanWord) return []

  // 1. Try Commons first (better for generic words)
  let results = await fetchFromCommons(cleanWord, lang)

  // 2. Fallback to Wikipedia if Commons found nothing
  if (results.length === 0) {
    results = await fetchFromWikipedia(cleanWord, lang)
  }

  return results
}

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

export async function clearImage(word: string, lang: string = 'en'): Promise<void> {
  const cacheKey = `${lang}:${word.toLowerCase().trim()}`
  try {
    await db.imageCache.delete(cacheKey)
  } catch {}
}
