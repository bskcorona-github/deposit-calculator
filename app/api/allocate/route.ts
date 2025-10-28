import { NextRequest, NextResponse } from 'next/server';
import { allocateExpenses } from '@/lib/rules/rulesEngine';
import { validateAllocationWithAI } from '@/lib/ai/allocationValidator';
import type {
  EstimateParseResult,
  LeaseParseResult,
  AllocationContext,
} from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/allocate
 * 見積と契約書から費用を自動振り分け + AI検証を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estimate, lease, context } = body as {
      estimate: EstimateParseResult;
      lease: LeaseParseResult;
      context: AllocationContext;
    };
    
    if (!estimate || !lease || !context) {
      return NextResponse.json(
        { error: '必要なデータが不足しています' },
        { status: 400 }
      );
    }
    
    // 1. 自動振り分けを実行
    const result = allocateExpenses(estimate, lease, context);
    
    // 2. AI検証を自動的に実行（OpenAI API keyがある場合のみ）
    let aiValidation = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        aiValidation = await validateAllocationWithAI(
          result,
          estimate,
          lease,
          context
        );
        
        // 3. AI検証結果を振り分け結果に統合
        // 修正提案がある項目を自動的に反映
        const processedLines = new Set<number>(); // 既に処理した行を記録
        
        for (const itemValidation of aiValidation.items) {
          if (itemValidation.suggested_correction) {
            const correction = itemValidation.suggested_correction;
            
            // 重大な問題（critical）と警告（warning）のみ自動修正
            // info/approvedは参考情報のみなので適用しない
            if (itemValidation.severity === 'critical' || itemValidation.severity === 'warning') {
              // 該当する項目を検索（項目名でマッチング）
              const lineIndex = result.lines.findIndex((line, idx) => {
                const nameMatch = line.item === itemValidation.item;
                return nameMatch && !processedLines.has(idx);
              });
              
              if (lineIndex !== -1) {
                const line = result.lines[lineIndex];
                
                // correction.tenant_shareは割合（0-1）なので、金額に変換
                const newTenantShare = Math.round(line.original_subtotal * correction.tenant_share);
                const newLandlordShare = line.original_subtotal - newTenantShare;
                
                // 修正を適用
                line.tenant_share = newTenantShare;
                line.landlord_share = newLandlordShare;
                line.tenant_percentage = Math.round(correction.tenant_share * 100);
                
                // 根拠にAI検証結果を追加（重複チェック）
                const severityLabel = itemValidation.severity === 'critical' 
                  ? 'AI検証による自動修正（重大）' 
                  : 'AI検証による自動修正（警告）';
                
                // 既に同じラベルの根拠が存在しないかチェック
                const existingBasis = line.basis.find(b => 
                  b.label === severityLabel && b.detail === correction.reason
                );
                
                if (!existingBasis) {
                  line.basis.push({
                    type: 'guideline',
                    label: severityLabel,
                    detail: correction.reason,
                  });
                }
                
                // 判定理由を更新
                const aiCorrectionPart = `【AI修正】${correction.reason}により${line.tenant_percentage}%に変更`;
                // 既存のexplanationに追加
                if (line.explanation && !line.explanation.includes('【AI修正】')) {
                  line.explanation = `${line.explanation} ${aiCorrectionPart}`;
                }
                
                // この行を処理済みとしてマーク
                processedLines.add(lineIndex);
              }
            }
          }
        }
        
        // 合計を再計算
        result.totals = {
          original: result.lines.reduce((sum, line) => sum + line.original_subtotal, 0),
          tenant: result.lines.reduce((sum, line) => sum + line.tenant_share, 0),
          landlord: result.lines.reduce((sum, line) => sum + line.landlord_share, 0),
        };
        
      } catch (aiError) {
        console.error('AI検証エラー（続行）:', aiError);
        // AI検証が失敗しても振り分け結果は返す
      }
    }
    
    return NextResponse.json({
      ...result,
      ai_validation: aiValidation, // AI検証結果も含める
    });
  } catch (error) {
    console.error('Allocation error:', error);
    return NextResponse.json(
      {
        error: '費用の振り分け中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
