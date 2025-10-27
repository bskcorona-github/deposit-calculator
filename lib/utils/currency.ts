/**
 * 金額をフォーマット
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * 金額計算（小計）
 */
export function calculateAmount(
  unitPrice: number,
  quantity: number
): number {
  return Math.round(unitPrice * quantity);
}

/**
 * パーセンテージ適用
 */
export function applyPercentage(
  amount: number,
  percentage: number
): number {
  return Math.round(amount * percentage);
}

/**
 * 文字列から金額をパース
 */
export function parseAmount(str: string): number {
  const cleaned = str.replace(/[^¥\d.,-]/g, '').replace(/[,¥]/g, '');
  return parseFloat(cleaned) || 0;
}
