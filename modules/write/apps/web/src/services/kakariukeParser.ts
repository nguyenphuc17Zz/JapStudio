/**
 * Bunsetsu & Kakariuke Syntactic Dependency Parser (Algorithm 17).
 *
 * Implements Japanese Syntactic Dependency Tree Parsing based on classical
 * Bunsetsu (文節 - minimal semantic phrase) and Kakariuke (係り受け - head-modifier)
 * linguistic theory.
 *
 * Grammatical Invariants:
 * 1. Head-Final Constraint: Japanese is strictly head-final; any modifier Bunsetsu
 *    at index i modifies a head at index j where i < j.
 * 2. Sentence-Final Root: The terminal Bunsetsu (index N-1) is the root head of the sentence.
 * 3. Non-Crossing Constraint (Projectivity): Dependency arcs in Japanese syntax trees
 *    do not cross each other: if i < j < head(i), then head(j) <= head(i).
 *
 * Metrics Extracted:
 * - Bunsetsu Segmentation & Case Particle tagging
 * - Maximum Dependency Distance (MDD): max_i (head(i) - i)
 * - Syntactic Tree Depth
 * - Tangled / Cognitive Friction Warning (when MDD > 3)
 */

export interface BunsetsuChunk {
  index: number;
  text: string;
  headIndex: number; // Index of the head Bunsetsu it modifies (-1 for root)
  caseMarker?: string; // 'は', 'が', 'を', 'に', 'で', 'の', etc.
  isPredicate: boolean; // True if ends in verb/adjective/copula
}

export interface KakariukeSentenceTree {
  sentence: string;
  chunks: BunsetsuChunk[];
  rootIndex: number;
  treeDepth: number;
  maxDependencyDistance: number;
  isTangled: boolean;
  summaryVi: string;
}

// ---------------------------------------------------------------------------
// Japanese Grammatical Constants
// ---------------------------------------------------------------------------

const CASE_PARTICLES = new Set([
  'は', 'が', 'を', 'に', 'で', 'と', 'へ', 'から', 'まで', 'より', 'も', 'の',
]);

const CONJUNCTIVE_PARTICLES = new Set([
  'ので', 'から', 'のに', 'けど', 'けれど', 'けれども', 'が', 'ながら',
]);

const PREDICATE_ENDINGS = [
  'です', 'ます', 'ました', 'でした', 'だ', 'である', 'だった', 'ない',
  'たい', 'た', 'る', 'う', 'く', 'す', 'つ', 'ぬ', 'ふ', 'む', 'ゆ', 'い',
];

export class KakariukeParser {
  /**
   * Parses a Japanese sentence into Bunsetsu chunks and builds a projective dependency tree.
   */
  public static parseSentence(sentence: string): KakariukeSentenceTree {
    const clean = sentence.trim();
    if (!clean) {
      return {
        sentence: '',
        chunks: [],
        rootIndex: -1,
        treeDepth: 0,
        maxDependencyDistance: 0,
        isTangled: false,
        summaryVi: 'Chưa có câu để phân tích cú pháp.',
      };
    }

    // 1. Segment into Bunsetsu chunks
    const chunks = this.segmentBunsetsu(clean);
    const n = chunks.length;

    if (n === 0) {
      return {
        sentence: clean,
        chunks: [],
        rootIndex: -1,
        treeDepth: 0,
        maxDependencyDistance: 0,
        isTangled: false,
        summaryVi: '',
      };
    }

    // Root is always the terminal Bunsetsu in Japanese
    const rootIndex = n - 1;
    chunks[rootIndex].headIndex = -1;

    // 2. Resolve Kakariuke dependency links (head-modifier relations)
    for (let i = 0; i < n - 1; i++) {
      const chunk = chunks[i];

      // Rule A: Genitive/attributive particle 'の' attaches locally to the immediately next noun chunk
      if (chunk.caseMarker === 'の') {
        chunk.headIndex = i + 1;
        continue;
      }

      // Rule B: Case particles ('は', 'が', 'を', 'に', 'で') attach to subsequent predicates
      let targetHead = rootIndex;
      for (let j = i + 1; j < n; j++) {
        if (chunks[j].isPredicate || j === rootIndex) {
          // If chunk has conjunctive marker, it modifies the immediate next predicate
          targetHead = j;
          if (chunk.caseMarker && CONJUNCTIVE_PARTICLES.has(chunk.caseMarker)) {
            break;
          }
          // Topic 'は' tends to modify the main sentence-final predicate (root)
          if (chunk.caseMarker === 'は') {
            targetHead = rootIndex;
          } else {
            break;
          }
        }
      }
      chunk.headIndex = targetHead;
    }

    // 3. Compute Maximum Dependency Distance (MDD)
    let maxDistance = 0;
    for (let i = 0; i < n - 1; i++) {
      const dist = chunks[i].headIndex - i;
      if (dist > maxDistance) {
        maxDistance = dist;
      }
    }

    // 4. Compute Syntactic Tree Depth
    let treeDepth = 1;
    for (let i = 0; i < n; i++) {
      let depth = 1;
      let curr = i;
      while (curr !== -1 && chunks[curr].headIndex !== -1) {
        curr = chunks[curr].headIndex;
        depth++;
        if (depth > n) break; // cycle guard
      }
      if (depth > treeDepth) {
        treeDepth = depth;
      }
    }

    // Cognitive friction threshold: MDD > 3 indicates long-distance modifier separation
    const isTangled = maxDistance >= 4;
    let summaryVi = `Cấu trúc câu cân đối (Độ sâu cú pháp: ${treeDepth}, Khoảng cách phụ thuộc lớn nhất: ${maxDistance}).`;
    if (isTangled) {
      summaryVi = `Cảnh báo: Bổ ngữ cách vị ngữ ${maxDistance} văn tiết (quá xa). Hãy đưa bổ ngữ lại gần vị ngữ hơn để tránh tối nghĩa.`;
    }

    return {
      sentence: clean,
      chunks,
      rootIndex,
      treeDepth,
      maxDependencyDistance: maxDistance,
      isTangled,
      summaryVi,
    };
  }

  /**
   * Segments Japanese text into Bunsetsu units using morphological heuristics.
   */
  private static segmentBunsetsu(text: string): BunsetsuChunk[] {
    const chunks: BunsetsuChunk[] = [];
    const punctuationClean = text.replace(/[。！？!?]$/, '');

    // Common particle boundaries
    const regex = /(.*?([はがをにでとのへも]|から|まで|より|ので|のに|けど|ね|よ|、))\s*/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(punctuationClean)) !== null) {
      const part = match[1].trim();
      if (part) {
        const marker = match[2];
        const isPred = PREDICATE_ENDINGS.some(end => part.endsWith(end));
        chunks.push({
          index: chunks.length,
          text: part,
          headIndex: -1,
          caseMarker: CASE_PARTICLES.has(marker) || CONJUNCTIVE_PARTICLES.has(marker) ? marker : undefined,
          isPredicate: isPred,
        });
      }
      lastIndex = regex.lastIndex;
    }

    // Capture terminal remainder
    const remainder = punctuationClean.slice(lastIndex).trim();
    if (remainder) {
      const isPred = PREDICATE_ENDINGS.some(end => remainder.endsWith(end));
      chunks.push({
        index: chunks.length,
        text: remainder,
        headIndex: -1,
        caseMarker: undefined,
        isPredicate: isPred || true,
      });
    }

    // Fallback if no particles matched
    if (chunks.length === 0 && punctuationClean.trim()) {
      chunks.push({
        index: 0,
        text: punctuationClean.trim(),
        headIndex: -1,
        caseMarker: undefined,
        isPredicate: true,
      });
    }

    return chunks;
  }
}
