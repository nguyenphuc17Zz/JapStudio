/**
 * Japanese Register & Stylistic Analysis Engine (Algorithm 11: Aho-Corasick Automaton).
 *
 * Implements Alfred V. Aho & Margaret J. Corasick's (1975) multi-pattern string matching
 * algorithm with linear time complexity O(N + M + Z), where:
 *   N = text length
 *   M = total length of all keywords in the trie
 *   Z = number of pattern occurrences
 *
 * Capabilities:
 * 1. Instantaneous detection of mixed registers (Desu/Masu vs Da/Dearu) in the same text.
 * 2. Real-time flagging of colloquial spoken idioms (めっちゃ, マジで, 〜じゃん, 〜っす) in formal writing.
 * 3. Exact matching of notorious double-keigo (二重敬語) traps (おっしゃられる, ご覧になられる).
 * 4. Zero network latency: runs directly in the client within < 1ms on full essays.
 */

export type StyleRegister = 'polite' | 'casual' | 'business' | 'colloquial' | 'double_keigo';

export interface StylePattern {
  id: string;
  pattern: string;
  register: StyleRegister;
  category: 'register_mismatch' | 'colloquial_in_formal' | 'double_keigo' | 'filler_word';
  severity: 'warning' | 'error' | 'info';
  suggestion: string;
  explanationVi: string;
}

export interface StyleMatch {
  pattern: StylePattern;
  startIndex: number;
  endIndex: number;
  matchedText: string;
}

export interface RegisterAnalysisReport {
  matches: StyleMatch[];
  politeCount: number;
  casualCount: number;
  colloquialCount: number;
  doubleKeigoCount: number;
  predominantRegister: 'polite' | 'casual' | 'neutral' | 'mixed';
  consistencyScore: number; // 0.0 (severely mixed) to 1.0 (pure consistent tone)
  hasMixedRegister: boolean;
  summaryVi: string;
}

// ---------------------------------------------------------------------------
// Aho-Corasick Trie Node
// ---------------------------------------------------------------------------

class ACNode {
  children: Map<string, ACNode> = new Map();
  failureLink: ACNode | null = null;
  outputs: StylePattern[] = [];
}

// ---------------------------------------------------------------------------
// Aho-Corasick Automaton
// ---------------------------------------------------------------------------

export class AhoCorasickAutomaton {
  private root: ACNode = new ACNode();
  private isBuilt: boolean = false;

  constructor(patterns: StylePattern[] = []) {
    for (const pattern of patterns) {
      this.addPattern(pattern);
    }
    if (patterns.length > 0) {
      this.buildFailureLinks();
    }
  }

  public addPattern(pattern: StylePattern): void {
    let curr = this.root;
    for (const char of pattern.pattern) {
      if (!curr.children.has(char)) {
        curr.children.set(char, new ACNode());
      }
      curr = curr.children.get(char)!;
    }
    curr.outputs.push(pattern);
    this.isBuilt = false;
  }

  /**
   * Constructs failure transitions using Breadth-First Search (BFS).
   * Time complexity: O(sum of pattern lengths).
   */
  public buildFailureLinks(): void {
    const queue: ACNode[] = [];

    // Initialize depth-1 children failure links to root
    for (const child of this.root.children.values()) {
      child.failureLink = this.root;
      queue.push(child);
    }

    // BFS through trie
    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [char, child] of current.children.entries()) {
        queue.push(child);

        let fall = current.failureLink;
        while (fall !== null && !fall.children.has(char)) {
          fall = fall.failureLink;
        }

        const failure = fall !== null ? fall.children.get(char)! : this.root;
        child.failureLink = failure;

        // Merge dictionary outputs from the failure node
        if (failure.outputs.length > 0) {
          child.outputs = [...child.outputs, ...failure.outputs];
        }
      }
    }

    this.isBuilt = true;
  }

  /**
   * Scans text in a single linear pass O(N) using state transitions and failure links.
   */
  public search(text: string): StyleMatch[] {
    if (!this.isBuilt) {
      this.buildFailureLinks();
    }

    const matches: StyleMatch[] = [];
    let current: ACNode = this.root;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Traverse failure links until finding a matching transition or reaching root
      while (current !== this.root && !current.children.has(char)) {
        current = current.failureLink || this.root;
      }

      current = current.children.get(char) || this.root;

      // Check outputs at current state
      for (const pattern of current.outputs) {
        const startIndex = i - pattern.pattern.length + 1;
        matches.push({
          pattern,
          startIndex,
          endIndex: i + 1,
          matchedText: text.slice(startIndex, i + 1),
        });
      }
    }

    return matches;
  }
}

// ---------------------------------------------------------------------------
// Standard Curated Japanese Style Patterns Dictionary
// ---------------------------------------------------------------------------

export const JAPANESE_STYLE_PATTERNS: StylePattern[] = [
  // 1. Polite sentence endings (丁寧語 / Desu-Masu)
  {
    id: 'polite_desu',
    pattern: 'です',
    register: 'polite',
    category: 'register_mismatch',
    severity: 'info',
    suggestion: 'だ (nếu viết thân mật)',
    explanationVi: 'Đuôi câu lịch sự thể Desu',
  },
  {
    id: 'polite_masu',
    pattern: 'ます',
    register: 'polite',
    category: 'register_mismatch',
    severity: 'info',
    suggestion: 'thể từ điển / thể Ta (nếu viết thân mật)',
    explanationVi: 'Đuôi câu lịch sự thể Masu',
  },
  {
    id: 'polite_deshita',
    pattern: 'でした',
    register: 'polite',
    category: 'register_mismatch',
    severity: 'info',
    suggestion: 'だった (nếu viết thân mật)',
    explanationVi: 'Quá khứ thể lịch sự Deshita',
  },
  {
    id: 'polite_mashita',
    pattern: 'ました',
    register: 'polite',
    category: 'register_mismatch',
    severity: 'info',
    suggestion: 'thể 〜た (nếu viết thân mật)',
    explanationVi: 'Quá khứ thể lịch sự Mashita',
  },
  {
    id: 'polite_gozaimasu',
    pattern: 'ございます',
    register: 'business',
    category: 'register_mismatch',
    severity: 'info',
    suggestion: 'あります / です',
    explanationVi: 'Kính ngữ cao cấp Gozaimasu',
  },

  // 2. Casual sentence endings (普通体 / Da-Dearu)
  {
    id: 'casual_da',
    pattern: 'だ。',
    register: 'casual',
    category: 'register_mismatch',
    severity: 'warning',
    suggestion: 'です。',
    explanationVi: 'Đuôi câu thân mật thể Da kết thúc câu',
  },
  {
    id: 'casual_dearu',
    pattern: 'である。',
    register: 'casual',
    category: 'register_mismatch',
    severity: 'warning',
    suggestion: 'です。',
    explanationVi: 'Văn phong nghị luận thể Dearu',
  },
  {
    id: 'casual_datta',
    pattern: 'だった。',
    register: 'casual',
    category: 'register_mismatch',
    severity: 'warning',
    suggestion: 'でした。',
    explanationVi: 'Quá khứ thể thân mật Datta',
  },
  {
    id: 'casual_janai',
    pattern: 'じゃない',
    register: 'casual',
    category: 'register_mismatch',
    severity: 'warning',
    suggestion: 'ではありません / ではない',
    explanationVi: 'Phủ định khẩu ngữ Janai',
  },
  {
    id: 'casual_teru',
    pattern: 'てる',
    register: 'casual',
    category: 'colloquial_in_formal',
    severity: 'warning',
    suggestion: 'ている / ています',
    explanationVi: 'Lược bỏ âm い trong thể tiếp diễn (てる -> ている)',
  },
  {
    id: 'casual_chau',
    pattern: 'ちゃう',
    register: 'casual',
    category: 'colloquial_in_formal',
    severity: 'warning',
    suggestion: 'てしまう / てしまいます',
    explanationVi: 'Dạng rút gọn khẩu ngữ ちゃう (てしまう)',
  },

  // 3. Spoken Colloquialisms (Khẩu ngữ tránh dùng trong văn viết chuẩn)
  {
    id: 'colloquial_meccha',
    pattern: 'めっちゃ',
    register: 'colloquial',
    category: 'colloquial_in_formal',
    severity: 'error',
    suggestion: 'とても / 大変 / 非常に',
    explanationVi: 'Khẩu ngữ thô "めっちゃ" — nên thay bằng "とても" hoặc "非常に"',
  },
  {
    id: 'colloquial_majide',
    pattern: 'マジで',
    register: 'colloquial',
    category: 'colloquial_in_formal',
    severity: 'error',
    suggestion: '本当に / 誠に',
    explanationVi: 'Tiếng lóng "マジで" — nên dùng "本当に"',
  },
  {
    id: 'colloquial_yappari',
    pattern: 'やっぱり',
    register: 'colloquial',
    category: 'colloquial_in_formal',
    severity: 'warning',
    suggestion: 'やはり',
    explanationVi: 'Khẩu ngữ "やっぱり" — văn viết nên dùng "やはり"',
  },
  {
    id: 'colloquial_jan',
    pattern: 'じゃん',
    register: 'colloquial',
    category: 'colloquial_in_formal',
    severity: 'error',
    suggestion: 'ではないでしょうか / ですね',
    explanationVi: 'Đuôi câu khẩu ngữ "じゃん" tuyệt đối tránh trong văn viết',
  },
  {
    id: 'colloquial_ssu',
    pattern: 'っす',
    register: 'colloquial',
    category: 'colloquial_in_formal',
    severity: 'error',
    suggestion: 'です',
    explanationVi: 'Khẩu ngữ rút gọn "っす" thay cho "です"',
  },

  // 4. Double Keigo Traps (二重敬語 - Nhị trùng kính ngữ sai quy tắc)
  {
    id: 'double_keigo_osshirareru',
    pattern: 'おっしゃられ',
    register: 'double_keigo',
    category: 'double_keigo',
    severity: 'error',
    suggestion: 'おっしゃる / おっしゃいました / おっしゃった',
    explanationVi: 'Nhị trùng kính ngữ: おっしゃる đã là tôn kính ngữ, không ghép thêm れる/られる',
  },
  {
    id: 'double_keigo_goranninarareru',
    pattern: 'ご覧になられ',
    register: 'double_keigo',
    category: 'double_keigo',
    severity: 'error',
    suggestion: 'ご覧になる / ご覧になります / ご覧になった',
    explanationVi: 'Nhị trùng kính ngữ: ご覧になる đã là tôn kính ngữ, không ghép thêm れる/られる',
  },
  {
    id: 'double_keigo_omeshiagari',
    pattern: 'お召し上がりになられ',
    register: 'double_keigo',
    category: 'double_keigo',
    severity: 'error',
    suggestion: '召し上がる / お召し上がりになる',
    explanationVi: 'Nhị trùng kính ngữ lặp thừa お〜になられる với 召し上がる',
  },
  {
    id: 'double_keigo_ukagawasete',
    pattern: '伺わせていただきます',
    register: 'double_keigo',
    category: 'double_keigo',
    severity: 'warning',
    suggestion: '伺います / お伺いいたします',
    explanationVi: 'Khiêm nhường ngữ thừa sai khiến: nên dùng 伺います hoặc お伺いいたします',
  },
];

// ---------------------------------------------------------------------------
// Singleton Register Analysis Engine
// ---------------------------------------------------------------------------

export class RegisterAnalysisEngine {
  private automaton: AhoCorasickAutomaton;

  constructor(customPatterns?: StylePattern[]) {
    this.automaton = new AhoCorasickAutomaton(customPatterns || JAPANESE_STYLE_PATTERNS);
  }

  /**
   * Evaluates text for register consistency and stylistic friction in O(N).
   */
  public analyze(text: string): RegisterAnalysisReport {
    if (!text || text.trim().length === 0) {
      return {
        matches: [],
        politeCount: 0,
        casualCount: 0,
        colloquialCount: 0,
        doubleKeigoCount: 0,
        predominantRegister: 'neutral',
        consistencyScore: 1.0,
        hasMixedRegister: false,
        summaryVi: 'Chưa có văn bản để thẩm định văn phong.',
      };
    }

    const matches = this.automaton.search(text);

    let politeCount = 0;
    let casualCount = 0;
    let colloquialCount = 0;
    let doubleKeigoCount = 0;

    for (const match of matches) {
      switch (match.pattern.register) {
        case 'polite':
        case 'business':
          politeCount++;
          break;
        case 'casual':
          casualCount++;
          break;
        case 'colloquial':
          colloquialCount++;
          break;
        case 'double_keigo':
          doubleKeigoCount++;
          break;
      }
    }

    // Determine predominant register
    let predominantRegister: 'polite' | 'casual' | 'neutral' | 'mixed' = 'neutral';
    if (politeCount > 0 && casualCount === 0) {
      predominantRegister = 'polite';
    } else if (casualCount > 0 && politeCount === 0) {
      predominantRegister = 'casual';
    } else if (politeCount > 0 && casualCount > 0) {
      const ratio = Math.max(politeCount, casualCount) / (politeCount + casualCount);
      predominantRegister = ratio > 0.8 ? (politeCount > casualCount ? 'polite' : 'casual') : 'mixed';
    }

    // Calculate Register Consistency Index (RCI)
    // When both polite and casual styles appear, consistency decreases proportionally
    let consistencyScore = 1.0;
    const totalRegisterMarkers = politeCount + casualCount;
    if (totalRegisterMarkers > 1) {
      const minority = Math.min(politeCount, casualCount);
      const discordance = (2 * minority) / totalRegisterMarkers;
      consistencyScore = Math.max(0.0, 1.0 - discordance);
    }

    // Penalty for colloquialisms and double-keigo
    if (colloquialCount > 0) {
      consistencyScore = Math.max(0.0, consistencyScore - colloquialCount * 0.15);
    }
    if (doubleKeigoCount > 0) {
      consistencyScore = Math.max(0.0, consistencyScore - doubleKeigoCount * 0.2);
    }

    consistencyScore = Math.round(consistencyScore * 100) / 100;
    const hasMixedRegister = politeCount > 0 && casualCount > 0 && consistencyScore < 0.85;

    // Summary advice
    let summaryVi = 'Văn phong nhất quán, tự nhiên.';
    if (hasMixedRegister) {
      summaryVi = `Phát hiện lẫn lộn thể lịch sự (${politeCount} lần) và thể thân mật (${casualCount} lần). Hãy thống nhất 1 văn phong xuyên suốt.`;
    } else if (doubleKeigoCount > 0) {
      summaryVi = `Phát hiện ${doubleKeigoCount} lỗi nhị trùng kính ngữ (二重敬語). Xem gợi ý điều chỉnh để viết tự nhiên hơn.`;
    } else if (colloquialCount > 0) {
      summaryVi = `Chứa ${colloquialCount} từ khẩu ngữ / tiếng lóng. Nên thay bằng từ ngữ chuẩn văn viết.`;
    }

    return {
      matches,
      politeCount,
      casualCount,
      colloquialCount,
      doubleKeigoCount,
      predominantRegister,
      consistencyScore,
      hasMixedRegister,
      summaryVi,
    };
  }
}

export const registerAnalysisEngine = new RegisterAnalysisEngine();
