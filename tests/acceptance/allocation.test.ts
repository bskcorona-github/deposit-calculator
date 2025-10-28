import { describe, it, expect } from 'vitest';
import { allocateExpenses } from '@/lib/rules/rulesEngine';
import type { EstimateParseResult, LeaseParseResult, AllocationContext } from '@/lib/types';

/**
 * 受付基準テスト（Acceptance Tests）
 * ChatGPT監査レポートで推奨された10項目のテストケース
 */

describe('受付基準テスト: 原状回復費用計算の正確性', () => {
  /**
   * テストケース1: クロス落書き（2面）・入居4年
   * 期待: 負担割合 1-4/6=33.3%を2面分に適用。最小単位=一面
   */
  it('1. クロス落書き（2面）・入居4年 → 減価償却33.3%適用', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 60000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替（落書き）',
          location: 'リビング',
          unit_price: 30000,
          quantity: 2,
          unit: '面',
          subtotal: 60000,
          notes: '子供の落書きあり',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 4,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 減価償却: (6-4)/6 = 0.333...
    // 期待借主負担: 60000 * 0.333 ≈ 20000円
    expect(line.tenant_share).toBeGreaterThanOrEqual(19000);
    expect(line.tenant_share).toBeLessThanOrEqual(21000);
    expect(line.tenant_percentage).toBeGreaterThanOrEqual(31);
    expect(line.tenant_percentage).toBeLessThanOrEqual(35);

    // 監査トレースの確認
    expect(line.audit_trace).toBeDefined();
    expect(line.audit_trace?.classification).toBe('tenant_fault');
    expect(line.audit_trace?.depreciation).toBeDefined();
    expect(line.audit_trace?.depreciation?.useful_life_years).toBe(6);
    expect(line.audit_trace?.depreciation?.elapsed_years).toBe(4);
  });

  /**
   * テストケース2: 喫煙ヤニ汚れ（全面）・入居2年
   * 期待: 借主負担。ただし面単位/減価適用
   */
  it('2. 喫煙ヤニ汚れ（全面）・入居2年 → 減価償却適用', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 100000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 100000,
          quantity: 1,
          unit: '式',
          subtotal: 100000,
          notes: '喫煙によるヤニ汚れ全面',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 2,
      building_age: 3,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 減価償却: (6-2)/6 = 0.666...
    // 期待借主負担: 100000 * 0.666 ≈ 66600円
    expect(line.tenant_share).toBeGreaterThanOrEqual(65000);
    expect(line.tenant_share).toBeLessThanOrEqual(68000);

    // 監査トレースで喫煙検出を確認
    expect(line.audit_trace).toBeDefined();
    expect(line.notes).toContain('喫煙');
  });

  /**
   * テストケース3: ペット傷（床部分補修）
   * 期待: 対象箇所限定の部分補修
   */
  it('3. ペット傷（床部分補修） → 借主負担', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 30000,
      lines: [
        {
          category: '床',
          description: 'フローリング部分補修',
          location: '寝室',
          unit_price: 30000,
          quantity: 1,
          unit: '箇所',
          subtotal: 30000,
          notes: 'ペットの引っかき傷',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 3,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // ペット傷は借主負担だが、減価償却適用
    // (6-3)/6 = 0.5
    expect(line.tenant_share).toBeGreaterThanOrEqual(14000);
    expect(line.tenant_share).toBeLessThanOrEqual(16000);

    // 監査トレース確認
    expect(line.audit_trace?.classification).toBe('tenant_fault');
    expect(line.notes).toContain('ペット');
  });

  /**
   * テストケース4: 通常損耗（日焼け・経年劣化）
   * 期待: 原則貸主負担（民法621条）として完全除外
   */
  it('4. 通常損耗（日焼け・経年劣化） → 全額貸主負担', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 50000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 50000,
          quantity: 1,
          unit: '式',
          subtotal: 50000,
          notes: '日焼けによる変色',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 5,
      building_age: 8,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 日焼けは通常損耗 → 貸主負担
    expect(line.tenant_share).toBe(0);
    expect(line.landlord_share).toBe(50000);
    expect(line.tenant_percentage).toBe(0);

    // 監査トレース確認
    expect(line.audit_trace?.classification).toBe('normal_wear');
    expect(line.audit_trace?.root_cause).toContain('CIVIL-621');
  });

  /**
   * テストケース5: クリーニング特約（25,000円/税別・明確合意）
   * 期待: 有効側の分岐で借主負担
   */
  it('5. クリーニング特約（有効・相当額） → 借主負担', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 25000,
      lines: [
        {
          category: 'クリーニング',
          description: 'ルームクリーニング',
          location: '全室',
          unit_price: 25000,
          quantity: 1,
          unit: '式',
          subtotal: 25000,
          notes: '',
          tax_included: false,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [
        {
          article_no: '第10条',
          heading: 'クリーニング費用の負担',
          body: '借主は退去時に専門業者によるルームクリーニング費用25,000円（税別）を負担する。',
          is_special: true,
        },
      ],
    };

    const context: AllocationContext = {
      tenancy_years: 2,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 特約により借主負担（相当額内）
    expect(line.tenant_share).toBe(25000);
    expect(line.landlord_share).toBe(0);
    expect(line.tenant_percentage).toBe(100);

    // 監査トレース確認
    expect(line.audit_trace?.classification).toBe('special_clause');
    expect(line.audit_trace?.special_clause_override?.validity).toBe('valid');
  });

  /**
   * テストケース6: クリーニング特約（高額・曖昧条項）
   * 期待: 無効/一部無効シグナル（警告）を挿入
   */
  it('6. クリーニング特約（高額） → 価格警告', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 80000,
      lines: [
        {
          category: 'クリーニング',
          description: 'ルームクリーニング',
          location: '全室',
          unit_price: 80000,
          quantity: 1,
          unit: '式',
          subtotal: 80000,
          notes: '',
          tax_included: false,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [
        {
          article_no: '第10条',
          heading: 'クリーニング費用',
          body: '退去時のクリーニング費用は借主が負担する。',
          is_special: true,
        },
      ],
    };

    const context: AllocationContext = {
      tenancy_years: 2,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 高額のため警告が出ている
    expect(result.warnings.length).toBeGreaterThan(0);
    const hasWarning = result.warnings.some(
      (w) => w.includes('クリーニング') && w.includes('高額')
    );
    expect(hasWarning).toBe(true);
  });

  /**
   * テストケース7: 築古設備（耐用年数経過後）
   * 期待: 残存1円相当ロジックで負担ゼロor極小に漸近
   */
  it('7. 築古設備（耐用年数経過後） → 残存価値1円', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 50000,
      lines: [
        {
          category: '設備',
          description: 'エアコン修理',
          location: 'リビング',
          unit_price: 50000,
          quantity: 1,
          unit: '台',
          subtotal: 50000,
          notes: '借主の不適切な使用による故障',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 7, // エアコン耐用年数6年を超過
      building_age: 15,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 耐用年数経過後 → 残存価値1円相当
    // 50000 * 0.00001 = 0.5 → 最低1円
    expect(line.tenant_share).toBeLessThanOrEqual(10);
    expect(line.tenant_share).toBeGreaterThanOrEqual(1);

    // 監査トレース確認
    expect(line.audit_trace?.depreciation).toBeDefined();
    expect(line.audit_trace?.depreciation?.remaining_ratio).toBeLessThanOrEqual(0.00001);
  });

  /**
   * テストケース8: 「一面＋角欠け」の複合
   * 期待: 面単位＋単位数量を正しく合成。二重計上なし
   */
  it('8. 一面＋角欠けの複合 → 単位数量の正確計算', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 40000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 20000,
          quantity: 2,
          unit: '面',
          subtotal: 40000,
          notes: '1面は角欠けあり',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 3,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 2面分で計算されている
    expect(line.quantity).toBe(2);
    expect(line.original_subtotal).toBe(40000);

    // 減価償却: (6-3)/6 = 0.5
    expect(line.tenant_share).toBeGreaterThanOrEqual(19000);
    expect(line.tenant_share).toBeLessThanOrEqual(21000);
  });

  /**
   * テストケース9: 敷金相殺
   * 期待: 敷金定義に沿って差引後残額の返還が明細で追える
   * 注: 現在未実装のため、このテストはスキップ
   */
  it.skip('9. 敷金相殺計算 → 差引後返還額の明示', () => {
    // TODO: Phase 3-2で実装予定
  });

  /**
   * テストケース10: PIIマスキング
   * 期待: 氏名・電話・メール・住所がAI送信前にマスク
   * 注: このテストは単体テストで別途実装
   */
  it.skip('10. PIIマスキング → 個人情報保護', () => {
    // TODO: lib/utils/sanitize.test.tsで実装予定
  });
});

/**
 * 混在ケース（経年劣化+借主過失）のテスト
 */
describe('混在ケース: 経年劣化と借主過失の按分', () => {
  it('日焼け+シミの混在 → 50%按分後に減価償却', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 50000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 50000,
          quantity: 1,
          unit: '式',
          subtotal: 50000,
          notes: '日焼けによる変色と飲み物のシミ',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 3,
      building_age: 5,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 混在按分: 50% (中程度の按分)
    // 按分後: 50000 * 0.5 = 25000円
    // 減価償却: 25000 * (6-3)/6 = 25000 * 0.5 = 12500円
    expect(line.tenant_share).toBeGreaterThanOrEqual(11000);
    expect(line.tenant_share).toBeLessThanOrEqual(14000);

    // 監査トレース確認
    expect(line.audit_trace?.mixed_damage).toBeDefined();
    expect(line.audit_trace?.mixed_damage?.aging_keywords.length).toBeGreaterThan(0);
    expect(line.audit_trace?.mixed_damage?.fault_keywords.length).toBeGreaterThan(0);
  });

  it('部分的な油汚れ+経年劣化 → 30%按分', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 40000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'キッチン',
          unit_price: 40000,
          quantity: 1,
          unit: '式',
          subtotal: 40000,
          notes: '部分的な油汚れと色あせ',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 2,
      building_age: 10,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 混在按分: 30% (部分的)
    // 按分後: 40000 * 0.3 = 12000円
    // 減価償却: 12000 * (6-2)/6 = 12000 * 0.666 = 8000円
    expect(line.tenant_share).toBeGreaterThanOrEqual(7000);
    expect(line.tenant_share).toBeLessThanOrEqual(9000);
  });
});

/**
 * 建物築年数調整のテスト
 */
describe('建物築年数調整: 古い建物の負担軽減', () => {
  it('築10年の建物 → 10%軽減', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 50000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 50000,
          quantity: 1,
          unit: '式',
          subtotal: 50000,
          notes: '穴あけ',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 1,
      building_age: 10,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 減価償却なし（1年未満相当の影響）
    // 築10年調整: 0.9倍
    const expectedWithoutAdjustment = Math.round(50000 * (6 - 1) / 6);
    const expectedWithAdjustment = Math.round(expectedWithoutAdjustment * 0.9);

    expect(line.tenant_share).toBeGreaterThanOrEqual(expectedWithAdjustment - 2000);
    expect(line.tenant_share).toBeLessThanOrEqual(expectedWithAdjustment + 2000);

    // 監査トレース確認
    expect(line.audit_trace?.building_age_adjustment).toBeDefined();
    expect(line.audit_trace?.building_age_adjustment?.building_age).toBe(10);
    expect(line.audit_trace?.building_age_adjustment?.adjustment_factor).toBeGreaterThanOrEqual(0.89);
    expect(line.audit_trace?.building_age_adjustment?.adjustment_factor).toBeLessThanOrEqual(0.91);
  });

  it('築30年以上の建物 → 30%軽減', () => {
    const estimate: EstimateParseResult = {
      vendor: 'テスト業者',
      issue_date: '2024-01-01',
      total: 50000,
      lines: [
        {
          category: 'クロス',
          description: '壁クロス張替',
          location: 'リビング',
          unit_price: 50000,
          quantity: 1,
          unit: '式',
          subtotal: 50000,
          notes: '穴あけ',
          tax_included: true,
        },
      ],
    };

    const lease: LeaseParseResult = {
      clauses: [],
    };

    const context: AllocationContext = {
      tenancy_years: 1,
      building_age: 35,
    };

    const result = allocateExpenses(estimate, lease, context);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];

    // 築30年以上調整: 0.7倍
    const expectedWithoutAdjustment = Math.round(50000 * (6 - 1) / 6);
    const expectedWithAdjustment = Math.round(expectedWithoutAdjustment * 0.7);

    expect(line.tenant_share).toBeGreaterThanOrEqual(expectedWithAdjustment - 2000);
    expect(line.tenant_share).toBeLessThanOrEqual(expectedWithAdjustment + 2000);

    // 監査トレース確認
    expect(line.audit_trace?.building_age_adjustment?.adjustment_factor).toBeGreaterThanOrEqual(0.69);
    expect(line.audit_trace?.building_age_adjustment?.adjustment_factor).toBeLessThanOrEqual(0.71);
  });
});
