import * as XLSX from 'xlsx';
import { EstimateParseResult, EstimateLine } from '../types';

/**
 * Excelファイルから見積データをローカルで抽出（簡易版）
 */
export async function parseEstimateExcel(
  buffer: Buffer
): Promise<Partial<EstimateParseResult>> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

  const lines: EstimateLine[] = [];
  let total = 0;

  // 簡易的なパース（実際にはAIに補完してもらう）
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const description = row[0]?.toString() || '';
    const subtotalStr = row[row.length - 1]?.toString().replace(/[,¥]/g, '');
    const subtotal = parseFloat(subtotalStr) || 0;

    if (description && subtotal > 0) {
      lines.push({
        category: 'その他',
        description,
        location: '',
        unit_price: subtotal,
        quantity: 1,
        unit: '',
        subtotal,
        notes: '',
      });
      total += subtotal;
    }
  }

  return {
    vendor: '',
    issue_date: '',
    lines,
    total,
  };
}

/**
 * Excelファイルからテキストを抽出（AI処理用）
 */
export async function extractFromExcel(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

  return data.map((row: any[]) => row.join('\t')).join('\n');
}
