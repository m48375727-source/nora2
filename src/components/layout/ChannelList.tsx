import React, { useState, useRef, useEffect } from 'react';
import type { Server, Channel, UserProfile, VoiceParticipant } from '../../types';
import {
  Hash,
  Volume2,
  MessageSquare,
  ShieldAlert,
  Lock,
  ChevronDown,
  Share2,
  Plus,
  Settings,
  Shield,
  LogOut,
  Mic,
  MicOff,
  Headphones,
  Signal,
  PhoneOff,
  Sliders
} from 'lucide-react';

interface ChannelListProps {
  server: Server;
  channels: Channel[];
  activeChannelId: string | null;
  currentUser: UserProfile;
  voiceParticipants: VoiceParticipant[];
  users: UserProfile[];
  currentVoiceState: {
    isConnected: boolean;
    channelId: string | null;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    ping: number;
    error: string | null;
  };
  onSelectChannel: (channelId: string) => void;
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenShareModal: () => void;
  onOpenServerSettings: (initialTab?: string) => void;
  onOpenCreateChannel: () => void;
  onOpenCreateRole: () => void;
  onLeaveServer: () => void;
  onOpenUserProfile: () => void;
  onOpenVoiceSettings: () => void;
  onParticipantClick: (participant: VoiceParticipant, user?: UserProfile, e?: React.MouseEvent) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  server,
  channels,
  activeChannelId,
  currentUser,
  voiceParticipants,
  users,
  currentVoiceState,
  onSelectChannel,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
  onOpenShareModal,
  onOpenServerSettings,
  onOpenCreateChannel,
  onOpenCreateRole,
  onLeaveServer,
  onOpenUserProfile,
  onOpenVoiceSettings,
  onParticipantClick
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Partition channels into groups
  const rulesChannels = channels.filter((c) => c.type === 'rules');
  const textChannels = channels.filter((c) => c.type === 'text');
  const forumChannels = channels.filter((c) => c.type === 'forum');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  const currentVoiceChannel = channels.find((c) => c.id === currentVoiceState.channelId);

  return (
    <div className="w-60 shrink-0 bg-[#05070d] border-r border-[#111a2e] flex flex-col h-full select-none">
      {/* Server Header with visible Share button and dropdown */}
      <div className="relative h-14 border-b border-[#111a2e] px-4 flex items-center justify-between shrink-0 bg-[#05070d]/50 backdrop-blur-md">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 font-bold text-white tracking-wide truncate hover:text-blue-400 transition-colors text-left flex-1"
        >
          <span className="truncate text-sm font-semibold">{server.name}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Visible Share button at top of channel list as specified */}
        <button
          onClick={onOpenShareModal}
          title="Davet Bağlantısını Paylaş"
          className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-[#2563ff] transition-all cursor-pointer ml-1 shrink-0"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Server Actions Dropdown */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-14 left-2 right-2 z-40 bg-[#0a0f1c] border border-[#111a2e] rounded-xl shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenServerSettings('overview');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-[#2563ff] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Sunucu Ayarları</span>
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCreateChannel();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-[#2563ff] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Kanal Oluştur</span>
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCreateRole();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-[#2563ff] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Rol Oluştur</span>
            </button>
            <div className="h-[1px] bg-[#111a2e] my-1" />
            <button
              onClick={() => {
                setDropdownOpen(false);
                onLeaveServer();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sunucudan Ayrıl</span>
            </button>
          </div>
        )}
      </div>

      {/* Channel Categories & List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Rules & Announcements */}
        {rulesChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Duyurular & Kurallar</span>
            </div>
            {rulesChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeChannelId === channel.id
                    ? 'bg-[#111a2e] text-blue-400'
                    : 'text-slate-300 hover:bg-[#0a0f1c] hover:text-slate-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{channel.name}</span>
                {channel.isPrivate && <Lock className="w-3 h-3 text-slate-500 ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Metin Kanalları</span>
            <button
              onClick={onOpenCreateChannel}
              title="Metin Kanalı Oluştur"
              className="hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {textChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeChannelId === channel.id
                  ? 'bg-[#111a2e] text-blue-400'
                  : 'text-slate-300 hover:bg-[#0a0f1c] hover:text-slate-100'
              }`}
            >
              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{channel.name}</span>
              {channel.isPrivate && <Lock className="w-3 h-3 text-slate-500 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Forum Channels (Twitter/X Style) */}
        <div>
          <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Forum Kanalları</span>
          </div>
          {forumChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeChannelId === channel.id
                  ? 'bg-[#111a2e] text-blue-400'
                  : 'text-slate-300 hover:bg-[#0a0f1c] hover:text-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{channel.name}</span>
              {channel.isPrivate && <Lock className="w-3 h-3 text-slate-500 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Voice Channels (Permanent, live participant tree with speaking rings) */}
        <div>
          <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>3D Sesli Mekanlar</span>
            <button
              onClick={onOpenCreateChannel}
              title="3D Sesli Mekan Oluştur"
              className="hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {voiceChannels.map((channel) => {
            const isUserInThisChannel = currentVoiceState.isConnected && currentVoiceState.channelId === channel.id;
            const participantsInChannel = voiceParticipants.filter((p) => p.channelId === channel.id);

            return (
              <div key={channel.id} className="mb-1.5">
                <button
                  onClick={() => {
                    onSelectChannel(channel.id);
                    onJoinVoice(channel.id);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isUserInThisChannel
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-[#0a0f1c] hover:text-slate-100'
                  }`}
                >
                  <Volume2 className={`w-4 h-4 shrink-0 ${isUserInThisChannel ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{channel.name}</span>
                  {channel.userLimit && channel.userLimit > 0 ? (
                    <span className="ml-auto text-[11px] font-mono text-slate-500">
                      {participantsInChannel.length}/{channel.userLimit}
                    </span>
                  ) : null}
                </button>

                {/* Live participant list under voice channel */}
                {participantsInChannel.length > 0 && (
                  <div className="ml-4 pl-2 border-l border-[#111a2e] space-y-1 mt-1">
                    {participantsInChannel.map((p) => {
                      const user = users.find((u) => u.id === p.userId) || (p.userId === currentUser.id ? currentUser : null);
                      const isCurrentUser = p.userId === currentUser.id;
                      const speaking = isCurrentUser ? currentVoiceState.isSpeaking : p.isSpeaking;

                      return (
                        <div
                          key={p.userId}
                          onClick={(e) => onParticipantClick(p, user || undefined, e)}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-slate-300 hover:bg-[#0a0f1c] hover:text-white cursor-pointer transition-colors"
                        >
                          {/* Avatar with speaking ring */}
                          <div className="relative">
                            <img
                              src={user?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                              alt=""
                              className={`w-5 h-5 rounded-full object-cover transition-all ${
                                speaking ? 'voice-speaking-ring border border-blue-400' : ''
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <span className="truncate flex-1 font-medium">
                            {user?.displayName || user?.username || 'Üye'}
                          </span>

                          {/* Mute/Deafen indicators */}
                          <div className="flex items-center gap-1 shrink-0 text-slate-400">
                            {(p.isMuted || (isCurrentUser && currentVoiceState.isMuted) || p.isServerMuted) && (
                              <MicOff className="w-3 h-3 text-red-400" />
                            )}
                            {(p.isDeafened || (isCurrentUser && currentVoiceState.isDeafened) || p.isServerDeafened) && (
                              <Headphones className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice Connected Bottom Panel (Shown while connected to voice) */}
      {currentVoiceState.isConnected && currentVoiceChannel && (
        <div className="p-3 bg-[#0a0f1c] border-t border-b border-[#111a2e] space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Signal className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider leading-none">
                  Sese Bağlandı
                </p>
                <p className="text-xs text-slate-200 font-medium truncate mt-0.5">
                  {currentVoiceChannel.name} / {server.name}
                </p>
              </div>
            </div>

            <button
              onClick={onLeaveVoice}
              title="Bağlantıyı Kes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Voice Controls */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <button
              onClick={onToggleMute}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentVoiceState.isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[#111a2e] text-slate-200 hover:bg-[#1e2d4e]'
              }`}
            >
              {currentVoiceState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{currentVoiceState.isMuted ? 'Sessiz' : 'Konuş'}</span>
            </button>

            <button
              onClick={onToggleDeafen}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentVoiceState.isDeafened
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[#111a2e] text-slate-200 hover:bg-[#1e2d4e]'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{currentVoiceState.isDeafened ? 'Sağır' : 'Dinle'}</span>
            </button>

            <button
              onClick={onOpenVoiceSettings}
              title="Ses Ayarları"
              className="p-1.5 rounded-lg bg-[#111a2e] text-slate-300 hover:text-white hover:bg-[#1e2d4e] transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* User Status Bar at the bottom */}
      <div className="h-14 bg-[#03050a] px-3 flex items-center justify-between shrink-0 border-t border-[#111a2e]">
        <button
          onClick={onOpenUserProfile}
          className="flex items-center gap-2.5 text-left truncate flex-1 hover:bg-[#0a0f1c] p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <div className="relative shrink-0">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#03050a] ${
                currentUser.status === 'online'
                  ? 'bg-emerald-500'
                  : currentUser.status === 'idle'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate leading-tight">{currentUser.displayName}</p>
            <p className="text-[11px] text-slate-400 truncate leading-none">@{currentUser.username}</p>
          </div>
        </button>

        <div className="flex items-center gap-0.5 text-slate-400 shrink-0">
          <button
            onClick={onToggleMute}
            title={currentVoiceState.isMuted ? 'Sesi Aç' : 'Sustur'}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#111a2e] transition-colors cursor-pointer"
          >
            {currentVoiceState.isMuted ? (
              <MicOff className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onOpenUserProfile}
            title="Kullanıcı Profili ve Temalar"
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#111a2e] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
