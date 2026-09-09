import type { WritingDiagnosisResult } from '../../types/api'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { Icon } from '../icons/Icon'
import { categoryBadgeTone } from './intelligenceConstants'

interface AIDiagnosisReportCardProps {
  showDiagnosis: boolean
  diagnosing: boolean
  diagnosis: WritingDiagnosisResult | null
  onClose: () => void
  copiedIndex: number | null
  onCopyExample: (text: string, idx: number) => void
}

export function AIDiagnosisReportCard({
  showDiagnosis,
  diagnosing,
  diagnosis,
  onClose,
  copiedIndex,
  onCopyExample,
}: AIDiagnosisReportCardProps) {
  if (!showDiagnosis) return null

  return (
    <div className="jw-intel-ai-box jw-mb-lg">
      <div className="jw-intel-ai-header">
        <div className="jw-intel-ai-title">
          <span className="jw-text--accent">
            <Icon name="sparkles" size={18} />
          </span>
          <span>BÁO CÁO CHẨN ĐOÁN AI (ROOT-CAUSE DIAGNOSIS)</span>
          {diagnosis?.estimated_writing_level && (
            <Badge tone="accent">JLPT {diagnosis.estimated_writing_level}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>

      {diagnosing ? (
        <div className="jw-p-lg jw-text-center">
          <Skeleton variant="card" />
          <p className="jw-text--muted jw-text--sm jw-mt-md">
            Gemini đang phân tích Writing Fingerprint và tổng hợp báo cáo căn nguyên...
          </p>
        </div>
      ) : diagnosis ? (
        <div className="jw-flex jw-flex-col jw-gap-md">
          {/* Executive Overview */}
          <div className="jw-intel-overview-card">
            <span className="jw-card-eyebrow" style={{ color: 'var(--color-accent)' }}>
              Nhận định tổng quan từ Chuyên gia AI
            </span>
            <p className="jw-text--primary jw-text--sm jw-mt-xs" style={{ lineHeight: 1.7, fontSize: 14 }}>
              {diagnosis.overall_assessment_vi}
            </p>
            {diagnosis.strengths_assessment_vi && (
              <div className="jw-mt-sm jw-pt-xs" style={{ borderTop: '1px dashed var(--color-border-subtle)' }}>
                <p className="jw-text--secondary jw-text--xs">
                  ✨ <strong className="jw-text--success">Điểm sáng ngôn ngữ:</strong> {diagnosis.strengths_assessment_vi}
                </p>
              </div>
            )}
          </div>

          {/* Root Causes breakdown with 2-col Bad vs Good cards */}
          {diagnosis.root_causes && diagnosis.root_causes.length > 0 && (
            <div>
              <span className="jw-card-eyebrow block jw-mb-xs">
                Phân tích căn nguyên tư duy tiếng Việt & Mẫu câu đối chiếu
              </span>
              <div className="jw-flex jw-flex-col jw-gap-sm">
                {diagnosis.root_causes.map((rc, idx) => (
                  <div key={idx} className="jw-intel-root-card">
                    <div className="jw-flex jw-items-center jw-flex-between">
                      <div className="jw-inline jw-gap-xs jw-items-center">
                        <Badge tone={categoryBadgeTone(rc.category)}>
                          {rc.category.toUpperCase()}
                        </Badge>
                        <strong className="jw-text--sm jw-text--primary">
                          {rc.subtype.replace(/_/g, ' ')}
                        </strong>
                      </div>
                    </div>

                    <p className="jw-text--secondary jw-text--xs jw-mt-xs" style={{ lineHeight: 1.6 }}>
                      {rc.root_cause_vi}
                    </p>

                    <div className="jw-text--accent jw-text--xs jw-mt-xs font-medium">
                      💡 {rc.japanese_pattern_tip}
                    </div>

                    {rc.example_bad_vs_good && (
                      <div className="jw-mt-xs">
                        {rc.example_bad_vs_good.includes('->') || rc.example_bad_vs_good.includes('→') ? (
                          <div className="jw-intel-contrast-grid">
                            <div className="jw-intel-contrast-bad">
                              <div className="jw-text--muted jw-text--xs jw-mb-xs">Lỗi hay mắc (Tư duy tiếng Việt):</div>
                              <div>{rc.example_bad_vs_good.split(/->|→/)[0]?.trim()}</div>
                            </div>
                            <div className="jw-intel-contrast-good">
                              <div className="jw-flex jw-items-center jw-flex-between jw-mb-xs">
                                <span className="jw-text--success jw-text--xs" style={{ fontWeight: 600 }}>Chuẩn tự nhiên Nhật:</span>
                                <button
                                  type="button"
                                  onClick={() => onCopyExample(rc.example_bad_vs_good!.split(/->|→/)[1] || '', idx)}
                                  className="jw-btn jw-btn--ghost jw-btn--sm"
                                  style={{ height: 22, padding: '0 6px', fontSize: 10 }}
                                >
                                  {copiedIndex === idx ? '✓ Đã sao chép' : 'Sao chép'}
                                </button>
                              </div>
                              <div>{rc.example_bad_vs_good.split(/->|→/)[1]?.trim()}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="jw-intel-contrast-box">
                            {rc.example_bad_vs_good}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Plan & Recommended Grammar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {diagnosis.action_plan_vi && diagnosis.action_plan_vi.length > 0 && (
              <div className="jw-intel-plan-box">
                <span className="jw-card-eyebrow" style={{ color: 'var(--color-success)' }}>
                  Kế hoạch cải thiện cụ thể
                </span>
                <div className="jw-flex jw-flex-col jw-gap-xs jw-mt-xs">
                  {diagnosis.action_plan_vi.map((step, sIdx) => (
                    <div key={sIdx} className="jw-intel-step-item">
                      <span className="jw-intel-step-num">{sIdx + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnosis.recommended_grammar_focus && diagnosis.recommended_grammar_focus.length > 0 && (
              <div
                className="jw-p-md"
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <span className="jw-card-eyebrow">Ngữ pháp trọng tâm gợi ý ôn tập</span>
                <div className="jw-inline jw-gap-xs jw-mt-sm" style={{ flexWrap: 'wrap' }}>
                  {diagnosis.recommended_grammar_focus.map((point, pIdx) => (
                    <span key={pIdx} className="jw-intel-grammar-pill">
                      {point}
                    </span>
                  ))}
                </div>
                {diagnosis.encouragement_vi && (
                  <p className="jw-text--muted jw-text--xs jw-mt-md" style={{ fontStyle: 'italic', margin: '16px 0 0' }}>
                    "{diagnosis.encouragement_vi}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
