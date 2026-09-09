import { describe, it, expect } from 'vitest';
import { kanjiDAGService } from '../services/kanjiDAGService';


describe('Algorithm 13: Kanji Component Decomposition DAG', () => {
  it('successfully computes Kahn topological sort without cycles', () => {
    const topoOrder = kanjiDAGService.computeTopologicalSort();

    expect(topoOrder.length).toBeGreaterThan(30);

    // Primitives must appear before their composites
    const indexOfKi = topoOrder.indexOf('木');
    const indexOfRin = topoOrder.indexOf('林');
    const indexOfShin = topoOrder.indexOf('森');
    const indexOfHito = topoOrder.indexOf('人');
    const indexOfKyu = topoOrder.indexOf('休');

    expect(indexOfKi).toBeLessThan(indexOfRin);
    expect(indexOfRin).toBeLessThan(indexOfShin);
    expect(indexOfHito).toBeLessThan(indexOfKyu);
    expect(indexOfKi).toBeLessThan(indexOfKyu);
  });

  it('computes complete prerequisite transitive closure for compound characters', () => {
    // 詩 (Poem) is composed of 言 and 寺. 寺 is composed of 土 and 寸.
    const chainForShi = kanjiDAGService.getPrerequisiteChain('詩');

    expect(chainForShi).toContain('言');
    expect(chainForShi).toContain('寺');
    expect(chainForShi).toContain('土');
    expect(chainForShi).toContain('寸');

    // Transitive order: 土 and 寸 must appear before 寺, and 寺 before 詩
    expect(chainForShi.indexOf('土')).toBeLessThan(chainForShi.indexOf('寺'));
    expect(chainForShi.indexOf('寸')).toBeLessThan(chainForShi.indexOf('寺'));
  });

  it('identifies derivative descendants unlocked by a radical', () => {
    // Radical 青 (Thanh) derives 清 (Thanh), 晴 (Tình), 情 (Tình)
    const derivatives = kanjiDAGService.getDerivativeKanji('青');

    expect(derivatives).toContain('清');
    expect(derivatives).toContain('晴');
    expect(derivatives).toContain('情');
  });

  it('correctly evaluates prerequisite readiness (canLearn)', () => {
    const mastered = new Set(['人', '木']);
    // 休 requires 人 and 木 -> can learn
    expect(kanjiDAGService.canLearn('休', mastered)).toBe(true);

    // 森 requires 木 and 林 -> since 林 is not mastered, cannot learn
    expect(kanjiDAGService.canLearn('森', mastered)).toBe(false);

    mastered.add('林');
    expect(kanjiDAGService.canLearn('森', mastered)).toBe(true);
  });
});
