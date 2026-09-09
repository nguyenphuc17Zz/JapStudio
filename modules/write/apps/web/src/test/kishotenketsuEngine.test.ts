import { describe, it, expect } from 'vitest';
import {
  analyzeKishotenketsu,
  segmentJapaneseSentences,
  PHASE_METADATA,
} from '../services/kishotenketsuEngine';

describe('Kishotenketsu (起承転結) Flow Analyzer Engine', () => {
  it('correctly segments Japanese sentences preserving internal dialogue punctuation', () => {
    const text = '「昨日は天気が良かったですね。」と田中さんが言った。しかし、今日は大雨だ。';
    const sentences = segmentJapaneseSentences(text);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toBe('「昨日は天気が良かったですね。」と田中さんが言った。');
    expect(sentences[1]).toBe('しかし、今日は大雨だ。');
  });

  it('classifies an authentic 4-part Kishotenketsu essay with all phases intact', () => {
    const essay = `
      はじめに、最近の人工知能の発展は目覚ましいものがあります。
      例えば、翻訳や文章生成の分野において人間と同等の精度を発揮しています。
      しかし、人間の感情や繊細な文脈の機微を完全に理解するにはまだ課題が残されています。
      したがって、人間とAIが互いの強みを活かして協力していくことが何よりも重要です。
    `.trim();

    const result = analyzeKishotenketsu(essay);
    expect(result.sentences).toHaveLength(4);
    expect(result.sentences[0].phase).toBe('KI');
    expect(result.sentences[1].phase).toBe('SHO');
    expect(result.sentences[2].phase).toBe('TEN');
    expect(result.sentences[3].phase).toBe('KETSU');

    expect(result.hasAllPhases).toBe(true);
    expect(result.missingPhases).toHaveLength(0);
    expect(result.structuralBalanceScore).toBeGreaterThanOrEqual(80);
    expect(result.flowSummary).toContain('起 (1) → 承 (1) → 転 (1) → 結 (1)');
  });

  it('flags missing phases when an essay skips the Ten (転 - Turn) phase', () => {
    const essay = `
      まず、日本語の勉強はとても面白いです。
      具体的には、漢字の成り立ちを調べると歴史が分かります。
      また、文法の規則も論理的で美しいです。
      このように、日本語を学ぶことは非常に価値があります。
    `.trim();

    const result = analyzeKishotenketsu(essay);
    expect(result.hasAllPhases).toBe(false);
    expect(result.missingPhases).toContain('TEN');
    expect(result.diagnostics.some(d => d.includes('Thiếu hồi 「転」'))).toBe(true);
    expect(result.structuralBalanceScore).toBeLessThan(90);
  });

  it('handles empty input gracefully', () => {
    const result = analyzeKishotenketsu('');
    expect(result.sentences).toHaveLength(0);
    expect(result.structuralBalanceScore).toBe(0);
    expect(result.hasAllPhases).toBe(false);
  });

  it('provides rich phase metadata and Vietnamese explanations', () => {
    expect(PHASE_METADATA.KI.kanji).toBe('起');
    expect(PHASE_METADATA.SHO.kanji).toBe('承');
    expect(PHASE_METADATA.TEN.kanji).toBe('転');
    expect(PHASE_METADATA.KETSU.kanji).toBe('結');
  });
});
