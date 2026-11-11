import { db } from '../db'

const MAX_CONCURRENT = 2
let activeCount = 0
const queue: Array<() => void> = []
function pump() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!
    activeCount++
    task()
  }
}
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(async () => {
      try { resolve(await fn()) }
      catch (e) { reject(e) }
      finally { activeCount--; pump() }
    })
    pump()
  })
}

const LANG_MAP: Record<string, string> = {
  en: 'en', ru: 'ru', tr: 'tr', es: 'es', de: 'de', fr: 'fr', uk: 'uk',
}

async function urlToDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { mode: 'cors' })
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

async function fetchFromWikipedia(word: string, lang: string): Promise<string | null> {
  const subdomain = LANG_MAP[lang.toLowerCase()] || 'en'
  const params = new URLSearchParams({
    action: 'query',
    titles: word,
    prop: 'pageimages',
    pithumbsize: '200',
    origin: '*',
    format: 'json',
  })
  const url = `https://${subdomain}.wikipedia.org/w/api.php?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const pages = data.query?.pages
  if (!pages) return null
  const page = Object.values(pages)[0] as any
  const thumb = page?.thumbnail?.source
  if (!thumb) return null
  return thumb.startsWith('https://') ? thumb : null
}

export async function findImage(word: string, lang: string = 'en'): Promise<string | null> {
  const cleanWord = word.trim().toLowerCase()
  if (!cleanWord) return null
  const cacheKey = `${lang}:${cleanWord}`

  try {
    const cached = await db.imageCache.get(cacheKey)
    if (cached) return cached.dataUrl || cached.url
  } catch {}

  const url = await enqueue(() => fetchFromWikipedia(cleanWord, lang)).catch(() => null)
  if (!url) return null

  const dataUrl = await urlToDataUrl(url).catch(() => undefined)

  try {
    await db.imageCache.put({
      word: cacheKey,
      url,
      dataUrl,
      lang,
      fetchedAt: Date.now(),
    })
  } catch (e) {
    console.warn('[Image Cache] Save failed:', e)
  }

  return dataUrl || url
}

export function prefetchImages(words: string[], lang: string = 'en') {
  for (const w of words) {
    findImage(w, lang).catch(() => {})
  }
}
