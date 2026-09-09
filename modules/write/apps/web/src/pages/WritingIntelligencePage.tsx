import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'
import type {
  WritingIntelligenceProfile,
  WritingIntelligenceSummary,
  WritingWeakness,
  WritingDiagnosisResult,
} from '../types/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { PageContainer } from '../components/layout/PageContainer'
import { WritingDrillModal } from '../components/drill/WritingDrillModal'
import { ExpressionBankPanel } from '../components/expression/ExpressionBankPanel'
import { AdaptiveCurriculumPanel } from '../components/curriculum/AdaptiveCurriculumPanel'
import { WritingMasteryPanel } from '../components/mastery/WritingMasteryPanel'
import { WritingMetricsGrid } from '../components/intelligence/WritingMetricsGrid'
import { AIDiagnosisReportCard } from '../components/intelligence/AIDiagnosisReportCard'
import { SkillDimensionsRadarCard } from '../components/intelligence/SkillDimensionsRadarCard'
import { WeaknessExplorerCard } from '../components/intelligence/WeaknessExplorerCard'

export function WritingIntelligencePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<WritingIntelligenceProfile | null>(null)
  const [summary, setSummary] = useState<WritingIntelligenceSummary | null>(null)
  const [weaknesses, setWeaknesses] = useState<WritingWeakness[]>([])
  const [dueRetests, setDueRetests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI Diagnosis state
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosis, setDiagnosis] = useState<WritingDiagnosisResult | null>(null)
  const [showDiagnosis, setShowDiagnosis] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Tab & Navigation State
  const [mainPageTab, setMainPageTab] = useState<'mastery' | 'curriculum' | 'weaknesses' | 'expressions'>('weaknesses')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all')
  const [expandedWeaknessId, setExpandedWeaknessId] = useState<string | null>(null)
  const [displayLimit, setDisplayLimit] = useState(10)
  const [selectedDrillWeaknessId, setSelectedDrillWeaknessId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [profData, sumData, listData, retestData] = await Promise.all([
        api.getWritingIntelligenceProfile(),
        api.getWritingIntelligenceSummary(),
        api.listWritingWeaknesses({ limit: 100 }),
        api.getDueRetests().catch(() => ({ items: [], total: 0 })),
      ])
      setProfile(profData)
      setSummary(sumData)
      setWeaknesses(listData.items)
      setDueRetests(retestData.items || [])
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu Writing Intelligence.')
    } finally {
      setLoading(false)
    }
  }, [])

  const runAiDiagnosis = async () => {
    try {
      setDiagnosing(true)
      setShowDiagnosis(true)
      const result = await api.diagnoseWritingIntelligence()
      setDiagnosis(result)
    } catch (err: any) {
      setError(err?.message || 'Không thể thực hiện chẩn đoán AI.')
    } finally {
      setDiagnosing(false)
    }
  }

  const handleCopyExample = (text: string, idx: number) => {
    const cleanText = text.replace(/^[⭕❌\s]+/, '').trim()
    void navigator.clipboard.writeText(cleanText)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const debouncedSearch = useDebouncedValue(searchQuery, 250)

  // Filtered weaknesses
  const filteredWeaknesses = useMemo(() => {
    return weaknesses.filter((w) => {
      // 1. Search Query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase()
        const matchSubtype = w.subtype.toLowerCase().includes(q)
        const matchDesc = w.description.toLowerCase().includes(q)
        const matchEx = w.examples.some((ex) => ex.toLowerCase().includes(q))
        if (!matchSubtype && !matchDesc && !matchEx) return false
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && w.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      // 3. Status / Lifecycle Tab Filter
      if (selectedStatusTab === 'retests') {
        return Boolean(w.retest_due_at)
      }
      if (selectedStatusTab === 'recurring') {
        return (
          w.lifecycle_state === 'recurring' ||
          w.lifecycle_state === 'recurrent' ||
          w.status === 'recurring' ||
          w.recurrence_count >= 2
        )
      }
      if (selectedStatusTab === 'targeted') {
        return (
          w.lifecycle_state === 'targeted' ||
          w.status === 'persistent' ||
          w.recurrence_count >= 4
        )
      }
      if (selectedStatusTab === 'improving') {
        return (
          w.lifecycle_state === 'improving' ||
          w.lifecycle_state === 'stable' ||
          w.status === 'improving'
        )
      }
      if (selectedStatusTab === 'mastered') {
        return w.lifecycle_state === 'mastered' || w.status === 'mastered'
      }

      return true
    })
  }, [weaknesses, debouncedSearch, selectedCategory, selectedStatusTab])

  // Aggregate stats — single pass reduce
  const { totalTracked, activeCount, masteredCount, persistentCount } = useMemo(() => {
    let active = 0
    let mastered = 0
    let persistent = 0
    for (const w of weaknesses) {
      if (w.status !== 'mastered') active++
      if (w.status === 'mastered') mastered++
      if (w.status === 'persistent') persistent++
    }
    return {
      totalTracked: weaknesses.length,
      activeCount: active,
      masteredCount: mastered,
      persistentCount: persistent,
    }
  }, [weaknesses])

  const masteryRate = Math.round(
    (summary?.overall_mastery_rate ?? (totalTracked > 0 ? masteredCount / totalTracked : 0)) * 100,
  )

  const dimensionsData = profile?.fingerprint?.dimensions || []

  return (
    <PageContainer size="wide">
      {/* Slim Studio Header */}
      <div className="jw-studio-subbar jw-mb-md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'var(--text-subtitle)', fontWeight: 800, margin: 0, color: 'var(--color-foreground)' }}>
            Studio Trí Tuệ Viết Tiếng Nhật
          </h1>
          <Badge tone="ai">8 Dimensions & L1 Diagnosis</Badge>
        </div>

        <div className="jw-inline jw-gap-xs jw-items-center">
          <Button
            variant="primary"
            size="sm"
            icon="sparkles"
            loading={diagnosing}
            onClick={() => void runAiDiagnosis()}
          >
            {diagnosing ? 'Đang phân tích...' : 'AI Chẩn Đoán Toàn Diện'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            loading={loading}
            onClick={() => void fetchData()}
            aria-label="Làm mới dữ liệu"
          />
        </div>
      </div>

      {/* Main Page Mode Tabs */}
      <div className="jw-mb-md">
        <Tabs
          items={[
            { id: 'mastery', label: 'Thẩm Định Năng Lực (Làm Chủ & Boss Assessment)' },
            { id: 'curriculum', label: 'Lộ trình Thích ứng (Kế hoạch 70/20/10)' },
            { id: 'weaknesses', label: 'Chẩn đoán Điểm yếu & Vòng đời' },
            { id: 'expressions', label: 'Kho Biểu Đạt & Collocation' },
          ]}
          value={mainPageTab}
          onChange={(val) => setMainPageTab(val as any)}
        />
      </div>

      {mainPageTab === 'mastery' ? (
        <WritingMasteryPanel
          onStartDrill={(weaknessId) => {
            if (weaknessId) {
              setSelectedDrillWeaknessId(weaknessId)
            } else if (weaknesses.length > 0) {
              setSelectedDrillWeaknessId(weaknesses[0].id)
            }
          }}
        />
      ) : mainPageTab === 'curriculum' ? (
        <AdaptiveCurriculumPanel
          onStartDrill={(weaknessId) => {
            if (weaknessId) {
              setSelectedDrillWeaknessId(weaknessId)
            } else if (weaknesses.length > 0) {
              setSelectedDrillWeaknessId(weaknesses[0].id)
            }
          }}
          onStartRewrite={() => {
            navigate('/rewrite-lab')
          }}
        />
      ) : mainPageTab === 'expressions' ? (
        <ExpressionBankPanel
          onPracticeExpression={(expr) => {
            const matchingWeakness = weaknesses.find(
              (w) => w.description.includes(expr) || (w.related_expressions || []).includes(expr),
            )
            if (matchingWeakness) {
              setSelectedDrillWeaknessId(matchingWeakness.id)
            } else if (weaknesses.length > 0) {
              setSelectedDrillWeaknessId(weaknesses[0].id)
            }
          }}
        />
      ) : (
        <>
          {error && (
            <div
              className="jw-p-md jw-mb-md"
              style={{
                background: 'var(--color-error-muted)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* 1. Top Metrics Row */}
          <WritingMetricsGrid
            masteryRate={masteryRate}
            activeCount={activeCount}
            totalTracked={totalTracked}
            persistentCount={persistentCount}
            masteredCount={masteredCount}
            estimatedLevel={diagnosis?.estimated_writing_level}
            totalAnalyzed={profile?.total_evaluations_analyzed ?? 0}
          />

          {/* 2. Live AI Diagnosis Studio Box */}
          <AIDiagnosisReportCard
            showDiagnosis={showDiagnosis}
            diagnosing={diagnosing}
            diagnosis={diagnosis}
            onClose={() => setShowDiagnosis(false)}
            copiedIndex={copiedIndex}
            onCopyExample={handleCopyExample}
          />

          {/* 3. 5-Dimension Skill Map */}
          <SkillDimensionsRadarCard
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            dimensionsData={dimensionsData}
            weaknesses={weaknesses}
          />

          {/* 4. Weakness Explorer Studio */}
          <WeaknessExplorerCard
            weaknesses={weaknesses}
            filteredWeaknesses={filteredWeaknesses}
            dueRetestsCount={dueRetests.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatusTab={selectedStatusTab}
            onSelectStatusTab={setSelectedStatusTab}
            loading={loading}
            expandedWeaknessId={expandedWeaknessId}
            onToggleExpand={(id) => setExpandedWeaknessId((prev) => (prev === id ? null : id))}
            displayLimit={displayLimit}
            onLoadMore={() => setDisplayLimit((prev) => prev + 10)}
            onStartDrill={(id) => setSelectedDrillWeaknessId(id)}
          />
        </>
      )}

      {/* Interactive Targeted Writing Drill Modal */}
      <WritingDrillModal
        isOpen={Boolean(selectedDrillWeaknessId)}
        weaknessId={selectedDrillWeaknessId || undefined}
        onClose={() => {
          setSelectedDrillWeaknessId(null)
          void fetchData()
        }}
      />
    </PageContainer>
  )
}

export default WritingIntelligencePage
