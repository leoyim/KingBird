import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { importOPML } from '@/services/exportService';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface ImportOPMLDialogProps {
  open: boolean;
  onClose: () => void;
  onRefreshRequested?: () => void;
}

export function ImportOPMLDialog({ open, onClose, onRefreshRequested }: ImportOPMLDialogProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ feeds: number; folders: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadAll } = useSubscriptionStore();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.opml') && !file.name.endsWith('.xml')) {
      setErrorMsg('请选择 OPML 或 XML 文件');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('文件大小不能超过 5MB');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const importResult = await importOPML(file);
      await loadAll();
      setResult(importResult);
      setStatus('success');
    } catch (err) {
      setErrorMsg(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
      setStatus('error');
    }
  }, [loadAll]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClose = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-fade-in"
        onClick={handleClose}
      />
      <div className="relative card-mac w-full max-w-md mx-4 animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-base font-semibold">导入 OPML</h2>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {status === 'idle' && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-mac-blue bg-mac-blue/5'
                  : 'border-black/10 dark:border-white/10 hover:border-mac-blue/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-mac-text-secondary dark:text-mac-text-dark-secondary" />
              <p className="text-sm font-medium">拖放 OPML 文件到此处</p>
              <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary mt-1">
                或点击选择文件
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".opml,.xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-mac-blue animate-spin mb-3" />
              <p className="text-sm">正在导入订阅源...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-8 h-8 text-mac-green mb-3" />
              <p className="text-sm font-medium">导入成功</p>
              <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary mt-1">
                已导入 {result.feeds} 个订阅源
              </p>
              <p className="text-xs text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mt-4 mb-4">
                是否立即刷新获取文章？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onRefreshRequested?.();
                    handleClose();
                  }}
                  className="btn-mac-primary px-6 text-xs"
                >
                  立即刷新
                </button>
                <button
                  onClick={handleClose}
                  className="btn-mac-ghost px-4 text-xs"
                >
                  稍后再说
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle className="w-8 h-8 text-mac-red mb-3" />
              <p className="text-sm font-medium">导入失败</p>
              <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary mt-1 text-center">
                {errorMsg}
              </p>
              <button onClick={() => setStatus('idle')} className="btn-mac-ghost mt-3 text-xs">
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
