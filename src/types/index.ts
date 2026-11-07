export type ExerciseType =
  | 'multiple_choice'
  | 'true_false'
  | 'true_false_ng'
  | 'sentence_completion'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'short_answer'
  | 'translation'

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  kind: 'language' | 'subject' | 'custom'
  icon: string
  created_at: number
  updated_at: number
}

export interface Set {
  id: string
  folder_id: string | null
  title: string
  topic: string
  target_lang: string
  native_lang: string
  level: string
  theory_md: string
  tags: string[]
  settings: {
    hints: boolean
    translations: boolean
    shuffle: boolean
  }
  created_at: number
  updated_at: number
}

export interface VocabItem {
  text: string
  translation: string
}

export interface Option {
  id: string
  text: string
  vocabulary?: VocabItem[]
}

export interface Item {
  id: string
  prompt?: string
  vocabulary?: VocabItem[]
  options?: Option[]
  answer: (string | boolean)[]
  hint?: string
  translation?: string
  explanation?: string
  word_limit?: number
  word_box?: string[]
  pairs?: { left: string; right: string }[]
  tokens?: string[]
  correct_order?: string[]
  alternatives?: string[]
}

export interface Exercise {
  id: string
  set_id: string
  type: ExerciseType
  title: string
  instruction: string
  tags?: string[] // <--- New field
  items: Item[]
}

export interface Card {
  id: string
  set_id: string
  front: string
  back: string
  tags: string[]
  source_item_id?: string
  due: number
  interval: number
  ease: number
  reps: number
  lapses: number
}

export interface Progress {
  id: string
  set_id: string
  item_id: string
  correct: boolean
  used_hint: boolean
  used_translation: boolean
  viewed_vocabulary?: string[]
  timestamp: number
  duration_ms: number
}

export interface AppSettings {
  key: string
  value: any
}

export interface ExercisePlan {
  type: ExerciseType
  count: number | ''
  itemsPerExercise: number | ''
}

export interface BuilderParams {
  targetLang: string
  nativeLang: string
  topic: string
  level: string
  plans: ExercisePlan[]
  includeTheory: boolean
  includeHints: boolean
  includeTranslations: boolean
  wordList: string
}
