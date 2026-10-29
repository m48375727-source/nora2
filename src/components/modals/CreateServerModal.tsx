import React, { useState } from 'react';
import { api } from '../../lib/api';
import type { Server } from '../../types';
import { X, Sparkles, Globe, Lock } from 'lucide-react';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerCreated: (server: Server) => void;
}

const PRESET_ACCENTS = ['#2563ff', '#38bdf8', '#818cf8', '#a855f7', '#06b6d4', '#10b981'];

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onClose,
  onServerCreated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#2563ff');
  const [isPublic, setIsPublic] = useState(true);
  const [discoverCategory, setDiscoverCategory] = useState('Tech');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.createServer({
        name: name.trim(),
        description: description.trim(),
        iconUrl: iconUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        themeColor,
        isPublic,
        discoverCategory
      });
      onServerCreated(res.server);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563ff] to-[#60a5fa] mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Sunucunu Oluştur</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerçek zamanlı sohbet, 3D sesli mekanlar ve forum dizileri için topluluk alanınız.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Sunucu Adı *
            </label>
            <input
              type="text"
              required
              placeholder="örn. Cyber Topluluğu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Açıklama
            </label>
            <input
              type="text"
              placeholder="Topluluğunuz hakkında birkaç cümle"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Simge URL (İsteğe Bağlı)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Tema Vurgu Rengi
            </label>
            <div className="flex items-center gap-2">
              {PRESET_ACCENTS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setThemeColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    themeColor === hex ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#111a2e]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Keşfet Sayfasında Yayınla
                </p>
                <p className="text-[11px] text-slate-400">Diğer Nocturne kullanıcılarının bulup katılmasına izin ver</p>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {isPublic && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kategori
              </label>
              <select
                value={discoverCategory}
                onChange={(e) => setDiscoverCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {['Teknoloji', 'Oyun', 'Müzik', 'Tasarım', 'Kripto', 'Sohbet', 'Bilim'].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? 'Oluşturuluyor...' : 'Sunucu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
