import React, { useState } from 'react';
import type { Server } from '../../types';
import { api } from '../../lib/api';
import { X, Share2, Copy, Check, Clock, Users } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  server: Server;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, server, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxUses, setMaxUses] = useState(0);
  const [inviteCode, setInviteCode] = useState('nexus');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      const res = await api.createInvite(server.id, {
        maxUses: Number(maxUses),
        expiryDays: Number(expiryDays)
      });
      setInviteCode(res.invite.code);
    } catch (err: any) {
      alert(err.message || 'Failed to generate invite');
    } finally {
      setIsGenerating(false);
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

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">{server.name} Sunucusuna Davet Et</h3>
            <p className="text-xs text-slate-400">Anında sunucu erişimi için bu bağlantıyı paylaşın</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Link Box */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Davet Bağlantısı
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full px-2.5 py-1.5 bg-transparent text-white text-xs font-mono focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#2563ff] hover:bg-[#3b82f6] text-white shadow-md shadow-blue-500/20'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Expiry & Uses Options */}
          <div className="pt-2 border-t border-[#111a2e] grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                Geçerlilik Süresi
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-[#0a0f1c] border border-[#111a2e] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Süresiz</option>
                <option value={1}>1 gün</option>
                <option value={7}>7 gün</option>
                <option value={30}>30 gün</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" />
                Maksimum Kullanım
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-[#0a0f1c] border border-[#111a2e] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Sınırsız</option>
                <option value={1}>1 kullanım</option>
                <option value={5}>5 kullanım</option>
                <option value={25}>25 kullanım</option>
                <option value={100}>100 kullanım</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerateNew}
              disabled={isGenerating}
              className="w-full py-2 bg-[#0a0f1c] hover:bg-[#111a2e] border border-[#111a2e] rounded-xl text-xs font-semibold text-blue-400 transition-colors cursor-pointer"
            >
              {isGenerating ? 'Oluşturuluyor...' : 'Özel Bağlantı Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
