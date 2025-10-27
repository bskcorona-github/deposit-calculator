import { EstimateParseResult, EstimateLine } from '../types';
import { extractTextFromPDF, cleanText } from './extractText';

/**
 * 見積書PDFからローカルで構造化データを抽出（簡易版）
 * 正確な抽出はAIに任せる、ここでは簡単なパターンマッチングのみ
 */
export async function parseEstimatePDF(
  buffer: Buffer
): Promise<Partial<EstimateParseResult>> {
  const text = await extractTextFromPDF(buffer);
  const cleaned = cleanText(text);

  // 簡易的なパース（実際にはAIに任せる）
  const lines = cleaned.split('\n');
  const estimateLines: EstimateLine[] = [];
  let total = 0;

  // 簡易的な明細抽出（ダミーデータ）
  for (const line of lines) {
    const match = line.match(
      /(.*?)\s+([¥\d,]+)\s*円?\s*(\d+\.?\d*)?\s*(.*)?/
    );
    if (match) {
      const description = match[1]?.trim();
      const amountStr = match[2]?.replace(/[¥,]/g, '');
      const amount = parseInt(amountStr, 10);

      if (description && !isNaN(amount)) {
        estimateLines.push({
          category: 'その他', // AIに補完してもらう
          description,
          location: '', // AIに補完してもらう
          unit_price: amount,
          quantity: 1,
          unit: '', // AIに補完してもらう
          subtotal: amount,
          notes: '', // AIに補完してもらう
        });
        total += amount;
      }
    }
  }

  return {
    vendor: '', // AIに補完してもらう
    issue_date: '', // AIに補完してもらう
    lines: estimateLines,
    total,
  };
}
