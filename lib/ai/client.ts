import OpenAI from 'openai';
import { maskPII } from '../utils/sanitize';

/**
 * OpenAI クライアントのインスタンス（シングルトン・遅延初期化）
 */
let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_openaiClient) return _openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }
  
  _openaiClient = new OpenAI({
    apiKey,
  });
  
  return _openaiClient;
}

// 遅延初期化されたクライアントのゲッター
export const openai = {
  get client() {
    return getOpenAIClient();
  }
};

/**
 * JSON構造化抽出を実行
 * 最新の高性能モデル（gpt-4o）を使用してデータを抽出
 */
export async function extractStructuredData<T>(
  prompt: string,
  text: string,
  jsonSchema: any
): Promise<T> {
  const client = getOpenAIClient();
  
  // PII マスキング
  const sanitizedText = maskPII(text);
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o', // 最新の高性能モデル（常に最新版を使用）
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: sanitizedText,
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
    temperature: 0.1, // 一貫性と精度を重視
  });
  
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI からのレスポンスが空です');
  }
  
  return JSON.parse(content) as T;
}
