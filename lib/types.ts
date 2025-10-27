/**
 * 基本的な型定義
 */

import { z } from 'zod';

export interface EstimateLine {
  category: string;
  description: string;
  location: string; // 場所・部屋（不明時は空文字列）
  unit_price: number;
  quantity: number;
  unit: string; // 単位（不明時は空文字列）
  subtotal: number;
  notes: string; // 備考・理由（不明時は空文字列）
  tax_included?: boolean;
}

export interface EstimateParseResult {
  vendor: string;
  issue_date: string;
  lines: EstimateLine[];
  total: number;
}

export interface LeaseClause {
  article_no: string;
  heading: string;
  body: string;
  is_special: boolean; // 特約かどうか
}

export interface LeaseParseResult {
  clauses: LeaseClause[];
}

export interface AllocationContext {
  tenancy_years: number; // 入居年数
  building_age?: number; // 建物築年数（契約書から自動抽出または手動入力）
  // has_smoking, has_pet は見積書の備考から自動判定するため削除
}

export interface AllocationBasis {
  type: 'guideline' | 'special_clause' | 'depreciation' | 'price_check';
  label: string;
  detail?: string;
  clause_ref?: string; // 特約参照
}

export interface AllocatedLine {
  item: string;
  location: string; // 場所・部屋（不明時は空文字列）
  quantity: number; // 数量
  unit: string; // 単位（不明時は空文字列）
  unit_price: number; // 単価
  original_subtotal: number;
  tenant_share: number;
  landlord_share: number;
  tenant_percentage: number;
  basis: AllocationBasis[];
  explanation: string; // 判定理由の説明
  notes: string; // 備考（不明時は空文字列）
  editable?: boolean;
}

export interface AllocationResult {
  lines: AllocatedLine[];
  totals: {
    original: number;
    tenant: number;
    landlord: number;
  };
  warnings: string[];
  ai_validation?: any; // AI検証結果（オプション）
}

export interface Rule {
  id: string;
  label: string;
  match: string[];
  default_allocation: 'tenant' | 'landlord' | 'split';
  tenant_if?: string[];
  override_if?: Array<{
    when: string;
    then: string;
  }>;
  depreciation?: {
    useful_life_years: number;
    method: 'straight_line';
  };
}

export interface RulesConfig {
  meta: {
    version: number;
    locale: string;
    notes?: string;
  };
  rules: Rule[];
  pricing_guidance: {
    cleaning_flat_cap: number;
    key_change_cap: number;
  };
}

/**
 * Zodスキーマ定義
 */

export const AllocationBasisSchema = z.object({
  type: z.enum(['guideline', 'special_clause', 'depreciation', 'price_check']),
  label: z.string(),
  detail: z.string().optional(),
  clause_ref: z.string().optional(),
});

export const AllocatedLineSchema = z.object({
  item: z.string(),
  location: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number(),
  original_subtotal: z.number(),
  tenant_share: z.number(),
  landlord_share: z.number(),
  tenant_percentage: z.number(),
  basis: z.array(AllocationBasisSchema),
  explanation: z.string(),
  notes: z.string(),
  editable: z.boolean().optional(),
});

export const AllocationResultSchema = z.object({
  lines: z.array(AllocatedLineSchema),
  totals: z.object({
    original: z.number(),
    tenant: z.number(),
    landlord: z.number(),
  }),
  warnings: z.array(z.string()),
});

export const TenancyContextSchema = z.object({
  tenancy_years: z.number().min(0, '入居年数は0以上である必要があります'),
  building_age: z.number().min(0, '築年数は0以上である必要があります').optional(),
});
