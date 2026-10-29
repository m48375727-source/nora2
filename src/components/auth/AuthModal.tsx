import React, { useState } from 'react';
import { api } from '../../lib/api';
import type { UserProfile } from '../../types';
import { Sparkles, Shield, UserCheck, ArrowRight, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!username || !email || !password) {
          throw new Error('Please fill in all required fields');
        }
        const res = await api.register({ email, password, username, displayName });
        onSuccess(res.user);
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        const res = await api.login({ email, password });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Demo account quick switchers for multi-user instant testing
  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email: demoEmail, password: 'password123' });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-2xl shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2563ff] to-[#60a5fa] mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isRegister ? "Nocturne'a Katıl" : 'Tekrar Hoş Geldiniz'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isRegister
              ? '3D mekanlarda topluluk kurmak ve sohbet etmek için hesap oluşturun'
              : 'Sunucularınıza, 3D odalarınıza ve forumlara erişmek için giriş yapın'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn. cyber_gezgini"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#2563ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Görünen İsim
                </label>
                <input
                  type="text"
                  placeholder="örn. Cyber Gezgini"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#2563ff] transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              E-posta Adresi *
            </label>
            <input
              type="email"
              required
              placeholder="ad@ornek.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#2563ff] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Şifre *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#2563ff] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#2563ff] hover:bg-[#3b82f6] text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'İşleniyor...' : isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {isRegister ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Hesabınız yok mu? Kayıt Olun'}
          </button>
        </div>

        {/* Quick Demo Switcher for fast dual-user testing */}
        <div className="mt-6 pt-5 border-t border-[#111a2e]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            Hızlı Test Hesapları (Anında Geçiş)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alice@nocturne.gg')}
              className="py-1.5 px-2 bg-[#0a0f1c] hover:bg-[#111a2e] border border-[#111a2e] rounded-lg text-xs text-blue-400 font-medium transition-colors text-center truncate cursor-pointer"
            >
              Alice (Kurucu)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('bob@nocturne.gg')}
              className="py-1.5 px-2 bg-[#0a0f1c] hover:bg-[#111a2e] border border-[#111a2e] rounded-lg text-xs text-cyan-400 font-medium transition-colors text-center truncate cursor-pointer"
            >
              Bob (Mod)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('cypher@nocturne.gg')}
              className="py-1.5 px-2 bg-[#0a0f1c] hover:bg-[#111a2e] border border-[#111a2e] rounded-lg text-xs text-slate-300 font-medium transition-colors text-center truncate cursor-pointer"
            >
              Cypher (Üye)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
