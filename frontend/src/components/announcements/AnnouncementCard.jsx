'use client';
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { announcementApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const QUICK_EMOJIS = ['👍', '🎉', '❤️', '🚀', '👀', '✅'];

export default function AnnouncementCard({ announcement, workspaceId, role, onEdit, onDelete, onPin, onReact }) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    try {
      const { data } = await announcementApi.getComments(workspaceId, announcement.id);
      setComments(data.comments);
      setShowComments(true);
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const { data } = await announcementApi.addComment(workspaceId, announcement.id, { content: commentText });
      setComments((prev) => [...prev, data.comment]);
      setCommentText('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await announcementApi.deleteComment(workspaceId, announcement.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  // Group reactions by emoji
  const grouped = announcement.reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {}) || {};

  return (
    <>
      <div className={`card p-5 space-y-4 ${announcement.isPinned ? 'border-violet-800/40' : ''}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={announcement.author?.name} avatarUrl={announcement.author?.avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white text-sm">{announcement.author?.name}</span>
              {announcement.isPinned && (
                <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">📌 Pinned</span>
              )}
              <span className="text-xs text-zinc-600 ml-auto">
                {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
              </span>
            </div>
            <h3 className="font-display font-semibold text-white mt-0.5">{announcement.title}</h3>
          </div>

          {role === 'ADMIN' && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onPin(announcement.id)}
                className="btn-ghost p-1.5 text-xs"
                title="Toggle pin"
              >
                📌
              </button>
              <button onClick={() => onEdit(announcement)} className="btn-ghost p-1.5 text-xs">✎</button>
              <button onClick={() => setShowDelete(true)} className="btn-ghost p-1.5 text-xs text-zinc-600 hover:text-red-400">✕</button>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className={`rich-content text-sm ${!expanded && 'line-clamp-4'}`}
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
        {announcement.content?.length > 400 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-violet-400 hover:text-violet-300">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Reactions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {Object.entries(grouped).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onReact(announcement.id, emoji)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all ${
                users.some((u) => u.user.id === user?.id)
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
              title={users.map((u) => u.user.name).join(', ')}
            >
              {emoji} <span className="text-xs">{users.length}</span>
            </button>
          ))}

          {/* Quick emoji picker */}
          <div className="flex gap-1 ml-1">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(announcement.id, e)}
                className="text-sm opacity-30 hover:opacity-100 transition-opacity hover:scale-125"
              >
                {e}
              </button>
            ))}
          </div>

          <button onClick={loadComments} className="ml-auto btn-ghost text-xs flex items-center gap-1.5">
            💬 {announcement._count?.comments || comments.length || 0}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="pt-3 border-t border-zinc-800 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 group">
                <Avatar name={c.author?.name} avatarUrl={c.author?.avatarUrl} size="xs" />
                <div className="flex-1 bg-zinc-800 rounded-xl px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-white">{c.author?.name}</span>
                    <span className="text-[10px] text-zinc-600">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                    {(c.authorId === user?.id || role === 'ADMIN') && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-[10px] transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}

            <form onSubmit={postComment} className="flex gap-2">
              <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="xs" />
              <div className="flex-1 flex gap-2">
                <input
                  className="input flex-1 text-sm py-1.5"
                  placeholder="Add a comment… (use @name to mention)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button type="submit" disabled={posting || !commentText.trim()} className="btn-primary py-1.5 px-3 text-xs">
                  {posting ? '…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { onDelete(announcement.id); setShowDelete(false); }}
        title="Delete announcement?"
        message="This announcement and all its comments will be permanently deleted."
      />
    </>
  );
}