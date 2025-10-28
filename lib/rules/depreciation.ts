/**
 * 減価償却の計算ユーティリティ
 */

/**
 * 直線法による減価償却率の計算
 * 国交省ガイドライン準拠：耐用年数経過後も残存価値1円を维持
 * @param tenancyYears 入居年数
 * @param usefulLifeYears 耐用年数
 * @returns 残存価値の割合（0.00001-1）
 */
export function calculateStraightLineDepreciation(
  tenancyYears: number,
  usefulLifeYears: number
): number {
  // 耐用年数経過後も残存価値1円を维持（国交省ガイドライン準拠）
  // 0.00001 = 1/100,000 で、10万円の場合1円、1万円の場合0.1円となる
  const RESIDUAL_VALUE_RATIO = 0.00001;
  
  if (tenancyYears >= usefulLifeYears) {
    return RESIDUAL_VALUE_RATIO; // 残存価値1円相当
  }
  
  // 残存価値の割合 = (耐用年数 - 経過年数) / 耐用年数
  const remainingValue = (usefulLifeYears - tenancyYears) / usefulLifeYears;
  return Math.max(RESIDUAL_VALUE_RATIO, Math.min(1, remainingValue));
}

/**
 * 減価償却を適用した借主負担額の計算
 * @param originalAmount 元の金額
 * @param tenancyYears 入居年数
 * @param usefulLifeYears 耐用年数
 * @returns 借主負担額（減価後、最低1円）
 */
export function applyDepreciation(
  originalAmount: number,
  tenancyYears: number,
  usefulLifeYears: number
): number {
  const remainingValueRatio = calculateStraightLineDepreciation(
    tenancyYears,
    usefulLifeYears
  );
  
  const depreciatedAmount = Math.round(originalAmount * remainingValueRatio);
  
  // 国交省ガイドライン：耐用年数経過後も最低1円は借主負担
  return Math.max(1, depreciatedAmount);
}

/**
 * 減価償却の説明文を生成
 */
export function getDepreciationExplanation(
  tenancyYears: number,
  usefulLifeYears: number,
  originalAmount: number,
  depreciatedAmount: number
): string {
  const remainingRatio = calculateStraightLineDepreciation(tenancyYears, usefulLifeYears);
  const percentage = Math.round(remainingRatio * 100);
  
  if (tenancyYears >= usefulLifeYears) {
    return `耐用年数${usefulLifeYears}年を経過しているため、残存価値1円を適用（国交省ガイドライン準拠）`;
  }
  
  return `耐用年数${usefulLifeYears}年、入居${tenancyYears}年により残存価値${percentage}%（${depreciatedAmount.toLocaleString()}円）を適用`;
}
