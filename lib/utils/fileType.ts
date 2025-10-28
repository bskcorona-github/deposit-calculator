export type FileTypeInfo = {
  type: 'pdf' | 'excel' | 'word' | 'csv' | 'unknown';
  mimeType: string;
  fileName: string;
};

/**
 * ファイルタイプを検出
 */
export function detectFileType(file: File): FileTypeInfo {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let detectedType: FileTypeInfo['type'] = 'unknown';
  
  if (ext === 'pdf') detectedType = 'pdf';
  else if (ext === 'xlsx' || ext === 'xls') detectedType = 'excel';
  else if (ext === 'docx' || ext === 'doc') detectedType = 'word';
  else if (ext === 'csv') detectedType = 'csv';
  
  // MIMEタイプでもチェック
  if (detectedType === 'unknown') {
    if (file.type === 'application/pdf') detectedType = 'pdf';
    else if (file.type.includes('spreadsheet') || file.type.includes('excel')) detectedType = 'excel';
    else if (file.type.includes('wordprocessing') || file.type.includes('msword')) detectedType = 'word';
    else if (file.type === 'text/csv') detectedType = 'csv';
  }
  
  return {
    type: detectedType,
    mimeType: file.type,
    fileName: file.name,
  };
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
