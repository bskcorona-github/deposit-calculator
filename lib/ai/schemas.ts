import { z } from 'zod';

/**
 * 見積明細行のスキーマ
 */
export const EstimateLineSchema = z.object({
  category: z.string().describe('カテゴリ（例: クリーニング、クロス、床、設備等）'),
  description: z.string().describe('項目の説明'),
  location: z.string().describe('場所・部屋（例: 洋室6畳、リビング）。不明な場合は空文字列'),
  unit_price: z.number().describe('単価'),
  quantity: z.number().describe('数量'),
  unit: z.string().describe('単位（例: 式、㎡、箇所）。不明な場合は空文字列'),
  subtotal: z.number().describe('小計'),
  notes: z.string().describe('備考・理由（例: 喫煙によるヤニ汚れ、ペットによる傷、通常損耗）。不明な場合は空文字列'),
  tax_included: z.boolean().optional().describe('税込かどうか'),
});

/**
 * 見積解析結果のスキーマ
 */
export const EstimateParseResultSchema = z.object({
  vendor: z.string().describe('業者名（不明な場合は空文字列）'),
  issue_date: z.string().describe('発行日（不明な場合は空文字列）'),
  lines: z.array(EstimateLineSchema).describe('明細行'),
  total: z.number().describe('合計金額'),
});

/**
 * 契約書条項のスキーマ
 */
export const LeaseClauseSchema = z.object({
  article_no: z.string().describe('条番号（不明な場合は空文字列）'),
  heading: z.string().describe('見出し（不明な場合は空文字列）'),
  body: z.string().describe('本文'),
  is_special: z.boolean().describe('特約かどうか'),
});

/**
 * 契約書解析結果のスキーマ
 */
export const LeaseParseResultSchema = z.object({
  clauses: z.array(LeaseClauseSchema).describe('条項リスト'),
});

/**
 * OpenAI APIに渡すJSON Schema形式
 * 注: OpenAIの厳格モードでは、propertiesの全キーをrequiredに含める必要がある
 */
export const estimateJsonSchema = {
  type: 'object',
  properties: {
    vendor: { type: 'string', description: '業者名（不明な場合は空文字列）' },
    issue_date: { type: 'string', description: '発行日（不明な場合は空文字列）' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'カテゴリ' },
          description: { type: 'string', description: '項目の説明' },
          location: { type: 'string', description: '場所・部屋（例: 洋室6畳、リビング）' },
          unit_price: { type: 'number', description: '単価' },
          quantity: { type: 'number', description: '数量' },
          unit: { type: 'string', description: '単位（例: 式、㎡、箇所）' },
          subtotal: { type: 'number', description: '小計' },
          notes: { type: 'string', description: '備考・理由（例: 喫煙によるヤニ汚れ、ペットによる傷、通常損耗）' },
        },
        required: ['category', 'description', 'location', 'unit_price', 'quantity', 'unit', 'subtotal', 'notes'],
        additionalProperties: false,
      },
    },
    total: { type: 'number', description: '合計金額' },
  },
  required: ['vendor', 'issue_date', 'lines', 'total'],
  additionalProperties: false,
};

export const leaseJsonSchema = {
  type: 'object',
  properties: {
    clauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          article_no: { type: 'string', description: '条番号（不明な場合は空文字列）' },
          heading: { type: 'string', description: '見出し（不明な場合は空文字列）' },
          body: { type: 'string', description: '本文' },
          is_special: { type: 'boolean', description: '特約かどうか' },
        },
        required: ['article_no', 'heading', 'body', 'is_special'],
        additionalProperties: false,
      },
    },
  },
  required: ['clauses'],
  additionalProperties: false,
};
