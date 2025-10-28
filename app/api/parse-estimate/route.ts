import { NextRequest, NextResponse } from 'next/server';
import { parseEstimatePDF } from '@/lib/pdf/estimateExtractor';
import { parseEstimateExcel, extractFromExcel } from '@/lib/excel/excelExtractor';
import { extractTextFromWord } from '@/lib/word/wordExtractor';
import { detectFileType, isEstimateSupportedType } from '@/lib/utils/fileType';
import { extractStructuredData } from '@/lib/ai/client';
import { estimateJsonSchema, EstimateParseResultSchema } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/parse-estimate
 * 見積ファイル（PDF/Excel/Word/CSV）を解析するAPIエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const useAI = formData.get('useAI') === 'true';
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }
    
    // ファイルタイプを判定
    const fileTypeInfo = detectFileType(file);
    
    if (!isEstimateSupportedType(fileTypeInfo.type)) {
      return NextResponse.json(
        { error: `対応していないファイル形式です: ${fileTypeInfo.type}` },
        { status: 400 }
      );
    }
    
    // FileをBufferに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let result;
    
    // ファイルタイプに応じて解析
    switch (fileTypeInfo.type) {
      case 'pdf':
        result = await parseEstimatePDF(buffer);
        break;
        
      case 'excel':
        // まずローカルパースを試行
        result = parseEstimateExcel(buffer);
        
        // 失敗した場合、AIを使用
        if (!result && useAI) {
          const excelText = await extractFromExcel(buffer);
          const prompt = `あなたは日本の賃貸原状回復に詳しい事務担当です。
与えられたExcel/CSVデータから見積明細を厳密なJSONで抽出してください。

抽出ルール:
- 各行の項目（description）、数量（quantity）、単価（unit_price）、小計（subtotal）を抽出
- カテゴリ（category）は以下から選択: クリーニング、クロス、床、設備、鍵交換、その他
- 数値は半角数字のみ、カンマなし
- 推測は控え、明確なもののみ抽出`;
          
          result = await extractStructuredData(
            prompt,
            excelText,
            estimateJsonSchema
          );
          result = EstimateParseResultSchema.parse(result);
        }
        break;
        
      case 'word':
        // Wordファイルからテキスト抽出 → AIで解析
        if (useAI) {
          const wordText = await extractTextFromWord(buffer);
          const prompt = `あなたは日本の賃貸原状回復に詳しい事務担当です。
与えられたWord文書から見積明細を厳密なJSONで抽出してください。

抽出ルール:
- 各行の項目（description）、数量（quantity）、単価（unit_price）、小計（subtotal）を抽出
- カテゴリ（category）は以下から選択: クリーニング、クロス、床、設備、鍵交換、その他
- 数値は半角数字のみ、カンマなし
- 推測は控え、明確なもののみ抽出`;
          
          result = await extractStructuredData(
            prompt,
            wordText,
            estimateJsonSchema
          );
          result = EstimateParseResultSchema.parse(result);
        } else {
          throw new Error('Word形式はAI解析が必要です');
        }
        break;
        
      case 'csv':
        // CSVはExcelと同じ処理
        result = parseEstimateExcel(buffer);
        break;
        
      default:
        throw new Error(`未対応の形式: ${fileTypeInfo.type}`);
    }
    
    if (!result) {
      throw new Error('ファイルの解析に失敗しました');
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Estimate parsing error:', error);
    return NextResponse.json(
      {
        error: '見積の解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
