'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UploadCards } from '@/components/UploadCards';
import { EstimateTable } from '@/components/EstimateTable';
import { LeaseViewer } from '@/components/LeaseViewer';
import { ContextForm } from '@/components/ContextForm';
import { AllocationTable } from '@/components/AllocationTable';
import { ExportPanel } from '@/components/ExportPanel';
import { Loader2, Calculator } from 'lucide-react';
import type {
  EstimateParseResult,
  LeaseParseResult,
  AllocationContext,
  AllocationResult,
} from '@/lib/types';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'review' | 'context' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  
  const [estimateFile, setEstimateFile] = useState<File | null>(null);
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [estimate, setEstimate] = useState<EstimateParseResult | null>(null);
  const [lease, setLease] = useState<LeaseParseResult | null>(null);
  const [context, setContext] = useState<AllocationContext>({
    tenancy_years: 2,
  });
  const [result, setResult] = useState<AllocationResult | null>(null);

  // 見積PDFのアップロード
  const handleEstimateUpload = async (file: File) => {
    setEstimateFile(file);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useAI', 'true');
      
      const response = await fetch('/api/parse-estimate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('見積の解析に失敗しました');
      }
      
      const data = await response.json();
      setEstimate(data);
    } catch (error) {
      console.error('Estimate upload error:', error);
      alert('見積のアップロードに失敗しました');
      setEstimateFile(null);
    } finally {
      setLoading(false);
    }
  };

  // 契約書PDFのアップロード
  const handleLeaseUpload = async (file: File) => {
    setLeaseFile(file);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useAI', 'true');
      
      const response = await fetch('/api/parse-lease', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('契約書の解析に失敗しました');
      }
      
      const data = await response.json();
      setLease(data);
    } catch (error) {
      console.error('Lease upload error:', error);
      alert('契約書のアップロードに失敗しました');
      setLeaseFile(null);
    } finally {
      setLoading(false);
    }
  };

  // 自動振り分けの実行
  const handleAllocate = async () => {
    if (!estimate || !lease) {
      alert('見積と契約書の両方をアップロードしてください');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate, lease, context }),
      });
      
      if (!response.ok) {
        throw new Error('費用の振り分けに失敗しました');
      }
      
      const data = await response.json();
      setResult(data);
      setStep('result');
    } catch (error) {
      console.error('Allocation error:', error);
      alert('費用の振り分けに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToReview = estimateFile && leaseFile && estimate && lease;
  const canProceedToContext = canProceedToReview;
  const canAllocate = canProceedToContext && context.tenancy_years > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            原状回復費用 自動計算ツール
          </h1>
          <p className="text-gray-600">
            見積と契約書から、借主と貸主の負担を自動で振り分けます
          </p>
        </header>

        <Tabs value={step} onValueChange={(v) => setStep(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">1. アップロード</TabsTrigger>
            <TabsTrigger value="review" disabled={!canProceedToReview}>
              2. 確認
            </TabsTrigger>
            <TabsTrigger value="context" disabled={!canProceedToContext}>
              3. 入居条件
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!result}>
              4. 結果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <UploadCards
              onEstimateUpload={handleEstimateUpload}
              onLeaseUpload={handleLeaseUpload}
              estimateUploaded={!!estimateFile}
              leaseUploaded={!!leaseFile}
              loading={loading}
            />

            {canProceedToReview && (
              <div className="flex justify-end">
                <Button onClick={() => setStep('review')} size="lg">
                  次へ：内容を確認
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-6">
            {estimate && <EstimateTable estimate={estimate} />}
            {lease && <LeaseViewer lease={lease} />}

            <div className="flex justify-between">
              <Button onClick={() => setStep('upload')} variant="outline">
                戻る
              </Button>
              <Button onClick={() => setStep('context')} size="lg">
                次へ：入居条件を入力
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="context" className="space-y-6">
            <ContextForm context={context} onChange={setContext} />

            <div className="flex justify-between">
              <Button onClick={() => setStep('review')} variant="outline">
                戻る
              </Button>
              <Button
                onClick={handleAllocate}
                disabled={!canAllocate || loading}
                size="lg"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    計算中...（AI検証を含む、30秒程度）
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    自動振り分けを実行（AI検証付き）
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="result" className="space-y-6">
            {result && (
              <>
                <AllocationTable result={result} />
                <ExportPanel result={result} />
              </>
            )}

            <div className="flex justify-between">
              <Button onClick={() => setStep('context')} variant="outline">
                戻る
              </Button>
              <Button
                onClick={() => {
                  setStep('upload');
                  setEstimateFile(null);
                  setLeaseFile(null);
                  setEstimate(null);
                  setLease(null);
                  setResult(null);
                }}
                variant="secondary"
              >
                最初からやり直す
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
