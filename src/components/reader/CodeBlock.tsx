import { useEffect, useRef, useState, useCallback } from 'react';
import { highlightCodeBlock, addLineNumbers, SUPPORTED_LANGUAGES } from '@/services/highlightService';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const COPY_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="5" width="9" height="9" rx="1.5" />
    <path d="M3 11V3a1 1 0 011-1h7" />
  </svg>
);

const CHECK_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8l3.5 3.5L13 4" />
  </svg>
);

export function CodeBlock({ code, language }: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!codeRef.current) return;
    highlightCodeBlock(codeRef.current);
    if (preRef.current) {
      addLineNumbers(preRef.current);
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [code]);

  const langLabel = language ? SUPPORTED_LANGUAGES[language] || language : '';

  return (
    <div className="monaco-block my-4">
      <pre ref={preRef} className={`language-${language || 'text'}`}>
        <code ref={codeRef} className={`language-${language || 'text'}`}>
          {code}
        </code>
      </pre>
      {langLabel && (
        <span className="monaco-block-lang">{langLabel}</span>
      )}
      <button
        onClick={handleCopy}
        className={`monaco-block-copy ${copied ? 'copied' : ''}`}
        title="复制代码"
      >
        {copied ? CHECK_ICON : COPY_ICON}
        <span>{copied ? '已复制' : '复制'}</span>
      </button>
    </div>
  );
}
