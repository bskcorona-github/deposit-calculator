import { NextRequest, NextResponse } from 'next/server';
import { parseLeasePDF } from '@/lib/pdf/leaseExtractor';
import { extractTextFromWord } from '@/lib/word/wordExtractor';
import { detectFileType, isLeaseSupportedType } from '@/lib/utils/fileType';
import { extractStructuredData } from '@/lib/ai/client';
import { leaseJsonSchema, LeaseParseResultSchema } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/parse-lease
 * 契約書ファイル（PDF/Word）を解析するAPIエンドポイント
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
    
    if (!isLeaseSupportedType(fileTypeInfo.type)) {
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
        result = await parseLeasePDF(buffer, useAI);
        break;
        
      case 'word':
        // Wordファイルからテキスト抽出 → AIで解析
        if (useAI) {
          const wordText = await extractTextFromWord(buffer);
          const prompt = `あなたは日本の賃貸契約書に詳しい事務担当です。
与えられたWord文書から契約条項を厳密なJSONで抽出してください。

抽出ルール:
- 各条項の条番号（article_no）、見出し（heading）、本文（body）を抽出
- 特約かどうか（is_special）を判定: 「特約」「クリーニング」「鍵交換」「原状回復」等のキーワードを含む条項はtrue
- 本文は省略せず全文を抽出
- 推測は控え、明確なもののみ抽出`;
          
          result = await extractStructuredData(
            prompt,
            wordText,
            leaseJsonSchema
          );
          result = LeaseParseResultSchema.parse(result);
        } else {
          throw new Error('Word形式はAI解析が必要です');
        }
        break;
        
      default:
        throw new Error(`未対応の形式: ${fileTypeInfo.type}`);
    }
    
    if (!result) {
      throw new Error('ファイルの解析に失敗しました');
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lease parsing error:', error);
    return NextResponse.json(
      {
        error: '契約書の解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
