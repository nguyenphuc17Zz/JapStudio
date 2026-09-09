import { describe, it, expect } from 'vitest';
import { viterbiLatticeEngine } from '../services/viterbiLatticeEngine';


describe('Algorithm 18: Viterbi Algorithm on HMM Word Lattice', () => {
  it('globally optimizes word boundary segmentation on unspaced Japanese', () => {
    // '私は日本語を勉強します。'
    const sentence = '私は日本語を勉強します。';
    const tokens = viterbiLatticeEngine.tokenize(sentence);

    const surfaces = tokens.map(t => t.surface);
    expect(surfaces).toEqual(['私', 'は', '日本語', 'を', '勉強', 'し', 'ます', '。']);

    const poses = tokens.map(t => t.pos);
    expect(poses).toEqual([
      'NOUN',
      'PARTICLE',
      'NOUN',
      'PARTICLE',
      'NOUN',
      'VERB',
      'AUXILIARY',
      'PUNCT',
    ]);
  });

  it('correctly segments ambiguous overlapping compound words', () => {
    // '図書館で本を読みました。'
    // '図書' vs '図書館' (library vs book)
    const sentence = '図書館で本を読みました。';
    const tokens = viterbiLatticeEngine.tokenize(sentence);

    const surfaces = tokens.map(t => t.surface);
    expect(surfaces).toContain('図書館');
    expect(surfaces).toContain('で');
    expect(surfaces).toContain('本');
    expect(surfaces).toContain('を');
    expect(surfaces).toContain('読み');
    expect(surfaces).toContain('ました');
  });

  it('handles unknown words gracefully with fallback characters', () => {
    const textWithUnknown = '猫XYZです。';
    const tokens = viterbiLatticeEngine.tokenize(textWithUnknown);

    expect(tokens[0].surface).toBe('猫');
    expect(tokens[0].pos).toBe('NOUN');
    expect(tokens.some(t => t.surface === 'です')).toBe(true);
  });
});
