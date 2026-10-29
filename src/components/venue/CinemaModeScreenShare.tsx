/**
 * CinemaModeScreenShare.tsx
 * 
 * Ultra-realistic, high-end Cinema Mode Screen Sharing interface.
 * Design language:
 * - Clean dark cinematic interface with deep black (#0A0A0B) and soft charcoal backgrounds.
 * - Subtle film grain overlay texture.
 * - Elegant gold/amber accent lighting (#f59e0b, #fbbf24, #d97706) for a premium, theatrical feel.
 * - Central content area with rounded corners, glowing thin gold border, cinematic letterbox effect, and soft vignette.
 * - Minimal semi-transparent top bar with gold-ringed sharer avatar, Cinema Mode film strip badge, and 4K quality indicator.
 * - Floating glassmorphism bottom control bar with heavy blur, Theater Focus button, Cinema Audio toggle, and reaction buttons with gold particle bursts.
 * - Collapsible slim vertical Cinema Audience panel on the right with pulsing gold presence indicators.
 * - Zero Discord branding, 100% bespoke luxury theatrical design.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../../types';
import {
  Film,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Headphones,
  Maximize2,
  Minimize2,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Radio,
  Share2,
  Settings,
  Tv,
  Check
} from 'lucide-react';

interface CinemaModeScreenShareProps {
  sharerName: string | null;
  sharerAvatar?: string;
  videoStream: MediaStream | null;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  currentVoiceState: {
    isConnected: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
  };
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeaveCinema: () => void;
  onStopSharing?: () => void;
  isSharing: boolean;
}

interface FloatingParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export const CinemaModeScreenShare: React.FC<CinemaModeScreenShareProps> = ({
  sharerName,
  sharerAvatar,
  videoStream,
  currentUser,
  allUsers,
  currentVoiceState,
  onToggleMute,
  onToggleDeafen,
  onLeaveCinema,
  onStopSharing,
  isSharing
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cinemaAudio, setCinemaAudio] = useState(true);
  const [volume, setVolume] = useState(85);
  const [isMutedLocal, setIsMutedLocal] = useState(false);
  const [isAudienceOpen, setIsAudienceOpen] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'4K' | '1080p'>('4K');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [theaterFocus, setTheaterFocus] = useState(false);

  // Reaction counters
  const [reactionCounts, setReactionCounts] = useState({
    popcorn: 1240,
    clap: 984,
    heart: 2150
  });

  // Floating gold particles
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  // Attach MediaStream to video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(console.error);
    }
  }, [videoStream]);

  // Audio volume adjustment
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMutedLocal ? 0 : volume / 100;
    }
  }, [volume, isMutedLocal]);

  // Trigger Reaction with particle fireworks
  const triggerReaction = (type: 'popcorn' | 'clap' | 'heart', emoji: string, e: React.MouseEvent) => {
    setReactionCounts(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spawnX = rect.left + rect.width / 2;
    const spawnY = rect.top;

    const newParticles: FloatingParticle[] = Array.from({ length: 7 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      emoji,
      x: spawnX + (Math.random() - 0.5) * 60,
      y: spawnY - 10 - Math.random() * 30,
      size: 18 + Math.random() * 12,
      rotation: (Math.random() - 0.5) * 45
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 1800);
  };

  const displayName = sharerName || currentUser.displayName || currentUser.username;
  const avatarUrl =
    sharerAvatar ||
    currentUser.avatarUrl ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${displayName}`;

  // Audience list derived from allUsers
  const audienceList = allUsers.length > 0 ? allUsers : [currentUser];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0B] text-slate-100 select-none overflow-hidden font-sans">
      {/* 1. Subtle Film Grain & Volumetric Amber Atmosphere Texture */}
      <div
        className="pointer-events-none absolute inset-0 z-40 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(rgba(245, 158, 11, 0.15) 1px, transparent 1px)`,
          backgroundSize: '4px 4px'
        }}
      />

      {/* Volumetric ambient backlight glow behind screen */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-amber-600/10 via-amber-500/15 to-transparent blur-[140px] rounded-full" />

      {/* 2. Floating Golden Particles Container */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute animate-float-up pointer-events-none drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              fontSize: `${p.size}px`,
              transform: `rotate(${p.rotation}deg)`
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* 3. Top Bar (Minimal, Semi-Transparent, Theatrical) */}
      <header className="relative z-30 flex items-center justify-between px-6 py-3.5 backdrop-blur-xl bg-[#0A0A0B]/85 border-b border-amber-500/10 transition-all">
        {/* Left: Sharer Info & Cinema Mode Badge */}
        <div className="flex items-center gap-3.5">
          {/* Avatar with Thin Gold Glowing Ring */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover rounded-full bg-[#121316]"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0A0A0B]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-wide text-white drop-shadow-sm">
                {displayName}
              </span>

              {/* Elegant Cinema Mode Film Strip Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Film className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Cinema Mode
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Canlı Ekran Yayını • 60 FPS Kayıpsız Akış
            </span>
          </div>
        </div>

        {/* Right: Technical Badges & Discreet Controls */}
        <div className="flex items-center gap-3">
          {/* 4K Quality Badge */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14161b] hover:bg-[#1a1d24] border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <span>{selectedQuality === '4K' ? '4K ULTRA HD • HDR' : '1080p 60FPS'}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute right-0 mt-2 w-44 py-1.5 bg-[#121316] border border-amber-500/30 rounded-xl shadow-2xl backdrop-blur-xl z-50">
                <button
                  onClick={() => {
                    setSelectedQuality('4K');
                    setShowQualityMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
                >
                  <span>4K Ultra HD (HDR)</span>
                  {selectedQuality === '4K' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button
                  onClick={() => {
                    setSelectedQuality('1080p');
                    setShowQualityMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
                >
                  <span>1080p Full HD (60fps)</span>
                  {selectedQuality === '1080p' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Dolby Atmos / Cinema Audio Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14161b] border border-[#232733] text-slate-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Dolby Atmos</span>
          </div>

          {/* Audience Counter Pill */}
          <button
            onClick={() => setIsAudienceOpen(!isAudienceOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14161b] hover:bg-[#1c1f29] border border-[#232733] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="İzleyici Listesini Göster / Gizle"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{audienceList.length + 23} İzleyici</span>
          </button>

          {/* Discreet Leave Cinema Button */}
          <button
            onClick={onLeaveCinema}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16181f] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-[#232733] hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
            title="Sinema Görünümünden Ayrıl"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sinemadan Ayrıl</span>
          </button>
        </div>
      </header>

      {/* 4. Central Viewing Area + Collapsible Audience Sidebar */}
      <div className="relative flex-1 flex overflow-hidden p-4 sm:p-6 gap-6 items-center justify-center">
        {/* Main Cinema Screen Container */}
        <div
          className={`relative flex-1 flex flex-col items-center justify-center h-full max-h-[85vh] transition-all duration-300 ${
            theaterFocus ? 'scale-105' : 'scale-100'
          }`}
        >
          {/* Cinema Screen Frame with Glowing Gold Border and Volumetric Shadow */}
          <div className="relative w-full max-w-6xl aspect-video bg-[#050608] rounded-2xl sm:rounded-3xl p-1 sm:p-1.5 border border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.22),_0_0_120px_rgba(245,158,11,0.08)] flex flex-col justify-between overflow-hidden">
            {/* Cinematic Letterbox Top Black Bar */}
            <div className="w-full h-4 sm:h-7 bg-gradient-to-b from-black via-black to-transparent z-20 shrink-0 pointer-events-none" />

            {/* Inner Video Stream Content Area */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
              {/* Soft Vignette Overlay for True Theater Depth */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.88)'
                }}
              />

              {videoStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={isMutedLocal}
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                /* Fallback Cinematic Test Pattern / Ready Screen */
                <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                    <Film className="w-8 h-8 text-amber-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {displayName} Ekranını Paylaşıyor
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Ultra yüksek çözünürlüklü 4K HDR sinema projeksiyonu aktif. Lütfen arkanıza yaslanın ve keyfini çıkarın.
                  </p>
                </div>
              )}
            </div>

            {/* Cinematic Letterbox Bottom Black Bar */}
            <div className="w-full h-4 sm:h-7 bg-gradient-to-t from-black via-black to-transparent z-20 shrink-0 pointer-events-none" />
          </div>
        </div>

        {/* 5. Collapsible Slim Vertical Cinema Audience Panel */}
        {isAudienceOpen && (
          <aside className="w-64 h-full max-h-[85vh] bg-[#0E0F14]/90 backdrop-blur-2xl border border-amber-500/20 rounded-2xl p-4 flex flex-col shadow-2xl z-30 shrink-0 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Audience Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/15">
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest uppercase text-amber-400">
                  Cinema Audience
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">
                    CANLI {audienceList.length + 23} Kişi
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsAudienceOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Paneli Kapat"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Audience Member List with Pulsing Gold Presence Dots */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2">
              {/* Sharer Item */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden p-[1.5px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white truncate max-w-[110px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">Yayıncı</span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-ping" />
              </div>

              {/* Viewers */}
              {audienceList.map((user, idx) => (
                <div
                  key={user.id + idx}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`}
                      alt={user.displayName}
                      className="w-7 h-7 rounded-full bg-[#121316] object-cover ring-1 ring-white/10 group-hover:ring-amber-400/50 transition-all"
                    />
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate max-w-[120px]">
                      {user.displayName || user.username}
                      {user.id === currentUser.id ? ' (Sen)' : ''}
                    </span>
                  </div>

                  {/* Pulsing Gold Presence Dot */}
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
                </div>
              ))}
            </div>

            {/* Invite Button at Bottom of Sidebar */}
            <div className="pt-3 border-t border-amber-500/15">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Sinemaya Davet Et</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* 6. Floating Glassmorphism Bottom Control Dock */}
      <footer className="relative z-30 pb-6 px-4 flex justify-center pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6 px-6 py-3.5 rounded-3xl bg-[#0F1015]/85 backdrop-blur-2xl border border-amber-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.9),_0_0_30px_rgba(245,158,11,0.12)]">
          {/* Left Controls: Audio / Mic / Spatial */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mic Toggle */}
            <button
              onClick={onToggleMute}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                currentVoiceState.isMuted
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-[#181920] hover:bg-[#20222c] border-[#2c303f] text-slate-200'
              }`}
              title={currentVoiceState.isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            >
              {currentVoiceState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isCameraActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-[#181920] hover:bg-[#20222c] border-[#2c303f] text-slate-300'
              }`}
              title="Kamera Aç / Kapat"
            >
              {isCameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            {/* Special Cinema Audio (Spatial/Immersive Surround) Button */}
            <button
              onClick={() => setCinemaAudio(!cinemaAudio)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                cinemaAudio
                  ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/15 border-amber-500/50 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                  : 'bg-[#181920] hover:bg-[#20222c] border-[#2c303f] text-slate-400'
              }`}
              title="Mekânsal Sinema Sesi (Spatial Audio) Modunu Değiştir"
            >
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>Cinema Audio</span>
              {cinemaAudio && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
            </button>
          </div>

          {/* Center: Theater Focus Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheaterFocus(!theaterFocus)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs tracking-wider uppercase shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:shadow-[0_0_36px_rgba(245,158,11,0.7)] transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 stroke-[2.5]" />
              <span>{theaterFocus ? 'Normal Görünüm' : 'Theater Focus'}</span>
            </button>
          </div>

          {/* Right Controls: Reactions with Gold Particle Bursts & Stop Sharing */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reaction: Popcorn */}
            <button
              onClick={e => triggerReaction('popcorn', '🍿', e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181920] hover:bg-amber-500/15 border border-[#2c303f] hover:border-amber-500/40 text-xs font-medium text-slate-200 transition-all cursor-pointer active:scale-95"
              title="Patlamış Mısır Gönder"
            >
              <span className="text-base">🍿</span>
              <span className="text-[11px] font-bold text-amber-300">{reactionCounts.popcorn}</span>
            </button>

            {/* Reaction: Clap */}
            <button
              onClick={e => triggerReaction('clap', '👏', e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181920] hover:bg-amber-500/15 border border-[#2c303f] hover:border-amber-500/40 text-xs font-medium text-slate-200 transition-all cursor-pointer active:scale-95"
              title="Alkışla"
            >
              <span className="text-base">👏</span>
              <span className="text-[11px] font-bold text-amber-300">{reactionCounts.clap}</span>
            </button>

            {/* Reaction: Heart */}
            <button
              onClick={e => triggerReaction('heart', '❤️', e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181920] hover:bg-amber-500/15 border border-[#2c303f] hover:border-amber-500/40 text-xs font-medium text-slate-200 transition-all cursor-pointer active:scale-95"
              title="Kalp Bırak"
            >
              <span className="text-base">❤️</span>
              <span className="text-[11px] font-bold text-amber-300">{reactionCounts.heart}</span>
            </button>

            {/* Stop Sharing Button (If Local User is Sharing) */}
            {isSharing && onStopSharing && (
              <button
                onClick={onStopSharing}
                className="ml-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Yayını Durdur
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
