import React, { useState } from 'react';
import type { ChannelType, Role, VenueType } from '../../types';
import { api } from '../../lib/api';
import { X, Hash, Volume2, MessageSquare, ShieldAlert, Lock, Film, Music, Moon } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  serverId: string;
  roles: Role[];
  onClose: () => void;
  onChannelCreated: (channel: any) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  serverId,
  roles,
  onClose,
  onChannelCreated
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [venueType, setVenueType] = useState<VenueType>('cinema');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [userLimit, setUserLimit] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await api.createChannel(serverId, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
        topic: topic.trim(),
        isPrivate,
        allowedRoleIds: isPrivate ? allowedRoleIds : [],
        userLimit: type === 'voice' ? userLimit : undefined,
        venueType: type === 'voice' ? venueType : undefined
      });
      onChannelCreated(res.channel);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Kanal oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleSelection = (roleId: string) => {
    setAllowedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white tracking-wide mb-1">Kanal Oluştur</h3>
        <p className="text-xs text-slate-400 mb-5">Bir kanal türü seçin ve izinleri belirleyin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Kanal Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  type === 'text'
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <Hash className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Metin</p>
                  <p className="text-[10px] text-slate-400">Sohbet ve dosyalar</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('voice')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  type === 'voice'
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">3D Sesli Mekan</p>
                  <p className="text-[10px] text-slate-400">3D dünya & ses</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('forum')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  type === 'forum'
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Forum</p>
                  <p className="text-[10px] text-slate-400">X tarzı gönderiler</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('rules')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                  type === 'rules'
                    ? 'border-blue-500 bg-blue-600/15 text-white'
                    : 'border-[#111a2e] bg-[#0a0f1c] text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Kurallar</p>
                  <p className="text-[10px] text-slate-400">Yalnızca sahip</p>
                </div>
              </button>
            </div>
          </div>

          {/* 3D Venue Type Selector for Voice Channels */}
          {type === 'voice' && (
            <div className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider">
                3D Mekan Atmosferi
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVenueType('cinema')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    venueType === 'cinema'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-[#111a2e] text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-4 h-4 mx-auto mb-1 text-red-400" />
                  <p className="text-[11px] font-semibold">Sinema</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVenueType('club')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    venueType === 'club'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-[#111a2e] text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                  <p className="text-[11px] font-semibold">Kulüp</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVenueType('rooftop')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    venueType === 'rooftop'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-[#111a2e] text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <p className="text-[11px] font-semibold">Çatı Katı</p>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Kanal Adı *
            </label>
            <input
              type="text"
              required
              placeholder="örn. genel-sohbet, sinema-odasi, duyurular"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Kanal Konusu
            </label>
            <input
              type="text"
              placeholder="Bu kanalın amacını belirtin"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {type === 'voice' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kullanıcı Limiti (0 = Sınırsız)
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={userLimit}
                onChange={(e) => setUserLimit(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Private Channel Toggle */}
          <div className="pt-2 border-t border-[#111a2e]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Özel Kanal
                </p>
                <p className="text-[11px] text-slate-400">Yalnızca seçilen roller bu kanalı görebilir</p>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Allowed Roles Multi-select if private */}
            {isPrivate && (
              <div className="mt-3 p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  İzin Verilen Roller
                </p>
                {roles
                  .filter((r) => r.name !== '@everyone')
                  .map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center justify-between text-xs text-white p-1.5 hover:bg-[#111a2e] rounded-lg cursor-pointer"
                    >
                      <span className="font-medium" style={{ color: role.color }}>
                        {role.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={allowedRoleIds.includes(role.id)}
                        onChange={() => toggleRoleSelection(role.id)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </label>
                  ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#111a2e] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Oluşturuluyor...' : 'Kanal Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
