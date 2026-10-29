import React, { useState, useRef, useEffect } from 'react';
import type { Channel, ForumPost, UserProfile, Role, Attachment, Poll } from '../../types';
import { api } from '../../lib/api';
import { PollWidget } from '../chat/PollWidget';
import { GifPicker } from '../chat/GifPicker';
import {
  MessageSquare,
  Repeat2,
  Heart,
  Bookmark,
  Share2,
  Image as ImageIcon,
  Smile,
  BarChart2,
  MoreHorizontal,
  Pin,
  Trash2,
  Edit2,
  X,
  Loader2,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface ForumFeedProps {
  channel: Channel;
  posts: ForumPost[];
  users: UserProfile[];
  roles: Role[];
  currentUser: UserProfile;
  serverOwnerId: string;
  newPostsCount: number;
  onClearNewPosts: () => void;
  onOpenThread: (postId: string) => void;
  onOpenCreatePoll: () => void;
  onOpenUserProfile: (user: UserProfile) => void;
}

export const ForumFeed: React.FC<ForumFeedProps> = ({
  channel,
  posts,
  users,
  roles,
  currentUser,
  serverOwnerId,
  newPostsCount,
  onClearNewPosts,
  onOpenThread,
  onOpenCreatePoll,
  onOpenUserProfile
}) => {
  const [activeTab, setActiveTab] = useState<'latest' | 'top'>('latest');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 1000;
  const charsRemaining = MAX_CHARS - content.length;

  // Sorting
  const sortedPosts = [...posts].sort((a, b) => {
    if (activeTab === 'top') {
      const scoreA = (a.likeCount || 0) * 2 + (a.replyCount || 0) * 3 + (a.repostCount || 0);
      const scoreB = (b.likeCount || 0) * 2 + (b.replyCount || 0) * 3 + (b.repostCount || 0);
      return scoreB - scoreA;
    }
    // Latest: pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handlePost = async () => {
    if (!content.trim() && attachments.length === 0 && !gifUrl) return;
    if (content.length > MAX_CHARS) return;

    setIsPosting(true);
    try {
      await api.createForumPost(channel.id, {
        content: content.trim(),
        media: attachments.map((a) => ({ url: a.url, type: a.type === 'video' ? 'video' : 'image' })),
        gifUrl: gifUrl || undefined
      });
      setContent('');
      setAttachments([]);
      setGifUrl(null);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          alert(`Dosya 25MB limitini aşıyor.`);
          continue;
        }
        const res = await api.uploadFile(file);
        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${i}`,
            url: res.url,
            name: res.name,
            size: res.size,
            type: res.type
          }
        ]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleLikePost(postId);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleToggleRepost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleRepost(postId);
    } catch (err) {
      console.error('Repost failed:', err);
    }
  };

  const handleToggleBookmark = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleBookmark(postId);
    } catch (err) {
      console.error('Bookmark failed:', err);
    }
  };

  const handleCopyPostLink = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/server/${channel.serverId}/forum/${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu gönderiyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteForumPost(postId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleTogglePin = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.togglePinPost(postId);
    } catch (err) {
      console.error('Pin failed:', err);
    }
  };

  const handleSaveEdit = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) return;
    try {
      await api.editForumPost(postId, editContent.trim());
      setEditingPostId(null);
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}sn`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return `${Math.floor(diff / 86400)}g`;
  };

  // Render clickable hashtags, @mentions, and URLs
  const renderFormattedContent = (text: string) => {
    const tokenRegex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_-]+)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, i) => {
      if (part.startsWith('http')) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            {part} <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-blue-400 font-semibold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-400 font-medium bg-blue-500/10 px-1 py-0.5 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-y-auto">
      {/* Forum Channel Header */}
      <div className="sticky top-0 z-30 bg-[#05070d]/85 backdrop-blur-md border-b border-[#111a2e] px-4 py-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>#{channel.name}</span>
          </h2>
          <p className="text-xs text-slate-400">{channel.topic || 'Topluluk akışı ve tartışmalar'}</p>
        </div>

        {/* Latest vs Top Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'latest'
                ? 'bg-[#2563ff] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            En Yeni
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'top'
                ? 'bg-[#2563ff] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            En Popüler
          </button>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Top Composer: X/Twitter style "What's happening?" */}
        <div className="bg-[#05070d] border border-[#111a2e] rounded-2xl p-4 shadow-xl">
          <div className="flex gap-3">
            <img
              src={currentUser.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Neler oluyor?"
                rows={3}
                className="w-full bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
              />

              {/* Uploaded attachments preview */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 my-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative rounded-xl overflow-hidden bg-[#0a0f1c] max-h-48 group">
                      <img src={att.url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* GIF Preview */}
              {gifUrl && (
                <div className="relative rounded-xl overflow-hidden my-2 max-h-60 bg-[#0a0f1c] inline-block">
                  <img src={gifUrl} alt="GIF" className="max-h-60 rounded-xl object-contain" />
                  <button
                    onClick={() => setGifUrl(null)}
                    className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Composer Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-[#111a2e] mt-2">
                <div className="flex items-center gap-1 text-slate-400">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Medya"
                    className="p-2 hover:bg-[#0a0f1c] hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setGifPickerOpen(true)}
                    title="GIF"
                    className="px-2 py-1 hover:bg-[#0a0f1c] hover:text-blue-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    GIF
                  </button>

                  <button
                    onClick={onOpenCreatePoll}
                    title="Anket"
                    className="p-2 hover:bg-[#0a0f1c] hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character Counter (turns red near 1000 limit) */}
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      charsRemaining < 50
                        ? 'text-red-400 font-bold'
                        : charsRemaining < 150
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {charsRemaining}
                  </span>

                  <button
                    disabled={(!content.trim() && attachments.length === 0 && !gifUrl) || isPosting}
                    onClick={handlePost}
                    className="px-4 py-1.5 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Paylaş'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live "Show N new posts" notification pill */}
        {newPostsCount > 0 && (
          <div className="flex justify-center sticky top-16 z-20">
            <button
              onClick={onClearNewPosts}
              className="px-4 py-1.5 bg-[#2563ff] hover:bg-[#3b82f6] text-white text-xs font-semibold rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer animate-bounce"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{newPostsCount} yeni gönderiyi göster</span>
            </button>
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-3">
          {sortedPosts.map((post) => {
            const author = users.find((u) => u.id === post.authorId);
            const isAuthor = post.authorId === currentUser.id;
            const isOwner = currentUser.id === serverOwnerId;
            const canManage = isAuthor || isOwner;
            const hasLiked = post.likes.includes(currentUser.id);
            const hasReposted = post.reposts.includes(currentUser.id);
            const hasBookmarked = post.bookmarks.includes(currentUser.id);

            return (
              <article
                key={post.id}
                onClick={() => onOpenThread(post.id)}
                className="bg-[#05070d] hover:bg-[#070b14] border border-[#111a2e] hover:border-[#1e2d4e] rounded-2xl p-4 transition-all cursor-pointer group shadow-lg"
              >
                {/* Pinned pill if pinned */}
                {post.isPinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 mb-2">
                    <Pin className="w-3 h-3 rotate-45" />
                    <span>Sabitlenmiş Gönderi</span>
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Author Avatar */}
                  <img
                    src={author?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                    alt=""
                    onClick={(e) => {
                      e.stopPropagation();
                      if (author) onOpenUserProfile(author);
                    }}
                    className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Header with name, handle, time, menu */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate text-xs">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (author) onOpenUserProfile(author);
                          }}
                          className="font-bold text-white hover:underline truncate cursor-pointer"
                        >
                          {author?.displayName || author?.username || 'Üye'}
                        </span>
                        <span className="text-slate-500 truncate">@{author?.username}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500 font-mono">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                        {post.editedAt && (
                          <span className="text-[10px] text-slate-500 italic">(düzenlendi)</span>
                        )}
                      </div>

                      {/* Three-dot dropdown menu */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                          <button
                            onClick={(e) => handleTogglePin(post.id, e)}
                            title={post.isPinned ? 'Sabitlemeyi Kaldır' : 'Kanala Sabitle'}
                            className={`p-1 rounded-lg hover:bg-[#111a2e] transition-colors cursor-pointer ${
                              post.isPinned ? 'text-blue-400' : 'text-slate-500 hover:text-white'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAuthor && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPostId(post.id);
                              setEditContent(post.content);
                            }}
                            title="Düzenle"
                            className="p-1 text-slate-500 hover:text-white hover:bg-[#111a2e] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={(e) => handleDeletePost(post.id, e)}
                            title="Sil"
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content or Edit Form */}
                    {editingPostId === post.id ? (
                      <div className="my-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2.5 bg-[#0a0f1c] border border-blue-500 rounded-xl text-white text-xs focus:outline-none"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleSaveEdit(post.id, e)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="px-3 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {renderFormattedContent(post.content)}
                      </p>
                    )}

                    {/* Media Grid (1-4 images, lightbox on click) */}
                    {post.media && post.media.length > 0 && (
                      <div
                        className={`grid gap-2 my-2.5 rounded-2xl overflow-hidden ${
                          post.media.length === 1
                            ? 'grid-cols-1'
                            : post.media.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2'
                        }`}
                      >
                        {post.media.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(item.url);
                            }}
                            className="relative max-h-80 bg-[#0a0f1c] overflow-hidden rounded-xl cursor-pointer"
                          >
                            {item.type === 'video' ? (
                              <video src={item.url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img
                                src={item.url}
                                alt=""
                                className="w-full h-full object-cover hover:scale-102 transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GIF Image */}
                    {post.gifUrl && (
                      <div className="rounded-xl overflow-hidden my-2 max-h-72 inline-block bg-[#0a0f1c]">
                        <img
                          src={post.gifUrl}
                          alt="GIF"
                          className="max-h-72 rounded-xl object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Poll Block */}
                    {post.poll && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <PollWidget
                          poll={post.poll}
                          currentUserId={currentUser.id}
                          canManage={canManage}
                        />
                      </div>
                    )}

                    {/* Action Bar: Reply, Repost, Like, Bookmark, Share */}
                    <div className="flex items-center justify-between text-slate-400 pt-3 border-t border-[#111a2e]/60 mt-3 max-w-md">
                      {/* Reply button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenThread(post.id);
                        }}
                        className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors group cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-mono tabular-nums">{post.replyCount || 0}</span>
                      </button>

                      {/* Repost button */}
                      <button
                        onClick={(e) => handleToggleRepost(post.id, e)}
                        className={`flex items-center gap-1.5 text-xs transition-colors group cursor-pointer ${
                          hasReposted ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
                        }`}
                      >
                        <Repeat2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-mono tabular-nums">{post.repostCount || 0}</span>
                      </button>

                      {/* Like button (animated blue heart as specified) */}
                      <button
                        onClick={(e) => handleToggleLike(post.id, e)}
                        className={`flex items-center gap-1.5 text-xs transition-all group cursor-pointer ${
                          hasLiked ? 'text-blue-500 font-semibold' : 'hover:text-blue-400'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform group-hover:scale-125 ${
                            hasLiked ? 'fill-blue-500 text-blue-500' : ''
                          }`}
                        />
                        <span className="font-mono tabular-nums">{post.likeCount || 0}</span>
                      </button>

                      {/* Bookmark button */}
                      <button
                        onClick={(e) => handleToggleBookmark(post.id, e)}
                        className={`p-1 text-xs transition-colors group cursor-pointer ${
                          hasBookmarked ? 'text-blue-400 font-semibold' : 'hover:text-blue-400'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${hasBookmarked ? 'fill-blue-400' : ''}`}
                        />
                      </button>

                      {/* Share / Copy Link button */}
                      <button
                        onClick={(e) => handleCopyPostLink(post.id, e)}
                        title="Gönderi bağlantısını kopyala"
                        className="p-1 hover:text-white transition-colors cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {copiedPostId === post.id && (
                      <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                        Bağlantı panoya kopyalandı!
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelectGif={(url) => setGifUrl(url)}
      />

      {/* Lightbox Modal */}
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
