import React, { useState } from 'react';
import type { Server } from '../../types';
import { api } from '../../lib/api';
import { Compass, Search, Users, ArrowRight, Check } from 'lucide-react';

interface DiscoverPageProps {
  publicServers: (Server & { memberCount: number })[];
  userServerIds: string[];
  onJoinServer: (serverId: string) => void;
  onOpenServer: (serverId: string) => void;
}

const CATEGORIES = ['Tümü', 'Teknoloji', 'Oyun', 'Müzik', 'Tasarım', 'Kripto', 'Sohbet', 'Bilim'];

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  publicServers,
  userServerIds,
  onJoinServer,
  onOpenServer
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const filteredServers = publicServers.filter((server) => {
    const matchesCat =
      selectedCategory === 'Tümü' ||
      server.discoverCategory?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleJoin = async (serverId: string) => {
    setJoiningId(serverId);
    try {
      await api.joinServer(serverId);
      onJoinServer(serverId);
    } catch (err) {
      console.error('Join server failed:', err);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative py-12 px-6 sm:px-12 bg-gradient-to-b from-[#0a0f1c] via-[#05070d] to-[#000000] border-b border-[#111a2e] text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Nocturne Topluluklarını Keşfet
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mt-2 leading-relaxed">
          Geliştiriciler, dijital sanatçılar, müzisyenler ve gece kuşları için açık alanları keşfedin.
        </p>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-lg mt-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            placeholder="İsim veya konuya göre topluluk ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#0a0f1c] border border-[#111a2e] focus:border-[#2563ff] rounded-2xl text-white text-xs placeholder-slate-500 shadow-xl transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Category Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#2563ff] text-white shadow-md shadow-blue-500/20'
                  : 'bg-[#0a0f1c] text-slate-400 hover:text-white border border-[#111a2e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Server Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => {
            const isAlreadyMember = userServerIds.includes(server.id);

            return (
              <div
                key={server.id}
                className="bg-[#05070d] border border-[#111a2e] hover:border-[#1e2d4e] rounded-2xl overflow-hidden shadow-xl flex flex-col group transition-all"
              >
                {/* Server Banner */}
                <div className="relative h-28 bg-[#0a0f1c] overflow-hidden">
                  {server.bannerUrl ? (
                    <img
                      src={server.bannerUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-900/30 to-indigo-900/30" />
                  )}

                  {/* Server Icon */}
                  <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl bg-[#05070d] border-2 border-[#111a2e] overflow-hidden shadow-lg">
                    {server.iconUrl ? (
                      <img
                        src={server.iconUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white bg-blue-600">
                        {server.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 pt-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white tracking-wide truncate">
                        {server.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 shrink-0">
                        {server.discoverCategory || 'Topluluk'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {server.description || 'Bu açık Nocturne alanına hoş geldiniz.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#111a2e]/60">
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{server.memberCount || 1} üye</span>
                    </span>

                    {isAlreadyMember ? (
                      <button
                        onClick={() => onOpenServer(server.id)}
                        className="px-3 py-1.5 bg-[#0a0f1c] hover:bg-[#111a2e] text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Katıldın</span>
                      </button>
                    ) : (
                      <button
                        disabled={joiningId === server.id}
                        onClick={() => handleJoin(server.id)}
                        className="px-4 py-1.5 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{joiningId === server.id ? 'Katılınıyor...' : 'Katıl'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredServers.length === 0 && (
          <div className="py-16 text-center text-xs text-slate-500">
            Aramanızla eşleşen açık topluluk bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
};
