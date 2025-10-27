'use client';

import React, { useState } from 'react';
import type { AllocationResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';

interface ExportPanelProps {
  result: AllocationResult;
}

export function ExportPanel({ result }: ExportPanelProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, format }),
      });

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restoration_cost.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>エクスポート</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            CSV形式でダウンロード
          </Button>

          <Button
            onClick={() => handleExport('pdf')}
            disabled={true}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF形式でダウンロード（準備中）
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
