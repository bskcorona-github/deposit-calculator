import { LeaseParseResult, LeaseClause } from '../types';
import { extractTextFromPDF, cleanText } from './extractText';

/**
 * 契約書PDFからローカルで構造化データを抽出（簡易版）
 */
export async function parseLeasePDF(
  buffer: Buffer
): Promise<Partial<LeaseParseResult>> {
  const text = await extractTextFromPDF(buffer);
  const cleaned = cleanText(text);

  const clauses: LeaseClause[] = [];
  const lines = cleaned.split('\n');

  // 簡易的な条文抽出（実際にはAIに任せる）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^（?(第?\s*\d+\s*条?)\uff09?\s*(.*)/);
    if (match) {
      const article_no = match[1]?.trim() || '';
      const heading = match[2]?.trim() || '';
      let body = '';

      // 次の条までの本文を収集
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^（?第?\s*\d+\s*条?\uff09?/)) {
          break;
        }
        body += lines[j] + ' ';
      }

      clauses.push({
        article_no,
        heading,
        body: body.trim(),
        is_special: body.includes('特約') || body.includes('特別な定め'),
      });
    }
  }

  return {
    clauses,
  };
}
