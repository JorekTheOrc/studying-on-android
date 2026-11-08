import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useTtsEnabled() {
  const setting = useLiveQuery(() => db.settings.get('tts_enabled'))
  // If the setting doesn't exist yet, default to true
  return setting ? setting.value === true : true
}
