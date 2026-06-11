/// <reference types="vite/client" />

declare module 'rss-parser' {
  interface ParserOptions {
    customFields?: Record<string, string[]>;
    timeout?: number;
    headers?: Record<string, string>;
  }

  interface ParserResult {
    title?: string;
    description?: string;
    link?: string;
    image?: { url?: string; title?: string; link?: string };
    items?: Array<{
      title?: string;
      link?: string;
      creator?: string;
      author?: string;
      content?: string;
      contentSnippet?: string;
      summary?: string;
      'content:encoded'?: string;
      isoDate?: string;
      pubDate?: string;
      categories?: string[];
    }>;
  }

  export default class Parser {
    constructor(options?: ParserOptions);
    parseURL(url: string): Promise<ParserResult>;
    parseString(xml: string): Promise<ParserResult>;
  }
}

declare module 'flexsearch' {
  interface DocumentOptions<T, I> {
    document: {
      id: string;
      index: string[];
      store?: string[];
    };
    tokenize?: string;
    context?: boolean;
    cache?: boolean;
  }

  interface SearchOptions {
    limit?: number;
  }

  interface SearchResult<T> {
    field: string;
    result: I[];
  }

  export class Document<T = unknown, I = unknown> {
    constructor(options: DocumentOptions<T, I>);
    add(doc: T): void;
    remove(id: I): void;
    search(query: string, options?: SearchOptions): SearchResult<T>[];
    searchAsync(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
  }
}
