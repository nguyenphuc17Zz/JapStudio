/**
 * Kanji Component Decomposition DAG Service (Algorithm 13).
 *
 * Models the Japanese writing system's radical-character composition as a
 * Directed Acyclic Graph (DAG) G = (V, E), where:
 *   - Vertices V are Kanji characters and primitive radicals.
 *   - A directed edge (u, v) in E means component 'u' is a direct structural
 *     prerequisite for composite character 'v'.
 *
 * Implements:
 * 1. Kahn's Topological Sort Algorithm with in-degree tracking to establish
 *    the optimal pedagogical prerequisite learning order.
 * 2. Cycle Detection to formally prove acyclicity (guaranteeing no recursive circularity).
 * 3. Prerequisite Transitive Closure via DFS/BFS to trace full genealogical ancestor
 *    chains (e.g. 青 -> 清, 言 + 寺 -> 詩).
 * 4. Derivative Expansion to show all compound characters unlocked by mastering a radical.
 */

export interface KanjiDAGNode {
  kanji: string;
  meaningVi: string;
  isPrimitive: boolean;
  prerequisites: string[]; // Incoming edges (parent components)
  derivatives: string[]; // Outgoing edges (children characters)
}

// ---------------------------------------------------------------------------
// Decomposition Knowledge Base
// ---------------------------------------------------------------------------

const KANJI_DECOMPOSITION_DATABASE: Record<string, { meaningVi: string; prereqs: string[] }> = {
  // Primitives / Radicals (In-degree 0)
  '一': { meaningVi: 'Nhất (Số một)', prereqs: [] },
  '十': { meaningVi: 'Thập (Số mười)', prereqs: [] },
  '人': { meaningVi: 'Nhân (Con người)', prereqs: [] },
  '口': { meaningVi: 'Khẩu (Miệng)', prereqs: [] },
  '日': { meaningVi: 'Nhật (Mặt trời, ngày)', prereqs: [] },
  '月': { meaningVi: 'Nguyệt (Mặt trăng, tháng)', prereqs: [] },
  '木': { meaningVi: 'Mộc (Cây gỗ)', prereqs: [] },
  '水': { meaningVi: 'Thủy (Nước)', prereqs: [] },
  '火': { meaningVi: 'Hỏa (Lửa)', prereqs: [] },
  '土': { meaningVi: 'Thổ (Đất)', prereqs: [] },
  '心': { meaningVi: 'Tâm (Trái tim, tấm lòng)', prereqs: [] },
  '言': { meaningVi: 'Ngôn (Lời nói)', prereqs: [] },
  '糸': { meaningVi: 'Mịch (Sợi tơ)', prereqs: [] },
  '女': { meaningVi: 'Nữ (Phụ nữ)', prereqs: [] },
  '子': { meaningVi: 'Tử (Con cái)', prereqs: [] },
  '田': { meaningVi: 'Điền (Ruộng lúa)', prereqs: [] },
  '力': { meaningVi: 'Lực (Sức mạnh)', prereqs: [] },
  '刀': { meaningVi: 'Đao (Con dao)', prereqs: [] },
  '門': { meaningVi: 'Môn (Cánh cổng)', prereqs: [] },
  '目': { meaningVi: 'Mục (Mắt)', prereqs: [] },
  '耳': { meaningVi: 'Nhĩ (Tai)', prereqs: [] },
  '寸': { meaningVi: 'Thốn (Tấc đo)', prereqs: [] },
  '舌': { meaningVi: 'Thiệt (Cái lưỡi)', prereqs: [] },
  '青': { meaningVi: 'Thanh (Màu xanh)', prereqs: [] },
  '先': { meaningVi: 'Tiên (Trước tiên)', prereqs: [] },
  '五': { meaningVi: 'Ngũ (Số năm)', prereqs: [] },

  // Level 1 Composites (Depend directly on primitives)
  '休': { meaningVi: 'Hưu (Nghỉ ngơi)', prereqs: ['人', '木'] },
  '林': { meaningVi: 'Lâm (Rừng thưa)', prereqs: ['木'] },
  '明': { meaningVi: 'Minh (Sáng sủa)', prereqs: ['日', '月'] },
  '早': { meaningVi: 'Tảo (Sớm)', prereqs: ['日', '十'] },
  '寺': { meaningVi: 'Tự (Chùa chiền)', prereqs: ['土', '寸'] },
  '男': { meaningVi: 'Nam (Đàn ông, con trai)', prereqs: ['田', '力'] },
  '好': { meaningVi: 'Hảo (Thích, tốt đẹp)', prereqs: ['女', '子'] },
  '間': { meaningVi: 'Gian (Khoảng cách, ở giữa)', prereqs: ['門', '日'] },
  '問': { meaningVi: 'Vấn (Hỏi han, vấn đề)', prereqs: ['門', '口'] },
  '聞': { meaningVi: 'Văn (Nghe thấy)', prereqs: ['門', '耳'] },
  '炎': { meaningVi: 'Viêm (Ngọn lửa bốc cao)', prereqs: ['火'] },
  '相': { meaningVi: 'Tương (Tương trợ, cùng nhau)', prereqs: ['木', '目'] },
  '話': { meaningVi: 'Thoại (Trò chuyện)', prereqs: ['言', '舌'] },
  '思': { meaningVi: 'Tư (Suy nghĩ, tưởng nhớ)', prereqs: ['田', '心'] },
  '洗': { meaningVi: 'Tẩy (Rửa sạch)', prereqs: ['水', '先'] },
  '清': { meaningVi: 'Thanh (Trong trẻo, thanh khiết)', prereqs: ['水', '青'] },
  '晴': { meaningVi: 'Tình (Trời trong xanh, nắng ráo)', prereqs: ['日', '青'] },
  '情': { meaningVi: 'Tình (Tình cảm, tâm tình)', prereqs: ['心', '青'] },

  // Level 2 Composites (Depend on other composites)
  '森': { meaningVi: 'Sâm (Rừng rậm)', prereqs: ['木', '林'] },
  '詩': { meaningVi: 'Thi (Bài thơ)', prereqs: ['言', '寺'] },
  '想': { meaningVi: 'Tưởng (Tư tưởng, mơ ước)', prereqs: ['相', '心'] },
  '語': { meaningVi: 'Ngữ (Ngôn ngữ)', prereqs: ['言', '五', '口'] },
};

// ---------------------------------------------------------------------------
// Kanji DAG Engine
// ---------------------------------------------------------------------------

export class KanjiDAGService {
  private nodes: Map<string, KanjiDAGNode> = new Map();

  constructor() {
    this.initializeGraph();
  }

  private initializeGraph(): void {
    // 1. Create nodes
    for (const [char, meta] of Object.entries(KANJI_DECOMPOSITION_DATABASE)) {
      this.nodes.set(char, {
        kanji: char,
        meaningVi: meta.meaningVi,
        isPrimitive: meta.prereqs.length === 0,
        prerequisites: [...meta.prereqs],
        derivatives: [],
      });
    }

    // 2. Build forward derivative edges (outgoing)
    for (const [char, node] of this.nodes.entries()) {
      for (const parent of node.prerequisites) {
        if (!this.nodes.has(parent)) {
          // Add implicit primitive if missing
          this.nodes.set(parent, {
            kanji: parent,
            meaningVi: 'Bộ thủ nguyên tố',
            isPrimitive: true,
            prerequisites: [],
            derivatives: [],
          });
        }
        const parentNode = this.nodes.get(parent)!;
        if (!parentNode.derivatives.includes(char)) {
          parentNode.derivatives.push(char);
        }
      }
    }
  }

  public getNode(kanji: string): KanjiDAGNode | undefined {
    return this.nodes.get(kanji);
  }

  public getAllNodes(): KanjiDAGNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Computes Kahn's Topological Sort Algorithm with in-degree tracking.
   * Guarantees a linear ordering L where every prerequisite appears before its composites.
   * Throws Error if the graph contains any cycle.
   */
  public computeTopologicalSort(): string[] {
    const inDegree: Map<string, number> = new Map();
    for (const [char, node] of this.nodes.entries()) {
      inDegree.set(char, node.prerequisites.length);
    }

    // Initialize queue with all in-degree 0 nodes (primitives)
    const queue: string[] = [];
    for (const [char, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(char);
      }
    }

    const sortedList: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedList.push(current);

      const node = this.nodes.get(current);
      if (!node) continue;

      for (const neighbor of node.derivatives) {
        const currentDeg = inDegree.get(neighbor) || 0;
        const newDeg = currentDeg - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sortedList.length !== this.nodes.size) {
      throw new Error('Graph cycle detected in Kanji decomposition DAG!');
    }

    return sortedList;
  }

  /**
   * Computes the Prerequisite Transitive Closure (Ancestors Subgraph) for a target Kanji.
   * Returns all direct and indirect sub-components required in topological dependency order.
   */
  public getPrerequisiteChain(target: string): string[] {
    if (!this.nodes.has(target)) {
      return [];
    }

    const ancestors: Set<string> = new Set();
    const dfs = (curr: string) => {
      const node = this.nodes.get(curr);
      if (!node) return;
      for (const parent of node.prerequisites) {
        if (!ancestors.has(parent)) {
          ancestors.add(parent);
          dfs(parent);
        }
      }
    };

    dfs(target);

    // Sort ancestors according to the global topological sort
    const fullOrder = this.computeTopologicalSort();
    return fullOrder.filter((char) => ancestors.has(char));
  }

  /**
   * Gets all derivative Kanji (Descendants) that are constructed using this character.
   */
  public getDerivativeKanji(kanji: string): string[] {
    const node = this.nodes.get(kanji);
    if (!node) return [];
    return [...node.derivatives];
  }

  /**
   * Evaluates if learner has satisfied all prerequisites for learning this Kanji.
   */
  public canLearn(kanji: string, masteredKanji: Set<string>): boolean {
    const prereqs = this.getPrerequisiteChain(kanji);
    return prereqs.every((p) => masteredKanji.has(p));
  }
}

export const kanjiDAGService = new KanjiDAGService();
