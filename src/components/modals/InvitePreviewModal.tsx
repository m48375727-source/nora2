import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Server, UserProfile } from '../../types';
import { Users, ArrowRight, X, Loader2 } from 'lucide-react';

interface InvitePreviewModalProps {
  inviteCode: string | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onJoined: (serverId: string) => void;
  onRequestAuth: () => void;
}

export const InvitePreviewModal: React.FC<InvitePreviewModalProps> = ({
  inviteCode,
  currentUser,
  onClose,
  onJoined,
  onRequestAuth
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;
    setLoading(true);
    setError(null);

    api.getInvite(inviteCode)
      .then((res) => {
        setServerInfo(res.server);
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired invite link');
      })
      .finally(() => setLoading(false));
  }, [inviteCode]);

  if (!inviteCode) return null;

  const handleJoin = async () => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }

    setJoining(true);
    try {
      const res = await api.acceptInvite(inviteCode);
      onJoined(res.serverId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-2xl overflow-hidden shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-1 rounded-lg bg-black/60 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs text-slate-400">Loading invite preview...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0a0f1c] hover:bg-[#111a2e] text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        ) : serverInfo ? (
          <div>
            {/* Banner */}
            <div className="h-32 bg-[#0a0f1c] relative overflow-hidden">
              {serverInfo.bannerUrl ? (
                <img
                  src={serverInfo.bannerUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-900/40 to-indigo-900/40" />
              )}

              {/* Icon */}
              <div className="absolute -bottom-5 left-6 w-14 h-14 rounded-2xl bg-[#05070d] border-2 border-[#111a2e] overflow-hidden shadow-xl">
                {serverInfo.iconUrl ? (
                  <img
                    src={serverInfo.iconUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white bg-blue-600">
                    {serverInfo.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="p-6 pt-8 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                  You have been invited to join
                </p>
                <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                  {serverInfo.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {serverInfo.description || 'Welcome to this Nocturne community.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 py-2 border-y border-[#111a2e]">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{serverInfo.memberCount} Members</span>
              </div>

              <div className="pt-2">
                <button
                  disabled={joining}
                  onClick={handleJoin}
                  className="w-full py-2.5 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{joining ? 'Joining Server...' : currentUser ? 'Accept Invite & Join' : 'Sign in to Join'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
