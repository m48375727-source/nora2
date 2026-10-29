import React from 'react';
import type { Server } from '../../types';
import { Compass, Plus, MessageSquare } from 'lucide-react';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string | null;
  isDiscoverActive: boolean;
  onSelectServer: (serverId: string) => void;
  onOpenDiscover: () => void;
  onOpenCreateServer: () => void;
}

export const ServerRail: React.FC<ServerRailProps> = ({
  servers,
  activeServerId,
  isDiscoverActive,
  onSelectServer,
  onOpenDiscover,
  onOpenCreateServer
}) => {
  return (
    <nav
      aria-label="Server list"
      className="w-[72px] shrink-0 bg-[#000000] border-r border-[#111a2e] flex flex-col items-center py-3 gap-2 z-20 select-none overflow-y-auto overflow-x-hidden"
    >
      {/* Home / Direct messages button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            !activeServerId && !isDiscoverActive ? 'h-9' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={() => onSelectServer(servers[0]?.id || '')}
          title="Ana Sayfa / Mesajlar"
          className={`w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] transition-all duration-200 ${
            !activeServerId && !isDiscoverActive
              ? 'bg-[#2563ff] rounded-[16px] text-white shadow-lg shadow-blue-500/30'
              : 'bg-[#0a0f1c] text-slate-300 hover:bg-[#2563ff] hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-[#111a2e] my-1 shrink-0" />

      {/* Server list */}
      <div className="flex flex-col gap-2 w-full items-center">
        {servers.map((server) => {
          const isActive = activeServerId === server.id && !isDiscoverActive;
          const initials = server.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Discord-style active indicator pill */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive ? 'h-9' : 'h-0 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => onSelectServer(server.id)}
                title={server.name}
                className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-200 ${
                  isActive
                    ? 'rounded-[16px] ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'rounded-[24px] hover:rounded-[16px] bg-[#0a0f1c] hover:bg-[#111a2e]'
                }`}
              >
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt={server.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-200 tracking-wider">
                    {initials || server.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Server Button */}
      <div className="relative group flex items-center justify-center w-full mt-1">
        <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
        <button
          onClick={onOpenCreateServer}
          title="Sunucu Oluştur"
          className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-[#0a0f1c] text-[#2563ff] hover:bg-[#2563ff] hover:text-white transition-all duration-200 border border-[#111a2e] hover:border-transparent"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Discover Public Communities Button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            isDiscoverActive ? 'h-9' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={onOpenDiscover}
          title="Açık Toplulukları Keşfet"
          className={`w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] transition-all duration-200 ${
            isDiscoverActive
              ? 'bg-[#2563ff] text-white rounded-[16px] shadow-lg shadow-blue-500/30'
              : 'bg-[#0a0f1c] text-slate-400 hover:bg-[#111a2e] hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};
