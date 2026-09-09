import type {
  ExerciseType,
  JlptLevel,
  Register,
  TargetLength,
} from '../../types/api'

export interface PracticeDefaultSettings {
  exerciseType: ExerciseType
  jlptLevel: JlptLevel
  register: Register
  difficulty: number
  targetLength: TargetLength
  topic?: string
}

export const PRACTICE_DEFAULT_STORAGE_KEY = 'practice:quick_settings:v1'

export const DEFAULT_PRACTICE_CONFIG: PracticeDefaultSettings = {
  exerciseType: 'sentence_translation',
  jlptLevel: 'N4',
  register: 'polite',
  difficulty: 5,
  targetLength: 'short_sentence',
  topic: '',
}

export function getStoredPracticeConfig(): PracticeDefaultSettings {
  try {
    const raw = localStorage.getItem(PRACTICE_DEFAULT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PracticeDefaultSettings>
      return {
        ...DEFAULT_PRACTICE_CONFIG,
        ...parsed,
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return DEFAULT_PRACTICE_CONFIG
}
