import type { WritingWeakness } from '../../types/api'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DIMENSION_CONFIG, categoryBadgeTone } from './intelligenceConstants'

interface SkillDimensionsRadarCardProps {
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  dimensionsData: Array<{ category: string; average_mastery?: number }>
  weaknesses: WritingWeakness[]
}

export function SkillDimensionsRadarCard({
  selectedCategory,
  onSelectCategory,
  dimensionsData,
  weaknesses,
}: SkillDimensionsRadarCardProps) {
  return (
    <div className="jw-mb-lg">
      <div className="jw-flex jw-items-center jw-flex-between jw-mb-sm">
        <div>
          <h2 className="jw-text--md jw-text--primary" style={{ fontWeight: 700, margin: 0 }}>
            Bản Đồ 5 Chiều Năng Lực Viết
          </h2>
          <p className="jw-text--muted jw-text--xs jw-mt-xs">
            Nhấp vào bất kỳ chiều năng lực nào để lọc ngay danh sách điểm yếu chi tiết phía dưới.
          </p>
        </div>
        {selectedCategory !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => onSelectCategory('all')}>
            Xem tất cả chiều kỹ năng ✕
          </Button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 'var(--space-sm)',
        }}
      >
        {Object.entries(DIMENSION_CONFIG).map(([catKey, conf]) => {
          const isSelected = selectedCategory === catKey
          const dimStats = dimensionsData.find((d) => d.category === catKey)
          const catWeaknesses = weaknesses.filter((w) => w.category === catKey)
          const catActive = catWeaknesses.filter((w) => w.status !== 'mastered').length
          const catScore = Math.round((dimStats?.average_mastery ?? 0.5) * 100)

          return (
            <div
              key={catKey}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Lọc theo ${conf.label}`}
              onClick={() => onSelectCategory(isSelected ? 'all' : catKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectCategory(isSelected ? 'all' : catKey)
                }
              }}
              className="jw-card--interactive"
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'var(--color-accent-muted)' : 'var(--color-surface)',
                border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <div className="jw-flex jw-items-center jw-flex-between jw-mb-xs">
                <Badge tone={categoryBadgeTone(catKey)}>
                  {catKey.toUpperCase()}
                </Badge>
                <span className="jw-text--xs jw-text--muted">
                  {catActive > 0 ? (
                    <span className="jw-text--warning font-medium">{catActive} điểm yếu</span>
                  ) : (
                    <span className="jw-text--success font-medium">Tốt</span>
                  )}
                </span>
              </div>

              <strong className="jw-text--sm jw-text--primary block jw-mt-xs">
                {conf.label}
              </strong>
              <p className="jw-text--muted jw-text--xs jw-mt-xs" style={{ lineHeight: 1.4, minHeight: 36 }}>
                {conf.desc}
              </p>

              {/* Progress */}
              <div className="jw-flex jw-items-center jw-flex-between jw-mt-sm jw-text--xs">
                <span className="jw-text--muted">Làm chủ:</span>
                <span className="jw-text--primary font-medium">{catScore}%</span>
              </div>
              <div
                className="jw-mt-xs"
                style={{
                  height: 4,
                  background: 'var(--color-border-subtle)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${catScore}%`,
                    height: '100%',
                    background: conf.color,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
