export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'ai'
  | 'grammar'
  | 'vocabulary'
  | 'naturalness'
  | 'semantic'
  | 'register'
  | 'discourse'
  | 'scenario'

export type BadgeKind =
  | 'status'
  | 'difficulty'
  | 'jlpt'
  | 'register'
  | 'topic'
  | 'ai'
  | 'new'
  | 'completed'

/** Maps a badge kind to its default tone. */
export function badgeToneFor(kind: BadgeKind | undefined, tone?: BadgeTone): BadgeTone {
  if (tone) return tone
  switch (kind) {
    case 'ai':
      return 'ai'
    case 'new':
      return 'accent'
    case 'completed':
      return 'success'
    default:
      return 'neutral'
  }
}
