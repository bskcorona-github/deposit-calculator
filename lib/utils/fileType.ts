/**
 * ファイルタイプを検出
 */
export function detectFileType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'docx' || ext === 'doc') return 'word';
  if (ext === 'csv') return 'csv';
  
  // MIMEタイプでもチェック
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
  if (file.type.includes('wordprocessing') || file.type.includes('msword')) return 'word';
  if (file.type === 'text/csv') return 'csv';
  
  return 'unknown';
}

/**
 * 見積書に対応するファイルタイプかチェック
 */
export function isEstimateSupportedType(fileType: string): boolean {
  return ['pdf', 'excel', 'word', 'csv'].includes(fileType);
}

/**
 * 契約書に対応するファイルタイプかチェック
 */
export function isLeaseSupportedType(fileType: string): boolean {
  return ['pdf', 'word'].includes(fileType);
}
