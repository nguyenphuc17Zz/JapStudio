/**
 * Viterbi Algorithm on Hidden Markov Model Word Lattice (Algorithm 18).
 *
 * Implements Andrew J. Viterbi's (1967) dynamic programming algorithm for
 * optimal morphological path decoding across an unspaced Japanese Word Lattice.
 *
 * Mathematical Foundations:
 * 1. Word Lattice DAG:
 *    Represents all overlapping lexical candidate hypotheses as a Directed
 *    Acyclic Graph covering character indices [0, L].
 *
 * 2. Bigram HMM Cost Model:
 *    - Emission cost E(w, t) = -ln P(w | t)
 *    - Transition cost C(t_{k-1}, t_k) = -ln P(t_k | t_{k-1})
 *
 * 3. Viterbi Trellis Recurrence:
 *    V[t, j] = min_{w, t'} ( V[t', w.start] + TransitionCost(t', t) ) + EmissionCost(w, t)
 *
 * Time Complexity: O(L * |S|^2), where L = text length, |S| = number of POS states.
 * Guarantees globally optimal Japanese word boundary segmentation directly in client memory.
 */

export type POSTag =
  | 'BOS'       // Beginning of Sentence
  | 'NOUN'      // 名詞
  | 'VERB'      // 動詞
  | 'ADJ'       // 形容詞
  | 'PARTICLE'  // 助詞
  | 'AUXILIARY' // 助動詞
  | 'PUNCT'     // 記号
  | 'UNKNOWN'   // 未知語
  | 'EOS';      // End of Sentence

export interface LexiconEntry {
  surface: string;
  pos: POSTag;
  cost: number; // Negative log unigram emission cost (lower = more frequent)
}

export interface MorphemeToken {
  surface: string;
  pos: POSTag;
  startIndex: number;
  endIndex: number;
  cost: number;
}

// ---------------------------------------------------------------------------
// POS Transition Cost Matrix C(pos_prev, pos_curr)
// ---------------------------------------------------------------------------

const POS_TRANSITION_COSTS: Record<POSTag, Partial<Record<POSTag, number>>> = {
  BOS: { NOUN: 10, ADJ: 15, VERB: 25, PARTICLE: 80, PUNCT: 90, UNKNOWN: 30 },
  NOUN: { PARTICLE: 5, NOUN: 20, VERB: 35, AUXILIARY: 15, PUNCT: 10, EOS: 15 },
  PARTICLE: { NOUN: 15, VERB: 10, ADJ: 15, PARTICLE: 35, PUNCT: 25, EOS: 40 },
  VERB: { AUXILIARY: 5, PARTICLE: 15, NOUN: 25, PUNCT: 10, EOS: 5 },
  ADJ: { NOUN: 10, AUXILIARY: 10, PARTICLE: 20, PUNCT: 10, EOS: 10 },
  AUXILIARY: { AUXILIARY: 10, PARTICLE: 20, PUNCT: 5, EOS: 5 },
  PUNCT: { BOS: 10, NOUN: 15, VERB: 20, EOS: 0 },
  UNKNOWN: { PARTICLE: 10, NOUN: 20, VERB: 25, EOS: 20 },
  EOS: {},
};

const DEFAULT_TRANSITION_COST = 45;

// Core lexicon dictionary
const STANDARD_LEXICON: LexiconEntry[] = [
  // Nouns
  { surface: '私', pos: 'NOUN', cost: 10 },
  { surface: '僕', pos: 'NOUN', cost: 15 },
  { surface: '学生', pos: 'NOUN', cost: 15 },
  { surface: '先生', pos: 'NOUN', cost: 12 },
  { surface: '日本', pos: 'NOUN', cost: 12 },
  { surface: '日本語', pos: 'NOUN', cost: 10 },
  { surface: '本', pos: 'NOUN', cost: 15 },
  { surface: '図書館', pos: 'NOUN', cost: 20 },
  { surface: '今日', pos: 'NOUN', cost: 12 },
  { surface: '明日', pos: 'NOUN', cost: 14 },
  { surface: '友達', pos: 'NOUN', cost: 15 },
  { surface: '猫', pos: 'NOUN', cost: 18 },
  { surface: '犬', pos: 'NOUN', cost: 18 },
  { surface: '桜', pos: 'NOUN', cost: 20 },
  { surface: '雨', pos: 'NOUN', cost: 18 },

  // Particles
  { surface: 'は', pos: 'PARTICLE', cost: 5 },
  { surface: 'が', pos: 'PARTICLE', cost: 5 },
  { surface: 'を', pos: 'PARTICLE', cost: 5 },
  { surface: 'に', pos: 'PARTICLE', cost: 5 },
  { surface: 'で', pos: 'PARTICLE', cost: 5 },
  { surface: 'と', pos: 'PARTICLE', cost: 8 },
  { surface: 'へ', pos: 'PARTICLE', cost: 10 },
  { surface: 'の', pos: 'PARTICLE', cost: 5 },
  { surface: 'も', pos: 'PARTICLE', cost: 8 },
  { surface: 'から', pos: 'PARTICLE', cost: 12 },
  { surface: 'まで', pos: 'PARTICLE', cost: 12 },

  // Verbs
  { surface: '読', pos: 'VERB', cost: 20 },
  { surface: '読み', pos: 'VERB', cost: 15 },
  { surface: '書', pos: 'VERB', cost: 20 },
  { surface: '書き', pos: 'VERB', cost: 15 },
  { surface: '食', pos: 'VERB', cost: 20 },
  { surface: '食べ', pos: 'VERB', cost: 15 },
  { surface: '行', pos: 'VERB', cost: 20 },
  { surface: '行き', pos: 'VERB', cost: 15 },
  { surface: '勉強', pos: 'NOUN', cost: 15 },
  { surface: 'し', pos: 'VERB', cost: 10 },
  { surface: '寝', pos: 'VERB', cost: 20 },

  // Auxiliaries & Endings
  { surface: 'ます', pos: 'AUXILIARY', cost: 8 },
  { surface: 'ました', pos: 'AUXILIARY', cost: 8 },
  { surface: 'です', pos: 'AUXILIARY', cost: 8 },
  { surface: 'でした', pos: 'AUXILIARY', cost: 8 },
  { surface: 'だ', pos: 'AUXILIARY', cost: 10 },
  { surface: 'である', pos: 'AUXILIARY', cost: 15 },
  { surface: 'たい', pos: 'AUXILIARY', cost: 12 },
  { surface: 'ない', pos: 'AUXILIARY', cost: 10 },
  { surface: 'ている', pos: 'AUXILIARY', cost: 10 },

  // Punctuation
  { surface: '。', pos: 'PUNCT', cost: 1 },
  { surface: '、', pos: 'PUNCT', cost: 1 },
  { surface: '！', pos: 'PUNCT', cost: 2 },
  { surface: '？', pos: 'PUNCT', cost: 2 },
];

export class ViterbiLatticeEngine {
  private lexicon: LexiconEntry[];

  constructor(customLexicon?: LexiconEntry[]) {
    this.lexicon = customLexicon || STANDARD_LEXICON;
  }

  /**
   * Executes Viterbi Dynamic Programming decoding on the word lattice in O(L * |S|^2).
   */
  public tokenize(text: string): MorphemeToken[] {
    const clean = text.trim();
    if (!clean) return [];

    const L = clean.length;

    // Trellis State at each index j: map from POS -> { minCost, MorphemeToken, prevPOS }
    interface TrellisNode {
      cost: number;
      token: MorphemeToken;
      prevPOS: POSTag;
      prevIndex: number;
    }

    // trellis[j] stores best node ending at character index j for each POS
    const trellis: Array<Map<POSTag, TrellisNode>> = Array.from({ length: L + 1 }, () => new Map());

    // Initialize root at index 0 with BOS
    trellis[0].set('BOS', {
      cost: 0,
      token: { surface: '', pos: 'BOS', startIndex: 0, endIndex: 0, cost: 0 },
      prevPOS: 'BOS',
      prevIndex: 0,
    });

    // 1. Forward Viterbi pass across character indices
    for (let i = 0; i < L; i++) {
      const currentMap = trellis[i];
      if (currentMap.size === 0) continue;

      // Find all matching words starting at index i
      const candidateMatches = this.findMatchingWords(clean, i);

      for (const cand of candidateMatches) {
        const j = cand.endIndex;
        const emissionCost = cand.cost;

        for (const [prevPOS, prevNode] of currentMap.entries()) {
          const transCost = POS_TRANSITION_COSTS[prevPOS]?.[cand.pos] ?? DEFAULT_TRANSITION_COST;
          const totalPathCost = prevNode.cost + transCost + emissionCost;

          const existingBest = trellis[j].get(cand.pos);
          if (!existingBest || totalPathCost < existingBest.cost) {
            trellis[j].set(cand.pos, {
              cost: totalPathCost,
              token: cand,
              prevPOS,
              prevIndex: i,
            });
          }
        }
      }
    }

    // 2. Find optimal terminal state at index L
    const endMap = trellis[L];
    if (endMap.size === 0) {
      // Fallback to single character tokens if dictionary gap
      return clean.split('').map((ch, idx) => ({
        surface: ch,
        pos: 'UNKNOWN',
        startIndex: idx,
        endIndex: idx + 1,
        cost: 50,
      }));
    }

    let bestEndNode: TrellisNode | null = null;
    let minFinalCost = Infinity;

    for (const [pos, node] of endMap.entries()) {
      const eosCost = POS_TRANSITION_COSTS[pos]?.EOS ?? DEFAULT_TRANSITION_COST;
      const total = node.cost + eosCost;
      if (total < minFinalCost) {
        minFinalCost = total;
        bestEndNode = node;
      }
    }

    if (!bestEndNode) return [];

    // 3. Backward path reconstruction
    const tokens: MorphemeToken[] = [];
    let currNode: TrellisNode | undefined = bestEndNode;

    while (currNode && currNode.token.pos !== 'BOS') {
      tokens.push(currNode.token);
      const prevIdx: number = currNode.prevIndex;
      const prevPOS: POSTag = currNode.prevPOS;
      currNode = trellis[prevIdx]?.get(prevPOS);
    }

    tokens.reverse();
    return tokens;
  }

  /**
   * Matches dictionary entries and generates single-character unknown fallback nodes.
   */
  private findMatchingWords(text: string, startIndex: number): MorphemeToken[] {
    const matches: MorphemeToken[] = [];
    const sub = text.slice(startIndex);

    for (const entry of this.lexicon) {
      if (sub.startsWith(entry.surface)) {
        matches.push({
          surface: entry.surface,
          pos: entry.pos,
          startIndex,
          endIndex: startIndex + entry.surface.length,
          cost: entry.cost,
        });
      }
    }

    // Always include a single-character fallback to ensure lattice connectivity
    if (matches.length === 0 || !matches.some(m => m.endIndex === startIndex + 1)) {
      matches.push({
        surface: text[startIndex],
        pos: 'UNKNOWN',
        startIndex,
        endIndex: startIndex + 1,
        cost: 60,
      });
    }

    return matches;
  }
}

export const viterbiLatticeEngine = new ViterbiLatticeEngine();
