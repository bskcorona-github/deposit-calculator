'use client';

import React from 'react';
import type { EstimateParseResult } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';

interface EstimateTableProps {
  estimate: EstimateParseResult;
}

export function EstimateTable({ estimate }: EstimateTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>見積明細</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>カテゴリ</TableHead>
              <TableHead>項目</TableHead>
              <TableHead className="text-right">単価</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">小計</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimate.lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>{line.category}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(line.unit_price)}
                </TableCell>
                <TableCell className="text-right">{line.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(line.subtotal)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell colSpan={4} className="text-right">
                合計
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(estimate.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
