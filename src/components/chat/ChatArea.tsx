import React, { useState, useRef, useEffect } from 'react';
import type { Channel, Message, UserProfile, Role, Attachment } from '../../types';
import { MessageItem } from './MessageItem';
import { GifPicker } from './GifPicker';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import {
  Hash,
  ShieldAlert,
  Plus,
  Smile,
  Send,
  Image as ImageIcon,
  BarChart2,
  X,
  Loader2,
  Lock,
  Search
} from 'lucide-react';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  users: UserProfile[];
  roles: Role[];
  currentUser: UserProfile;
  serverOwnerId: string;
  typingUsers: { channelId: string; username: string }[];
  onSendMessage: (data: {
    content: string;
    attachments?: Attachment[];
    replyToId?: string;
    poll?: any;
  }) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onOpenCreatePoll: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  users,
  roles,
  currentUser,
  serverOwnerId,
  typingUsers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onOpenCreatePoll
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    socket.sendTyping(channel.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && attachments.length === 0) return;

    try {
      await onSendMessage({
        content: inputText.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        replyToId: replyingTo?.id
      });
      setInputText('');
      setAttachments([]);
      setReplyingTo(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          alert(`${file.name} dosyası 25MB limitini aşıyor.`);
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
      console.error('File upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          alert(`${file.name} dosyası 25MB limitini aşıyor.`);
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
      console.error('Drag upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectGif = async (gifUrl: string) => {
    await onSendMessage({
      content: '',
      attachments: [
        {
          id: `gif_${Date.now()}`,
          url: gifUrl,
          name: 'giphy.gif',
          size: 0,
          type: 'image'
        }
      ]
    });
  };

  // Determine if rules channel is restricted
  const isRulesChannel = channel.type === 'rules';
  const isOwner = currentUser.id === serverOwnerId;
  const isPostRestricted = isRulesChannel && !isOwner;

  // Filter messages if search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const currentChannelTyping = typingUsers.filter((t) => t.channelId === channel.id);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-[#000000] relative overflow-hidden"
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#000000]/85 border-2 border-dashed border-blue-500 flex flex-col items-center justify-center pointer-events-none">
          <ImageIcon className="w-12 h-12 text-blue-400 mb-2 animate-bounce" />
          <p className="text-base font-semibold text-white">Yüklemek için dosyaları buraya bırakın (25MB&apos;a kadar)</p>
        </div>
      )}

      {/* Top Channel Header */}
      <div className="h-14 border-b border-[#111a2e] px-4 flex items-center justify-between shrink-0 bg-[#05070d]/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5 truncate">
          {channel.type === 'rules' ? (
            <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <Hash className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <span className="text-sm font-bold text-white tracking-wide truncate">{channel.name}</span>
          {channel.topic && (
            <>
              <div className="w-[1px] h-4 bg-[#111a2e] mx-1 shrink-0" />
              <span className="text-xs text-slate-400 truncate max-w-md">{channel.topic}</span>
            </>
          )}
        </div>

        {/* Message Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Mesajlarda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-[#0a0f1c] border border-[#111a2e] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2563ff] w-36 sm:w-48 transition-all"
          />
        </div>
      </div>

      {/* Message History List */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {/* Channel Welcome Banner */}
        <div className="px-4 py-6 mb-4 border-b border-[#111a2e]/60">
          <div className="w-14 h-14 rounded-2xl bg-[#0a0f1c] border border-[#111a2e] flex items-center justify-center mb-3 text-blue-400 shadow-lg shadow-blue-500/10">
            {channel.type === 'rules' ? <ShieldAlert className="w-7 h-7" /> : <Hash className="w-7 h-7" />}
          </div>
          <h2 className="text-xl font-bold text-white">#{channel.name} kanalına hoş geldiniz!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Bu #{channel.name} kanalının başlangıcıdır.
            {channel.topic ? ` — ${channel.topic}` : ''}
          </p>
        </div>

        {filteredMessages.map((msg) => {
          const author = users.find((u) => u.id === msg.authorId);
          const authorRoles = roles.filter((r) => r.serverId === channel.serverId);

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              author={author}
              authorRoles={authorRoles}
              currentUserId={currentUser.id}
              canManageMessages={isOwner}
              onReply={(m) => setReplyingTo(m)}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onToggleReaction={onToggleReaction}
              onOpenLightbox={(url) => setLightboxImage(url)}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {currentChannelTyping.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-slate-400 font-medium flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>
            {currentChannelTyping.map((t) => t.username).join(', ')}{' '}
            yazıyor...
          </span>
        </div>
      )}

      {/* Message Composer Area */}
      <div className="p-3 bg-[#000000] border-t border-[#111a2e] shrink-0">
        {/* Rules channel restricted banner */}
        {isPostRestricted ? (
          <div className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>#{channel.name} kanalında yalnızca sunucu sahibi mesaj gönderebilir.</span>
          </div>
        ) : (
          <div className="bg-[#05070d] border border-[#111a2e] focus-within:border-blue-500/60 rounded-2xl p-2 transition-all shadow-xl">
            {/* Replying banner */}
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#0a0f1c] rounded-xl text-xs text-slate-300 border border-[#111a2e]">
                <div className="truncate flex items-center gap-1.5">
                  <span className="text-slate-500">Yanıtlanan:</span>
                  <span className="font-semibold text-blue-400">
                    @{users.find((u) => u.id === replyingTo.authorId)?.displayName || 'Üye'}
                  </span>
                  <span className="truncate max-w-xs text-slate-400 italic">
                    {replyingTo.content}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attached files preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group p-1.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl flex items-center gap-2 max-w-xs"
                  >
                    {att.type === 'image' ? (
                      <img src={att.url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#111a2e] flex items-center justify-center text-blue-400 font-bold text-xs">
                        DOSYA
                      </div>
                    )}
                    <div className="truncate flex-1">
                      <p className="text-xs text-white truncate font-medium">{att.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {Math.round(att.size / 1024)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`#${channel.name} kanalına mesaj yaz...`}
              className="w-full px-3 py-1.5 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none resize-none max-h-32"
            />

            {/* Composer Action Buttons Bar */}
            <div className="flex items-center justify-between pt-1 px-1 border-t border-[#111a2e]/60">
              <div className="flex items-center gap-1">
                {/* File Upload Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Dosya ekle (fotoğraf, video, belge 25MB'a kadar)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0a0f1c] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Create Poll Button */}
                <button
                  type="button"
                  onClick={onOpenCreatePoll}
                  title="Anket Oluştur"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#0a0f1c] transition-colors cursor-pointer"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* GIF Button (Directly next to attachment and emoji buttons) */}
                <button
                  type="button"
                  onClick={() => setGifPickerOpen(!gifPickerOpen)}
                  title="Giphy GIF Seçiciyi Aç"
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-blue-400 hover:bg-[#0a0f1c] transition-colors cursor-pointer"
                >
                  GIF
                </button>

                {/* Emoji Picker Button */}
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                  title="Emoji Ekle"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0a0f1c] transition-colors cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Send Button */}
              <button
                type="button"
                disabled={(!inputText.trim() && attachments.length === 0) || uploading}
                onClick={handleSend}
                className="py-1.5 px-3 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:hover:bg-[#2563ff] flex items-center gap-1.5 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Gönder</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelectGif={handleSelectGif}
      />

      {/* Emoji Quick Bar if toggled */}
      {emojiPickerOpen && (
        <div className="absolute bottom-20 left-20 z-40 bg-[#0a0f1c] border border-[#111a2e] rounded-xl p-3 shadow-2xl flex flex-wrap gap-2 w-64 animate-in fade-in zoom-in-95 duration-100">
          {['😄', '🚀', '🔥', '⚡', '✨', '👍', '❤️', '💯', '🎮', '🎉', '👀', '👏', '🤖', '🎧', '💎', '💡'].map((em) => (
            <button
              key={em}
              onClick={() => {
                setInputText((prev) => prev + em);
                setEmojiPickerOpen(false);
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-[#111a2e] rounded-lg text-lg transition-colors cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      )}

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
