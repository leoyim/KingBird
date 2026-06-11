import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
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

export function highlightAllCodeBlocks(): void {
  requestAnimationFrame(() => {
    document.querySelectorAll('pre code').forEach((block) => {
      Prism.highlightElement(block);
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
