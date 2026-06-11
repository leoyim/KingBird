import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function useVirtualScroll<T>(items: T[], itemHeight: number) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer: Virtualizer<HTMLDivElement, Element> = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
