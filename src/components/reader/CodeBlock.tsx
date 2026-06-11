import { useEffect, useRef } from 'react';
import { highlightCodeBlock } from '@/services/highlightService';
import { SUPPORTED_LANGUAGES } from '@/services/highlightService';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      highlightCodeBlock(codeRef.current);
    }
  }, [code, language]);

  const langLabel = language ? SUPPORTED_LANGUAGES[language] || language : '';

  return (
    <div className="relative group my-4">
      {langLabel && (
        <div className="absolute top-0 right-0 px-2 py-1 text-[10px] text-white/40 bg-black/20 rounded-bl-md z-10">
          {langLabel}
        </div>
      )}
      <pre className={`language-${language || 'text'} rounded-xl overflow-x-auto`}>
        <code ref={codeRef} className={`language-${language || 'text'}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
