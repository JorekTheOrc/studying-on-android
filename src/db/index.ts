import Dexie, { type EntityTable } from 'dexie'
import type { Folder, Set, Exercise, Card, Progress, AppSettings } from '../types'

export interface ImageCache {
  word: string         // primary key
  url: string          // URL картинки (для отображения)
  dataUrl?: string     // base64 (для бэкапа — если оригинал удалится)
  lang: string
  fetchedAt: number
}

const db = new Dexie('StudyingOnAndroidDB') as Dexie & {
  folders: EntityTable<Folder, 'id'>
  sets: EntityTable<Set, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  cards: EntityTable<Card, 'id'>
  progress: EntityTable<Progress, 'id'>
  settings: EntityTable<AppSettings, 'key'>
  imageCache: EntityTable<ImageCache, 'word'>
}

db.version(1).stores({
  folders: 'id, parent_id, name',
  sets: 'id, folder_id, title, *tags',
  exercises: 'id, set_id, type',
  cards: 'id, set_id, due, *tags',
  progress: 'id, set_id, item_id, timestamp',
  settings: 'key',
})

db.version(2).stores({
  folders: 'id, parent_id, name',
  sets: 'id, folder_id, title, *tags',
  exercises: 'id, set_id, type',
  cards: 'id, set_id, due, *tags',
  progress: 'id, set_id, item_id, timestamp',
  settings: 'key',
  imageCache: 'word, fetchedAt',
})

export { db }
