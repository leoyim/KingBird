import type { Tag } from '@/types';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        backgroundColor: `${tag.color || '#007AFF'}15`,
        color: tag.color || '#007AFF',
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
}
