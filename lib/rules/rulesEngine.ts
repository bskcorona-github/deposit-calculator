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
import { adjustForBuildingAge, getBuildingAgeAdjustmentExplanation } from './buildingAgeAdjustment';

/**
 * YAMLルールファイルを読み込み
 */
export function loadRules(): RulesConfig {
  const rulesPath = join(process.cwd(), 'lib/rules/defaultRules.yaml');
  const fileContents = readFileSync(rulesPath, 'utf8');
  return yaml.parse(fileContents) as RulesConfig;
}

/**
 * ルールのマッチ判定
 */
function matchesRule(text: string, matchPatterns: string[]): boolean {
  return matchPatterns.some((pattern) =>
    text.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 特約の有効性をチェック（国交省ガイドラインQ3準拠）
 * 
 * 国交省ガイドラインの特約有効要件（Q3）：
 * 1. 特約の必要性があり、かつ、暴利的でないこと
 * 2. 賃借人が特約により負担すべき範囲が明確であること
 * 3. 賃借人が特約の内容を理解し、合意していること
 * 
 * このシステムでは、契約書に記載された内容から1と2を判定します。
 * （3は契約締結時の問題のため、システムでは判定不可能）
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
  
  // 経年劣化・通常損耗の項目には特約を適用しない（民法621条）
  const hasLandlordKeyword = landlordKeywords.some(keyword => itemText.includes(keyword));
  if (hasLandlordKeyword) {
    return { valid: false }; // 経年劣化項目には特約適用しない
  }
  
  // 【重要】故意・過失を明示するキーワード
  // これらがない場合、単なる「破れ」「破損」は通常使用の範囲内の可能性があるため特約適用しない
  const intentionalDamageKeywords = [
    '故意', '過失', '重過失', '不注意', '乱暴', 'わざと',
    '不適切', '不当', '無断', '違反', '禁止', '放置',
    '喫煙', 'ヤニ', 'たばこ', 'タバコ', // 喫煙は明確な違反
    'ペット', '犬', '猫', '動物', '飼育', // ペット飼育も明確な違反の可能性
    '引っかき', 'かじり', '穴あけ', '釘穴', 'ネジ穴', // 明確な損傷
    '水濬れ', '水漏れ', '結露', '換気不足', '清掃不足', '油汚れ', // 管理不足
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
    // 【要件チェック1】ルールのキーワードが特約に含まれているか
    const hasKeyword = keywords.some((kw) =>
      clause.body.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (!hasKeyword) {
      continue; // キーワードがない特約はスキップ
    }
    
    // 【要件チェック2】範囲の明確性：借主負担を示すキーワードが含まれているか
    // 単なる「通常の使用による損耗は貸主負担」のような一般原則は除外
    const hasTenantBurden = tenantBurdenKeywords.some((kw) =>
      clause.body.includes(kw)
    );
    
    if (!hasTenantBurden) {
      continue; // 借主負担が明記されていない特約は無効
    }
    
    // 【要件チェック3】明確性の追加確認：金額明示または具体的な負担範囲の指定
    // ・金額が明示されている（例：「25,000円」）
    // ・「全額」「100%」「実費」など具体的な負担割合が明示されている
    // ・具体的な項目が列挙されている（例：「クリーニング費用」）
    const hasSpecificScope = 
      /\d+[,、\d]*円/.test(clause.body) || // 金額明示
      /\d+%/.test(clause.body) || // パーセンテージ明示
      fullAmountKeywords.some(kw => clause.body.includes(kw)); // 全額負担の明示
    
    if (!hasSpecificScope) {
      // 明確性が不足（例：「必要な費用を負担する」のような曖昧な表現）
      // ただし、項目キーワード（クリーニング、鍵交換等）がある場合は明確とみなす
      const hasSpecificItem = keywords.some(kw => 
        ['クリーニング', '清掃', '鍵', 'シリンダー', 'クロス', '壁紙'].includes(kw)
      );
      
      if (!hasSpecificItem) {
        continue; // 範囲が不明確な特約は無効
      }
    }
    
    // 【要件チェック4】合理性：通常損耗も含むことが明記されている場合のみ通常損耗に適用
    // 「通常の使用による損耗も含む」などの明記がない限り、通常損耗は適用外
    const includesNormalWear = [
      '通常損耗', '通常の使用', '経年劣化', '経年変化'
    ].some(kw => clause.body.includes(kw));
    
    // 通常損耗を含むことが明記されていない特約は、通常損耗項目には適用しない
    // （これは上記の landlordKeywords チェックで既に除外されている）
    
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
 * 特約が適用される項目の範囲をチェック
 * 国交省ガイドラインに基づき、特約の範囲を厳格に解釈
 */
function isItemWithinSpecialClauseScope(
  line: { description: string; notes: string },
  clauseBody: string
): { applicable: boolean; reason: string } {
  const itemText = `${line.description} ${line.notes}`.toLowerCase();
  const clause = clauseBody.toLowerCase();
  
  // クリーニング特約の場合
  if (clause.includes('クリーニング') || clause.includes('清掃')) {
    // 基本的なクリーニングのみを対象とする
    const specialCleaningKeywords = ['研磨', '分解洗浄', '特殊清掃', '内部洗浄', 'コーティング', 'ワックス'];
    
    const isSpecialCleaning = specialCleaningKeywords.some(kw => itemText.includes(kw));
    
    if (isSpecialCleaning) {
      return {
        applicable: false,
        reason: '特別清掃は特約の「基本的なクリーニング」の範囲外です',
      };
    }
  }
  
  // 修理・交換の場合
  if (itemText.includes('修理') || itemText.includes('交換') || itemText.includes('調整')) {
    // 経年劣化が原因の場合は特約適用外
    const agingKeywords = ['経年劣化', '経年', '劣化', '経年変化', '経年くすみ'];
    const hasAging = agingKeywords.some(kw => itemText.includes(kw));
    
    if (hasAging) {
      return {
        applicable: false,
        reason: '経年劣化による修理は特約の対象外です（民法621条）',
      };
    }
    
    // 故意・過失が明記されていない場合は特約適用外
    const faultKeywords = ['故意', '過失', '重過失', '不注意', '破損', '破壊', '乱用'];
    const hasFault = faultKeywords.some(kw => itemText.includes(kw));
    
    // 「使用過多」のみでは不十分
    const ambiguousKeywords = ['使用過多', '使用痕'];
    const hasAmbiguous = ambiguousKeywords.some(kw => itemText.includes(kw));
    
    if (!hasFault && hasAmbiguous) {
      return {
        applicable: false,
        reason: '「使用過多」のみでは故意・過失が明確でないため、特約の対象外です',
      };
    }
    
    if (!hasFault) {
      return {
        applicable: false,
        reason: '故意・過失が明確でない修理は特約の対象外です',
      };
    }
  }
  
  return { applicable: true, reason: '' };
}

/**
 * 経年劣化と借主過失が混在する場合の按分計算
 * @param line 見積明細
 * @param totalAmount 総額
 * @returns 按分後の負担額と説明
 */
function applyMixedDamageAllocation(
  line: { description: string; notes: string },
  totalAmount: number
): { tenant: number; landlord: number; explanation: string } | null {
  const text = `${line.description} ${line.notes}`.toLowerCase();
  
  // 経年劣化キーワード
  const agingKeywords = ['日焼け', '色あせ', '変色', '経年劣化', '経年くすみ', '経年変化'];
  const hasAging = agingKeywords.some(kw => text.includes(kw));
  
  // 借主過失キーワード
  const tenantFaultKeywords = ['シミ', '油汚れ', '水垢', 'カビ', '汚損', '汚れ', '手垢'];
  const hasTenantFault = tenantFaultKeywords.some(kw => text.includes(kw));
  
  // 混在していない場合はnullを返す
  if (!hasAging || !hasTenantFault) {
    return null;
  }
  
  // 混在の程度を判定
  let tenantRatio = 0.5; // デフォルトは50%ずつ
  let explanation = '';
  
  // 「部分的」「全体的」などのキーワードから按分比率を調整
  if (text.includes('部分的') || text.includes('一部')) {
    tenantRatio = 0.3; // 借主過失が部分的な場合
    explanation = '借主過失（シミ・汚れ）が部分的であるため、30%を借主負担とします';
  } else if (text.includes('全体的') || text.includes('全面')) {
    tenantRatio = 0.7; // 借主過失が全体的な場合
    explanation = '借主過失（シミ・汚れ）が全体的であるため、70%を借主負担とします';
  } else if (text.includes('軽度') || text.includes('軽～中') || text.includes('軽い')) {
    tenantRatio = 0.3; // 軽度の場合
    explanation = '汚損度が軽度であるため、30%を借主負担とします';
  } else if (text.includes('中程度') || text.includes('中度')) {
    tenantRatio = 0.5; // 中程度の場合
    explanation = '汚損度が中程度であるため、50%を借主負担とします';
  } else if (text.includes('重度') || text.includes('著しい') || text.includes('ひどい')) {
    tenantRatio = 0.7; // 重度の場合
    explanation = '汚損度が重度であるため、70%を借主負担とします';
  } else {
    explanation = '経年劣化と借主過失が混在しているため、50%ずつ按分します';
  }
  
  return {
    tenant: Math.round(totalAmount * tenantRatio),
    landlord: Math.round(totalAmount * (1 - tenantRatio)),
    explanation,
  };
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
  
  // 上記以外の一般的な条件チェック
  for (const condition of tenantIf) {
    if (text.includes(condition.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * 価格の妥当性チェック
 */
function checkPriceGuidance(
  rule: Rule,
  amount: number,
  rulesConfig: RulesConfig
): { within_range: boolean; warning?: string } {
  if (rule.id === 'cleaning-basic') {
    const cap = rulesConfig.pricing_guidance.cleaning_flat_cap;
    if (amount > cap) {
      return {
        within_range: false,
        warning: `クリーニング費用が目安${cap.toLocaleString()}円を超えています`,
      };
    }
  } else if (rule.id === 'key-change') {
    const cap = rulesConfig.pricing_guidance.key_change_cap;
    if (amount > cap) {
      return {
        within_range: false,
        warning: `鍵交換費用が目安${cap.toLocaleString()}円を超えています`,
      };
    }
  }
  return { within_range: true };
}

/**
 * 判定理由の説明を生成
 */
function buildExplanation(params: {
  line: { category: string; description: string; notes?: string };
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
      parts.push(`【特約】${params.clauseRef || '特約'}により100%借主負担（減価償却は適用）`);
    } else {
      parts.push(`【特約】${params.clauseRef || '特約'}により借主負担`);
    }
  }
  
  // 4. 減価償却
  if (params.hasDepreciation) {
    parts.push(`【減価償却】適用済み`);
  }
  
  // 5. 最終判定
  if (params.tenantPercentage === 100) {
    parts.push(`【結果】100%借主負担`);
  } else if (params.tenantPercentage === 0) {
    parts.push(`【結果】100%貸主負担`);
  } else {
    parts.push(`【結果】借主${params.tenantPercentage}%・貸主${100 - params.tenantPercentage}%負担`);
  }
  
  return parts.join(' / ');
}

/**
 * 費用振り分けエンジン
 * 見積と契約書を元に、各項目を借主・貸主に自動振り分け
 * 
 * 【判定の優先順位】（国交省ガイドライン準拠）
 * 1. 強行法規（民法621条）- 通常損耗・経年劣化は借主負担から除外
 * 2. 有効な特約 - 3要件を満たす特約は優先適用
 * 3. 国交省ガイドライン - 原則的な負担区分
 * 4. 見積書の記載 - 最終的な参考情報
 * 
 * TODO: 将来的な機能追加
 * - 部分張替の範囲判定（㎡単位 vs 一面単位 vs 部屋全体）
 * - 立会確認記録との照合（入居時状態との比較）
 * - 裁判例データベースの参照（判例による精度向上）
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
            label: '該当ルールなし - 原則として貸主負担',
          },
        ],
        explanation: `【判定】該当ルールなし / 【結果】100%貸主負担`,
        notes: line.notes,
      });
      continue;
    }
    
    let allocation = matchedRule.default_allocation;
    let tenantShare = 0;
    let landlordShare = 0;
    let shouldApplyDepreciation = !!matchedRule.depreciation;
    let hasSpecialClause = false;
    let clauseRef = '';
    let isFullAmount = false;
    let isTenantCondition = false;
    
    const basis: AllocationBasis[] = [
      {
        type: 'guideline',
        label: `${matchedRule.label}: ${allocation === 'landlord' ? '貸主負担原則' : '借主負担原則'}`,
      },
    ];
    
    // tenant_if条件のチェック
    if (matchedRule.tenant_if) {
      const tenantConditionMet = checkTenantConditions(
        line,
        matchedRule.tenant_if,
        context
      );
      
      if (tenantConditionMet) {
        allocation = 'tenant';
        isTenantCondition = true;
        basis.push({
          type: 'guideline',
          label: '借主負担条件に該当',
          detail: `${matchedRule.tenant_if.join(', ')}のいずれかに該当`,
        });
      }
    }
    
    // override_if条件のチェック（特約）
    if (matchedRule.override_if) {
      for (const override of matchedRule.override_if) {
        if (override.when === 'special_clause_valid') {
          const clauseCheck = checkSpecialClauseValidity(
            lease,
            matchedRule.match,
            line
          );
          
          if (clauseCheck.valid) {
            // 特約の範囲内かどうかを追加チェック
            const scopeCheck = isItemWithinSpecialClauseScope(
              { description: line.description, notes: line.notes },
              lease.clauses.find(c => c.is_special)?.body || ''
            );
            
            if (!scopeCheck.applicable) {
              // 特約の範囲外の場合、警告を追加して貸主負担に変更
              warnings.push(
                `${line.description}: ${scopeCheck.reason}`
              );
              // 特約を無効化し、デフォルトの判定に戻る
              continue; // 次のoverride_ifをチェック（あれば）
            }
            
            allocation = 'tenant';
            hasSpecialClause = true;
            clauseRef = clauseCheck.clauseRef || '';
            isFullAmount = clauseCheck.fullAmount || false;
            
            // 【重要】特約が全額負担を明記していても、減価償却は必ず適用（国交省ガイドライン準拠）
            // 判例: 特約の「全額負担」は「残存価値分のみ」を指すとされる
            if (clauseCheck.fullAmount) {
              // shouldApplyDepreciation = false; ← 削除（常に減価償却を適用）
              shouldApplyDepreciation = true; // 国交省ガイドライン第3章および判例に基づく
              
              basis.push({
                type: 'special_clause',
                label: '特約による借主負担（減価償却適用）',
                clause_ref: clauseCheck.clauseRef,
                detail: '特約により借主負担ですが、減価償却を適用します（ガイドライン準拠）',
              });
              
              // 警告を追加
              warnings.push(
                `${line.description}: 特約により借主負担ですが、国交省ガイドラインに基づき減価償却を適用しました`
              );
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
    
    // 【Step 1】混在ケース（経年劣化+借主過失）の按分処理を先に実行
    let baseAmountForDepreciation = line.subtotal;
    
    if (allocation === 'tenant') {
      const mixedResult = applyMixedDamageAllocation(
        { description: line.description, notes: line.notes },
        line.subtotal
      );
      
      if (mixedResult) {
        // 按分比率を適用（減価償却前）
        baseAmountForDepreciation = mixedResult.tenant;
        landlordShare = mixedResult.landlord;
        
        basis.push({
          type: 'guideline',
          label: '経年劣化との按分',
          detail: mixedResult.explanation,
        });
      }
    }
    
    // 【Step 2】減価償却の適用（按分後の借主負担額に対して）
    if (
      allocation === 'tenant' &&
      shouldApplyDepreciation &&
      matchedRule.depreciation &&
      context.tenancy_years > 0
    ) {
      const depreciatedAmount = applyDepreciation(
        baseAmountForDepreciation,
        context.tenancy_years,
        matchedRule.depreciation.useful_life_years
      );
      
      tenantShare = depreciatedAmount;
      
      // 按分がある場合は landlordShare は既に設定されている
      // 按分がない場合は全体から借主負担を引いた額
      if (landlordShare === 0) {
        landlordShare = line.subtotal - depreciatedAmount;
      }
      
      const explanation = getDepreciationExplanation(
        context.tenancy_years,
        matchedRule.depreciation.useful_life_years,
        baseAmountForDepreciation,
        depreciatedAmount
      );
      
      basis.push({
        type: 'depreciation',
        label: '減価償却適用',
        detail: explanation,
      });
    } else if (allocation === 'tenant') {
      tenantShare = baseAmountForDepreciation;
      if (landlordShare === 0) {
        landlordShare = line.subtotal - baseAmountForDepreciation;
      }
    } else {
      tenantShare = 0;
      landlordShare = line.subtotal;
    }
    
    // 建物築年数による調整（借主負担の場合のみ）
    if (allocation === 'tenant' && tenantShare > 0 && context.building_age) {
      const originalTenantShare = tenantShare;
      tenantShare = adjustForBuildingAge(tenantShare, context.building_age);
      landlordShare = line.subtotal - tenantShare;
      
      const buildingAgeExplanation = getBuildingAgeAdjustmentExplanation(
        context.building_age,
        originalTenantShare,
        tenantShare
      );
      
      if (buildingAgeExplanation) {
        basis.push({
          type: 'depreciation', // 減価償却の一種として扱う
          label: '建物築年数による調整',
          detail: buildingAgeExplanation,
        });
      }
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
      });
  }
  
  const totals = {
    original: estimate.total,
    tenant: allocatedLines.reduce((sum, line) => sum + line.tenant_share, 0),
    landlord: allocatedLines.reduce((sum, line) => sum + line.landlord_share, 0),
  };
  
  return {
    lines: allocatedLines,
    totals,
    warnings,
  };
}
