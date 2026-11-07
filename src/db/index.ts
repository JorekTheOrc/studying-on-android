import Dexie, { type EntityTable } from 'dexie'
import type { Folder, Set, Exercise, Card, Progress, AppSettings } from '../types'

const db = new Dexie('StudyingOnAndroidDB') as Dexie & {
  folders: EntityTable<Folder, 'id'>
  sets: EntityTable<Set, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  cards: EntityTable<Card, 'id'>
  progress: EntityTable<Progress, 'id'>
  settings: EntityTable<AppSettings, 'key'>
}

db.version(1).stores({
  folders: 'id, parent_id, name',
  sets: 'id, folder_id, title, *tags', // *tags = array indexing
  exercises: 'id, set_id, type',
  cards: 'id, set_id, due, *tags',
  progress: 'id, set_id, item_id, timestamp',
  settings: 'key',
})

export { db }
