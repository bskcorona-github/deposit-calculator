import { NextRequest, NextResponse } from 'next/server';
import type { AllocationResult } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/export
 * 結果をCSVまたはPDFでエクスポートするAPIエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { result, format } = body as {
      result: AllocationResult;
      format: 'csv' | 'pdf';
    };
    
    if (!result || !format) {
      return NextResponse.json(
        { error: '必要なデータが不足しています' },
        { status: 400 }
      );
    }
    
    if (format === 'csv') {
      // CSV生成
      const csv = generateCSV(result);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="restoration_cost.csv"',
        },
      });
    } else if (format === 'pdf') {
      // PDF生成（簡易版）
      // 実際には @react-pdf/renderer を使用
      return NextResponse.json(
        { error: 'PDF生成は未実装です' },
        { status: 501 }
      );
    }
    
    return NextResponse.json(
      { error: '不正なフォーマット指定です' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error: 'エクスポート中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * CSV生成
 */
function generateCSV(result: AllocationResult): string {
  const lines: string[] = [];
  
  // ヘッダー
  lines.push('項目,場所,数量,単位,単価,元の金額,借主負担,貸主負担,負担率,判定理由,根拠');
  
  // データ行
  for (const line of result.lines) {
    const basisText = line.basis
      .map((b) => `${b.label}${b.detail ? `: ${b.detail}` : ''}`)
      .join(' / ');
    
    lines.push(
      `"${line.item}","${line.location || '-'}",${line.quantity},"${line.unit || '-'}",${line.unit_price},${line.original_subtotal},${line.tenant_share},${line.landlord_share},${line.tenant_percentage}%,"${line.explanation || '-'}","${basisText}"`
    );
  }
  
  // 合計行
  lines.push('');
  lines.push(
    `合計,,,,,${result.totals.original},${result.totals.tenant},${result.totals.landlord},,,`
  );
  
  // 警告
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('警告:');
    for (const warning of result.warnings) {
      lines.push(`"${warning}"`);
    }
  }
  
  // UTF-8 BOM付き（Excelで文字化け防止）
  return '\uFEFF' + lines.join('\n');
}
