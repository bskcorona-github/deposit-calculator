import mammoth from 'mammoth';

/**
 * Wordドキュメントからテキストを抽出
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
