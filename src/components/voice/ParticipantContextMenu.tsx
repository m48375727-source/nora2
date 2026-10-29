import React, { useState, useEffect, useRef } from 'react';
import type { VoiceParticipant, UserProfile } from '../../types';
import { voice } from '../../lib/voice';
import { socket } from '../../lib/socket';
import {
  Volume2,
  VolumeX,
  MicOff,
  Headphones,
  PhoneOff,
  UserCheck
} from 'lucide-react';

interface ParticipantContextMenuProps {
  participant: VoiceParticipant;
  user?: UserProfile;
  canModerate: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const ParticipantContextMenu: React.FC<ParticipantContextMenuProps> = ({
  participant,
  user,
  canModerate,
  position,
  onClose,
  onOpenProfile
}) => {
  const [volume, setVolume] = useState(voice.getUserVolume(participant.userId));
  const [isLocallyMuted, setIsLocallyMuted] = useState(voice.isUserLocallyMuted(participant.userId));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    voice.setUserVolume(participant.userId, newVol);
  };

  const handleToggleLocalMute = () => {
    voice.toggleLocalMuteUser(participant.userId);
    setIsLocallyMuted(!isLocallyMuted);
  };

  const handleServerMute = () => {
    socket.modVoiceAction(participant.userId, 'SERVER_MUTE');
    onClose();
  };

  const handleServerDeafen = () => {
    socket.modVoiceAction(participant.userId, 'SERVER_DEAFEN');
    onClose();
  };

  const handleDisconnect = () => {
    socket.modVoiceAction(participant.userId, 'DISCONNECT');
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        top: Math.min(position.y, window.innerHeight - 300),
        left: Math.min(position.x, window.innerWidth - 240)
      }}
      className="fixed z-50 w-56 bg-[#05070d] border border-[#111a2e] rounded-2xl shadow-2xl p-2 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header Info */}
      <div className="px-3 py-2 border-b border-[#111a2e] mb-1">
        <p className="font-bold text-white truncate">{user?.displayName || 'Üye'}</p>
        <p className="text-[10px] text-slate-500 font-mono">@{user?.username}</p>
      </div>

      {user && (
        <button
          onClick={() => {
            onOpenProfile(user);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-[#0a0f1c] hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Profili Görüntüle</span>
        </button>
      )}

      {/* User Volume Slider (0 - 200%) */}
      <div className="px-3 py-2 bg-[#0a0f1c] rounded-xl my-1 border border-[#111a2e]/60">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            Kullanıcı Sesi
          </span>
          <span className="font-mono tabular-nums text-blue-400">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
      </div>

      {/* Local Mute */}
      <button
        onClick={handleToggleLocalMute}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
          isLocallyMuted
            ? 'bg-red-500/10 text-red-400'
            : 'text-slate-200 hover:bg-[#0a0f1c] hover:text-white'
        }`}
      >
        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
        <span>{isLocallyMuted ? 'Benim için sesi aç' : 'Benim için sustur'}</span>
      </button>

      {/* Moderator Actions */}
      {canModerate && (
        <>
          <div className="h-[1px] bg-[#111a2e] my-1" />
          <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Yönetim
          </p>

          <button
            onClick={handleServerMute}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-[#0a0f1c] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <MicOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Sunucuda Sustur</span>
          </button>

          <button
            onClick={handleServerDeafen}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-[#0a0f1c] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <span>Sunucuda Sağırlaştır</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-colors cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5 text-red-400" />
            <span>Bağlantısını Kes</span>
          </button>
        </>
      )}
    </div>
  );
};
