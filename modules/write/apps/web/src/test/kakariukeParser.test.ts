import { describe, it, expect } from 'vitest';
import { KakariukeParser } from '../services/kakariukeParser';

describe('Algorithm 17: Bunsetsu & Kakariuke Syntactic Dependency Parser', () => {
  it('strictly enforces Head-Final Constraint and identifies sentence root', () => {
    const sentence = '私は 図書館で 日本語の 本を 読みました。';
    const tree = KakariukeParser.parseSentence(sentence);

    expect(tree.chunks.length).toBeGreaterThanOrEqual(4);
    expect(tree.rootIndex).toBe(tree.chunks.length - 1);

    // Every non-terminal chunk i must have headIndex > i (Head-Final rule)
    for (let i = 0; i < tree.chunks.length - 1; i++) {
      expect(tree.chunks[i].headIndex).toBeGreaterThan(i);
    }
  });

  it('correctly attaches genitive particle の to immediate next noun phrase', () => {
    const sentence = '日本の 文化は 素晴らしいです。';
    const tree = KakariukeParser.parseSentence(sentence);

    const noChunk = tree.chunks.find(c => c.caseMarker === 'の');
    expect(noChunk).toBeDefined();
    if (noChunk) {
      // '日本の' at index 0 must modify '文化は' at index 1
      expect(noChunk.headIndex).toBe(noChunk.index + 1);
    }
  });

  it('calculates tree depth and detects tangled long-distance dependencies', () => {
    // Highly nested / long-separated sentence:
    // '私は (0) 昨日 (1) 友達と (2) 駅前で (3) 偶然 (4) 会った (5)。'
    const longSentence = '私は、昨日、友達と、駅前で、偶然、会いました。';
    const tree = KakariukeParser.parseSentence(longSentence);

    expect(tree.treeDepth).toBeGreaterThanOrEqual(2);
    expect(tree.maxDependencyDistance).toBeGreaterThanOrEqual(4);
    expect(tree.isTangled).toBe(true);
    expect(tree.summaryVi).toContain('Cảnh báo: Bổ ngữ cách vị ngữ');
  });

  it('handles compact well-balanced sentences without false warnings', () => {
    const balancedSentence = '猫が寝ています。';
    const tree = KakariukeParser.parseSentence(balancedSentence);

    expect(tree.isTangled).toBe(false);
    expect(tree.maxDependencyDistance).toBeLessThanOrEqual(2);
  });
});
