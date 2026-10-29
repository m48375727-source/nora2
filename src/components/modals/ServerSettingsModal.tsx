import React, { useState } from 'react';
import type { Server, Role, Channel, ServerMember, UserProfile, ServerInvite } from '../../types';
import { api } from '../../lib/api';
import {
  X,
  Settings,
  Shield,
  Hash,
  Users,
  Link,
  Palette,
  Trash2,
  Plus,
  Crown,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ServerSettingsModalProps {
  isOpen: boolean;
  server: Server;
  roles: Role[];
  channels: Channel[];
  members: (ServerMember & { user?: UserProfile; roles: Role[] })[];
  currentUser: UserProfile;
  initialTab?: string;
  onClose: () => void;
  onServerUpdated: (server: Server) => void;
  onServerDeleted: () => void;
  onRolesUpdated: (roles: Role[]) => void;
}

const PRESET_ACCENTS = [
  '#2563ff', // electric blue
  '#3b82f6', // blue
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#10b981'  // emerald
];

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  server,
  roles,
  channels,
  members,
  currentUser,
  initialTab = 'overview',
  onClose,
  onServerUpdated,
  onServerDeleted,
  onRolesUpdated
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Overview Form
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description);
  const [iconUrl, setIconUrl] = useState(server.iconUrl || '');
  const [bannerUrl, setBannerUrl] = useState(server.bannerUrl || '');
  const [isPublic, setIsPublic] = useState(server.isPublic);
  const [discoverCategory, setDiscoverCategory] = useState(server.discoverCategory || 'Tech');
  const [accentColor, setAccentColor] = useState(server.theme?.accentColor || '#2563ff');
  const [bannerTint, setBannerTint] = useState(server.theme?.bannerTint || 'rgba(37, 99, 255, 0.2)');

  // New Role Form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');

  // Invites state
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwner = currentUser.id === server.ownerId;

  const handleSaveOverview = async () => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      const res = await api.updateServer(server.id, {
        name,
        description,
        iconUrl: iconUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        isPublic,
        discoverCategory,
        theme: {
          accentColor,
          bannerTint
        }
      });
      onServerUpdated(res.server);
      setSuccessMsg('Sunucu ayarları başarıyla kaydedildi!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Sunucu güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const res = await api.createRole(server.id, {
        name: newRoleName.trim(),
        color: newRoleColor,
        hoist: true,
        permissions: ['View Channels', 'Send Messages', 'Add Reactions']
      });
      onRolesUpdated([...roles, res.role]);
      setNewRoleName('');
    } catch (err: any) {
      alert(err.message || 'Rol oluşturulamadı');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteRole(roleId);
      onRolesUpdated(roles.filter((r) => r.id !== roleId));
    } catch (err: any) {
      alert(err.message || 'Rol silinemedi');
    }
  };

  const handleDeleteServer = async () => {
    if (!isOwner) return;
    const confirmName = prompt(`Sunucuyu kalıcı olarak silmek için "${server.name}" yazın:`);
    if (confirmName !== server.name) return;

    try {
      await api.deleteServer(server.id);
      onServerDeleted();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Sunucu silinemedi');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[620px] bg-[#05070d] border border-[#111a2e] rounded-2xl shadow-2xl flex overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar Tabs */}
        <div className="w-56 bg-[#000000] border-r border-[#111a2e] p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              {server.name}
            </p>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Genel Bakış</span>
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Roller ({roles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Üyeler ({members.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-[#0a0f1c] hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Görünüm & Tema</span>
            </button>
          </div>

          {/* Delete Server Option for Owner */}
          {isOwner && (
            <div className="pt-4 border-t border-[#111a2e]">
              <button
                onClick={() => setActiveTab('delete')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'delete'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Sunucuyu Sil</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4 max-w-lg">
              <h3 className="text-lg font-bold text-white tracking-wide">Server Overview</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Server Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Icon URL
                </label>
                <input
                  type="url"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-[#111a2e]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-white">List in Discover</p>
                    <p className="text-[11px] text-slate-400">Public communities show in the global directory</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 accent-blue-500 cursor-pointer"
                  />
                </div>

                {isPublic && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Discover Category
                    </label>
                    <select
                      value={discoverCategory}
                      onChange={(e) => setDiscoverCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0f1c] border border-[#111a2e] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {['Teknoloji', 'Oyun', 'Müzik', 'Tasarım', 'Kripto', 'Sohbet', 'Bilim'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                disabled={loading}
                onClick={handleSaveOverview}
                className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          )}

          {/* ROLES TAB */}
          {activeTab === 'roles' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Roller ve Yetkiler</h3>
                  <p className="text-xs text-slate-400">Hiyerarşiyi ve üye yetkilerini düzenleyin</p>
                </div>
              </div>

              {/* Create Role Input */}
              <div className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Yeni Rol Adı (ör. VIP, Moderatör)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#05070d] border border-[#111a2e] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <button
                  onClick={handleCreateRole}
                  disabled={!newRoleName.trim()}
                  className="px-3 py-1.5 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                >
                  Rol Ekle
                </button>
              </div>

              {/* Roles List */}
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="text-sm font-semibold text-white">{role.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {role.permissions.length} yetki
                      </span>
                    </div>

                    {role.name !== '@everyone' && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white tracking-wide">
                Sunucu Üyeleri ({members.length})
              </h3>
              <div className="space-y-2">
                {members.map((member) => {
                  const isServerOwner = member.userId === server.ownerId;
                  return (
                    <div
                      key={member.userId}
                      className="p-3 bg-[#0a0f1c] border border-[#111a2e] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.user?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {member.user?.displayName || member.user?.username || 'Üye'}
                            {isServerOwner && <Crown className="w-3 h-3 text-amber-400" />}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">@{member.user?.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.roles.map((r) => (
                          <span
                            key={r.id}
                            style={{ color: r.color }}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#111a2e]"
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* APPEARANCE & THEME TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 max-w-lg">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Sunucu Teması ve Görünüm</h3>
                <p className="text-xs text-slate-400">
                  Bu sunucudaki herkes için vurgu rengini ve görsel temayı özelleştirin
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Vurgu Rengi
                </label>
                <div className="flex items-center gap-2.5">
                  {PRESET_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccentColor(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                        accentColor === hex ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Theme Preview Card */}
              <div className="p-4 rounded-xl border border-[#111a2e] bg-[#0a0f1c] space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Önizleme</p>
                <div className="p-3 bg-[#05070d] rounded-xl border border-[#111a2e] flex items-center justify-between">
                  <span className="text-xs font-bold text-white">#genel-sohbet</span>
                  <button
                    style={{ backgroundColor: accentColor }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-sm"
                  >
                    Aktif Vurgu
                  </button>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handleSaveOverview}
                className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                Temayı Kaydet
              </button>
            </div>
          )}

          {/* DELETE SERVER TAB */}
          {activeTab === 'delete' && isOwner && (
            <div className="space-y-4 max-w-lg">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Kalıcı Silme Uyarısı</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">{server.name}</strong> sunucusunu silmek tüm kanalları,
                  mesajları, forum gönderilerini, rolleri ve medya dosyalarını kalıcı olarak silecektir. Bu işlem geri alınamaz.
                </p>
              </div>

              <button
                onClick={handleDeleteServer}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-red-500/20"
              >
                Sunucuyu Sil
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
