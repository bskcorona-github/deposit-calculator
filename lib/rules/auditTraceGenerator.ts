import type {
  AuditTrace,
  EstimateLine,
  AllocationBasis,
  AllocationContext,
  Rule,
} from '@/lib/types';

/**
 * 監査トレースを生成
 * 計算の全ステップを詳細に記録し、根拠を追跡可能にする
 */
export function generateAuditTrace(params: {
  line: EstimateLine;
  matchedRule: Rule | null;
  allocation: 'tenant' | 'landlord' | 'split';
  tenantShare: number;
  landlordShare: number;
  basis: AllocationBasis[];
  context: AllocationContext;
  hasSpecialClause: boolean;
  hasDepreciation: boolean;
  hasMixedDamage: boolean;
  buildingAgeAdjustment?: { original: number; adjusted: number };
}): AuditTrace {
  const {
    line,
    matchedRule,
    allocation,
    tenantShare,
    landlordShare,
    basis,
    context,
    hasSpecialClause,
    hasDepreciation,
    hasMixedDamage,
    buildingAgeAdjustment,
  } = params;

  // 分類を判定
  let classification: AuditTrace['classification'] = 'tenant_fault';
  let rootCause = '';

  if (allocation === 'landlord') {
    classification = 'normal_wear';
    rootCause = 'CIVIL-621'; // 民法621条
  } else if (hasSpecialClause) {
    classification = 'special_clause';
    const clauseBasis = basis.find((b) => b.type === 'special_clause');
    rootCause = clauseBasis?.clause_ref || 'SPECIAL-CLAUSE';
  } else if (hasMixedDamage) {
    classification = 'aging';
    rootCause = 'GL-Mixed-Damage';
  } else if (matchedRule) {
    classification = 'tenant_fault';
    rootCause = `GL-Rule-${matchedRule.id}`;
  } else {
    classification = 'excluded';
    rootCause = 'UNMATCHED';
  }

  // 減価償却情報
  let depreciationInfo: AuditTrace['depreciation'] | undefined;
  if (hasDepreciation && matchedRule?.depreciation) {
    const usefulLife = matchedRule.depreciation.useful_life_years;
    const elapsed = context.tenancy_years;
    const remainingRatio =
      elapsed >= usefulLife
        ? 0.00001 // 残存価値1円相当
        : Math.max(0.00001, (usefulLife - elapsed) / usefulLife);

    depreciationInfo = {
      useful_life_years: usefulLife,
      elapsed_years: elapsed,
      remaining_ratio: remainingRatio,
      rounding_rule: 'round_down_to_1yen_minimum',
    };

    rootCause += `-Depreciation-${usefulLife}y`;
  }

  // 建物築年数調整
  let buildingAgeInfo: AuditTrace['building_age_adjustment'] | undefined;
  if (buildingAgeAdjustment && context.building_age) {
    const factor = buildingAgeAdjustment.adjusted / buildingAgeAdjustment.original;
    buildingAgeInfo = {
      building_age: context.building_age,
      adjustment_factor: factor,
      reason: `築${context.building_age}年の建物のため、借主負担を${Math.round((1 - factor) * 100)}%軽減`,
    };
  }

  // 特約情報
  let specialClauseInfo: AuditTrace['special_clause_override'] | undefined;
  if (hasSpecialClause) {
    const clauseBasis = basis.find((b) => b.type === 'special_clause');
    specialClauseInfo = {
      clause_ref: clauseBasis?.clause_ref || 'unknown',
      validity: 'valid', // TODO: 実際の有効性判定を実装
      reason: clauseBasis?.detail || '特約により借主負担',
    };
  }

  // 混在ケース情報
  let mixedDamageInfo: AuditTrace['mixed_damage'] | undefined;
  if (hasMixedDamage) {
    const agingKeywords = ['日焼け', '色あせ', '変色', '経年劣化'];
    const faultKeywords = ['シミ', '油汚れ', '水垢', 'カビ'];
    const foundAging = agingKeywords.filter((kw) =>
      (line.description + line.notes).includes(kw)
    );
    const foundFault = faultKeywords.filter((kw) =>
      (line.description + line.notes).includes(kw)
    );

    // 按分率を推定
    let ratio = 0.5; // デフォルト50%
    const text = line.description + line.notes;
    if (text.includes('部分的') || text.includes('一部')) ratio = 0.3;
    if (text.includes('全体') || text.includes('全面')) ratio = 0.7;

    mixedDamageInfo = {
      aging_keywords: foundAging,
      fault_keywords: foundFault,
      allocation_ratio: ratio,
      explanation: `経年劣化と借主過失が混在。借主負担${Math.round(ratio * 100)}%`,
    };
  }

  // 計算ステップ
  const calculationSteps: string[] = [];
  let formula = '';

  if (allocation === 'landlord') {
    calculationSteps.push('通常損耗・経年劣化のため、全額貸主負担');
    formula = `${line.subtotal}円 × 0% = 0円（借主負担）`;
  } else {
    calculationSteps.push(`基本金額: ${line.subtotal}円`);

    if (hasMixedDamage && mixedDamageInfo) {
      calculationSteps.push(
        `混在按分: ${line.subtotal}円 × ${mixedDamageInfo.allocation_ratio} = ${Math.round(line.subtotal * mixedDamageInfo.allocation_ratio)}円`
      );
    }

    if (hasDepreciation && depreciationInfo) {
      calculationSteps.push(
        `減価償却: ${depreciationInfo.remaining_ratio.toFixed(4)} × 元金額`
      );
    }

    if (buildingAgeAdjustment) {
      calculationSteps.push(
        `築年数調整: ${buildingAgeAdjustment.original}円 → ${buildingAgeAdjustment.adjusted}円`
      );
    }

    formula = `最終借主負担: ${tenantShare}円（${Math.round((tenantShare / line.subtotal) * 100)}%）`;
  }

  // 参照情報
  const references: AuditTrace['references'] = {};
  if (classification === 'normal_wear') {
    references.law = '民法621条';
    references.guideline_page = 'ガイドライン 第2章';
  }
  if (hasDepreciation) {
    references.guideline_page = 'ガイドライン P.15 図3';
  }
  if (hasSpecialClause) {
    references.guideline_qa = 'Q16（クリーニング特約）';
  }

  return {
    extracted_item: {
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unit_price,
      subtotal: line.subtotal,
      notes: line.notes,
    },
    classification,
    root_cause: rootCause,
    depreciation: depreciationInfo,
    building_age_adjustment: buildingAgeInfo,
    special_clause_override: specialClauseInfo,
    mixed_damage: mixedDamageInfo,
    allocation: {
      tenant_share: tenantShare,
      landlord_share: landlordShare,
      calculation_steps: calculationSteps,
      final_formula: formula,
    },
    warnings: [],
    references,
  };
}

/**
 * 監査トレースをJSON形式で出力
 */
export function exportAuditTraceJSON(traces: AuditTrace[]): string {
  return JSON.stringify(
    {
      version: '1.0',
      generated_at: new Date().toISOString(),
      guideline_reference: '原状回復をめぐるトラブルとガイドライン（再改訂版）',
      disclaimer:
        'この計算結果は国土交通省ガイドラインに基づく参考値です。最終的な負担区分は当事者間の合意と専門家の助言に基づいて決定してください。',
      traces,
    },
    null,
    2
  );
}

/**
 * 監査トレースをCSV形式で出力
 */
export function exportAuditTraceCSV(traces: AuditTrace[]): string {
  const headers = [
    '項目',
    '分類',
    '根拠コード',
    '金額',
    '借主負担',
    '貸主負担',
    '減価償却',
    '築年数調整',
    '計算式',
    '参照',
  ];

  const rows = traces.map((trace) => {
    return [
      trace.extracted_item.description,
      trace.classification,
      trace.root_cause,
      trace.extracted_item.subtotal,
      trace.allocation.tenant_share,
      trace.allocation.landlord_share,
      trace.depreciation
        ? `${trace.depreciation.elapsed_years}/${trace.depreciation.useful_life_years}年 (${Math.round(trace.depreciation.remaining_ratio * 100)}%)`
        : '-',
      trace.building_age_adjustment
        ? `築${trace.building_age_adjustment.building_age}年 (${Math.round(trace.building_age_adjustment.adjustment_factor * 100)}%)`
        : '-',
      trace.allocation.final_formula,
      Object.values(trace.references).join('; '),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
