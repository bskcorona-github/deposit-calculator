'use client';

import React from 'react';
import type { AllocationResult } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { AlertCircle } from 'lucide-react';

interface AllocationTableProps {
  result: AllocationResult;
}

export function AllocationTable({ result }: AllocationTableProps) {
  const getBadgeVariant = (type: string): 'default' | 'secondary' | 'success' | 'warning' => {
    switch (type) {
      case 'guideline':
        return 'default';
      case 'special_clause':
        return 'warning';
      case 'depreciation':
        return 'success';
      case 'price_check':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          自動振り分け結果
          {result.ai_validation && (
            <Badge variant="default" className="bg-green-600">
              AI検証済み
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* AI検証サマリー */}
        {result.ai_validation && result.ai_validation.validation_summary && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 mb-2">AI検証結果（国交省ガイドライン準拠）</h4>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.ai_validation.item_validations.filter((v: any) => v.validation_status === 'approved').length}
                    </div>
                    <div className="text-xs text-gray-600">承認</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {result.ai_validation.validation_summary.warnings}
                    </div>
                    <div className="text-xs text-gray-600">警告</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {result.ai_validation.validation_summary.critical_issues + result.ai_validation.validation_summary.warnings}
                    </div>
                    <div className="text-xs text-gray-600">自動修正済み</div>
                  </div>
                </div>
                <p className="text-sm text-blue-700">
                  {result.ai_validation.overall_assessment}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {result.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 mb-1">警告</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead>場所</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>単位</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead className="text-right">元の金額</TableHead>
                <TableHead className="text-right">借主負担</TableHead>
                <TableHead className="text-right">貸主負担</TableHead>
                <TableHead className="text-center">負担率</TableHead>
                <TableHead>判定理由</TableHead>
                <TableHead>根拠</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{line.item}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {line.location || '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {line.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {line.unit || '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(line.unit_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.original_subtotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(line.tenant_share)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    {formatCurrency(line.landlord_share)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={line.tenant_percentage > 0 ? 'destructive' : 'success'}>
                      {line.tenant_percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 max-w-md">
                    {line.explanation || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {line.basis.map((basis, bIndex) => (
                        <Badge
                          key={bIndex}
                          variant={getBadgeVariant(basis.type)}
                          className="text-xs"
                          title={basis.detail}
                        >
                          {basis.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold text-base">
                <TableCell>合計</TableCell>
                <TableCell colSpan={4}></TableCell>
                <TableCell className="text-right">
                  {formatCurrency(result.totals.original)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(result.totals.tenant)}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatCurrency(result.totals.landlord)}
                </TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
