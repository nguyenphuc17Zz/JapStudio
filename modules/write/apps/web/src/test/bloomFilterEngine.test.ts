import { describe, it, expect } from 'vitest';
import {
  CountingBloomFilter,
  JLPTLexicalCoverageEngine,
  fnv1a32,
  murmurHash3Finalizer,
} from '../services/bloomFilterEngine';

describe('Counting Bloom Filter & Kirsch-Mitzenmacher Hashing', () => {
  it('generates consistent 32-bit unsigned hashes', () => {
    const h1 = fnv1a32('日本語');
    const h2 = murmurHash3Finalizer('日本語');

    expect(typeof h1).toBe('number');
    expect(typeof h2).toBe('number');
    expect(h1).toBeGreaterThan(0);
    expect(h2).toBeGreaterThan(0);
    expect(h1).not.toBe(h2);
  });

  it('guarantees zero false negatives and supports dynamic deletion', () => {
    const filter = new CountingBloomFilter(200, 0.01);

    const items = ['桜', '富士山', '東京', '京都', '侍', '寿司', '着物', '新幹線'];
    for (const item of items) {
      filter.add(item);
    }

    // Zero false negatives: all added items must return true
    for (const item of items) {
      expect(filter.has(item)).toBe(true);
    }

    // Unadded items should almost certainly return false
    expect(filter.has('未知の単語_xyz123')).toBe(false);
    expect(filter.has('宇宙船_galaxy_999')).toBe(false);

    // Dynamic removal
    expect(filter.remove('東京')).toBe(true);
    expect(filter.has('東京')).toBe(false);
    // Other items must remain unaffected
    expect(filter.has('京都')).toBe(true);
    expect(filter.has('桜')).toBe(true);
  });

  it('tracks frequency counts via 4-bit nibble counters', () => {
    const filter = new CountingBloomFilter(50, 0.01);

    expect(filter.estimateCount('練習')).toBe(0);

    filter.add('練習');
    expect(filter.estimateCount('練習')).toBe(1);

    filter.add('練習');
    filter.add('練習');
    expect(filter.estimateCount('練習')).toBe(3);

    filter.remove('練習');
    expect(filter.estimateCount('練習')).toBe(2);
  });
});

describe('JLPT Lexical Coverage Engine', () => {
  it('classifies words according to JLPT tiers N5 - N1', () => {
    const engine = new JLPTLexicalCoverageEngine();

    expect(engine.classifyToken('学生')).toBe('N5');
    expect(engine.classifyToken('準備')).toBe('N4');
    expect(engine.classifyToken('敬語')).toBe('N3');
    expect(engine.classifyToken('効率')).toBe('N2');
    expect(engine.classifyToken('概念')).toBe('N1');
  });

  it('computes live lexical coverage distribution and estimated level', () => {
    const engine = new JLPTLexicalCoverageEngine();
    // Mostly N5 and N4 tokens
    const tokens = ['私', '学生', '学校', '本', '試験', '準備'];
    const result = engine.analyzeCoverage(tokens);

    expect(result.classifiedTokens).toBe(6);
    expect(result.levelCounts.N5).toBe(4);
    expect(result.levelCounts.N4).toBe(2);
    expect(result.levelPercentages.N5).toBe(67);
    expect(result.levelPercentages.N4).toBe(33);
    expect(result.estimatedLevel).toBe('N5');
    expect(result.difficultyScore).toBeLessThan(2.0);
  });

  it('accurately projects higher JLPT tier for advanced vocabulary', () => {
    const engine = new JLPTLexicalCoverageEngine();
    const advancedTokens = ['概念', '網羅', '齟齬', '乖離', '効率', '傾向'];
    const result = engine.analyzeCoverage(advancedTokens);

    expect(result.levelCounts.N1).toBe(4);
    expect(result.levelCounts.N2).toBe(2);
    expect(result.estimatedLevel).toBe('N1');
    expect(result.difficultyScore).toBeGreaterThan(4.0);
  });
});
