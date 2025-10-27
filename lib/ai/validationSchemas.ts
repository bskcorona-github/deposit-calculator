import { z } from 'zod';

/**
 * AI検証の修正提案スキーマ
 */
export const AISuggestedCorrectionSchema = z.object({
  tenant_share: z.number().min(0).max(1).describe('提案する借主負担割合（0-1）'),
  reason: z.string().describe('修正理由'),
});

/**
 * AI検証項目スキーマ
 */
export const AIValidationItemSchema = z.object({
  item: z.string().describe('明細項目名'),
  severity: z
    .enum(['critical', 'warning', 'info', 'approved'])
    .describe('重要度'),
  message: z.string().describe('検証コメント'),
  guideline_reference: z.string().describe('ガイドライン参照箇所'),
  suggested_correction: AISuggestedCorrectionSchema.optional().describe(
    '修正提案（問題がある場合のみ）'
  ),
});

/**
 * AI検証レスポンススキーマ
 */
export const AIValidationResponseSchema = z.object({
  overall_assessment: z.string().describe('全体的な評価コメント'),
  items: z.array(AIValidationItemSchema).describe('各明細の検証結果'),
});

/**
 * OpenAI API用のJSON Schema
 */
export const aiValidationJsonSchema = {
  type: 'object',
  properties: {
    overall_assessment: {
      type: 'string',
      description: '全体的な評価コメント',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: '明細項目名' },
          severity: {
            type: 'string',
            enum: ['critical', 'warning', 'info', 'approved'],
            description: '重要度',
          },
          message: { type: 'string', description: '検証コメント' },
          guideline_reference: {
            type: 'string',
            description: 'ガイドライン参照箇所',
          },
          suggested_correction: {
            type: 'object',
            properties: {
              tenant_share: {
                type: 'number',
                description: '提案する借主負担割合（0-1）',
              },
              reason: { type: 'string', description: '修正理由' },
            },
            required: ['tenant_share', 'reason'],
            additionalProperties: false,
          },
        },
        required: ['item', 'severity', 'message', 'guideline_reference'],
        additionalProperties: false,
      },
    },
  },
  required: ['overall_assessment', 'items'],
  additionalProperties: false,
};
