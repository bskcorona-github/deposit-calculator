/**
 * 建物築年数による負担割合の調整
 * 
 * 国交省ガイドラインの理念に基づき、古い建物ほど借主負担を減額します。
 * 築年数が経過した建物では、同じ修繕でも物件価値への影響が小さいため、
 * 借主の負担割合を減らすことが合理的です。
 */

/**
 * 建物築年数による借主負担の調整率を計算
 * @param buildingAge 建物築年数
 * @returns 調整後の負担率（0.7-1.0）
 */
export function getBuildingAgeAdjustmentFactor(
  buildingAge: number | undefined
): number {
  if (!buildingAge || buildingAge < 10) {
    return 1.0; // 築10年未満は調整なし
  }
  
  // 築年数による減額率
  // - 築10-20年: 10%減額 → 0.9倍
  // - 築20-30年: 20%減額 → 0.8倍
  // - 築30年以上: 30%減額 → 0.7倍
  if (buildingAge >= 30) {
    return 0.7;
  } else if (buildingAge >= 20) {
    return 0.8;
  } else if (buildingAge >= 10) {
    return 0.9;
  }
  
  return 1.0;
}

/**
 * 建物築年数による借主負担額の調整
 * @param tenantShare 元の借主負担額
 * @param buildingAge 建物築年数
 * @returns 調整後の借主負担額
 */
export function adjustForBuildingAge(
  tenantShare: number,
  buildingAge: number | undefined
): number {
  const adjustmentFactor = getBuildingAgeAdjustmentFactor(buildingAge);
  
  if (adjustmentFactor === 1.0) {
    return tenantShare; // 調整なし
  }
  
  const adjustedAmount = Math.round(tenantShare * adjustmentFactor);
  
  // 調整後も最低1円は维持（完全にゼロにはしない）
  return Math.max(1, adjustedAmount);
}

/**
 * 建物築年数による調整の説明文を生成
 * @param buildingAge 建物築年数
 * @param originalAmount 元の金額
 * @param adjustedAmount 調整後の金額
 * @returns 説明文（調整がある場合のみ）
 */
export function getBuildingAgeAdjustmentExplanation(
  buildingAge: number | undefined,
  originalAmount: number,
  adjustedAmount: number
): string | null {
  if (!buildingAge || buildingAge < 10 || originalAmount === adjustedAmount) {
    return null; // 調整なし
  }
  
  const reductionRate = Math.round((1 - adjustedAmount / originalAmount) * 100);
  
  if (buildingAge >= 30) {
    return `築${buildingAge}年の古い建物のため、借主負担を${reductionRate}%減額`;
  } else if (buildingAge >= 20) {
    return `築${buildingAge}年の建物のため、借主負担を${reductionRate}%減額`;
  } else if (buildingAge >= 10) {
    return `築${buildingAge}年の建物のため、借主負担を${reductionRate}%減額`;
  }
  
  return null;
}
