import { db } from './index'
import { generateUUID } from '../utils'

export async function seedDatabase() {
  const count = await db.folders.count()
  if (count > 0) return // Already seeded

  const now = Date.now()
  const englishId = generateUUID()

  await db.folders.add({
    id: englishId,
    name: 'English',
    parent_id: null,
    kind: 'language',
    icon: '🇬🇧',
    created_at: now,
    updated_at: now,
  })

  const subFolders = ['Grammar', 'Vocabulary', 'Listening', 'Reading']
  for (const name of subFolders) {
    await db.folders.add({
      id: generateUUID(),
      name,
      parent_id: englishId,
      kind: 'language',
      icon: '📁',
      created_at: now,
      updated_at: now,
    })
  }
  
  console.log('Database seeded with English folders.')
}
