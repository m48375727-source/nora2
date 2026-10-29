import React, { useState, useEffect, useRef } from 'react';
import type { ForumPost, ForumComment, UserProfile, Role, Attachment } from '../../types';
import { api } from '../../lib/api';
import { PollWidget } from '../chat/PollWidget';
import { GifPicker } from '../chat/GifPicker';
import {
  ArrowLeft,
  MessageSquare,
  Repeat2,
  Heart,
  Bookmark,
  Share2,
  Image as ImageIcon,
  Send,
  X,
  Edit2,
  Trash2,
  CornerDownRight,
  Loader2
} from 'lucide-react';

interface ForumThreadProps {
  postId: string;
  currentUser: UserProfile;
  users: UserProfile[];
  roles: Role[];
  serverOwnerId: string;
  onBack: () => void;
  onOpenUserProfile: (user: UserProfile) => void;
}

export const ForumThread: React.FC<ForumThreadProps> = ({
  postId,
  currentUser,
  users,
  roles,
  serverOwnerId,
  onBack,
  onOpenUserProfile
}) => {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<ForumComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [attachedGif, setAttachedGif] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsBottomRef = useRef<HTMLDivElement>(null);

  const loadThread = async () => {
    try {
      const res = await api.getForumPostThread(postId);
      setPost(res.post);
      setComments(res.comments);
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
  }, [postId]);

  const handleSendComment = async () => {
    if (!commentContent.trim() && !attachedGif) return;

    setSubmitting(true);
    try {
      const res = await api.addForumComment(postId, {
        content: commentContent.trim(),
        parentCommentId: replyingToComment ? replyingToComment.id : null,
        gifUrl: attachedGif || undefined
      });
      setComments((prev) => [...prev, res.comment]);
      setCommentContent('');
      setAttachedGif(null);
      setReplyingToComment(null);

      if (post) {
        setPost({ ...post, replyCount: (post.replyCount || 0) + 1 });
      }

      setTimeout(() => {
        commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLikePost = async () => {
    if (!post) return;
    try {
      const res = await api.toggleLikePost(post.id);
      setPost({ ...post, likes: res.likes, likeCount: res.likeCount });
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleToggleLikeComment = async (commentId: string) => {
    try {
      const res = await api.toggleLikeComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likes: res.likes, likeCount: res.likeCount } : c))
      );
    } catch (err) {
      console.error('Like comment failed:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteForumComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId));
      if (post) {
        setPost({ ...post, replyCount: Math.max(0, (post.replyCount || 1) - 1) });
      }
    } catch (err) {
      console.error('Delete comment failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#000000]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#000000] p-6 text-center">
        <p className="text-sm text-slate-400 mb-4">Gönderi bulunamadı veya silinmiş.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Foruma Geri Dön
        </button>
      </div>
    );
  }

  const postAuthor = users.find((u) => u.id === post.authorId);
  const hasLikedPost = post.likes.includes(currentUser.id);

  // Group comments: top-level comments and nested replies
  const rootComments = comments.filter((c) => !c.parentCommentId);

  const getRepliesForComment = (parentId: string) => {
    return comments.filter((c) => c.parentCommentId === parentId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-hidden">
      {/* Thread Header */}
      <div className="sticky top-0 z-30 bg-[#05070d]/90 backdrop-blur-md border-b border-[#111a2e] px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          title="Akışa Geri Dön"
          className="p-1.5 hover:bg-[#111a2e] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">Tartışma Dizisi</h2>
          <p className="text-[11px] text-slate-500">@{postAuthor?.username} tarafından başlatıldı</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto space-y-6">
        {/* Original Post */}
        <div className="bg-[#05070d] border border-[#111a2e] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={postAuthor?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
              alt=""
              onClick={() => postAuthor && onOpenUserProfile(postAuthor)}
              className="w-11 h-11 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              referrerPolicy="no-referrer"
            />
            <div>
              <p
                onClick={() => postAuthor && onOpenUserProfile(postAuthor)}
                className="text-sm font-bold text-white hover:underline cursor-pointer leading-tight"
              >
                {postAuthor?.displayName || postAuthor?.username || 'Üye'}
              </p>
              <p className="text-xs text-slate-500">@{postAuthor?.username}</p>
            </div>
          </div>

          <p className="text-base text-slate-100 leading-relaxed whitespace-pre-wrap break-words mb-4">
            {post.content}
          </p>

          {/* Media Grid */}
          {post.media && post.media.length > 0 && (
            <div className="grid grid-cols-2 gap-2 my-3 rounded-xl overflow-hidden">
              {post.media.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImage(item.url)}
                  className="relative max-h-80 bg-[#0a0f1c] cursor-pointer"
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Attached GIF */}
          {post.gifUrl && (
            <div className="rounded-xl overflow-hidden my-3 max-h-72 inline-block bg-[#0a0f1c]">
              <img src={post.gifUrl} alt="" className="max-h-72 object-contain" />
            </div>
          )}

          {/* Poll */}
          {post.poll && (
            <PollWidget
              poll={post.poll}
              currentUserId={currentUser.id}
              canManage={currentUser.id === serverOwnerId || post.authorId === currentUser.id}
            />
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between text-slate-400 pt-3 border-t border-[#111a2e] mt-4">
            <button
              onClick={handleToggleLikePost}
              className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                hasLikedPost ? 'text-blue-500 font-semibold' : 'hover:text-blue-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasLikedPost ? 'fill-blue-500 text-blue-500' : ''}`} />
              <span className="font-mono tabular-nums">{post.likeCount || 0} Beğeni</span>
            </button>

            <span className="text-xs font-mono text-slate-400">
              {comments.length} Yorum
            </span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Yorumlar
          </h3>

          {rootComments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-[#05070d] rounded-2xl border border-[#111a2e]">
              Henüz yorum yok. İlk yorumu aşağıdan yazın!
            </div>
          ) : (
            rootComments.map((comment) => {
              const commentAuthor = users.find((u) => u.id === comment.authorId);
              const replies = getRepliesForComment(comment.id);
              const hasLiked = comment.likes?.includes(currentUser.id);
              const canDelete =
                comment.authorId === currentUser.id || currentUser.id === serverOwnerId;

              return (
                <div key={comment.id} className="bg-[#05070d] border border-[#111a2e] rounded-2xl p-4 space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={commentAuthor?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-white">
                            {commentAuthor?.displayName || commentAuthor?.username || 'Member'}
                          </span>
                          <span className="text-slate-500">@{commentAuthor?.username}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap">{comment.content}</p>

                      {comment.gifUrl && (
                        <div className="rounded-xl overflow-hidden my-2 max-h-48 inline-block">
                          <img src={comment.gifUrl} alt="" className="max-h-48 object-contain" />
                        </div>
                      )}

                      {/* Comment Actions */}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                        <button
                          onClick={() => handleToggleLikeComment(comment.id)}
                          className={`flex items-center gap-1 cursor-pointer ${
                            hasLiked ? 'text-blue-500 font-semibold' : 'hover:text-blue-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-blue-500' : ''}`} />
                          <span className="font-mono">{comment.likeCount || 0}</span>
                        </button>
                        <button
                          onClick={() => setReplyingToComment(comment)}
                          className="hover:text-blue-400 font-medium cursor-pointer"
                        >
                          Yanıtla
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Replies (Up to 3 levels) */}
                  {replies.length > 0 && (
                    <div className="ml-8 pl-3 border-l-2 border-[#111a2e] space-y-3 pt-2">
                      {replies.map((reply) => {
                        const replyAuthor = users.find((u) => u.id === reply.authorId);
                        const hasLikedReply = reply.likes?.includes(currentUser.id);
                        const canDeleteReply =
                          reply.authorId === currentUser.id || currentUser.id === serverOwnerId;

                        return (
                          <div key={reply.id} className="flex gap-2.5">
                            <img
                              src={replyAuthor?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="font-semibold text-white">
                                    {replyAuthor?.displayName || replyAuthor?.username || 'Üye'}
                                  </span>
                                  <span className="text-slate-500">@{replyAuthor?.username}</span>
                                </div>
                                {canDeleteReply && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                              {reply.gifUrl && (
                                <img src={reply.gifUrl} alt="" className="max-h-40 rounded-xl my-1.5 object-contain" />
                              )}
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                <button
                                  onClick={() => handleToggleLikeComment(reply.id)}
                                  className={`flex items-center gap-1 cursor-pointer ${
                                    hasLikedReply ? 'text-blue-500 font-semibold' : 'hover:text-blue-400'
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${hasLikedReply ? 'fill-blue-500' : ''}`} />
                                  <span className="font-mono">{reply.likeCount || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div ref={commentsBottomRef} />
        </div>
      </div>

      {/* Sticky Bottom Comment Composer */}
      <div className="sticky bottom-0 z-30 bg-[#05070d]/95 backdrop-blur-md border-t border-[#111a2e] p-3 max-w-2xl w-full mx-auto shrink-0">
        {replyingToComment && (
          <div className="flex items-center justify-between px-3 py-1 bg-[#0a0f1c] rounded-xl text-xs text-slate-300 mb-2 border border-[#111a2e]">
            <span className="truncate">
              Yanıtlanan: <span className="text-blue-400 font-semibold">@{users.find((u) => u.id === replyingToComment.authorId)?.username}</span>
            </span>
            <button
              onClick={() => setReplyingToComment(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {attachedGif && (
          <div className="relative inline-block my-1 rounded-xl overflow-hidden max-h-32 bg-[#0a0f1c]">
            <img src={attachedGif} alt="" className="max-h-32 object-contain" />
            <button
              onClick={() => setAttachedGif(null)}
              className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGifPickerOpen(true)}
            className="px-2 py-1.5 bg-[#0a0f1c] hover:bg-[#111a2e] text-slate-400 hover:text-blue-400 border border-[#111a2e] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            GIF
          </button>

          <input
            type="text"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
            placeholder={
              replyingToComment
                ? `@{users.find((u) => u.id === replyingToComment.authorId)?.username} kullanıcısına yanıt ver...`
                : 'Bir yorum yaz...'
            }
            className="flex-1 px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />

          <button
            disabled={(!commentContent.trim() && !attachedGif) || submitting}
            onClick={handleSendComment}
            className="p-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelectGif={(url) => setAttachedGif(url)}
      />

      {/* Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
