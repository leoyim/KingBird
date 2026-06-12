import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

/** Copy SVG icon (inline to avoid extra HTTP request) */
const COPY_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 011-1h7"/></svg>';

function detectLanguage(pre: HTMLPreElement): string | null {
  const className = pre.className;
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : null;
}

export function addLineNumbers(pre: HTMLPreElement): void {
  const code = pre.querySelector('code');
  if (!code || code.querySelector('.code-line')) return;

  const rawHtml = code.innerHTML;
  const lines = rawHtml.split('\n');

  // Remove trailing empty line artifact (common in code blocks)
  const effectiveLines = lines.length > 1 && lines[lines.length - 1].trim() === ''
    ? lines.slice(0, -1)
    : lines;

  // Each line: explicit line-number span + content span — no CSS tricks
  code.innerHTML = effectiveLines
    .map((lineContent, index) => {
      const num = index + 1;
      const content = lineContent || ' ';
      return `<span class="code-line"><span class="line-num">${num}</span><span class="line-cnt">${content}</span></span>`;
    })
    .join('');
}

function wrapInMonacoBlock(pre: HTMLPreElement): void {
  // Already wrapped
  if (pre.parentElement?.classList.contains('monaco-block')) return;

  const lang = detectLanguage(pre);
  const label = lang ? (SUPPORTED_LANGUAGES[lang] || lang.toUpperCase()) : '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'monaco-block';

  // Floating lang label
  if (label) {
    const langTag = document.createElement('span');
    langTag.className = 'monaco-block-lang';
    langTag.textContent = label;
    wrapper.appendChild(langTag);
  }

  // Floating copy button
  const btn = document.createElement('button');
  btn.className = 'monaco-block-copy';
  btn.innerHTML = `${COPY_ICON} <span>复制</span>`;
  btn.title = '复制代码';
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const code = pre.querySelector('code')?.textContent || pre.textContent || '';
    try {
      await navigator.clipboard.writeText(code);
      btn.classList.add('copied');
      btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8l3.5 3.5L13 4"/></svg> <span>已复制</span>`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `${COPY_ICON} <span>复制</span>`;
      }, 2000);
    } catch {
      btn.innerHTML = '<span>失败</span>';
      setTimeout(() => { btn.innerHTML = `${COPY_ICON} <span>复制</span>`; }, 1500);
    }
  });
  wrapper.appendChild(btn);

  // Insert wrapper before pre, then move pre into wrapper
  pre.parentNode?.insertBefore(wrapper, pre);
  wrapper.appendChild(pre);
}

export function highlightAllCodeBlocks(): void {
  requestAnimationFrame(() => {
    document.querySelectorAll('.article-content pre code').forEach((block) => {
      Prism.highlightElement(block);
    });
    document.querySelectorAll('.article-content pre').forEach((pre) => {
      const htmlPre = pre as HTMLPreElement;
      addLineNumbers(htmlPre);
      wrapInMonacoBlock(htmlPre);
    });
  });
}

export function highlightCodeBlock(element: HTMLElement): void {
  Prism.highlightElement(element);
}

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'jsx': 'JSX',
  'tsx': 'TSX',
  'py': 'Python',
  'python': 'Python',
  'rs': 'Rust',
  'rust': 'Rust',
  'go': 'Go',
  'java': 'Java',
  'c': 'C',
  'cpp': 'C++',
  'csharp': 'C#',
  'cs': 'C#',
  'rb': 'Ruby',
  'ruby': 'Ruby',
  'swift': 'Swift',
  'kt': 'Kotlin',
  'kotlin': 'Kotlin',
  'sql': 'SQL',
  'yaml': 'YAML',
  'yml': 'YAML',
  'json': 'JSON',
  'md': 'Markdown',
  'markdown': 'Markdown',
  'bash': 'Bash',
  'sh': 'Bash',
  'shell': 'Bash',
  'css': 'CSS',
  'scss': 'SCSS',
};
