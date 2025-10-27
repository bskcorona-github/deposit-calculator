'use client';

import React from 'react';
import type { AllocationContext } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ContextFormProps {
  context: AllocationContext;
  onChange: (context: AllocationContext) => void;
}

export function ContextForm({ context, onChange }: ContextFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>入居条件</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tenancy_years">入居年数</Label>
            <Input
              id="tenancy_years"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={context.tenancy_years}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                const clampedValue = Math.max(0, Math.min(100, value));
                onChange({ ...context, tenancy_years: clampedValue });
              }}
            />
            <p className="text-sm text-gray-500">減価償却の計算に使用されます（0～100年）</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="building_age">建物築年数（任意）</Label>
            <Input
              id="building_age"
              type="number"
              min="0"
              max="150"
              value={context.building_age || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                const clampedValue = value ? Math.max(0, Math.min(150, value)) : undefined;
                onChange({
                  ...context,
                  building_age: clampedValue,
                });
              }}
            />
            <p className="text-sm text-gray-500">将来の機能拡張用（0～150年）</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            💡 <strong>喫煙・ペット情報は自動判定されます</strong><br />
            見積書の備考や項目名から自動的に検出します。手動入力は不要です。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
