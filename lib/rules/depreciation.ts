/**
 * 減価償却の計算ユーティリティ
 */

/**
 * 直線法による減価償却率の計算
 * @param tenancyYears 入居年数
 * @param usefulLifeYears 耐用年数
 * @returns 残存価値の割合（0-1）
 */
export function calculateStraightLineDepreciation(
  tenancyYears: number,
  usefulLifeYears: number
): number {
  if (tenancyYears >= usefulLifeYears) {
    return 0; // 完全に償却済み（残存価値なし）
  }
  
  // 残存価値の割合 = (耐用年数 - 経過年数) / 耐用年数
  const remainingValue = (usefulLifeYears - tenancyYears) / usefulLifeYears;
  return Math.max(0, Math.min(1, remainingValue));
}

/**
 * 減価償却を適用した借主負担額の計算
 * @param originalAmount 元の金額
 * @param tenancyYears 入居年数
 * @param usefulLifeYears 耐用年数
 * @returns 借主負担額（減価後）
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
  
  return Math.round(originalAmount * remainingValueRatio);
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
  
  if (percentage === 0) {
    return `耐用年数${usefulLifeYears}年を経過しているため、借主負担はありません`;
  }
  
  return `耐用年数${usefulLifeYears}年、入居${tenancyYears}年により残存価値${percentage}%（${depreciatedAmount.toLocaleString()}円）を適用`;
}
