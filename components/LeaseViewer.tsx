'use client';

import React from 'react';
import type { LeaseParseResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeaseViewerProps {
  lease: LeaseParseResult;
}

export function LeaseViewer({ lease }: LeaseViewerProps) {
  const specialClauses = lease.clauses.filter((c) => c.is_special);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          契約書・特約
          <Badge variant="secondary">{specialClauses.length}件の特約</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {lease.clauses.map((clause, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border ${
                clause.is_special ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {clause.article_no && clause.article_no !== '' && (
                  <Badge variant="outline">第{clause.article_no}条</Badge>
                )}
                {clause.is_special && (
                  <Badge variant="warning">特約</Badge>
                )}
              </div>
              {clause.heading && clause.heading !== '' && (
                <h4 className="font-semibold mb-1">{clause.heading}</h4>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {clause.body}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
