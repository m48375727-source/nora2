/**
 * Nocturne - Discord-Style Real-Time Community Platform
 * Main Application Orchestrator
 */

import React, { useState, useEffect, useRef } from 'react';
import type {
  UserProfile,
  Server,
  Channel,
  Role,
  ServerMember,
  Message,
  ForumPost,
  VoiceParticipant,
  WSEvent
} from './types';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { socket } from './lib/socket';
import { voice } from './lib/voice';

// Layout & Components
import { ServerRail } from './components/layout/ServerRail';
import { ChannelList } from './components/layout/ChannelList';
import { MembersSidebar } from './components/layout/MembersSidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ForumFeed } from './components/forum/ForumFeed';
import { ForumThread } from './components/forum/ForumThread';
import { DiscoverPage } from './components/discover/DiscoverPage';
import { SpatialVenue3D } from './components/venue/SpatialVenue3D';

// Modals
import { AuthModal } from './components/auth/AuthModal';
import { CreateServerModal } from './components/modals/CreateServerModal';
import { ServerSettingsModal } from './components/modals/ServerSettingsModal';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { CreatePollModal } from './components/modals/CreatePollModal';
import { InviteModal } from './components/modals/InviteModal';
import { InvitePreviewModal } from './components/modals/InvitePreviewModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { VoiceSettingsModal } from './components/voice/VoiceSettingsModal';
import { ParticipantContextMenu } from './components/voice/ParticipantContextMenu';

import { Volume2, Users, Loader2, Sparkles, MessageSquare } from 'lucide-react';

export default function App() {
  // Current Authenticated User
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Community State
  const [servers, setServers] = useState<Server[]>([]);
  const [publicServers, setPublicServers] = useState<(Server & { memberCount: number })[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<(ServerMember & { user?: UserProfile; roles: Role[] })[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Real-time Chat & Forum State
  const [messages, setMessages] = useState<Message[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [activeThreadPostId, setActiveThreadPostId] = useState<string | null>(null);
  const [newForumPostsCount, setNewForumPostsCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ channelId: string; username: string }[]>([]);

  // Voice State
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [voiceState, setVoiceState] = useState(voice.getState());
  const [contextParticipant, setContextParticipant] = useState<{
    participant: VoiceParticipant;
    user?: UserProfile;
    x: number;
    y: number;
  } | null>(null);

  // Personal Themes
  const [personalAccent, setPersonalAccent] = useState<string>(
    localStorage.getItem('nocturne_personal_accent') || ''
  );
  const [messageDensity, setMessageDensity] = useState<'compact' | 'comfortable'>(
    (localStorage.getItem('nocturne_density') as any) || 'comfortable'
  );
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
    (localStorage.getItem('nocturne_font_size') as any) || 'medium'
  );

  // Navigation & Modals
  const [isDiscoverActive, setIsDiscoverActive] = useState(false);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [serverSettingsInitialTab, setServerSettingsInitialTab] = useState('overview');
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invitePreviewCode, setInvitePreviewCode] = useState<string | null>(null);
  const [userProfileModalTarget, setUserProfileModalTarget] = useState<UserProfile | null>(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);

  // Check URL params for direct invite code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setInvitePreviewCode(inviteParam);
    }
  }, []);

  // 1. Initial Authentication & Data Hydration
  useEffect(() => {
    async function initApp() {
      try {
        let user: UserProfile | null = null;
        const token = getStoredToken();

        if (token) {
          try {
            const meRes = await api.getMe();
            user = meRes.user;
          } catch {
            setStoredToken(null);
          }
        }

        // Auto-login to demo account (Alice Vanguard) if no existing session
        if (!user) {
          try {
            const loginRes = await api.login({ email: 'alice@nocturne.gg', password: 'password123' });
            user = loginRes.user;
          } catch (e) {
            console.warn('Seed login fallback:', e);
          }
        }

        if (user) {
          setCurrentUser(user);
          socket.connect(user.id);
        }

        // Hydrate initial public data
        const [usersRes, discoverRes] = await Promise.all([
          api.getUsers(),
          api.getDiscoverServers()
        ]);
        setAllUsers(usersRes.users);
        setPublicServers(discoverRes.servers);

        if (user) {
          const srvRes = await api.getServers();
          setServers(srvRes.servers);
          if (srvRes.servers.length > 0) {
            setActiveServerId(srvRes.servers[0].id);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitialLoading(false);
      }
    }

    initApp();
  }, []);

  // 2. Subscribe to WebRTC Voice State
  useEffect(() => {
    const unsubscribe = voice.subscribe((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  // 3. Dynamic CSS Theme Variable Orchestration
  // Priority: Personal Theme > Server Theme > Default Blue
  useEffect(() => {
    const activeServer = servers.find((s) => s.id === activeServerId);
    const effectiveAccent = personalAccent || activeServer?.theme?.accentColor || '#2563ff';

    const root = document.documentElement;
    root.style.setProperty('--accent-primary', effectiveAccent);
    root.style.setProperty('--accent-glow', `${effectiveAccent}40`);
    root.style.setProperty('--accent-glow-strong', `${effectiveAccent}80`);

    if (messageDensity === 'compact') {
      root.style.setProperty('--chat-density-py', '0.2rem');
    } else {
      root.style.setProperty('--chat-density-py', '0.45rem');
    }

    if (fontSize === 'small') {
      root.style.setProperty('--chat-font-size', '0.875rem');
    } else if (fontSize === 'large') {
      root.style.setProperty('--chat-font-size', '1rem');
    } else {
      root.style.setProperty('--chat-font-size', '0.9375rem');
    }
  }, [activeServerId, servers, personalAccent, messageDensity, fontSize]);

  // 4. Load Server Channels, Roles, and Members when Active Server changes
  useEffect(() => {
    if (!activeServerId || isDiscoverActive) return;

    async function loadServerData() {
      try {
        const [chanRes, roleRes, memRes] = await Promise.all([
          api.getChannels(activeServerId!),
          api.getRoles(activeServerId!),
          api.getServerMembers(activeServerId!)
        ]);
        setChannels(chanRes.channels);
        setRoles(roleRes.roles);
        setMembers(memRes.members);

        // Select first channel if not set or not in current server
        const currentChannelInServer = chanRes.channels.some((c) => c.id === activeChannelId);
        if (!currentChannelInServer && chanRes.channels.length > 0) {
          setActiveChannelId(chanRes.channels[0].id);
        }
      } catch (err) {
        console.error('Failed to load server data:', err);
      }
    }

    loadServerData();
  }, [activeServerId, isDiscoverActive]);

  // 5. Load Messages or Forum Posts when active channel changes
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  useEffect(() => {
    if (!activeChannel) return;
    setActiveThreadPostId(null);
    setNewForumPostsCount(0);

    if (activeChannel.type === 'text' || activeChannel.type === 'rules') {
      api.getMessages(activeChannel.id)
        .then((res) => setMessages(res.messages))
        .catch(console.error);
    } else if (activeChannel.type === 'forum') {
      api.getForumPosts(activeChannel.id)
        .then((res) => setForumPosts(res.posts))
        .catch(console.error);
    }
  }, [activeChannelId, activeChannel?.type]);

  // 6. WebSocket Realtime Event Engine
  useEffect(() => {
    const unsubscribe = socket.subscribe((event: WSEvent | any) => {
      switch (event.type) {
        case 'MESSAGE_CREATE': {
          const newMsg = event.payload as Message;
          if (newMsg.channelId === activeChannelId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          break;
        }

        case 'MESSAGE_UPDATE': {
          const updated = event.payload as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          break;
        }

        case 'MESSAGE_DELETE': {
          const { messageId } = event.payload;
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
          break;
        }

        case 'MESSAGE_REACTION': {
          const { messageId, reactions } = event.payload;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
          );
          break;
        }

        case 'TYPING_START': {
          const { channelId, username } = event.payload;
          setTypingUsers((prev) => {
            const without = prev.filter((t) => !(t.channelId === channelId && t.username === username));
            return [...without, { channelId, username }];
          });
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((t) => !(t.channelId === channelId && t.username === username))
            );
          }, 3500);
          break;
        }

        case 'FORUM_POST_CREATE': {
          const newPost = event.payload as ForumPost;
          if (newPost.channelId === activeChannelId) {
            setForumPosts((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev;
              return [newPost, ...prev];
            });
            if (newPost.authorId !== currentUser?.id) {
              setNewForumPostsCount((prev) => prev + 1);
            }
          }
          break;
        }

        case 'FORUM_POST_UPDATE': {
          const updatedPost = event.payload as ForumPost;
          setForumPosts((prev) =>
            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
          );
          break;
        }

        case 'FORUM_POST_DELETE': {
          const { postId } = event.payload;
          setForumPosts((prev) => prev.filter((p) => p.id !== postId));
          if (activeThreadPostId === postId) {
            setActiveThreadPostId(null);
          }
          break;
        }

        case 'VOICE_STATE_UPDATE': {
          const participants = event.payload as VoiceParticipant[];
          setVoiceParticipants(participants);

          // If connected to voice, check for peer connections
          if (voiceState.isConnected && voiceState.channelId) {
            const peersInSameRoom = participants.filter(
              (p) => p.channelId === voiceState.channelId && p.userId !== currentUser?.id
            );
            for (const peer of peersInSameRoom) {
              voice.connectToPeer(peer.userId);
            }
          }
          break;
        }

        case 'PRESENCE_UPDATE': {
          const { userId, status } = event.payload;
          setAllUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, status } : u))
          );
          setMembers((prev) =>
            prev.map((m) =>
              m.userId === userId && m.user ? { ...m, user: { ...m.user, status } } : m
            )
          );
          break;
        }

        case 'CHANNEL_UPDATE': {
          const chan = event.payload as Channel;
          if (chan.serverId === activeServerId) {
            setChannels((prev) => {
              const idx = prev.findIndex((c) => c.id === chan.id);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = chan;
                return copy;
              }
              return [...prev, chan];
            });
          }
          break;
        }

        case 'CHANNEL_DELETE': {
          const { channelId } = event.payload;
          setChannels((prev) => prev.filter((c) => c.id !== channelId));
          if (activeChannelId === channelId) {
            setActiveChannelId(null);
          }
          break;
        }

        case 'ROLE_UPDATE': {
          const { serverId, roles: updatedRoles } = event.payload;
          if (serverId === activeServerId) {
            setRoles(updatedRoles);
          }
          break;
        }

        case 'SERVER_UPDATE': {
          const srv = event.payload as Server;
          setServers((prev) => prev.map((s) => (s.id === srv.id ? srv : s)));
          break;
        }

        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [activeChannelId, activeServerId, currentUser?.id, voiceState.isConnected, voiceState.channelId]);

  // Voice room join / leave handlers
  const handleJoinVoice = async (channelId: string) => {
    if (!currentUser || !activeServerId) return;
    await voice.join(channelId, activeServerId, currentUser.id);
  };

  const handleLeaveVoice = () => {
    voice.leave();
  };

  const handleToggleMute = () => {
    voice.toggleMute();
  };

  const handleToggleDeafen = () => {
    voice.toggleDeafen();
  };

  // Chat message handlers
  const handleSendMessage = async (data: any) => {
    if (!activeChannelId) return;
    await api.sendMessage(activeChannelId, data);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    await api.editMessage(messageId, newContent);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await api.deleteMessage(messageId);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    await api.toggleReaction(messageId, emoji);
  };

  // Poll creation handler
  const handleCreatePoll = async (pollData: any) => {
    if (activeChannel?.type === 'forum') {
      await api.createForumPost(activeChannel.id, {
        content: `📊 **POLL:** ${pollData.question}`,
        poll: pollData
      });
    } else if (activeChannelId) {
      await api.sendMessage(activeChannelId, {
        content: '',
        poll: pollData
      });
    }
  };

  // Personal theme update
  const handleUpdatePersonalTheme = (
    accent: string,
    density: 'compact' | 'comfortable',
    font: 'small' | 'medium' | 'large'
  ) => {
    setPersonalAccent(accent);
    setMessageDensity(density);
    setFontSize(font);
    localStorage.setItem('nocturne_personal_accent', accent);
    localStorage.setItem('nocturne_density', density);
    localStorage.setItem('nocturne_font_size', font);
  };

  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center text-slate-400 select-none">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563ff] to-[#60a5fa] flex items-center justify-center shadow-2xl shadow-blue-500/25 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-white">Nocturne Başlatılıyor...</p>
        <p className="text-xs text-slate-500 mt-1">Gerçek zamanlı topluluk sunucusuna bağlanılıyor</p>
      </div>
    );
  }

  const activeServer = servers.find((s) => s.id === activeServerId);

  return (
    <div className="flex h-screen w-screen bg-[#000000] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Far-left Server Rail */}
      <ServerRail
        servers={servers}
        activeServerId={activeServerId}
        isDiscoverActive={isDiscoverActive}
        onSelectServer={(serverId) => {
          setIsDiscoverActive(false);
          setActiveServerId(serverId);
        }}
        onOpenDiscover={() => setIsDiscoverActive(true)}
        onOpenCreateServer={() => setCreateServerOpen(true)}
      />

      {/* Discover View OR Server Workspace */}
      {isDiscoverActive ? (
        <DiscoverPage
          publicServers={publicServers}
          userServerIds={servers.map((s) => s.id)}
          onJoinServer={async (serverId) => {
            const res = await api.getServers();
            setServers(res.servers);
            setActiveServerId(serverId);
            setIsDiscoverActive(false);
          }}
          onOpenServer={(serverId) => {
            setActiveServerId(serverId);
            setIsDiscoverActive(false);
          }}
        />
      ) : activeServer ? (
        <div className="flex-1 flex overflow-hidden">
          {/* 2. Channel List Sidebar */}
          <ChannelList
            server={activeServer}
            channels={channels}
            activeChannelId={activeChannelId}
            currentUser={currentUser || (allUsers[0] as any)}
            voiceParticipants={voiceParticipants}
            users={allUsers}
            currentVoiceState={voiceState}
            onSelectChannel={(channelId) => setActiveChannelId(channelId)}
            onJoinVoice={handleJoinVoice}
            onLeaveVoice={handleLeaveVoice}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            onOpenShareModal={() => setInviteModalOpen(true)}
            onOpenServerSettings={(tab) => {
              setServerSettingsInitialTab(tab || 'overview');
              setServerSettingsOpen(true);
            }}
            onOpenCreateChannel={() => setCreateChannelOpen(true)}
            onOpenCreateRole={() => {
              setServerSettingsInitialTab('roles');
              setServerSettingsOpen(true);
            }}
            onLeaveServer={async () => {
              if (!confirm('Bu sunucudan ayrılmak istediğinize emin misiniz?')) return;
              await api.leaveServer(activeServer.id);
              const res = await api.getServers();
              setServers(res.servers);
              if (res.servers.length > 0) setActiveServerId(res.servers[0].id);
            }}
            onOpenUserProfile={() => setUserProfileModalTarget(currentUser)}
            onOpenVoiceSettings={() => setVoiceSettingsOpen(true)}
            onParticipantClick={(p, u, e) => {
              if (e) {
                setContextParticipant({
                  participant: p,
                  user: u,
                  x: e.clientX,
                  y: e.clientY
                });
              }
            }}
          />

          {/* 3. Main Content Viewport */}
          <main className="flex-1 flex overflow-hidden">
            {activeChannel ? (
              activeChannel.type === 'forum' ? (
                activeThreadPostId ? (
                  <ForumThread
                    postId={activeThreadPostId}
                    currentUser={currentUser || (allUsers[0] as any)}
                    users={allUsers}
                    roles={roles}
                    serverOwnerId={activeServer.ownerId}
                    onBack={() => setActiveThreadPostId(null)}
                    onOpenUserProfile={(u) => setUserProfileModalTarget(u)}
                  />
                ) : (
                  <ForumFeed
                    channel={activeChannel}
                    posts={forumPosts}
                    users={allUsers}
                    roles={roles}
                    currentUser={currentUser || (allUsers[0] as any)}
                    serverOwnerId={activeServer.ownerId}
                    newPostsCount={newForumPostsCount}
                    onClearNewPosts={() => setNewForumPostsCount(0)}
                    onOpenThread={(postId) => setActiveThreadPostId(postId)}
                    onOpenCreatePoll={() => setCreatePollOpen(true)}
                    onOpenUserProfile={(u) => setUserProfileModalTarget(u)}
                  />
                )
              ) : activeChannel.type === 'voice' ? (
                <SpatialVenue3D
                  channelId={activeChannel.id}
                  initialVenueType={
                    activeChannel.venueType ||
                    (activeChannel.name.toLowerCase().includes('kulüp') || activeChannel.name.toLowerCase().includes('club')
                      ? 'club'
                      : activeChannel.name.toLowerCase().includes('çatı') || activeChannel.name.toLowerCase().includes('rooftop')
                      ? 'rooftop'
                      : 'cinema')
                  }
                  currentUser={currentUser || (allUsers[0] as any)}
                  allUsers={allUsers}
                  currentVoiceState={voiceState}
                  onToggleMute={handleToggleMute}
                  onToggleDeafen={handleToggleDeafen}
                  onLeaveVoice={handleLeaveVoice}
                />
              ) : (
                <ChatArea
                  channel={activeChannel}
                  messages={messages}
                  users={allUsers}
                  roles={roles}
                  currentUser={currentUser || (allUsers[0] as any)}
                  serverOwnerId={activeServer.ownerId}
                  typingUsers={typingUsers}
                  onSendMessage={handleSendMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onToggleReaction={handleToggleReaction}
                  onOpenCreatePoll={() => setCreatePollOpen(true)}
                />
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Başlamak için sol kenar çubuğundan bir kanal seçin
              </div>
            )}
          </main>

          {/* 4. Right Members Sidebar */}
          <MembersSidebar
            members={members}
            roles={roles}
            serverOwnerId={activeServer.ownerId}
            onMemberClick={(member) => {
              if (member.user) setUserProfileModalTarget(member.user);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-slate-400 mb-4">You are not part of any server yet.</p>
          <button
            onClick={() => setCreateServerOpen(true)}
            className="px-5 py-2 bg-[#2563ff] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20"
          >
            Create Your First Server
          </button>
        </div>
      )}

      {/* MODALS */}
      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          socket.connect(user.id);
          api.getServers().then((res) => {
            setServers(res.servers);
            if (res.servers.length > 0) setActiveServerId(res.servers[0].id);
          });
        }}
      />

      {/* Create Server Modal */}
      <CreateServerModal
        isOpen={createServerOpen}
        onClose={() => setCreateServerOpen(false)}
        onServerCreated={(newServer) => {
          setServers((prev) => [...prev, newServer]);
          setActiveServerId(newServer.id);
          setIsDiscoverActive(false);
        }}
      />

      {/* Server Settings Modal */}
      {activeServer && (
        <ServerSettingsModal
          isOpen={serverSettingsOpen}
          server={activeServer}
          roles={roles}
          channels={channels}
          members={members}
          currentUser={currentUser || (allUsers[0] as any)}
          initialTab={serverSettingsInitialTab}
          onClose={() => setServerSettingsOpen(false)}
          onServerUpdated={(updated) => {
            setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
          onServerDeleted={() => {
            setServers((prev) => prev.filter((s) => s.id !== activeServer.id));
            setActiveServerId(servers.find((s) => s.id !== activeServer.id)?.id || null);
          }}
          onRolesUpdated={(updatedRoles) => setRoles(updatedRoles)}
        />
      )}

      {/* Create Channel Modal */}
      {activeServer && (
        <CreateChannelModal
          isOpen={createChannelOpen}
          serverId={activeServer.id}
          roles={roles}
          onClose={() => setCreateChannelOpen(false)}
          onChannelCreated={(newChan) => {
            setChannels((prev) => [...prev, newChan]);
            setActiveChannelId(newChan.id);
          }}
        />
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={createPollOpen}
        onClose={() => setCreatePollOpen(false)}
        onSubmitPoll={handleCreatePoll}
      />

      {/* Invite Modal */}
      {activeServer && (
        <InviteModal
          isOpen={inviteModalOpen}
          server={activeServer}
          onClose={() => setInviteModalOpen(false)}
        />
      )}

      {/* Invite Preview Landing Modal */}
      <InvitePreviewModal
        inviteCode={invitePreviewCode}
        currentUser={currentUser}
        onClose={() => setInvitePreviewCode(null)}
        onRequestAuth={() => setAuthModalOpen(true)}
        onJoined={async (serverId) => {
          const res = await api.getServers();
          setServers(res.servers);
          setActiveServerId(serverId);
          setIsDiscoverActive(false);
        }}
      />

      {/* User Profile Modal */}
      {userProfileModalTarget && (
        <UserProfileModal
          isOpen={Boolean(userProfileModalTarget)}
          user={userProfileModalTarget}
          isCurrentUser={userProfileModalTarget.id === currentUser?.id}
          personalAccent={personalAccent}
          messageDensity={messageDensity}
          fontSize={fontSize}
          onClose={() => setUserProfileModalTarget(null)}
          onUpdateProfile={(updated) => {
            setCurrentUser(updated);
            setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          }}
          onUpdatePersonalTheme={handleUpdatePersonalTheme}
          onLogout={() => {
            api.logout();
            setCurrentUser(null);
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
      />

      {/* Participant Context Menu */}
      {contextParticipant && (
        <ParticipantContextMenu
          participant={contextParticipant.participant}
          user={contextParticipant.user}
          canModerate={activeServer?.ownerId === currentUser?.id}
          position={{ x: contextParticipant.x, y: contextParticipant.y }}
          onClose={() => setContextParticipant(null)}
          onOpenProfile={(u) => setUserProfileModalTarget(u)}
        />
      )}
    </div>
  );
}
