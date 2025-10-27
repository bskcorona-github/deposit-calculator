import yaml from 'yaml';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  EstimateParseResult,
  LeaseParseResult,
  AllocationContext,
  AllocationResult,
  AllocatedLine,
  AllocationBasis,
  RulesConfig,
  Rule,
} from '../types';
import { applyDepreciation, getDepreciationExplanation } from './depreciation';

/**
 * YAMLルールファイルを読み込み
 */
export function loadRules(): RulesConfig {
  const rulesPath = join(process.cwd(), 'lib/rules/defaultRules.yaml');
  const rulesText = readFileSync(rulesPath, 'utf-8');
  return yaml.parse(rulesText) as RulesConfig;
}

/**
 * テキストがルールのマッチパターンに該当するかチェック
 */
function matchesRule(text: string, matchPatterns: string[]): boolean {
  return matchPatterns.some((pattern) =>
    text.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 特約の有効性をチェック（厳密版）
 * 特約に該当キーワードがあり、かつ具体的な負担条項がある場合のみ有効
 */
function checkSpecialClauseValidity(
  lease: LeaseParseResult,
  keywords: string[],
  line: { description: string; notes?: string }
): { valid: boolean; clauseRef?: string; fullAmount?: boolean } {
  const specialClauses = lease.clauses.filter((c) => c.is_special);
  
  // 項目テキストから経年劣化・通常損耗をチェック
  const itemText = `${line.description} ${line.notes || ''}`.toLowerCase();
  const landlordKeywords = [
    '経年劣化', '経年変化', '自然劣化', '通常損耗', '通常使用',
    '日焼け', '色あせ', '変色', '通常メンテナンス', '定期点検'
  ];
  
  // 経年劣化・通常損耗の項目には特約を適用しない
  const hasLandlordKeyword = landlordKeywords.some(keyword => itemText.includes(keyword));
  if (hasLandlordKeyword) {
    return { valid: false }; // 経年劣化項目には特約適用しない
  }
  
  // 【重要】故意・過失を明示するキーワード
  // これらがない場合、単なれ「破れ」「破損」は通常使用の範囲内の可能性があるため特約適用しない
  const intentionalDamageKeywords = [
    '故意', '過失', '重過失', '不注意', '乱暴', 'わざと',
    '不適切', '不当', '無断', '違反', '禁止', '放置',
    '喫煙', 'ヤニ', 'たばこ', 'タバコ', // 喫煙は明確な違反
    'ペット', '犬', '猫', '動物', '飼育', // ペット飼育も明確な違反の可能性
    '引っかき', 'かじり', '穴あけ', '釘穴', 'ネジ穴', // 明確な損傷
    '水濡れ', '水漏れ', '結露', '換気不足', '清掃不足', '油汚れ', // 管理不足
  ];
  
  // 曖昧な損傷表現（これらだけでは特約を適用しない）
  const ambiguousDamageKeywords = ['破れ', '破損', 'キズ', '傷', '汚れ', '汚損'];
  const hasAmbiguousDamageOnly = ambiguousDamageKeywords.some(keyword => itemText.includes(keyword));
  const hasIntentionalDamage = intentionalDamageKeywords.some(keyword => itemText.includes(keyword));
  
  // 曖昧な損傷表現のみで故意・過失が明示されていない場合は、特約を適用しない
  if (hasAmbiguousDamageOnly && !hasIntentionalDamage) {
    return { valid: false }; // 通常損耗の可能性があるため特約適用しない
  }
  
  // 借主負担を示すキーワード（これらがない特約は除外）
  const tenantBurdenKeywords = [
    '借主',
    '乙',
    '入居者',
    '賃借人',
    '負担',
    '実費',
    '費用',
  ];
  
  // 全額負担を示すキーワード
  const fullAmountKeywords = [
    '100%',
    '100％',
    '全額',
    '全て',
    'すべて',
    '実費',
    '全部',
    '満額',
  ];
  
  for (const clause of specialClauses) {
    // 1. ルールのキーワードが特約に含まれているか
    const hasKeyword = keywords.some((kw) =>
      clause.body.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (!hasKeyword) {
      continue; // キーワードがない特約はスキップ
    }
    
    // 2. 借主負担を示すキーワードが含まれているか
    const hasTenantBurden = tenantBurdenKeywords.some((kw) =>
      clause.body.includes(kw)
    );
    
    if (!hasTenantBurden) {
      continue; // 一般原則（「通常の使用による損耗は貸主負担」など）は除外
    }
    
    // 3. 全額負担かどうかを判定
    const isFullAmount = fullAmountKeywords.some((kw) =>
      clause.body.includes(kw)
    );
    
    return {
      valid: true,
      clauseRef: clause.article_no && clause.article_no !== ''
        ? `第${clause.article_no}条: ${clause.heading && clause.heading !== '' ? clause.heading : ''}`
        : clause.heading && clause.heading !== '' ? clause.heading : '特約',
      fullAmount: isFullAmount,
    };
  }
  
  return { valid: false };
}

/**
 * 借主負担の条件（tenant_if）に該当するかチェック
 * 見積書の備考（notes）からも自動判定
 */
function checkTenantConditions(
  line: { category: string; description: string; notes?: string },
  tenantIf: string[],
  context: AllocationContext
): boolean {
  const text = `${line.category} ${line.description} ${line.notes || ''}`.toLowerCase();
  
  // 【重要】経年劣化・通常損耗の除外キーワード
  // これらが含まれる場合は借主負担から除外（貸主負担）
  const landlordKeywords = [
    '経年劣化', '経年変化', '自然劣化', '通常損耗', '通常使用',
    '通常の使用', '通常の劣化', '日焼け', '色あせ', '変色',
    '通常メンテナンス', '定期点検', '定期メンテナンス'
  ];
  
  const hasLandlordKeyword = landlordKeywords.some(keyword => text.includes(keyword));
  if (hasLandlordKeyword) {
    return false; // 貸主負担のキーワードがある場合は借主負担条件から除外
  }
  
  // 喫煙関連：項目名や備考に喫煙関連キーワードがある場合
  if (tenantIf.some((c) => c.includes('喫煙'))) {
    // 項目名や備考に喫煙・ヤニ・タバコなどのキーワードが含まれている場合
    const smokingKeywords = ['喫煙', 'ヤニ', 'やに', 'たばこ', 'タバコ', 'タール', 'ニコチン'];
    const hasSmokingInText = smokingKeywords.some(keyword => text.includes(keyword));
    
    if (hasSmokingInText) {
      if (text.includes('クロス') || text.includes('壁紙')) {
        return true;
      }
    }
  }
  
  // ペット関連：項目名や備考にペット関連キーワードがある場合
  if (tenantIf.some((c) => c.includes('ペット'))) {
    const petKeywords = ['ペット', 'ペット臭', '犬', '猫', '動物', '飼育'];
    const hasPetInText = petKeywords.some(keyword => text.includes(keyword));
    
    if (hasPetInText) {
      return true;
    }
  }
  
  // その他の条件はテキストマッチング
  return tenantIf.some((condition) =>
    text.includes(condition.toLowerCase())
  );
}

/**
 * 価格が相場範囲内かチェック
 */
function checkPriceGuidance(
  rule: Rule,
  amount: number,
  rulesConfig: RulesConfig
): { within_range: boolean; cap: number; warning?: string } {
  if (rule.id === 'cleaning-basic') {
    const cap = rulesConfig.pricing_guidance.cleaning_flat_cap;
    if (amount > cap) {
      return {
        within_range: false,
        cap,
        warning: `クリーニング費用が相場上限（${cap.toLocaleString()}円）を超えています`,
      };
    }
    return { within_range: true, cap };
  }
  
  if (rule.id === 'key-change') {
    const cap = rulesConfig.pricing_guidance.key_change_cap;
    if (amount > cap) {
      return {
        within_range: false,
        cap,
        warning: `鍵交換費用が相場上限（${cap.toLocaleString()}円）を超えています`,
      };
    }
    return { within_range: true, cap };
  }
  
  return { within_range: true, cap: 0 };
}

/**
 * 判定理由の説明を生成
 */
function buildExplanation(params: {
  line: { description: string; notes?: string };
  matchedRule?: Rule;
  isTenantCondition: boolean;
  hasSpecialClause: boolean;
  clauseRef?: string;
  isFullAmount: boolean;
  hasDepreciation: boolean;
  tenantPercentage: number;
}): string {
  const parts: string[] = [];
  
  // 1. 検出された条件
  if (params.line.notes) {
    parts.push(`【検出条件】${params.line.notes}`);
  }
  
  // 2. 適用ルール
  if (params.matchedRule) {
    if (params.isTenantCondition) {
      parts.push(`【判定】${params.matchedRule.label} - 借主負担条件に該当`);
    } else {
      const principle = params.matchedRule.default_allocation === 'landlord' ? '貸主負担' : '借主負担';
      parts.push(`【判定】${params.matchedRule.label} - 原則：${principle}`);
    }
  }
  
  // 3. 特約
  if (params.hasSpecialClause) {
    if (params.isFullAmount) {
      parts.push(`【特約】${params.clauseRef || '特約'}により100%借主負担（減価償却なし）`);
    } else {
      parts.push(`【特約】${params.clauseRef || '特約'}により借主負担`);
    }
  }
  
  // 4. 減価償却
  if (params.hasDepreciation) {
    parts.push(`【減価償却】適用により${params.tenantPercentage}%に減額`);
  } else if (params.tenantPercentage === 100) {
    parts.push(`【負担率】100%借主負担`);
  } else if (params.tenantPercentage === 0) {
    parts.push(`【負担率】100%貸主負担`);
  }
  
  return parts.join(' ');
}

/**
 * 見積と契約書から自動振り分けを実行
 */
export function allocateExpenses(
  estimate: EstimateParseResult,
  lease: LeaseParseResult,
  context: AllocationContext
): AllocationResult {
  const rulesConfig = loadRules();
  const allocatedLines: AllocatedLine[] = [];
  const warnings: string[] = [];
  
  for (const line of estimate.lines) {
    // マッチするルールを検索
    const matchedRule = rulesConfig.rules.find((rule) =>
      matchesRule(`${line.category} ${line.description}`, rule.match)
    );
    
    if (!matchedRule) {
      // ルールが見つからない場合はデフォルトで貸主負担
      allocatedLines.push({
        item: line.description,
        location: line.location,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        original_subtotal: line.subtotal,
        tenant_share: 0,
        landlord_share: line.subtotal,
        tenant_percentage: 0,
        basis: [
          {
            type: 'guideline',
            label: 'デフォルト（ルール未適用）',
            detail: 'マッチするルールがないため、原則として貸主負担',
          },
        ],
        explanation: '【判定】該当ルールなし - 原則として貸主負担',
        notes: '該当ルールなし',
        editable: true,
      });
      continue;
    }
    
    const basis: AllocationBasis[] = [];
    let tenantShare = 0;
    let landlordShare = line.subtotal;
    
    // デフォルトの配分
    let allocation = matchedRule.default_allocation;
    
    // 借主負担条件のチェック
    const isTenantCondition = matchedRule.tenant_if && checkTenantConditions(line, matchedRule.tenant_if, context);
    
    if (isTenantCondition) {
      allocation = 'tenant';
      basis.push({
        type: 'guideline',
        label: `${matchedRule.label}（借主負担条件に該当）`,
        detail: `条件: ${matchedRule.tenant_if?.join('、')}`,
      });
    } else {
      basis.push({
        type: 'guideline',
        label: `${matchedRule.label}（原則: ${allocation === 'landlord' ? '貸主負担' : '借主負担'}）`,
      });
    }
    
    // 特約による上書きチェック
    let shouldApplyDepreciation = true; // 減価償却を適用するかどうか
    let hasSpecialClause = false;
    let clauseRef = '';
    let isFullAmount = false;
    
    if (matchedRule.override_if) {
      for (const override of matchedRule.override_if) {
        if (override.when === 'special_clause_valid') {
          const clauseCheck = checkSpecialClauseValidity(
            lease,
            matchedRule.match,
            line
          );
          
          if (clauseCheck.valid) {
            allocation = 'tenant';
            hasSpecialClause = true;
            clauseRef = clauseCheck.clauseRef || '';
            isFullAmount = clauseCheck.fullAmount || false;
            
            // 特約が全額負担を明記している場合、減価償却を適用しない
            if (clauseCheck.fullAmount) {
              shouldApplyDepreciation = false;
              basis.push({
                type: 'special_clause',
                label: '特約による全額借主負担（減価適用なし）',
                clause_ref: clauseCheck.clauseRef,
                detail: '特約により100%借主負担が明記されています',
              });
            } else {
              basis.push({
                type: 'special_clause',
                label: '特約による借主負担',
                clause_ref: clauseCheck.clauseRef,
              });
            }
            
            // 価格チェック
            if (override.then === 'tenant_reasonable_range') {
              const priceCheck = checkPriceGuidance(
                matchedRule,
                line.subtotal,
                rulesConfig
              );
              
              if (!priceCheck.within_range && priceCheck.warning) {
                warnings.push(
                  `${line.description}: ${priceCheck.warning}`
                );
                basis.push({
                  type: 'price_check',
                  label: '価格警告',
                  detail: priceCheck.warning,
                });
              }
            }
          }
        }
      }
    }
    
    // 減価償却の適用
    if (
      allocation === 'tenant' &&
      shouldApplyDepreciation && // 特約で全額負担の場合はfalse
      matchedRule.depreciation &&
      context.tenancy_years > 0
    ) {
      const depreciatedAmount = applyDepreciation(
        line.subtotal,
        context.tenancy_years,
        matchedRule.depreciation.useful_life_years
      );
      
      tenantShare = depreciatedAmount;
      landlordShare = line.subtotal - depreciatedAmount;
      
      const explanation = getDepreciationExplanation(
        context.tenancy_years,
        matchedRule.depreciation.useful_life_years,
        line.subtotal,
        depreciatedAmount
      );
      
      basis.push({
        type: 'depreciation',
        label: '減価償却適用',
        detail: explanation,
      });
    } else if (allocation === 'tenant') {
      tenantShare = line.subtotal;
      landlordShare = 0;
    } else {
      tenantShare = 0;
      landlordShare = line.subtotal;
    }
    
    const tenantPercentage = line.subtotal > 0
      ? Math.round((tenantShare / line.subtotal) * 100)
      : 0;
    
    // 判定理由の説明を生成
    const explanation = buildExplanation({
      line,
      matchedRule,
      isTenantCondition: isTenantCondition || false,
      hasSpecialClause,
      clauseRef,
      isFullAmount,
      hasDepreciation: allocation === 'tenant' && shouldApplyDepreciation && !!matchedRule.depreciation,
      tenantPercentage,
    });
    
      allocatedLines.push({
        item: line.description,
        location: line.location,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        original_subtotal: line.subtotal,
        tenant_share: tenantShare,
        landlord_share: landlordShare,
        tenant_percentage: tenantPercentage,
        basis,
        explanation,
        notes: line.notes,
        editable: true,
      });
  }
  
  // 合計を計算
  const totals = {
    original: allocatedLines.reduce((sum, line) => sum + line.original_subtotal, 0),
    tenant: allocatedLines.reduce((sum, line) => sum + line.tenant_share, 0),
    landlord: allocatedLines.reduce((sum, line) => sum + line.landlord_share, 0),
  };
  
  return {
    lines: allocatedLines,
    totals,
    warnings,
  };
}
