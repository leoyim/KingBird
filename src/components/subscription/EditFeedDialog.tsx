import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, FolderOpen, Tags, Plus } from 'lucide-react';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTagStore } from '@/stores/tagStore';
import type { Feed } from '@/types';

interface EditFeedDialogProps {
  open: boolean;
  feedId: string | null;
  onClose: () => void;
}

export function EditFeedDialog({ open, feedId, onClose }: EditFeedDialogProps) {
  const { feeds, folders, subscriptions, updateFeed, removeSubscription, addFolder, renameFolder } = useSubscriptionStore();
  const { tags, addTag, getTagsForSubscription, addTagToSubscription, removeTagFromSubscription } = useTagStore();

  const feed = feeds.find(f => f.id === feedId);
  const sub = feed ? subscriptions.find(s => s.feedId === feed.id) : undefined;

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync form when dialog opens
  useEffect(() => {
    if (open && feed) {
      setTitle(feed.title);
      setUrl(feed.url);
      setSelectedFolderId(sub?.folderId);

      if (sub) {
        const subTags = getTagsForSubscription(sub.id);
        setSelectedTagIds(subTags.map(t => t.id));
      } else {
        setSelectedTagIds([]);
      }
      setShowDeleteConfirm(false);
      setNewTagName('');
      setNewFolderName('');
    }
  }, [open, feed, sub]);

  if (!open || !feed) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFeed(feed.id, {
        title: title.trim() || feed.title,
        url: url.trim() || feed.url,
      });

      // Update folder
      if (sub && selectedFolderId !== sub.folderId) {
        const db = (await import('@/db/schema')).db;
        await db.subscriptions.update(sub.id, { folderId: selectedFolderId });
        await useSubscriptionStore.getState().loadAll();
      }

      // Update tags
      if (sub) {
        const currentTagIds = getTagsForSubscription(sub.id).map(t => t.id);
        const toAdd = selectedTagIds.filter(id => !currentTagIds.includes(id));
        const toRemove = currentTagIds.filter(id => !selectedTagIds.includes(id));

        for (const tagId of toAdd) {
          await addTagToSubscription(sub.id, tagId);
        }
        for (const tagId of toRemove) {
          await removeTagFromSubscription(sub.id, tagId);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!sub) return;
    setDeleting(true);
    try {
      await removeSubscription(sub.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setDeleting(false);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await addFolder(name);
    setNewFolderName('');
  };

  const handleAddTagInline = async () => {
    const name = newTagName.trim();
    if (!name) return;

    let tag = tags.find(t => t.name === name);
    if (!tag) {
      await addTag(name);
      tag = useTagStore.getState().tags.find(t => t.name === name);
      if (!tag) return;
    }
    if (!selectedTagIds.includes(tag.id)) {
      setSelectedTagIds(prev => [...prev, tag!.id]);
    }
    setNewTagName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative card-mac w-full max-w-md mx-4 p-0 animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {feed.imageUrl ? (
              <img src={feed.imageUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded bg-mac-blue/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] text-mac-blue font-bold">R</span>
              </div>
            )}
            <h2 className="text-base font-semibold truncate">编辑订阅</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Delete section */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-mac-red/20 text-mac-red hover:bg-mac-red/5 transition-all text-sm"
            >
              删除此订阅源
            </button>
          ) : (
            <div className="p-3 rounded-lg bg-mac-red/5 border border-mac-red/20">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-mac-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-mac-red">确认删除？</p>
                  <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary mt-0.5">
                    将删除该订阅源及其所有已保存的文章，此操作不可撤销。
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 btn-mac-ghost text-xs py-1.5"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 btn-mac-primary bg-mac-red hover:bg-mac-red/90 text-white text-xs py-1.5"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '确认删除'}
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="订阅源标题"
              className="input-mac w-full"
              maxLength={200}
            />
          </div>

          {/* URL */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">RSS 地址</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input-mac w-full font-mono text-xs"
            />
          </div>

          {/* Folder */}
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              文件夹
            </label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value || undefined)}
              className="input-mac w-full"
            >
              <option value="">无文件夹（未分类）</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            {/* Create new folder */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}
              className="flex gap-1 mt-2"
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="+ 新建文件夹"
                className="flex-1 text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:border-mac-blue/50"
                maxLength={30}
              />
            </form>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5" />
              标签
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                        } else {
                          setSelectedTagIds(prev => [...prev, tag.id]);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                        isSelected ? 'ring-1 shadow-sm' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${tag.color || '#007AFF'}15`,
                        color: tag.color || '#007AFF',
                        ...(isSelected ? { borderColor: tag.color || '#007AFF' } : {}),
                      }}
                    >
                      {isSelected && <span className="font-bold">✓</span>}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Create new tag inline */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddTagInline(); }}
              className="flex gap-1 mt-2"
            >
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="+ 新建标签"
                className="flex-1 text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:border-mac-blue/50"
                maxLength={20}
              />
            </form>
          </div>

          {/* Feed info (read-only) */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5">
            <p className="text-[11px] text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60">
              已创建于 {sub ? new Date(sub.createdAt).toLocaleDateString('zh-CN') : '—'}
              {' · '}错误次数: {feed.errorCount}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-mac-ghost"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-mac-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
