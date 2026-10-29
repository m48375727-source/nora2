import React, { useState, useEffect } from 'react';
import type { UserProfile, ForumPost, ForumComment, OnlineStatus } from '../../types';
import { api } from '../../lib/api';
import {
  X,
  User,
  Palette,
  MessageSquare,
  Heart,
  LogOut,
  Check,
  Loader2,
  Shield,
  Download
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  isCurrentUser: boolean;
  personalAccent: string;
  messageDensity: 'compact' | 'comfortable';
  fontSize: 'small' | 'medium' | 'large';
  onClose: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  onUpdatePersonalTheme: (accent: string, density: 'compact' | 'comfortable', font: 'small' | 'medium' | 'large') => void;
  onLogout?: () => void;
}

const PRESET_ACCENTS = [
  '#2563ff',
  '#38bdf8',
  '#818cf8',
  '#a855f7',
  '#06b6d4',
  '#10b981',
  '#f59e0b'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  isCurrentUser,
  personalAccent,
  messageDensity,
  fontSize,
  onClose,
  onUpdateProfile,
  onUpdatePersonalTheme,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'activity'>('profile');
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [customStatus, setCustomStatus] = useState(user.customStatus || '');
  const [status, setStatus] = useState<OnlineStatus>(user.status);

  // Appearance state
  const [accent, setAccent] = useState(personalAccent);
  const [density, setDensity] = useState<'compact' | 'comfortable'>(messageDensity);
  const [font, setFont] = useState<'small' | 'medium' | 'large'>(fontSize);

  // Activity state
  const [userPosts, setUserPosts] = useState<ForumPost[]>([]);
  const [userComments, setUserComments] = useState<ForumComment[]>([]);
  const [userLikes, setUserLikes] = useState<ForumPost[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeTab === 'activity') {
      setLoadingActivity(true);
      api.getUserForumProfile(user.id)
        .then((res) => {
          setUserPosts(res.posts);
          setUserComments(res.comments);
          setUserLikes(res.likes);
        })
        .finally(() => setLoadingActivity(false));
    }
  }, [activeTab, user.id]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    if (!isCurrentUser) return;
    setSaving(true);
    try {
      const res = await api.updateProfile({
        displayName,
        bio,
        avatarUrl,
        customStatus,
        status
      });
      if (onUpdateProfile) onUpdateProfile(res.user);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = () => {
    onUpdatePersonalTheme(accent, density, font);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl h-[560px] bg-[#05070d] border border-[#111a2e] rounded-2xl shadow-2xl flex overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Sidebar */}
        <div className="w-48 bg-[#000000] border-r border-[#111a2e] p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Kullanıcı Ayarları
            </p>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profil</span>
            </button>

            {isCurrentUser && (
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Görünüm</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Forum Etkinliği</span>
            </button>
          </div>

          {isCurrentUser && (
            <div className="pt-4 border-t border-[#111a2e] space-y-1.5">
              <a
                href="/api/download-zip"
                download="nocturne-app.zip"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
                title="Tüm kaynak kodları ZIP arşivi olarak indir"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Projeyi İndir (.ZIP)</span>
              </a>

              {onLogout && (
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Çıkış Yap</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {savedSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Başarıyla kaydedildi!</span>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-4 mb-2">
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/50"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{displayName}</h3>
                  <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                </div>
              </div>

              {isCurrentUser ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Görünen Ad
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Avatar Resim URL
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Özel Durum
                    </label>
                    <input
                      type="text"
                      placeholder="Neler yapıyorsun?"
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Çevrimiçi Durumu
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OnlineStatus)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="online">Çevrimiçi</option>
                      <option value="idle">Boşta / Uzakta</option>
                      <option value="offline">Görünmez / Çevrimdışı</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Biyografi
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Topluluğa kendinden bahset..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <button
                    disabled={saving}
                    onClick={handleSaveProfile}
                    className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
                  </button>
                </>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#111a2e]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Biyografi</p>
                    <p className="text-xs text-slate-200">{user.bio || 'Henüz biyografi eklenmemiş.'}</p>
                  </div>

                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#111a2e]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Katılma Tarihi
                    </p>
                    <p className="text-xs text-slate-300 font-mono">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && isCurrentUser && (
            <div className="space-y-5 max-w-md">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Kişisel Tema Ayarları</h3>
                <p className="text-xs text-slate-400">
                  Nocturne görünümünü kendi hesabınız için özelleştirin
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Kişisel Vurgu Rengi
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccent(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        accent === hex ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Mesaj Yoğunluğu & Aralıkları
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDensity('comfortable')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      density === 'comfortable'
                        ? 'border-blue-500 bg-blue-600/15 text-white'
                        : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-semibold">Rahat</p>
                    <p className="text-[10px] text-slate-500">Geniş avatarlar ve dolgular</p>
                  </button>

                  <button
                    onClick={() => setDensity('compact')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      density === 'compact'
                        ? 'border-blue-500 bg-blue-600/15 text-white'
                        : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-semibold">Kompakt</p>
                    <p className="text-[10px] text-slate-500">Yoğun IRC tarzı görünüm</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Yazı Boyutu
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'small', label: 'Küçük' },
                    { id: 'medium', label: 'Orta' },
                    { id: 'large', label: 'Büyük' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setFont(s.id as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                        font === s.id
                          ? 'border-blue-500 bg-blue-600/20 text-white'
                          : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveAppearance}
                className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Temayı Uygula
              </button>
            </div>
          )}

          {/* FORUM ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white tracking-wide">
                Forum Etkinliği ({userPosts.length} gönderi, {userComments.length} yorum)
              </h3>

              {loadingActivity ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {userPosts.length === 0 ? (
                    <p className="text-xs text-slate-500">Henüz forum gönderisi paylaşılmamış.</p>
                  ) : (
                    userPosts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-xs text-slate-200"
                      >
                        <p className="line-clamp-2">{p.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                          <span>{new Date(p.createdAt).toLocaleDateString('tr-TR')}</span>
                          <span>•</span>
                          <span>{p.likeCount || 0} beğeni</span>
                          <span>•</span>
                          <span>{p.replyCount || 0} yanıt</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
