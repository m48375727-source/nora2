import React, { useState } from 'react';
import type { Message, UserProfile, Role } from '../../types';
import { PollWidget } from './PollWidget';
import {
  Reply,
  Smile,
  MoreHorizontal,
  Edit2,
  Trash2,
  Download,
  FileText,
  CornerDownRight,
  ExternalLink
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  author?: UserProfile;
  authorRoles: Role[];
  currentUserId: string;
  canManageMessages: boolean;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenLightbox: (imageUrl: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '⚡', '🚀', '😄'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  author,
  authorRoles,
  currentUserId,
  canManageMessages,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenLightbox
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isAuthor = message.authorId === currentUserId;
  const canDelete = isAuthor || canManageMessages;
  const highestRole = authorRoles[0];

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple Markdown and @mention / link rendering
  const renderFormattedText = (text: string) => {
    // URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            {part} <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }

      // Check for @mentions
      const mentionParts = part.split(/(@[a-zA-Z0-9_-]+)/g);
      return mentionParts.map((m, mi) => {
        if (m.startsWith('@')) {
          return (
            <span
              key={mi}
              className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium inline-block"
            >
              {m}
            </span>
          );
        }
        return m;
      });
    });
  };

  return (
    <div className="relative group px-4 py-2 hover:bg-[#05070d]/60 transition-colors rounded-xl flex gap-3.5 my-0.5">
      {/* Quick hover action bar */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-[#0a0f1c] border border-[#111a2e] rounded-lg p-1 shadow-xl z-20">
        {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
          <button
            key={emoji}
            onClick={() => onToggleReaction(message.id, emoji)}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#111a2e] rounded text-sm transition-colors"
          >
            {emoji}
          </button>
        ))}

        <div className="w-[1px] h-4 bg-[#111a2e] mx-0.5" />

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Tepki Ekle"
          className="p-1 hover:bg-[#111a2e] text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          onClick={() => onReply(message)}
          title="Yanıtla"
          className="p-1 hover:bg-[#111a2e] text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
        >
          <Reply className="w-4 h-4" />
        </button>

        {isAuthor && (
          <button
            onClick={() => setIsEditing(true)}
            title="Mesajı Düzenle"
            className="p-1 hover:bg-[#111a2e] text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(message.id)}
            title="Mesajı Sil"
            className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Emoji Picker Popup if toggled */}
      {showEmojiPicker && (
        <div className="absolute right-4 top-6 z-30 bg-[#0a0f1c] border border-[#111a2e] rounded-xl p-2 shadow-2xl flex flex-wrap gap-1.5 w-56">
          {['👍', '❤️', '🔥', '⚡', '🚀', '😄', '🎉', '👀', '💯', '👏', '✨', '🎮'].map((em) => (
            <button
              key={em}
              onClick={() => {
                onToggleReaction(message.id, em);
                setShowEmojiPicker(false);
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-[#111a2e] rounded-lg text-lg transition-colors"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Author Avatar */}
      <img
        src={author?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
        alt=""
        className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
        referrerPolicy="no-referrer"
      />

      <div className="flex-1 min-w-0">
        {/* Reply Context snippet */}
        {message.replyToMessage && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <CornerDownRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-blue-400">@{message.replyToMessage.authorName}</span>
            <span className="truncate max-w-sm text-slate-400 italic">
              {message.replyToMessage.content || 'ek / anket'}
            </span>
          </div>
        )}

        {/* Message Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-sm font-semibold tracking-wide"
            style={{ color: highestRole?.color || '#ffffff' }}
          >
            {author?.displayName || author?.username || 'Üye'}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-[10px] text-slate-500 italic">(düzenlendi)</span>
          )}
        </div>

        {/* Message Content or Edit Input */}
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2.5 bg-[#0a0f1c] border border-blue-500 rounded-xl text-white text-sm focus:outline-none"
              rows={2}
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Kaydet
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                İptal
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
            {renderFormattedText(message.content)}
          </p>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {message.attachments.map((att) => {
              if (att.type === 'image') {
                return (
                  <div
                    key={att.id}
                    onClick={() => onOpenLightbox(att.url)}
                    className="relative max-w-sm max-h-72 rounded-xl overflow-hidden border border-[#111a2e] bg-[#0a0f1c] cursor-pointer group"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                );
              }

              if (att.type === 'video') {
                return (
                  <div key={att.id} className="max-w-md rounded-xl overflow-hidden border border-[#111a2e] bg-black">
                    <video src={att.url} controls className="w-full max-h-72 object-contain" />
                  </div>
                );
              }

              if (att.type === 'audio') {
                return (
                  <div key={att.id} className="w-full max-w-sm p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl">
                    <p className="text-xs text-slate-300 font-medium mb-1 truncate">{att.name}</p>
                    <audio src={att.url} controls className="w-full" />
                  </div>
                );
              }

              return (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl max-w-xs"
                >
                  <FileText className="w-7 h-7 text-blue-400 shrink-0" />
                  <div className="truncate flex-1">
                    <p className="text-xs font-semibold text-white truncate">{att.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {Math.round(att.size / 1024)} KB
                    </p>
                  </div>
                  <a
                    href={att.url}
                    download={att.name}
                    className="p-1.5 hover:bg-[#111a2e] text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Poll Widget */}
        {message.poll && (
          <PollWidget
            poll={message.poll}
            currentUserId={currentUserId}
            canManage={canManageMessages}
          />
        )}

        {/* Reaction Chips */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.reactions.map((reaction) => {
              const hasReacted = reaction.userIds.includes(currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onToggleReaction(message.id, reaction.emoji)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    hasReacted
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                      : 'bg-[#0a0f1c] border-[#111a2e] text-slate-300 hover:bg-[#111a2e]'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-mono tabular-nums text-[11px]">{reaction.userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
