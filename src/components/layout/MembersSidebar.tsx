import React from 'react';
import type { ServerMember, Role, UserProfile } from '../../types';
import { Crown } from 'lucide-react';

interface MembersSidebarProps {
  members: (ServerMember & { user?: UserProfile; roles: Role[] })[];
  roles: Role[];
  serverOwnerId: string;
  onMemberClick: (member: ServerMember & { user?: UserProfile; roles: Role[] }, e: React.MouseEvent) => void;
}

export const MembersSidebar: React.FC<MembersSidebarProps> = ({
  members,
  roles,
  serverOwnerId,
  onMemberClick
}) => {
  // Sort roles by position
  const sortedRoles = [...roles].sort((a, b) => a.position - b.position);

  // Group members by hoist roles, then online, then offline
  const hoistRoles = sortedRoles.filter((r) => r.hoist);

  const getMemberHighestRole = (member: ServerMember) => {
    const memberRoles = sortedRoles.filter((r) => member.roleIds.includes(r.id));
    return memberRoles[0] || null;
  };

  const groups: { title: string; color?: string; members: typeof members }[] = [];

  // Group by hoist roles
  for (const role of hoistRoles) {
    const roleMembers = members.filter((m) => {
      const highest = getMemberHighestRole(m);
      return highest?.id === role.id && m.user?.status !== 'offline';
    });
    if (roleMembers.length > 0) {
      groups.push({
        title: `${role.name} — ${roleMembers.length}`,
        color: role.color,
        members: roleMembers
      });
    }
  }

  // General Online (without hoist role)
  const remainingOnline = members.filter((m) => {
    const highest = getMemberHighestRole(m);
    const inHoist = hoistRoles.some((hr) => hr.id === highest?.id);
    return !inHoist && m.user?.status !== 'offline';
  });

  if (remainingOnline.length > 0) {
    groups.push({
      title: `Çevrimiçi — ${remainingOnline.length}`,
      members: remainingOnline
    });
  }

  // Offline
  const offlineMembers = members.filter((m) => m.user?.status === 'offline');
  if (offlineMembers.length > 0) {
    groups.push({
      title: `Çevrimdışı — ${offlineMembers.length}`,
      members: offlineMembers
    });
  }

  return (
    <aside
      aria-label="Server members"
      className="w-60 shrink-0 bg-[#05070d] border-l border-[#111a2e] flex flex-col h-full select-none overflow-y-auto px-3 py-4"
    >
      <div className="space-y-5">
        {groups.map((group, gIdx) => (
          <div key={gIdx}>
            <h3
              className="text-[11px] font-bold uppercase tracking-wider px-2 mb-1.5"
              style={{ color: group.color || '#64748b' }}
            >
              {group.title}
            </h3>

            <div className="space-y-0.5">
              {group.members.map((member) => {
                const isOwner = member.userId === serverOwnerId;
                const user = member.user;
                const highestRole = getMemberHighestRole(member);

                return (
                  <button
                    key={member.userId}
                    onClick={(e) => onMemberClick(member, e)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#0a0f1c] text-left transition-colors group cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#05070d] ${
                          user?.status === 'online'
                            ? 'bg-emerald-500'
                            : user?.status === 'idle'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: highestRole?.color || '#f1f5f9' }}
                        >
                          {member.nickname || user?.displayName || user?.username || 'Üye'}
                        </span>
                        {isOwner && (
                          <span title="Sunucu Sahibi">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      {user?.customStatus ? (
                        <p className="text-[11px] text-slate-400 truncate">{user.customStatus}</p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate">@{user?.username}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
