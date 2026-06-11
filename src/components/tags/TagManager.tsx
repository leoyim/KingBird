import { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { useTagStore } from '@/stores/tagStore';
import { TAG_COLORS } from '@/utils/constants';

interface TagManagerProps {
  articleId: string;
  onClose?: () => void;
}

export function TagManager({ articleId, onClose }: TagManagerProps) {
  const { tags, articleTags, addTag, addTagToArticle, removeTagFromArticle, getTagsForArticle } = useTagStore();
  const [newTagName, setNewTagName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const articleTagList = getTagsForArticle(articleId);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    await addTag(newTagName.trim());
    setNewTagName('');
    setShowInput(false);
  };

  const handleToggleTag = async (tagId: string) => {
    const isTagged = articleTagList.some(t => t.id === tagId);
    if (isTagged) {
      await removeTagFromArticle(articleId, tagId);
    } else {
      await addTagToArticle(articleId, tagId);
    }
  };

  return (
    <div className="space-y-3">
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {articleTagList.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: `${tag.color || '#007AFF'}15`,
              color: tag.color || '#007AFF',
            }}
          >
            <Tag className="w-3 h-3" />
            {tag.name}
            <button
              onClick={() => removeTagFromArticle(articleId, tag.id)}
              className="hover:opacity-70"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Available tags */}
      <div className="flex flex-wrap gap-1">
        {tags
          .filter(t => !articleTagList.some(at => at.id === t.id))
          .map((tag) => (
            <button
              key={tag.id}
              onClick={() => addTagToArticle(articleId, tag.id)}
              className="px-2 py-0.5 rounded-md text-xs border border-dashed border-current/20 hover:border-current/40 transition-colors"
              style={{ color: tag.color || '#007AFF' }}
            >
              + {tag.name}
            </button>
          ))}
      </div>

      {/* Add new tag */}
      {showInput ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="新标签名..."
            className="input-mac text-xs h-7 flex-1"
            autoFocus
          />
          <button onClick={handleAddTag} className="btn-mac-primary h-7 px-2.5 text-xs">
            添加
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1 text-xs text-mac-blue hover:underline"
        >
          <Plus className="w-3 h-3" />
          新建标签
        </button>
      )}
    </div>
  );
}
