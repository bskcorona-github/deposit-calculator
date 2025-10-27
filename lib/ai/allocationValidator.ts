import { openai } from './client';
import { AIValidationResponseSchema } from './validationSchemas';
import { AllocationResult, EstimateParseResult, LeaseParseResult, AllocationContext } from '@/lib/types';
import { buildGuidelineReference, OFFICIAL_QA_URL } from '@/lib/guidelines/guidelineReference';

/**
 * AI検証用のプロンプトを構築
 */
function buildValidationPrompt(
  result: AllocationResult,
  estimate: EstimateParseResult,
  lease: LeaseParseResult,
  context: AllocationContext
): string {
  const guidelineRef = buildGuidelineReference();
  
  return `あなたは原状回復費用の負担区分を専門的に検証するAIアシスタントです。

# 参照すべき公式資料（最優先）
${guidelineRef}

# 検証対象の計算結果
${JSON.stringify(result, null, 2)}

# 見積書情報
業者: ${estimate.vendor}
発行日: ${estimate.issue_date}
合計: ${estimate.total}円

明細:
${estimate.lines.map((line, i) => 
  `${i + 1}. ${line.description} (${line.category}) - ${line.subtotal}円
   場所: ${line.location || '不明'}
   備考: ${line.notes || 'なし'}`
).join('\n')}

# 契約書の特約条項
${lease.clauses
  .filter(c => c.is_special)
  .map(c => `[${c.article_no}] ${c.heading}\n${c.body}`)
  .join('\n\n')}

# 入居者情報
- 入居年数: ${context.tenancy_years}年
- 建物築年数: ${context.building_age}年
- 喫煙: ${context.notes?.includes('喫煙') ? 'あり（見積書備考より自動検出）' : 'なし'}
- ペット: ${context.notes?.includes('ペット') ? 'あり（見積書備考より自動検出）' : 'なし'}
- その他: ${context.notes || 'なし'}

# 検証タスク
1. 各明細の負担区分が国土交通省ガイドライン（上記）に沿っているか確認
2. 特約条項が適切に適用されているか確認
3. 減価償却の計算が正確か確認（耐用年数と入居年数の関係）
4. 喫煙・ペットなどの特殊条件が正しく反映されているか確認
5. 問題がある場合は具体的な修正提案を提示

各明細について、以下の形式で検証結果を返してください：
- 明細項目ごとに検証
- 問題の重要度（critical/warning/info）
- 具体的な指摘内容と根拠（ガイドラインの該当箇所を引用）
- 修正が必要な場合の提案（借主負担割合と理由）`;
}

/**
 * AI検証を実行
 */
export async function validateAllocationWithAI(
  result: AllocationResult,
  estimate: EstimateParseResult,
  lease: LeaseParseResult,
  context: AllocationContext
) {
  const prompt = buildValidationPrompt(result, estimate, lease, context);

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたは原状回復ガイドラインの専門家です。国土交通省の公式ガイドライン、参考資料、Q&Aに基づき、厳密に検証を行ってください。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'validation_result',
        strict: true,
        schema: {
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
        },
      },
    },
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) {
    throw new Error('AI検証結果のパースに失敗しました');
  }

  return AIValidationResponseSchema.parse(parsed);
}
