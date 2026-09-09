export function scrollToSentence(index: number) {
  const element = document.getElementById(`jw-studio-sentence-${index}`)
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element?.scrollIntoView?.(reduce ? {} : { behavior: 'smooth', block: 'center' })
}

export type DiscourseDimensionKey =
  | 'coherence_score'
  | 'cohesion_score'
  | 'organization_score'
  | 'flow_score'
  | 'style_consistency_score'
  | 'redundancy_score'

export const DISCOURSE_DIMENSIONS: Array<{ key: DiscourseDimensionKey; label: string }> = [
  { key: 'coherence_score', label: 'Mạch lạc (ý chính)' },
  { key: 'cohesion_score', label: 'Liên kết câu' },
  { key: 'organization_score', label: 'Bố cục' },
  { key: 'flow_score', label: 'Trôi chảy' },
  { key: 'style_consistency_score', label: 'Nhất quán phong cách' },
  { key: 'redundancy_score', label: 'Không lặp thừa' },
]

export const DISCOURSE_DIMENSION_LABELS: Record<string, string> = Object.fromEntries(
  DISCOURSE_DIMENSIONS.map(({ key, label }) => [key, label]),
)
