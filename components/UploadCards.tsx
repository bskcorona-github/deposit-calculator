'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UploadCardsProps {
  onEstimateUpload: (file: File) => void;
  onLeaseUpload: (file: File) => void;
  estimateUploaded: boolean;
  leaseUploaded: boolean;
  loading: boolean;
}

export function UploadCards({
  onEstimateUpload,
  onLeaseUpload,
  estimateUploaded,
  leaseUploaded,
  loading,
}: UploadCardsProps) {
  const [isDraggingEstimate, setIsDraggingEstimate] = useState(false);
  const [isDraggingLease, setIsDraggingLease] = useState(false);
  const estimateInputRef = useRef<HTMLInputElement>(null);
  const leaseInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    (file: File | undefined, type: 'estimate' | 'lease') => {
      if (!file) {
        alert('ファイルを選択してください');
        return;
      }
      
      const fileName = file.name.toLowerCase();
      const validExtensions = type === 'estimate'
        ? ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc']
        : ['.pdf', '.docx', '.doc'];
      
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValid) {
        if (type === 'estimate') {
          onEstimateUpload(file);
        } else {
          onLeaseUpload(file);
        }
      } else {
        const formats = type === 'estimate'
          ? 'PDF、Excel（.xlsx/.xls）、Word（.docx/.doc）、CSV'
          : 'PDF、Word（.docx/.doc）';
        alert(`対応しているファイル形式: ${formats}`);
      }
    },
    [onEstimateUpload, onLeaseUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: 'estimate' | 'lease') => {
      const file = e.target.files?.[0];
      validateAndUpload(file, type);
    },
    [validateAndUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent, type: 'estimate' | 'lease') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'estimate') {
      setIsDraggingEstimate(true);
    } else {
      setIsDraggingLease(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, type: 'estimate' | 'lease') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'estimate') {
      setIsDraggingEstimate(false);
    } else {
      setIsDraggingLease(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'estimate' | 'lease') => {
      e.preventDefault();
      e.stopPropagation();
      
      if (type === 'estimate') {
        setIsDraggingEstimate(false);
      } else {
        setIsDraggingLease(false);
      }

      if (loading) return;

      const file = e.dataTransfer.files[0];
      validateAndUpload(file, type);
    },
    [loading, validateAndUpload]
  );

  const handleClick = useCallback((type: 'estimate' | 'lease') => {
    if (type === 'estimate') {
      estimateInputRef.current?.click();
    } else {
      leaseInputRef.current?.click();
    }
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* 見積書PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            見積書PDF
          </CardTitle>
          <CardDescription>
            原状回復の見積書をアップロード（PDF/Excel/Word/CSV対応）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={estimateInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="hidden"
            onChange={(e) => handleFileInput(e, 'estimate')}
            disabled={loading}
          />
          <div
            onDragOver={(e) => handleDragOver(e, 'estimate')}
            onDragLeave={(e) => handleDragLeave(e, 'estimate')}
            onDrop={(e) => handleDrop(e, 'estimate')}
            onClick={() => !loading && handleClick('estimate')}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${
isDraggingEstimate
                ? 'border-primary bg-primary/10 scale-105'
                : estimateUploaded
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {estimateUploaded ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="font-semibold text-green-700">アップロード済み</p>
                <p className="text-sm text-gray-500">クリックで再アップロード</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="font-semibold text-gray-700">
                  {isDraggingEstimate ? 'ここにドロップ' : 'PDFをドラッグ&ドロップ'}
                </p>
                <p className="text-sm text-gray-500">または</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick('estimate');
                  }}
                >
                  ファイルを選択
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 賃貸借契約書PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            賃貸借契約書PDF
          </CardTitle>
          <CardDescription>
            特約を含む契約書をアップロード（PDF/Word対応）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={leaseInputRef}
            type="file"
            accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="hidden"
            onChange={(e) => handleFileInput(e, 'lease')}
            disabled={loading}
          />
          <div
            onDragOver={(e) => handleDragOver(e, 'lease')}
            onDragLeave={(e) => handleDragLeave(e, 'lease')}
            onDrop={(e) => handleDrop(e, 'lease')}
            onClick={() => !loading && handleClick('lease')}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDraggingLease
                ? 'border-primary bg-primary/10 scale-105'
                : leaseUploaded
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {leaseUploaded ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="font-semibold text-green-700">アップロード済み</p>
                <p className="text-sm text-gray-500">クリックで再アップロード</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="font-semibold text-gray-700">
                  {isDraggingLease ? 'ここにドロップ' : 'PDFをドラッグ&ドロップ'}
                </p>
                <p className="text-sm text-gray-500">または</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick('lease');
                  }}
                >
                  ファイルを選択
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
