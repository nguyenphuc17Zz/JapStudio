import { describe, it, expect } from 'vitest';
import {
  AhoCorasickAutomaton,
  RegisterAnalysisEngine,
  type StylePattern,
} from '../services/registerAnalysisEngine';

describe('Algorithm 11: Aho-Corasick Multi-Pattern Automaton', () => {
  it('correctly constructs failure transitions and searches multiple keywords in O(N)', () => {
    const patterns: StylePattern[] = [
      {
        id: 'p1',
        pattern: 'です',
        register: 'polite',
        category: 'register_mismatch',
        severity: 'info',
        suggestion: 'だ',
        explanationVi: 'Desu',
      },
      {
        id: 'p2',
        pattern: 'でした',
        register: 'polite',
        category: 'register_mismatch',
        severity: 'info',
        suggestion: 'だった',
        explanationVi: 'Deshita',
      },
      {
        id: 'p3',
        pattern: 'だ。',
        register: 'casual',
        category: 'register_mismatch',
        severity: 'warning',
        suggestion: 'です。',
        explanationVi: 'Da',
      },
    ];

    const ac = new AhoCorasickAutomaton(patterns);
    const text = '今日は晴れでした。明日は雨だ。';
    const matches = ac.search(text);

    expect(matches.length).toBe(2);
    expect(matches[0].pattern.id).toBe('p2'); // でした
    expect(matches[0].matchedText).toBe('でした');
    expect(matches[1].pattern.id).toBe('p3'); // だ。
    expect(matches[1].matchedText).toBe('だ。');
  });

  it('detects mixed Desu/Masu and Da/Dearu registers with penalty score', () => {
    const engine = new RegisterAnalysisEngine();
    // Mixed sentence: starts polite, ends casual
    const text = '私は学生です。日本語を勉強しているんだ。';
    const report = engine.analyze(text);

    expect(report.politeCount).toBeGreaterThanOrEqual(1);
    expect(report.casualCount).toBeGreaterThanOrEqual(1);
    expect(report.hasMixedRegister).toBe(true);
    expect(report.consistencyScore).toBeLessThan(0.85);
    expect(report.summaryVi).toContain('Phát hiện lẫn lộn thể lịch sự');
  });

  it('identifies colloquial spoken idioms in formal text', () => {
    const engine = new RegisterAnalysisEngine();
    const text = 'このプロジェクトはめっちゃ大切で、マジで成功させたいです。';
    const report = engine.analyze(text);

    expect(report.colloquialCount).toBe(2); // めっちゃ and マジで
    const colloquialMatches = report.matches.filter(m => m.pattern.register === 'colloquial');
    expect(colloquialMatches.map(m => m.matchedText)).toEqual(
      expect.arrayContaining(['めっちゃ', 'マジで'])
    );
  });

  it('flags double-keigo (二重敬語) traps accurately', () => {
    const engine = new RegisterAnalysisEngine();
    const text = '先生がおっしゃられた通り、書類をご覧になられましたか。';
    const report = engine.analyze(text);

    expect(report.doubleKeigoCount).toBe(2); // おっしゃられる and ご覧になられる
    expect(report.matches.some(m => m.pattern.id === 'double_keigo_osshirareru')).toBe(true);
    expect(report.matches.some(m => m.pattern.id === 'double_keigo_goranninarareru')).toBe(true);
  });

  it('handles purely consistent text gracefully', () => {
    const engine = new RegisterAnalysisEngine();
    const text = '本日はお忙しい中、誠にありがとうございます。よろしくお願いいたします。';
    const report = engine.analyze(text);

    expect(report.hasMixedRegister).toBe(false);
    expect(report.colloquialCount).toBe(0);
    expect(report.doubleKeigoCount).toBe(0);
    expect(report.consistencyScore).toBe(1.0);
  });
});
