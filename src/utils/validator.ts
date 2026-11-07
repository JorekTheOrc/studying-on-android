import type { Set, Exercise, Card, Item, ExerciseType } from '../types'
import { generateUUID } from './index'

const VALID_TYPES: ExerciseType[] = [
  'multiple_choice', 'true_false', 'true_false_ng', 'sentence_completion', 'fill_blank',
  'matching', 'ordering', 'short_answer', 'translation'
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  data?: { set: Set, exercises: Exercise[], cards: Card[] }
}

export function validateImportedSet(jsonString: string): ValidationResult {
  const errors: string[] = []
  
  let raw: any
  try {
    raw = JSON.parse(jsonString)
  } catch (e: any) {
    return { valid: false, errors: [`Invalid JSON syntax: ${e.message}`] }
  }

  if (!raw.set_id || typeof raw.set_id !== 'string') errors.push("Missing or invalid 'set_id'")
  if (!raw.title || typeof raw.title !== 'string') errors.push("Missing or invalid 'title'")
  if (!Array.isArray(raw.exercises)) errors.push("Missing or invalid 'exercises' array")
  
  if (errors.length > 0) return { valid: false, errors }

  const set: Set = {
    id: raw.set_id || generateUUID(),
    folder_id: null,
    title: raw.title,
    topic: raw.topic || '',
    target_lang: raw.target_lang || 'English',
    native_lang: raw.native_lang || 'Russian',
    level: raw.level || 'B1',
    theory_md: raw.theory_md || '',
    tags: raw.tags || [],
    settings: raw.settings || { hints: true, translations: true, shuffle: false },
    created_at: Date.now(),
    updated_at: Date.now()
  }

  const exercises: Exercise[] = []
  const cards: Card[] = []
  const allIds = new Set<string>()

  raw.exercises.forEach((ex: any, exIndex: number) => {
    if (!ex.id || allIds.has(ex.id)) errors.push(`Exercise ${exIndex + 1}: Missing or duplicate id`)
    else allIds.add(ex.id)

    if (!VALID_TYPES.includes(ex.type)) {
      errors.push(`Exercise ${exIndex + 1}: Unknown type '${ex.type}'`)
      return
    }

    const validItems: Item[] = []
    
    if (!Array.isArray(ex.items)) {
       errors.push(`Exercise ${exIndex + 1}: Missing 'items' array`)
       return
    }

    ex.items.forEach((item: any, itemIndex: number) => {
      const itemPrefix = `Exercise ${exIndex + 1} (${ex.type}), Item ${itemIndex + 1}`
      
      if (!item.id || allIds.has(item.id)) errors.push(`${itemPrefix}: Missing or duplicate id`)
      else allIds.add(item.id)

      const typesWithAnswer = ['multiple_choice', 'true_false', 'true_false_ng', 'sentence_completion', 'fill_blank', 'short_answer', 'translation']
      if (typesWithAnswer.includes(ex.type) && !Array.isArray(item.answer)) {
        errors.push(`${itemPrefix}: 'answer' must be an array`)
      }
      
      if (ex.type === 'ordering' && !Array.isArray(item.correct_order)) {
        errors.push(`${itemPrefix}: 'correct_order' must be an array`)
      }
      
      if (ex.type === 'matching' && !Array.isArray(item.pairs)) {
        errors.push(`${itemPrefix}: 'pairs' must be an array`)
      }

      if (ex.type === 'multiple_choice') {
        if (!Array.isArray(item.options) || item.options.length < 3) errors.push(`${itemPrefix}: Needs at least 3 options`)
        if (!item.options.find((o: any) => o.id === item.answer[0])) errors.push(`${itemPrefix}: Correct answer ID not found in options`)
      }

      if (ex.type === 'ordering') {
        if (Array.isArray(item.tokens) && Array.isArray(item.correct_order)) {
          const sortedTokens = [...item.tokens].sort()
          const sortedOrder = [...item.correct_order].sort()
          if (JSON.stringify(sortedTokens) !== JSON.stringify(sortedOrder)) {
            errors.push(`${itemPrefix}: 'correct_order' is not a permutation of 'tokens'`)
          }
        }
      }

      if (ex.type === 'fill_blank' || ex.type === 'sentence_completion') {
        if (item.prompt) {
           const gapCount = (item.prompt.match(/___/g) || []).length
           if (gapCount !== item.answer.length) {
             errors.push(`${itemPrefix}: Prompt has ${gapCount} gaps (___), but 'answer' has ${item.answer.length} items`)
           }
        }
      }

      validItems.push(item)
    })

    exercises.push({
      id: ex.id,
      set_id: set.id,
      type: ex.type,
      title: ex.title || ex.type,
      instruction: ex.instruction || '',
      tags: ex.tags || [], // <--- Save tags
      items: validItems
    })
  })

  if (Array.isArray(raw.cards)) {
    raw.cards.forEach((c: any, i: number) => {
      if (!c.id || allIds.has(c.id)) errors.push(`Card ${i + 1}: Missing or duplicate id`)
      else allIds.add(c.id)

      if (!c.front || !c.back) errors.push(`Card ${i + 1}: Missing 'front' or 'back'`)

      cards.push({
        id: c.id || generateUUID(),
        set_id: set.id,
        front: c.front || '',
        back: c.back || '',
        tags: c.tags || [],
        source_item_id: c.source_item_id,
        due: Date.now(),
        interval: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0
      })
    })
  }

  if (errors.length > 0) return { valid: false, errors }
  return { valid: true, errors: [], data: { set, exercises, cards } }
}
