/**
 * PII（個人識別情報）をマスキング
 */
export function maskPII(text: string): string {
  let masked = text;

  // 電話番号
  masked = masked.replace(
    /\d{2,4}[-ー]?\d{2,4}[-ー]?\d{4}/g,
    '***-****-****'
  );

  // メールアドレス
  masked = masked.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '****@****.***'
  );

  // 郵便番号
  masked = masked.replace(/〒?\d{3}[-ー]?\d{4}/g, '〒***-****');

  // 住所（都道府県まで残し、市区町村以下をマスク）
  masked = masked.replace(
    /(都|道|府|県)[一-龥ぁ-んァ-ン\d\-ー]+/g,
    '$1***'
  );

  // 氏名（「様」「氏」の前）
  masked = masked.replace(/[一-龥]{2,4}(様|氏)/g, '***$1');

  return masked;
}

/**
 * PIIが含まれているかチェック
 */
export function containsPII(text: string): boolean {
  const patterns = [
    /\d{2,4}[-ー]?\d{2,4}[-ー]?\d{4}/, // 電話番号
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // メール
    /〒?\d{3}[-ー]?\d{4}/, // 郵便番号
  ];

  return patterns.some((pattern) => pattern.test(text));
}
