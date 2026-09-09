import { useState } from 'react';
import { kanjiDAGService, type KanjiDAGNode } from '../../services/kanjiDAGService';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';

interface KanjiPrerequisiteTreeProps {
  initialKanji?: string;
  onSelectKanji?: (kanji: string) => void;
}

export function KanjiPrerequisiteTree({
  initialKanji = '詩',
  onSelectKanji,
}: KanjiPrerequisiteTreeProps) {
  const [selectedKanji, setSelectedKanji] = useState<string>(initialKanji);

  const node: KanjiDAGNode | undefined = kanjiDAGService.getNode(selectedKanji);
  const prereqChain = kanjiDAGService.getPrerequisiteChain(selectedKanji);
  const derivatives = kanjiDAGService.getDerivativeKanji(selectedKanji);

  const handleKanjiClick = (char: string) => {
    setSelectedKanji(char);
    if (onSelectKanji) {
      onSelectKanji(char);
    }
  };

  return (
    <Card
      style={{
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'var(--glass-blur)',
      }}
    >
      <CardContent style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌳</span>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)' }}>
              Phả Hệ Cấu Tạo Chữ Hán (Kanji DAG)
            </span>
          </div>
          <Badge tone="accent">
            Kahn Topological DAG
          </Badge>
        </div>

        {/* Selected character spotlight */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              fontFamily: 'var(--font-japanese)',
              color: 'var(--color-primary)',
              lineHeight: 1,
            }}
          >
            {selectedKanji}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-foreground)' }}>
              {node?.meaningVi || 'Chữ Hán'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
              {node?.isPrimitive
                ? 'Bộ thủ nguyên tố (In-degree 0) — Viên gạch nền tảng'
                : `Ghép từ ${node?.prerequisites.length || 0} thành phần tiên quyết`}
            </div>
          </div>
        </div>

        {/* Ancestors Prerequisite Chain */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--color-foreground-muted)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>◀ Chuỗi Tiên Quyết (Prerequisites In Order):</span>
          </div>
          {prereqChain.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--color-foreground-secondary)', fontStyle: 'italic' }}>
              Đây là bộ thủ gốc nguyên thủy, không có thành phần tiên quyết.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {prereqChain.map((p, idx) => {
                const pNode = kanjiDAGService.getNode(p);
                return (
                  <div key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleKanjiClick(p)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-foreground)',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Xem phả hệ của ${p}`}
                    >
                      <span style={{ fontSize: '16px', fontFamily: 'var(--font-japanese)', fontWeight: 700 }}>
                        {p}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-foreground-secondary)' }}>
                        {pNode?.meaningVi.split(' ')[0]}
                      </span>
                    </button>
                    {idx < prereqChain.length - 1 && (
                      <span style={{ color: 'var(--color-foreground-muted)', fontSize: '11px' }}>→</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Derivatives / Descendants Unlocked */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--color-foreground-muted)',
              marginBottom: '6px',
            }}
          >
            <span>▶ Các Chữ Phái Sinh Mở Khóa (Derivatives):</span>
          </div>
          {derivatives.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--color-foreground-secondary)', fontStyle: 'italic' }}>
              Chưa có chữ phái sinh cấp tiếp theo trong cơ sở dữ liệu mẫu.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {derivatives.map((d) => {
                const dNode = kanjiDAGService.getNode(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleKanjiClick(d)}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--color-foreground)',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Xem phả hệ của ${d}`}
                  >
                    <span style={{ fontSize: '16px', fontFamily: 'var(--font-japanese)', fontWeight: 700 }}>
                      {d}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-foreground-secondary)' }}>
                      {dNode?.meaningVi.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
