import type { EstimateLine, RulesConfig } from '@/lib/types';

export interface PriceCheckResult {
  status: 'ok' | 'warning' | 'excessive';
  message?: string;
  threshold?: number;
  actual: number;
  category: string;
}

/**
 * 価格の妥当性をチェック
 */
export function checkPriceReasonableness(
  line: EstimateLine,
  config: RulesConfig
): PriceCheckResult {
  const category = line.category.toLowerCase();
  const { pricing_guidance } = config;

  // クリーニング特約のチェック
  if (
    category.includes('クリーニング') ||
    category.includes('cleaning') ||
    line.description.includes('クリーニング')
  ) {
    if (line.subtotal > pricing_guidance.cleaning_flat_cap * 1.5) {
      return {
        status: 'excessive',
        message: `クリーニング費用が相場の1.5倍（${pricing_guidance.cleaning_flat_cap * 1.5}円）を超えています`,
        threshold: pricing_guidance.cleaning_flat_cap * 1.5,
        actual: line.subtotal,
        category: 'クリーニング',
      };
    } else if (line.subtotal > pricing_guidance.cleaning_flat_cap) {
      return {
        status: 'warning',
        message: `クリーニング費用が上限目安（${pricing_guidance.cleaning_flat_cap}円）を超えています`,
        threshold: pricing_guidance.cleaning_flat_cap,
        actual: line.subtotal,
        category: 'クリーニング',
      };
    }
  }

  // 鍵交換のチェック
  if (
    category.includes('鍵') ||
    line.description.includes('鍵') ||
    line.description.includes('シリンダー')
  ) {
    if (line.subtotal > pricing_guidance.key_change_cap * 1.5) {
      return {
        status: 'excessive',
        message: `鍵交換費用が相場の1.5倍（${pricing_guidance.key_change_cap * 1.5}円）を超えています`,
        threshold: pricing_guidance.key_change_cap * 1.5,
        actual: line.subtotal,
        category: '鍵交換',
      };
    } else if (line.subtotal > pricing_guidance.key_change_cap) {
      return {
        status: 'warning',
        message: `鍵交換費用が上限目安（${pricing_guidance.key_change_cap}円）を超えています`,
        threshold: pricing_guidance.key_change_cap,
        actual: line.subtotal,
        category: '鍵交換',
      };
    }
  }

  // 壁紙（クロス）の単価チェック
  if (
    (category.includes('クロス') || category.includes('壁紙')) &&
    (line.unit === '㎡' || line.unit === 'm2' || line.unit === 'sqm')
  ) {
    if (line.unit_price > pricing_guidance.wallpaper_per_sqm_cap * 1.5) {
      return {
        status: 'excessive',
        message: `壁紙単価（${line.unit_price}円/㎡）が相場の1.5倍（${pricing_guidance.wallpaper_per_sqm_cap * 1.5}円/㎡）を超えています`,
        threshold: pricing_guidance.wallpaper_per_sqm_cap * 1.5,
        actual: line.unit_price,
        category: '壁紙',
      };
    } else if (line.unit_price > pricing_guidance.wallpaper_per_sqm_cap) {
      return {
        status: 'warning',
        message: `壁紙単価（${line.unit_price}円/㎡）が上限目安（${pricing_guidance.wallpaper_per_sqm_cap}円/㎡）を超えています`,
        threshold: pricing_guidance.wallpaper_per_sqm_cap,
        actual: line.unit_price,
        category: '壁紙',
      };
    }
  }

  // 床材の単価チェック
  if (
    (category.includes('床') ||
      category.includes('フローリング') ||
      category.includes('カーペット')) &&
    (line.unit === '㎡' || line.unit === 'm2' || line.unit === 'sqm')
  ) {
    if (line.unit_price > pricing_guidance.flooring_per_sqm_cap * 1.5) {
      return {
        status: 'excessive',
        message: `床材単価（${line.unit_price}円/㎡）が相場の1.5倍（${pricing_guidance.flooring_per_sqm_cap * 1.5}円/㎡）を超えています`,
        threshold: pricing_guidance.flooring_per_sqm_cap * 1.5,
        actual: line.unit_price,
        category: '床材',
      };
    } else if (line.unit_price > pricing_guidance.flooring_per_sqm_cap) {
      return {
        status: 'warning',
        message: `床材単価（${line.unit_price}円/㎡）が上限目安（${pricing_guidance.flooring_per_sqm_cap}円/㎡）を超えています`,
        threshold: pricing_guidance.flooring_per_sqm_cap,
        actual: line.unit_price,
        category: '床材',
      };
    }
  }

  // 畳の単価チェック
  if (
    (category.includes('畳') || line.description.includes('畳')) &&
    (line.unit === '畳' || line.unit === '帖')
  ) {
    if (line.unit_price > pricing_guidance.tatami_per_mat_cap * 1.5) {
      return {
        status: 'excessive',
        message: `畳単価（${line.unit_price}円/畳）が相場の1.5倍（${pricing_guidance.tatami_per_mat_cap * 1.5}円/畳）を超えています`,
        threshold: pricing_guidance.tatami_per_mat_cap * 1.5,
        actual: line.unit_price,
        category: '畳',
      };
    } else if (line.unit_price > pricing_guidance.tatami_per_mat_cap) {
      return {
        status: 'warning',
        message: `畳単価（${line.unit_price}円/畳）が上限目安（${pricing_guidance.tatami_per_mat_cap}円/畳）を超えています`,
        threshold: pricing_guidance.tatami_per_mat_cap,
        actual: line.unit_price,
        category: '畳',
      };
    }
  }

  return {
    status: 'ok',
    actual: line.subtotal,
    category: category,
  };
}

/**
 * 価格チェック結果を警告メッセージに変換
 */
export function generatePriceWarning(result: PriceCheckResult): string | null {
  if (result.status === 'ok') return null;

  const severity = result.status === 'excessive' ? '【重要】' : '【注意】';
  return `${severity} ${result.message}`;
}
