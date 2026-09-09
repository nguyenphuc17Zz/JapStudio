/**
 * Kishōtenketsu (起承転結) 4-Stage Flow Analyzer Engine
 *
 * Implements a Hidden Markov Model (HMM) with Viterbi Trellis Decoding
 * to analyze the classical 4-part rhetorical progression of Japanese writing:
 * 1. Ki (起 - Introduction / Premise)
 * 2. Shō (承 - Elaboration / Development)
 * 3. Ten (転 - Turn / Complication / Contrast)
 * 4. Ketsu (結 - Conclusion / Synthesis)
 */

export type KishotenketsuPhase = 'KI' | 'SHO' | 'TEN' | 'KETSU';

export interface SentencePhaseResult {
  index: number;
  text: string;
  phase: KishotenketsuPhase;
  phaseKanji: string;
  phaseVi: string;
  confidence: number;
  cues: string[];
}

export interface KishotenketsuAnalysis {
  sentences: SentencePhaseResult[];
  phaseCounts: Record<KishotenketsuPhase, number>;
  phaseProportions: Record<KishotenketsuPhase, number>;
  hasAllPhases: boolean;
  missingPhases: KishotenketsuPhase[];
  structuralBalanceScore: number; // 0 - 100
  diagnostics: string[];
  flowSummary: string;
}

export const PHASE_METADATA: Record<
  KishotenketsuPhase,
  { kanji: string; nameVi: string; description: string; idealRatio: [number, number] }
> = {
  KI: {
    kanji: '起',
    nameVi: 'Khởi (Mở đề / Bối cảnh)',
    description: 'Giới thiệu chủ đề, tiền đề hoặc bối cảnh ban đầu.',
    idealRatio: [0.10, 0.30],
  },
  SHO: {
    kanji: '承',
    nameVi: 'Thừa (Phát triển / Luận giải)',
    description: 'Phát triển luận điểm, đưa ra dẫn chứng và ví dụ thực tế.',
    idealRatio: [0.25, 0.55],
  },
  TEN: {
    kanji: '転',
    nameVi: 'Chuyển (Bước ngoặt / Đối lập)',
    description: 'Tạo bước ngoặt bất ngờ, góc nhìn tương phản hoặc tình huống phát sinh.',
    idealRatio: [0.10, 0.35],
  },
  KETSU: {
    kanji: '結',
    nameVi: 'Kết (Đúc kết / Hòa hợp)',
    description: 'Đúc kết bài học, dung hòa mâu thuẫn và đưa ra kết luận mạch lạc.',
    idealRatio: [0.10, 0.30],
  },
};

// Authentic Japanese discourse cues and rhetorical connectives
const DISCOURSE_CUES: Record<KishotenketsuPhase, string[]> = {
  KI: [
    'はじめに', 'まず', '最初に', '第一に', '〜について', '〜に関して',
    '昔々', 'ある日', '私は〜と思う', '近年', '今日では', '一般に', '周知の通り',
  ],
  SHO: [
    '例えば', 'さらに', 'その上', '実際に', 'また', '加えて', '具体的には',
    'それから', '続いて', '同様に', 'もちろん', '事実として', 'つまり', '詳しく言うと',
  ],
  TEN: [
    'しかし', 'だが', 'ところが', '一方で', 'それに対して', '実は', '思いがけず',
    'にもかかわらず', 'けれども', '反対に', '予想外に', 'とはいえ', 'ただし', 'しかしながら',
  ],
  KETSU: [
    'したがって', 'このように', '以上のように', '結論として', 'つまり', '最終的に',
    '要するに', '以上のことから', 'だからこそ', 'まとめると', 'このため', '結果として',
  ],
};

// Initial State Probabilities (Log probabilities)
const LOG_PI: Record<KishotenketsuPhase, number> = {
  KI: Math.log(0.85),
  SHO: Math.log(0.10),
  TEN: Math.log(0.03),
  KETSU: Math.log(0.02),
};

// State Transition Matrix A[i, j] = P(s_j | s_i) in Log Space
const LOG_TRANSITIONS: Record<KishotenketsuPhase, Record<KishotenketsuPhase, number>> = {
  KI: {
    KI: Math.log(0.35),
    SHO: Math.log(0.58),
    TEN: Math.log(0.05),
    KETSU: Math.log(0.02),
  },
  SHO: {
    KI: Math.log(0.02),
    SHO: Math.log(0.55),
    TEN: Math.log(0.38),
    KETSU: Math.log(0.05),
  },
  TEN: {
    KI: Math.log(0.01),
    SHO: Math.log(0.04),
    TEN: Math.log(0.30),
    KETSU: Math.log(0.65),
  },
  KETSU: {
    KI: Math.log(0.05),
    SHO: Math.log(0.05),
    TEN: Math.log(0.10),
    KETSU: Math.log(0.80),
  },
};

const PHASES: KishotenketsuPhase[] = ['KI', 'SHO', 'TEN', 'KETSU'];

/**
 * Splits Japanese text into candidate sentences while preserving dialogue quotes.
 */
export function segmentJapaneseSentences(text: string): string[] {
  if (!text.trim()) return [];

  const sentences: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    current += char;

    if (char === '「' || char === '『' || char === '（' || char === '(') {
      inQuote = true;
    } else if (char === '」' || char === '』' || char === '）' || char === ')') {
      inQuote = false;
    } else if (!inQuote && (char === '。' || char === '！' || char === '？' || char === '!' || char === '?')) {
      const trimmed = current.trim();
      if (trimmed) sentences.push(trimmed);
      current = '';
    } else if (!inQuote && char === '\n') {
      const trimmed = current.trim();
      if (trimmed) sentences.push(trimmed);
      current = '';
    }
  }

  const remainder = current.trim();
  if (remainder) sentences.push(remainder);

  return sentences;
}

/**
 * Detects discourse cues matching a specific phase in a sentence.
 */
function findCues(sentence: string, phase: KishotenketsuPhase): string[] {
  const found: string[] = [];
  for (const cue of DISCOURSE_CUES[phase]) {
    if (sentence.includes(cue)) {
      found.push(cue);
    }
  }
  return found;
}

/**
 * Calculates log emission probability log B(s, sentence).
 */
function computeLogEmission(
  sentence: string,
  phase: KishotenketsuPhase,
  sentenceIndex: number,
  totalSentences: number
): { logProb: number; cues: string[] } {
  const cues = findCues(sentence, phase);
  const relPos = totalSentences > 1 ? sentenceIndex / (totalSentences - 1) : 0;

  // Check if any other phase has cues
  let otherPhaseHasCues = false;
  for (const p of PHASES) {
    if (p !== phase && findCues(sentence, p).length > 0) {
      otherPhaseHasCues = true;
      break;
    }
  }

  let finalProb = 0.1;
  if (cues.length > 0) {
    // Strong emission when matching discourse connectives exist
    finalProb = Math.min(0.99, 0.60 + cues.length * 0.20);
  } else if (otherPhaseHasCues) {
    // Other phases have matching cues, so suppress this non-matching phase
    finalProb = 0.02;
  } else {
    // No explicit cues in the sentence for any phase -> use position-based prior
    if (phase === 'KI') {
      finalProb = Math.max(0.05, 0.85 - relPos * 1.2);
    } else if (phase === 'SHO') {
      finalProb = Math.max(0.05, 0.80 - Math.abs(relPos - 0.35) * 1.5);
    } else if (phase === 'TEN') {
      finalProb = Math.max(0.05, 0.75 - Math.abs(relPos - 0.70) * 1.5);
    } else if (phase === 'KETSU') {
      finalProb = Math.max(0.05, 0.10 + relPos * 0.75);
    }
  }

  return {
    logProb: Math.log(Math.max(0.001, finalProb)),
    cues,
  };
}

/**
 * Analyzes Japanese text using Viterbi Trellis decoding over the Kishōtenketsu HMM.
 */
export function analyzeKishotenketsu(text: string): KishotenketsuAnalysis {
  const sentences = segmentJapaneseSentences(text);
  const total = sentences.length;

  if (total === 0) {
    return {
      sentences: [],
      phaseCounts: { KI: 0, SHO: 0, TEN: 0, KETSU: 0 },
      phaseProportions: { KI: 0, SHO: 0, TEN: 0, KETSU: 0 },
      hasAllPhases: false,
      missingPhases: ['KI', 'SHO', 'TEN', 'KETSU'],
      structuralBalanceScore: 0,
      diagnostics: ['Văn bản trống.'],
      flowSummary: 'Chưa có dữ liệu để phân tích dòng chảy lập luận.',
    };
  }

  // 1. Viterbi Trellis DP
  // V[t][s] = highest log prob of path ending in state s at sentence t
  const V: number[][] = Array.from({ length: total }, () => Array(PHASES.length).fill(-Infinity));
  const backpointer: number[][] = Array.from({ length: total }, () => Array(PHASES.length).fill(0));
  const sentenceCues: Record<KishotenketsuPhase, string[]>[] = [];

  // Initialization (t = 0)
  const initialCues: Record<KishotenketsuPhase, string[]> = { KI: [], SHO: [], TEN: [], KETSU: [] };
  for (let s = 0; s < PHASES.length; s++) {
    const phase = PHASES[s];
    const { logProb, cues } = computeLogEmission(sentences[0], phase, 0, total);
    initialCues[phase] = cues;
    V[0][s] = LOG_PI[phase] + logProb;
  }
  sentenceCues.push(initialCues);

  // Recursion (t = 1 ... total - 1)
  for (let t = 1; t < total; t++) {
    const currentCues: Record<KishotenketsuPhase, string[]> = { KI: [], SHO: [], TEN: [], KETSU: [] };

    for (let sCurr = 0; sCurr < PHASES.length; sCurr++) {
      const phaseCurr = PHASES[sCurr];
      const { logProb: logEmission, cues } = computeLogEmission(sentences[t], phaseCurr, t, total);
      currentCues[phaseCurr] = cues;

      let maxLogProb = -Infinity;
      let bestPrev = 0;

      for (let sPrev = 0; sPrev < PHASES.length; sPrev++) {
        const phasePrev = PHASES[sPrev];
        const transProb = LOG_TRANSITIONS[phasePrev][phaseCurr];
        const candidate = V[t - 1][sPrev] + transProb;

        if (candidate > maxLogProb) {
          maxLogProb = candidate;
          bestPrev = sPrev;
        }
      }

      V[t][sCurr] = maxLogProb + logEmission;
      backpointer[t][sCurr] = bestPrev;
    }

    sentenceCues.push(currentCues);
  }

  // Termination: Pick best final state
  let bestFinalState = 0;
  let highestFinalProb = -Infinity;
  for (let s = 0; s < PHASES.length; s++) {
    if (V[total - 1][s] > highestFinalProb) {
      highestFinalProb = V[total - 1][s];
      bestFinalState = s;
    }
  }

  // Backtracking
  const optimalPath: KishotenketsuPhase[] = Array(total);
  optimalPath[total - 1] = PHASES[bestFinalState];
  let currState = bestFinalState;

  for (let t = total - 1; t > 0; t--) {
    currState = backpointer[t][currState];
    optimalPath[t - 1] = PHASES[currState];
  }

  // Build sentence results
  const sentenceResults: SentencePhaseResult[] = [];
  const phaseCounts: Record<KishotenketsuPhase, number> = { KI: 0, SHO: 0, TEN: 0, KETSU: 0 };

  for (let i = 0; i < total; i++) {
    const phase = optimalPath[i];
    phaseCounts[phase]++;
    const cues = sentenceCues[i][phase];

    // Compute relative confidence based on trellis probability margins
    const sortedProbs = [...V[i]].sort((a, b) => b - a);
    const margin = sortedProbs.length > 1 ? sortedProbs[0] - sortedProbs[1] : 2.0;
    const confidence = Math.min(1.0, Math.max(0.5, 0.5 + margin * 0.15));

    sentenceResults.push({
      index: i,
      text: sentences[i],
      phase,
      phaseKanji: PHASE_METADATA[phase].kanji,
      phaseVi: PHASE_METADATA[phase].nameVi,
      confidence: Math.round(confidence * 100) / 100,
      cues,
    });
  }

  // Calculate proportions
  const phaseProportions: Record<KishotenketsuPhase, number> = {
    KI: Math.round((phaseCounts.KI / total) * 100) / 100,
    SHO: Math.round((phaseCounts.SHO / total) * 100) / 100,
    TEN: Math.round((phaseCounts.TEN / total) * 100) / 100,
    KETSU: Math.round((phaseCounts.KETSU / total) * 100) / 100,
  };

  const missingPhases: KishotenketsuPhase[] = PHASES.filter(p => phaseCounts[p] === 0);
  const hasAllPhases = missingPhases.length === 0;

  // Compute Structural Balance Score (0 - 100)
  let balanceScore = 100;
  const diagnostics: string[] = [];

  if (total < 4) {
    balanceScore -= (4 - total) * 10;
    diagnostics.push(`Đoạn văn có ${total} câu, hơi ngắn để triển khai đầy đủ 4 hồi Khởi-Thừa-Chuyển-Kết.`);
  }

  for (const phase of PHASES) {
    const prop = phaseProportions[phase];
    const [minIdeal, maxIdeal] = PHASE_METADATA[phase].idealRatio;

    if (prop === 0) {
      balanceScore -= 20;
      diagnostics.push(`Thiếu hồi 「${PHASE_METADATA[phase].kanji}」 (${PHASE_METADATA[phase].nameVi}).`);
    } else if (prop < minIdeal && total >= 5) {
      balanceScore -= 5;
      diagnostics.push(`Hồi 「${PHASE_METADATA[phase].kanji}」 hơi mỏng (${Math.round(prop * 100)}% dung lượng bài).`);
    } else if (prop > maxIdeal && total >= 5) {
      balanceScore -= 5;
      diagnostics.push(`Hồi 「${PHASE_METADATA[phase].kanji}」 chiếm tỷ trọng khá lớn (${Math.round(prop * 100)}%).`);
    }
  }

  // Check sequential flow integrity
  if (sentenceResults[0]?.phase !== 'KI') {
    balanceScore -= 5;
    diagnostics.push('Bài viết không mở đầu bằng phần Khởi (起), vào đề hơi đột ngột.');
  }
  if (sentenceResults[total - 1]?.phase !== 'KETSU' && total >= 3) {
    balanceScore -= 5;
    diagnostics.push('Bài viết chưa khép lại bằng phần Kết (結) đúc kết trọn vẹn.');
  }

  balanceScore = Math.max(10, Math.min(100, balanceScore));

  if (diagnostics.length === 0) {
    diagnostics.push('Cấu trúc lập luận hài hòa tuyệt vời, phân bổ hoàn hảo theo nguyên lý Khởi-Thừa-Chuyển-Kết kinh điển.');
  }

  const summaryParts: string[] = [];
  summaryParts.push(`Cấu trúc ${total} câu:`);
  for (const p of PHASES) {
    if (phaseCounts[p] > 0) {
      summaryParts.push(`${PHASE_METADATA[p].kanji} (${phaseCounts[p]})`);
    }
  }
  const flowSummary = summaryParts.join(' → ');

  return {
    sentences: sentenceResults,
    phaseCounts,
    phaseProportions,
    hasAllPhases,
    missingPhases,
    structuralBalanceScore: balanceScore,
    diagnostics,
    flowSummary,
  };
}
