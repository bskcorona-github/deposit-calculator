import OpenAI from 'openai';
import { maskPII } from '../utils/sanitize';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * OpenAI APIを使用して構造化データを抽出
 * PIIマスキングを自動適用
 * model: gpt-4o（最新の高性能モデル）を使用
 */
export async function extractStructuredData<T = any>(
  systemPrompt: string,
  inputText: string,
  jsonSchema: any
): Promise<T> {
  try {
    // PIIマスキングを適用
    const maskedText = maskPII(inputText);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: maskedText,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'extraction_result',
          strict: true,
          schema: jsonSchema,
        },
      },
      temperature: 0.1,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAIからのレスポンスが空です');
    }
    
    const result = JSON.parse(content) as T;
    return result;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AIによるデータ抽出に失敗しました');
  }
}
