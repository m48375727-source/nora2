/**
 * Nocturne - Production Real-Time Community Backend
 * Express + WebSocket + File Storage + WebRTC Signaling + RBAC Security Engine
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { fileURLToPath } from 'url';
import type {
  UserProfile,
  Server,
  Channel,
  Role,
  ServerMember,
  Message,
  Poll,
  ForumPost,
  ForumComment,
  VoiceParticipant,
  ServerInvite,
  Reaction,
  WSEvent,
  OnlineStatus
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure storage directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'nocturne.json');

// Database Structure
interface NocturneDB {
  users: UserProfile[];
  passwords: Record<string, string>; // userId -> password
  servers: Server[];
  members: ServerMember[];
  roles: Role[];
  channels: Channel[];
  messages: Message[];
  forumPosts: ForumPost[];
  forumComments: ForumComment[];
  invites: ServerInvite[];
}

// In-Memory Database with Auto-Persistence
let db: NocturneDB = {
  users: [],
  passwords: {},
  servers: [],
  members: [],
  roles: [],
  channels: [],
  messages: [],
  forumPosts: [],
  forumComments: [],
  invites: []
};

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
    } catch (e) {
      console.error('Error loading DB, initializing seed data', e);
      seedInitialData();
    }
  } else {
    seedInitialData();
  }
}

// Seed initial flagship community if empty
function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Initial Users
  const user1: UserProfile = {
    id: 'user_alice',
    email: 'alice@nocturne.gg',
    username: 'alice',
    displayName: 'Alice Vanguard',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    bio: 'Founder @ Nocturne. Architecting the future of real-time communities.',
    status: 'online',
    createdAt: now
  };
  const user2: UserProfile = {
    id: 'user_bob',
    email: 'bob@nocturne.gg',
    username: 'bob',
    displayName: 'Bob Cipher',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Systems engineer & audio hacker. Testing WebRTC spatial rooms.',
    status: 'online',
    createdAt: now
  };
  const user3: UserProfile = {
    id: 'user_cypher',
    email: 'cypher@nocturne.gg',
    username: 'cypher',
    displayName: 'Cypher Neon',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    bio: 'Synthwave producer & night owl. Ping me in #forum.',
    status: 'idle',
    createdAt: now
  };

  db.users = [user1, user2, user3];
  db.passwords = {
    user_alice: 'password123',
    user_bob: 'password123',
    user_cypher: 'password123'
  };

  // 2. Default Flagship Server (Turkish)
  const serverId = 'srv_nocturne_nexus';
  const server: Server = {
    id: serverId,
    name: 'Nocturne Topluluğu',
    description: '3D mekanlar, sinema geceleri, WebRTC sesli sohbet ve canlı forum topluluğu.',
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=300&fit=crop',
    ownerId: user1.id,
    isPublic: true,
    discoverCategory: 'Tech',
    theme: {
      accentColor: '#2563ff',
      bannerTint: 'rgba(37, 99, 255, 0.2)'
    },
    createdAt: now
  };
  db.servers = [server];

  // 3. Roles
  const adminRole: Role = {
    id: 'role_admin',
    serverId,
    name: 'Yönetici',
    color: '#3b82f6',
    position: 1,
    hoist: true,
    permissions: [
      'Administrator',
      'View Channels',
      'Send Messages',
      'Attach Files',
      'Add Reactions',
      'Create Polls',
      'Create Forum Posts',
      'Create Voice Rooms',
      'Connect/Speak in Voice',
      'Manage Channels',
      'Manage Roles',
      'Manage Messages',
      'Manage Server',
      'Create Invites',
      'Kick Members'
    ]
  };

  const modRole: Role = {
    id: 'role_mod',
    serverId,
    name: 'Moderatör',
    color: '#06b6d4',
    position: 2,
    hoist: true,
    permissions: [
      'View Channels',
      'Send Messages',
      'Attach Files',
      'Add Reactions',
      'Create Polls',
      'Create Forum Posts',
      'Create Voice Rooms',
      'Connect/Speak in Voice',
      'Manage Messages',
      'Create Invites'
    ]
  };

  const everyoneRole: Role = {
    id: 'role_everyone',
    serverId,
    name: '@everyone',
    color: '#94a3b8',
    position: 3,
    hoist: false,
    permissions: [
      'View Channels',
      'Send Messages',
      'Attach Files',
      'Add Reactions',
      'Create Polls',
      'Create Forum Posts',
      'Connect/Speak in Voice',
      'Create Invites'
    ]
  };
  db.roles = [adminRole, modRole, everyoneRole];

  // Memberships
  db.members = [
    { userId: user1.id, serverId, joinedAt: now, roleIds: [adminRole.id] },
    { userId: user2.id, serverId, joinedAt: now, roleIds: [modRole.id] },
    { userId: user3.id, serverId, joinedAt: now, roleIds: [everyoneRole.id] }
  ];

  // 4. Default Channels: #kurallar, #genel-sohbet, #forum-akisi, and 3D Spatial Venues
  const rulesChannel: Channel = {
    id: 'chan_rules',
    serverId,
    name: 'kurallar',
    type: 'rules',
    topic: 'Topluluk kuralları ve resmi duyurular. Yalnızca yöneticiler yazabilir.',
    position: 0,
    isPrivate: false
  };

  const generalChannel: Channel = {
    id: 'chan_general',
    serverId,
    name: 'genel-sohbet',
    type: 'text',
    topic: 'Gerçek üyelerin anlık metin ve dosya sohbet alanı.',
    position: 1,
    isPrivate: false
  };

  const forumChannel: Channel = {
    id: 'chan_forum',
    serverId,
    name: 'forum-akisi',
    type: 'forum',
    topic: 'X/Twitter tarzı gönderiler, anketler ve fikir tartışmaları.',
    position: 2,
    isPrivate: false
  };

  const cinemaVoiceChannel: Channel = {
    id: 'chan_voice_cinema',
    serverId,
    name: '🎬 Sinema Salonu',
    type: 'voice',
    venueType: 'cinema',
    topic: '3D Sinema Salonu. Dev perdede YouTube videoları izleyip sesli sohbet edin.',
    position: 3,
    isPrivate: false,
    userLimit: 30
  };

  const clubVoiceChannel: Channel = {
    id: 'chan_voice_club',
    serverId,
    name: '🎧 Cyber Kulüp',
    type: 'voice',
    venueType: 'club',
    topic: '3D Cyber Gece Kulübü. Müzik klipleri, dans pisti ve neon atmosfer.',
    position: 4,
    isPrivate: false,
    userLimit: 30
  };

  const rooftopVoiceChannel: Channel = {
    id: 'chan_voice_rooftop',
    serverId,
    name: '🌌 Çatı Katı Lounge',
    type: 'voice',
    venueType: 'rooftop',
    topic: '3D Gece Manzaralı Çatı Katı. Yıldızlar altında açık hava ekranı ve sohbet.',
    position: 5,
    isPrivate: false,
    userLimit: 30
  };

  db.channels = [
    rulesChannel,
    generalChannel,
    forumChannel,
    cinemaVoiceChannel,
    clubVoiceChannel,
    rooftopVoiceChannel
  ];

  // 5. Zero fake/mock messages - Real users write their own messages!
  db.messages = [];
  db.forumPosts = [];
  db.forumComments = [];

  // 6. Permanent Invite
  db.invites = [
    {
      code: 'nexus',
      serverId,
      creatorId: user1.id,
      maxUses: 0,
      uses: 0,
      createdAt: now
    }
  ];

  saveDB();
}

loadDB();

// Global Voice Participants State (Channel-based)
let voiceParticipants: VoiceParticipant[] = [];

// Global 3D Spatial Venue state
const venuePlayers = new Map<string, any>(); // userId -> VenuePlayerState
const venueVideos = new Map<string, any>(); // channelId -> VenueVideoState

// Pre-configured default YouTube video for Cinema & Club
venueVideos.set('chan_voice_cinema', {
  channelId: 'chan_voice_cinema',
  videoId: 'L_LUpnjgPso',
  videoTitle: 'Cyberpunk 2077 — Night City Cinematic',
  isPlaying: true,
  timestamp: 0,
  updatedBy: 'Sistem'
});

venueVideos.set('chan_voice_club', {
  channelId: 'chan_voice_club',
  videoId: 'jfKfPfyJRdk',
  videoTitle: 'Synthwave Radio — Lofi & Beats',
  isPlaying: true,
  timestamp: 0,
  updatedBy: 'Sistem'
});

// Setup Express app and HTTP server
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage for uploads (25MB limit)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Auth Helper
function getAuthUser(req: Request): UserProfile | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  // For this self-contained platform, token is the user ID or a signed token
  const user = db.users.find(u => u.id === token);
  return user || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).user = user;
  next();
}

// Permission checking engine
function hasPermission(userId: string, serverId: string, permission: string): boolean {
  const server = db.servers.find(s => s.id === serverId);
  if (!server) return false;
  if (server.ownerId === userId) return true; // Owner has all permissions

  const member = db.members.find(m => m.serverId === serverId && m.userId === userId);
  if (!member) return false;

  const serverRoles = db.roles.filter(r => r.serverId === serverId);
  const userRoles = serverRoles.filter(r => member.roleIds.includes(r.id) || r.name === '@everyone');

  for (const role of userRoles) {
    if (role.permissions.includes('Administrator' as any)) return true;
    if (role.permissions.includes(permission as any)) return true;
  }
  return false;
}

function canViewChannel(userId: string, channel: Channel): boolean {
  if (!channel.isPrivate) return true;
  const server = db.servers.find(s => s.id === channel.serverId);
  if (server?.ownerId === userId) return true;
  if (!channel.allowedRoleIds || channel.allowedRoleIds.length === 0) return true;

  const member = db.members.find(m => m.serverId === channel.serverId && m.userId === userId);
  if (!member) return false;

  const serverRoles = db.roles.filter(r => r.serverId === channel.serverId);
  const userRoles = serverRoles.filter(r => member.roleIds.includes(r.id));
  if (userRoles.some(r => r.permissions.includes('Administrator' as any))) return true;

  return member.roleIds.some(roleId => channel.allowedRoleIds?.includes(roleId));
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, username, displayName } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, username, and password are required' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const newUser: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email,
    username: username.toLowerCase().trim(),
    displayName: displayName || username,
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
    bio: '',
    status: 'online',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.passwords[newUser.id] = password;

  // Auto-join default public server if exists
  const nexusServer = db.servers.find(s => s.id === 'srv_nocturne_nexus');
  if (nexusServer) {
    const everyoneRole = db.roles.find(r => r.serverId === nexusServer.id && r.name === '@everyone');
    db.members.push({
      userId: newUser.id,
      serverId: nexusServer.id,
      joinedAt: new Date().toISOString(),
      roleIds: everyoneRole ? [everyoneRole.id] : []
    });
  }

  saveDB();
  broadcast({ type: 'PRESENCE_UPDATE', payload: { userId: newUser.id, status: 'online' } });

  res.json({ token: newUser.id, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase());
  if (!user || db.passwords[user.id] !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  user.status = 'online';
  saveDB();
  broadcast({ type: 'PRESENCE_UPDATE', payload: { userId: user.id, status: 'online' } });

  res.json({ token: user.id, user });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

app.patch('/api/auth/profile', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const { displayName, avatarUrl, bannerUrl, bio, status, customStatus } = req.body;

  if (displayName) user.displayName = displayName;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (bannerUrl !== undefined) user.bannerUrl = bannerUrl;
  if (bio !== undefined) user.bio = bio;
  if (status && ['online', 'idle', 'offline'].includes(status)) user.status = status;
  if (customStatus !== undefined) user.customStatus = customStatus;

  saveDB();
  broadcast({ type: 'PRESENCE_UPDATE', payload: { userId: user.id, status: user.status } });
  res.json({ user });
});

app.get('/api/users', (_req, res) => {
  res.json({ users: db.users });
});

app.get('/api/download-zip', (_req, res) => {
  const zipPath = path.join(__dirname, 'public', 'nocturne-app.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'nocturne-app.zip');
  } else {
    res.status(404).json({ error: 'Zip file not found' });
  }
});

app.get('/nocturne-app.zip', (_req, res) => {
  const zipPath = path.join(__dirname, 'public', 'nocturne-app.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'nocturne-app.zip');
  } else {
    res.status(404).json({ error: 'Zip file not found' });
  }
});

app.get('/api/users/:id/forum', (req, res) => {
  const targetId = req.params.id;
  const posts = db.forumPosts.filter(p => p.authorId === targetId);
  const comments = db.forumComments.filter(c => c.authorId === targetId);
  const likes = db.forumPosts.filter(p => p.likes.includes(targetId));
  res.json({ posts, comments, likes });
});

// --- Server Routes ---
app.get('/api/servers', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const userMemberServerIds = db.members.filter(m => m.userId === user.id).map(m => m.serverId);
  const servers = db.servers.filter(s => userMemberServerIds.includes(s.id) || s.ownerId === user.id);
  res.json({ servers });
});

app.get('/api/servers/discover', (_req, res) => {
  const publicServers = db.servers.filter(s => s.isPublic);
  const withCounts = publicServers.map(s => {
    const memberCount = db.members.filter(m => m.serverId === s.id).length;
    return { ...s, memberCount };
  });
  res.json({ servers: withCounts });
});

app.post('/api/servers', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const { name, iconUrl, bannerUrl, description, themeColor, isPublic, discoverCategory } = req.body;
  if (!name) return res.status(400).json({ error: 'Server name is required' });

  const now = new Date().toISOString();
  const serverId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newServer: Server = {
    id: serverId,
    name,
    iconUrl,
    bannerUrl,
    description: description || '',
    ownerId: user.id,
    isPublic: Boolean(isPublic),
    discoverCategory: discoverCategory || 'Community',
    theme: {
      accentColor: themeColor || '#2563ff',
      bannerTint: 'rgba(37, 99, 255, 0.2)'
    },
    createdAt: now
  };

  db.servers.push(newServer);

  // Auto create @everyone role and Admin role
  const adminRole: Role = {
    id: `role_${Date.now()}_admin`,
    serverId,
    name: 'Admin',
    color: '#3b82f6',
    position: 1,
    hoist: true,
    permissions: [
      'Administrator',
      'View Channels',
      'Send Messages',
      'Attach Files',
      'Add Reactions',
      'Create Polls',
      'Create Forum Posts',
      'Create Voice Rooms',
      'Connect/Speak in Voice',
      'Manage Channels',
      'Manage Roles',
      'Manage Messages',
      'Manage Server',
      'Create Invites',
      'Kick Members'
    ]
  };

  const everyoneRole: Role = {
    id: `role_${Date.now()}_everyone`,
    serverId,
    name: '@everyone',
    color: '#94a3b8',
    position: 2,
    hoist: false,
    permissions: [
      'View Channels',
      'Send Messages',
      'Attach Files',
      'Add Reactions',
      'Create Polls',
      'Create Forum Posts',
      'Connect/Speak in Voice',
      'Create Invites'
    ]
  };

  db.roles.push(adminRole, everyoneRole);

  // Creator becomes member with Admin role
  db.members.push({
    userId: user.id,
    serverId,
    joinedAt: now,
    roleIds: [adminRole.id]
  });

  // Auto-create standard channels: #rules (owner posting), #general (text), #forum (forum), Lounge (voice)
  const rulesChannel: Channel = {
    id: `chan_${Date.now()}_rules`,
    serverId,
    name: 'rules',
    type: 'rules',
    topic: 'Server rules and announcements. Owner posting only.',
    position: 0,
    isPrivate: false
  };

  const generalChannel: Channel = {
    id: `chan_${Date.now()}_general`,
    serverId,
    name: 'general',
    type: 'text',
    topic: 'General chat room',
    position: 1,
    isPrivate: false
  };

  const forumChannel: Channel = {
    id: `chan_${Date.now()}_forum`,
    serverId,
    name: 'forum',
    type: 'forum',
    topic: 'Public discussions and threads',
    position: 2,
    isPrivate: false
  };

  const voiceChannel: Channel = {
    id: `chan_${Date.now()}_voice`,
    serverId,
    name: 'Lounge',
    type: 'voice',
    position: 3,
    isPrivate: false,
    userLimit: 25
  };

  db.channels.push(rulesChannel, generalChannel, forumChannel, voiceChannel);

  // Create default invite
  const inviteCode = Math.random().toString(36).substring(2, 8);
  db.invites.push({
    code: inviteCode,
    serverId,
    creatorId: user.id,
    maxUses: 0,
    uses: 0,
    createdAt: now
  });

  saveDB();
  broadcast({ type: 'SERVER_UPDATE', payload: newServer });

  res.json({
    server: newServer,
    channels: [rulesChannel, generalChannel, forumChannel, voiceChannel],
    inviteCode
  });
});

app.get('/api/servers/:id', requireAuth, (req, res) => {
  const server = db.servers.find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  const memberCount = db.members.filter(m => m.serverId === server.id).length;
  res.json({ server: { ...server, memberCount } });
});

app.patch('/api/servers/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const server = db.servers.find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  if (server.ownerId !== user.id && !hasPermission(user.id, server.id, 'Manage Server')) {
    return res.status(403).json({ error: 'Missing Manage Server permission' });
  }

  const { name, iconUrl, bannerUrl, description, isPublic, discoverCategory, theme } = req.body;
  if (name) server.name = name;
  if (iconUrl !== undefined) server.iconUrl = iconUrl;
  if (bannerUrl !== undefined) server.bannerUrl = bannerUrl;
  if (description !== undefined) server.description = description;
  if (isPublic !== undefined) server.isPublic = Boolean(isPublic);
  if (discoverCategory !== undefined) server.discoverCategory = discoverCategory;
  if (theme) server.theme = { ...server.theme, ...theme };

  saveDB();
  broadcast({ type: 'SERVER_UPDATE', payload: server });
  res.json({ server });
});

app.delete('/api/servers/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const server = db.servers.find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  if (server.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the server owner can delete the server' });
  }

  db.servers = db.servers.filter(s => s.id !== server.id);
  db.members = db.members.filter(m => m.serverId !== server.id);
  db.channels = db.channels.filter(c => c.serverId !== server.id);
  db.roles = db.roles.filter(r => r.serverId !== server.id);
  db.messages = db.messages.filter(m => m.serverId !== server.id);
  db.forumPosts = db.forumPosts.filter(p => p.serverId !== server.id);
  db.invites = db.invites.filter(i => i.serverId !== server.id);

  saveDB();
  res.json({ success: true });
});

app.post('/api/servers/:id/join', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;
  const server = db.servers.find(s => s.id === serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const existing = db.members.find(m => m.serverId === serverId && m.userId === user.id);
  if (!existing) {
    const everyoneRole = db.roles.find(r => r.serverId === serverId && r.name === '@everyone');
    db.members.push({
      userId: user.id,
      serverId,
      joinedAt: new Date().toISOString(),
      roleIds: everyoneRole ? [everyoneRole.id] : []
    });
    saveDB();
  }
  res.json({ success: true, server });
});

app.post('/api/servers/:id/leave', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;
  const server = db.servers.find(s => s.id === serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  if (server.ownerId === user.id) {
    return res.status(400).json({ error: 'Server owner cannot leave. Transfer ownership or delete server.' });
  }

  db.members = db.members.filter(m => !(m.serverId === serverId && m.userId === user.id));
  saveDB();
  res.json({ success: true });
});

app.get('/api/servers/:id/members', requireAuth, (req, res) => {
  const serverId = req.params.id;
  const serverMembers = db.members.filter(m => m.serverId === serverId);
  const result = serverMembers.map(m => {
    const profile = db.users.find(u => u.id === m.userId);
    const memberRoles = db.roles.filter(r => r.serverId === serverId && m.roleIds.includes(r.id));
    return {
      ...m,
      user: profile,
      roles: memberRoles
    };
  });
  res.json({ members: result });
});

app.patch('/api/servers/:id/members/:userId/roles', requireAuth, (req, res) => {
  const requester = (req as any).user as UserProfile;
  const { id: serverId, userId } = req.params;
  const { roleIds } = req.body;

  const server = db.servers.find(s => s.id === serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  if (server.ownerId !== requester.id && !hasPermission(requester.id, serverId, 'Manage Roles')) {
    return res.status(403).json({ error: 'Missing Manage Roles permission' });
  }

  const member = db.members.find(m => m.serverId === serverId && m.userId === userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  member.roleIds = roleIds || [];
  saveDB();
  res.json({ success: true, member });
});

app.delete('/api/servers/:id/members/:userId', requireAuth, (req, res) => {
  const requester = (req as any).user as UserProfile;
  const { id: serverId, userId } = req.params;

  const server = db.servers.find(s => s.id === serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  if (server.ownerId === userId) {
    return res.status(400).json({ error: 'Cannot kick server owner' });
  }

  if (server.ownerId !== requester.id && !hasPermission(requester.id, serverId, 'Kick Members')) {
    return res.status(403).json({ error: 'Missing Kick Members permission' });
  }

  db.members = db.members.filter(m => !(m.serverId === serverId && m.userId === userId));
  saveDB();
  res.json({ success: true });
});

// --- Channels Routes ---
app.get('/api/servers/:id/channels', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;
  const serverChannels = db.channels.filter(c => c.serverId === serverId);

  // Filter channels based on role permissions (Private channels enforcement)
  const accessibleChannels = serverChannels.filter(c => canViewChannel(user.id, c));
  accessibleChannels.sort((a, b) => a.position - b.position);

  res.json({ channels: accessibleChannels });
});

app.post('/api/servers/:id/channels', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;
  const { name, type, topic, isPrivate, allowedRoleIds, userLimit } = req.body;

  if (!hasPermission(user.id, serverId, 'Manage Channels') && type !== 'voice') {
    return res.status(403).json({ error: 'Missing Manage Channels permission' });
  }
  if (type === 'voice' && !hasPermission(user.id, serverId, 'Create Voice Rooms') && !hasPermission(user.id, serverId, 'Manage Channels')) {
    return res.status(403).json({ error: 'Missing Create Voice Rooms permission' });
  }

  const existingCount = db.channels.filter(c => c.serverId === serverId).length;
  const newChannel: Channel = {
    id: `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    serverId,
    name: name.toLowerCase().replace(/\s+/g, '-'),
    type: type || 'text',
    topic: topic || '',
    position: existingCount,
    isPrivate: Boolean(isPrivate),
    allowedRoleIds: allowedRoleIds || [],
    userLimit: type === 'voice' ? (userLimit ? Number(userLimit) : 0) : undefined
  };

  db.channels.push(newChannel);
  saveDB();
  broadcast({ type: 'CHANNEL_UPDATE', payload: newChannel });

  res.json({ channel: newChannel });
});

app.patch('/api/channels/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const channel = db.channels.find(c => c.id === req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  if (!hasPermission(user.id, channel.serverId, 'Manage Channels')) {
    return res.status(403).json({ error: 'Missing Manage Channels permission' });
  }

  const { name, topic, isPrivate, allowedRoleIds, userLimit } = req.body;
  if (name) channel.name = name.toLowerCase().replace(/\s+/g, '-');
  if (topic !== undefined) channel.topic = topic;
  if (isPrivate !== undefined) channel.isPrivate = Boolean(isPrivate);
  if (allowedRoleIds !== undefined) channel.allowedRoleIds = allowedRoleIds;
  if (userLimit !== undefined && channel.type === 'voice') channel.userLimit = Number(userLimit);

  saveDB();
  broadcast({ type: 'CHANNEL_UPDATE', payload: channel });
  res.json({ channel });
});

app.delete('/api/channels/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const channel = db.channels.find(c => c.id === req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  if (!hasPermission(user.id, channel.serverId, 'Manage Channels')) {
    return res.status(403).json({ error: 'Missing Manage Channels permission' });
  }

  db.channels = db.channels.filter(c => c.id !== channel.id);
  db.messages = db.messages.filter(m => m.channelId !== channel.id);
  db.forumPosts = db.forumPosts.filter(p => p.channelId !== channel.id);

  saveDB();
  broadcast({ type: 'CHANNEL_DELETE', payload: { channelId: channel.id, serverId: channel.serverId } });
  res.json({ success: true });
});

// --- Chat Messages Routes ---
app.get('/api/channels/:id/messages', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const channelId = req.params.id;
  const channel = db.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  if (!canViewChannel(user.id, channel)) {
    return res.status(403).json({ error: 'Access denied to this channel' });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  let messages = db.messages.filter(m => m.channelId === channelId);
  messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (before) {
    const targetIdx = messages.findIndex(m => m.id === before);
    if (targetIdx !== -1) {
      messages = messages.slice(Math.max(0, targetIdx - limit), targetIdx);
    }
  } else {
    messages = messages.slice(-limit);
  }

  res.json({ messages });
});

app.post('/api/channels/:id/messages', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const channelId = req.params.id;
  const channel = db.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  if (!canViewChannel(user.id, channel)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Rules channel restriction: Owner only posting
  const server = db.servers.find(s => s.id === channel.serverId);
  if (channel.type === 'rules' && server?.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the server owner can post in the rules channel' });
  }

  if (!hasPermission(user.id, channel.serverId, 'Send Messages')) {
    return res.status(403).json({ error: 'Missing Send Messages permission' });
  }

  const { content, attachments, replyToId, poll } = req.body;
  if (!content && (!attachments || attachments.length === 0) && !poll) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (attachments && attachments.length > 0 && !hasPermission(user.id, channel.serverId, 'Attach Files')) {
    return res.status(403).json({ error: 'Missing Attach Files permission' });
  }

  if (poll && !hasPermission(user.id, channel.serverId, 'Create Polls')) {
    return res.status(403).json({ error: 'Missing Create Polls permission' });
  }

  let replyToMessage;
  if (replyToId) {
    const parent = db.messages.find(m => m.id === replyToId);
    if (parent) {
      const parentAuthor = db.users.find(u => u.id === parent.authorId);
      replyToMessage = {
        id: parent.id,
        authorName: parentAuthor ? parentAuthor.displayName : 'Unknown',
        content: parent.content
      };
    }
  }

  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId,
    serverId: channel.serverId,
    authorId: user.id,
    content: content || '',
    attachments: attachments || [],
    replyToId,
    replyToMessage,
    poll: poll
      ? {
          id: `poll_${Date.now()}`,
          question: poll.question,
          options: (poll.options || []).map((text: string, idx: number) => ({
            id: `opt_${idx}`,
            text,
            voterIds: []
          })),
          creatorId: user.id,
          isMultiChoice: Boolean(poll.isMultiChoice),
          isAnonymous: Boolean(poll.isAnonymous),
          isClosed: false,
          createdAt: new Date().toISOString()
        }
      : undefined,
    createdAt: new Date().toISOString()
  };

  db.messages.push(newMessage);
  saveDB();

  broadcast({ type: 'MESSAGE_CREATE', payload: newMessage });
  res.json({ message: newMessage });
});

app.patch('/api/messages/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const msg = db.messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (msg.authorId !== user.id) {
    return res.status(403).json({ error: 'Cannot edit messages from other authors' });
  }

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content cannot be empty' });

  msg.content = content;
  msg.editedAt = new Date().toISOString();
  saveDB();

  broadcast({ type: 'MESSAGE_UPDATE', payload: msg });
  res.json({ message: msg });
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const msg = db.messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const isAuthor = msg.authorId === user.id;
  const canManage = hasPermission(user.id, msg.serverId, 'Manage Messages');

  if (!isAuthor && !canManage) {
    return res.status(403).json({ error: 'Missing permission to delete this message' });
  }

  db.messages = db.messages.filter(m => m.id !== msg.id);
  saveDB();

  broadcast({ type: 'MESSAGE_DELETE', payload: { messageId: msg.id, channelId: msg.channelId } });
  res.json({ success: true });
});

app.post('/api/messages/:id/reactions', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  const msg = db.messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (!hasPermission(user.id, msg.serverId, 'Add Reactions')) {
    return res.status(403).json({ error: 'Missing Add Reactions permission' });
  }

  if (!msg.reactions) msg.reactions = [];

  let reaction = msg.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    if (reaction.userIds.includes(user.id)) {
      reaction.userIds = reaction.userIds.filter(id => id !== user.id);
      if (reaction.userIds.length === 0) {
        msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      reaction.userIds.push(user.id);
    }
  } else {
    msg.reactions.push({ emoji, userIds: [user.id] });
  }

  saveDB();
  broadcast({
    type: 'MESSAGE_REACTION',
    payload: { messageId: msg.id, channelId: msg.channelId, reactions: msg.reactions }
  });

  res.json({ reactions: msg.reactions });
});

// --- Poll Voting Routes ---
app.post('/api/polls/:id/vote', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const pollId = req.params.id;
  const { optionId } = req.body;

  // Search in chat messages or forum posts
  let poll: Poll | undefined;
  let parentMsg: Message | undefined;
  let parentPost: ForumPost | undefined;

  for (const m of db.messages) {
    if (m.poll && m.poll.id === pollId) {
      poll = m.poll;
      parentMsg = m;
      break;
    }
  }
  if (!poll) {
    for (const p of db.forumPosts) {
      if (p.poll && p.poll.id === pollId) {
        poll = p.poll;
        parentPost = p;
        break;
      }
    }
  }

  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.isClosed) return res.status(400).json({ error: 'Poll is closed' });

  const targetOption = poll.options.find(o => o.id === optionId);
  if (!targetOption) return res.status(404).json({ error: 'Option not found' });

  if (poll.isMultiChoice) {
    if (targetOption.voterIds.includes(user.id)) {
      targetOption.voterIds = targetOption.voterIds.filter(id => id !== user.id);
    } else {
      targetOption.voterIds.push(user.id);
    }
  } else {
    // Single choice: remove from other options
    for (const opt of poll.options) {
      opt.voterIds = opt.voterIds.filter(id => id !== user.id);
    }
    targetOption.voterIds.push(user.id);
  }

  saveDB();

  if (parentMsg) {
    broadcast({ type: 'MESSAGE_UPDATE', payload: parentMsg });
  } else if (parentPost) {
    broadcast({ type: 'FORUM_POST_UPDATE', payload: parentPost });
  }

  res.json({ poll });
});

app.post('/api/polls/:id/close', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const pollId = req.params.id;

  let poll: Poll | undefined;
  let serverId = '';
  let parentMsg: Message | undefined;
  let parentPost: ForumPost | undefined;

  for (const m of db.messages) {
    if (m.poll && m.poll.id === pollId) {
      poll = m.poll;
      serverId = m.serverId;
      parentMsg = m;
      break;
    }
  }
  if (!poll) {
    for (const p of db.forumPosts) {
      if (p.poll && p.poll.id === pollId) {
        poll = p.poll;
        serverId = p.serverId;
        parentPost = p;
        break;
      }
    }
  }

  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  const isCreator = poll.creatorId === user.id;
  const canManage = hasPermission(user.id, serverId, 'Manage Messages');

  if (!isCreator && !canManage) {
    return res.status(403).json({ error: 'Only creator or moderator can close this poll' });
  }

  poll.isClosed = true;
  saveDB();

  if (parentMsg) {
    broadcast({ type: 'MESSAGE_UPDATE', payload: parentMsg });
  } else if (parentPost) {
    broadcast({ type: 'FORUM_POST_UPDATE', payload: parentPost });
  }

  res.json({ poll });
});

// --- Forum Channel Routes (Twitter/X Style - PART 1) ---
app.get('/api/channels/:id/forum/posts', requireAuth, (req, res) => {
  const channelId = req.params.id;
  const sort = (req.query.sort as string) || 'latest'; // 'latest' | 'top'
  const limit = parseInt(req.query.limit as string) || 20;

  let posts = db.forumPosts.filter(p => p.channelId === channelId);

  if (sort === 'top') {
    // Ranked by (likeCount + replyCount + repostCount)
    posts.sort((a, b) => {
      const scoreA = (a.likeCount || 0) * 2 + (a.replyCount || 0) * 3 + (a.repostCount || 0);
      const scoreB = (b.likeCount || 0) * 2 + (b.replyCount || 0) * 3 + (b.repostCount || 0);
      return scoreB - scoreA;
    });
  } else {
    // Pinned posts first, then newest
    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  posts = posts.slice(0, limit);
  res.json({ posts });
});

app.post('/api/channels/:id/forum/posts', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const channelId = req.params.id;
  const channel = db.channels.find(c => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  if (!hasPermission(user.id, channel.serverId, 'Create Forum Posts')) {
    return res.status(403).json({ error: 'Missing Create Forum Posts permission' });
  }

  const { content, media, gifUrl, poll } = req.body;
  if (!content && (!media || media.length === 0) && !gifUrl && !poll) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  if (content && content.length > 1000) {
    return res.status(400).json({ error: 'Content exceeds 1000 character limit' });
  }

  const newPost: ForumPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId,
    serverId: channel.serverId,
    authorId: user.id,
    content: content || '',
    media: media || [],
    gifUrl,
    poll: poll
      ? {
          id: `poll_${Date.now()}`,
          question: poll.question,
          options: (poll.options || []).map((text: string, idx: number) => ({
            id: `opt_${idx}`,
            text,
            voterIds: []
          })),
          creatorId: user.id,
          isMultiChoice: Boolean(poll.isMultiChoice),
          isAnonymous: Boolean(poll.isAnonymous),
          isClosed: false,
          createdAt: new Date().toISOString()
        }
      : undefined,
    replyCount: 0,
    likeCount: 0,
    repostCount: 0,
    likes: [],
    reposts: [],
    bookmarks: [],
    createdAt: new Date().toISOString()
  };

  db.forumPosts.unshift(newPost);
  saveDB();

  broadcast({ type: 'FORUM_POST_CREATE', payload: newPost });
  res.json({ post: newPost });
});

app.get('/api/forum/posts/:id', requireAuth, (req, res) => {
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Get comments and organize hierarchy
  const comments = db.forumComments.filter(c => c.postId === post.id);
  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Attach author profiles
  const postAuthor = db.users.find(u => u.id === post.authorId);
  const commentsWithAuthors = comments.map(c => ({
    ...c,
    author: db.users.find(u => u.id === c.authorId)
  }));

  res.json({
    post: { ...post, author: postAuthor },
    comments: commentsWithAuthors
  });
});

app.patch('/api/forum/posts/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (post.authorId !== user.id) {
    return res.status(403).json({ error: 'Only author can edit post' });
  }

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content cannot be empty' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content exceeds 1000 characters' });

  post.content = content;
  post.editedAt = new Date().toISOString();
  saveDB();

  broadcast({ type: 'FORUM_POST_UPDATE', payload: post });
  res.json({ post });
});

app.delete('/api/forum/posts/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const isAuthor = post.authorId === user.id;
  const canManage = hasPermission(user.id, post.serverId, 'Manage Messages');

  if (!isAuthor && !canManage) {
    return res.status(403).json({ error: 'Missing permission to delete post' });
  }

  db.forumPosts = db.forumPosts.filter(p => p.id !== post.id);
  db.forumComments = db.forumComments.filter(c => c.postId !== post.id);
  saveDB();

  broadcast({ type: 'FORUM_POST_DELETE', payload: { postId: post.id, channelId: post.channelId } });
  res.json({ success: true });
});

app.post('/api/forum/posts/:id/like', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const hasLiked = post.likes.includes(user.id);
  if (hasLiked) {
    post.likes = post.likes.filter(id => id !== user.id);
  } else {
    post.likes.push(user.id);
  }
  post.likeCount = post.likes.length;
  saveDB();

  broadcast({ type: 'FORUM_POST_UPDATE', payload: post });
  res.json({ likes: post.likes, likeCount: post.likeCount });
});

app.post('/api/forum/posts/:id/repost', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const hasReposted = post.reposts.includes(user.id);
  if (hasReposted) {
    post.reposts = post.reposts.filter(id => id !== user.id);
  } else {
    post.reposts.push(user.id);
  }
  post.repostCount = post.reposts.length;
  saveDB();

  broadcast({ type: 'FORUM_POST_UPDATE', payload: post });
  res.json({ reposts: post.reposts, repostCount: post.repostCount });
});

app.post('/api/forum/posts/:id/bookmark', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const hasBookmarked = post.bookmarks.includes(user.id);
  if (hasBookmarked) {
    post.bookmarks = post.bookmarks.filter(id => id !== user.id);
  } else {
    post.bookmarks.push(user.id);
  }
  saveDB();

  res.json({ bookmarks: post.bookmarks });
});

app.post('/api/forum/posts/:id/pin', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (!hasPermission(user.id, post.serverId, 'Manage Messages')) {
    return res.status(403).json({ error: 'Missing permission to pin post' });
  }

  post.isPinned = !post.isPinned;
  saveDB();

  broadcast({ type: 'FORUM_POST_UPDATE', payload: post });
  res.json({ isPinned: post.isPinned });
});

// Forum Comments & Nested Replies
app.post('/api/forum/posts/:id/comments', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const post = db.forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { content, parentCommentId, media, gifUrl } = req.body;
  if (!content && (!media || media.length === 0) && !gifUrl) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  const comment: ForumComment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    postId: post.id,
    parentCommentId: parentCommentId || null,
    authorId: user.id,
    content: content || '',
    media: media || [],
    gifUrl,
    likeCount: 0,
    likes: [],
    createdAt: new Date().toISOString()
  };

  db.forumComments.push(comment);
  post.replyCount = db.forumComments.filter(c => c.postId === post.id).length;
  saveDB();

  broadcast({ type: 'FORUM_COMMENT_CREATE', payload: { postId: post.id, comment } });
  broadcast({ type: 'FORUM_POST_UPDATE', payload: post });

  res.json({ comment });
});

app.patch('/api/forum/comments/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const comment = db.forumComments.find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.authorId !== user.id) {
    return res.status(403).json({ error: 'Only comment author can edit' });
  }

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content cannot be empty' });

  comment.content = content;
  comment.editedAt = new Date().toISOString();
  saveDB();

  broadcast({ type: 'FORUM_COMMENT_UPDATE', payload: { postId: comment.postId, comment } });
  res.json({ comment });
});

app.delete('/api/forum/comments/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const comment = db.forumComments.find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const post = db.forumPosts.find(p => p.id === comment.postId);
  const isAuthor = comment.authorId === user.id;
  const canManage = post ? hasPermission(user.id, post.serverId, 'Manage Messages') : false;

  if (!isAuthor && !canManage) {
    return res.status(403).json({ error: 'Missing permission to delete comment' });
  }

  db.forumComments = db.forumComments.filter(c => c.id !== comment.id && c.parentCommentId !== comment.id);
  if (post) {
    post.replyCount = db.forumComments.filter(c => c.postId === post.id).length;
  }
  saveDB();

  broadcast({ type: 'FORUM_COMMENT_DELETE', payload: { postId: comment.postId, commentId: comment.id } });
  if (post) broadcast({ type: 'FORUM_POST_UPDATE', payload: post });

  res.json({ success: true });
});

app.post('/api/forum/comments/:id/like', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const comment = db.forumComments.find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const hasLiked = comment.likes.includes(user.id);
  if (hasLiked) {
    comment.likes = comment.likes.filter(id => id !== user.id);
  } else {
    comment.likes.push(user.id);
  }
  comment.likeCount = comment.likes.length;
  saveDB();

  broadcast({ type: 'FORUM_COMMENT_UPDATE', payload: { postId: comment.postId, comment } });
  res.json({ likes: comment.likes, likeCount: comment.likeCount });
});

// --- Server Roles Management Routes ---
app.get('/api/servers/:id/roles', requireAuth, (req, res) => {
  const serverId = req.params.id;
  const roles = db.roles.filter(r => r.serverId === serverId);
  roles.sort((a, b) => a.position - b.position);
  res.json({ roles });
});

app.post('/api/servers/:id/roles', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;

  if (!hasPermission(user.id, serverId, 'Manage Roles')) {
    return res.status(403).json({ error: 'Missing Manage Roles permission' });
  }

  const { name, color, hoist, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });

  const existingRoles = db.roles.filter(r => r.serverId === serverId);
  const newRole: Role = {
    id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    serverId,
    name,
    color: color || '#3b82f6',
    position: existingRoles.length + 1,
    hoist: Boolean(hoist),
    permissions: permissions || ['View Channels', 'Send Messages']
  };

  db.roles.push(newRole);
  saveDB();

  broadcast({ type: 'ROLE_UPDATE', payload: { serverId, roles: db.roles.filter(r => r.serverId === serverId) } });
  res.json({ role: newRole });
});

app.patch('/api/roles/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const role = db.roles.find(r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found' });

  if (!hasPermission(user.id, role.serverId, 'Manage Roles')) {
    return res.status(403).json({ error: 'Missing Manage Roles permission' });
  }

  const { name, color, hoist, permissions, position } = req.body;
  if (name) role.name = name;
  if (color) role.color = color;
  if (hoist !== undefined) role.hoist = Boolean(hoist);
  if (permissions) role.permissions = permissions;
  if (position !== undefined) role.position = Number(position);

  saveDB();
  broadcast({
    type: 'ROLE_UPDATE',
    payload: { serverId: role.serverId, roles: db.roles.filter(r => r.serverId === role.serverId) }
  });
  res.json({ role });
});

app.delete('/api/roles/:id', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const role = db.roles.find(r => r.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found' });

  if (role.name === '@everyone') {
    return res.status(400).json({ error: 'Cannot delete default @everyone role' });
  }

  if (!hasPermission(user.id, role.serverId, 'Manage Roles')) {
    return res.status(403).json({ error: 'Missing Manage Roles permission' });
  }

  db.roles = db.roles.filter(r => r.id !== role.id);
  // Remove from member roles
  for (const m of db.members) {
    m.roleIds = m.roleIds.filter(id => id !== role.id);
  }
  saveDB();

  broadcast({
    type: 'ROLE_UPDATE',
    payload: { serverId: role.serverId, roles: db.roles.filter(r => r.serverId === role.serverId) }
  });
  res.json({ success: true });
});

// --- Invites Routes ---
app.post('/api/servers/:id/invites', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const serverId = req.params.id;

  if (!hasPermission(user.id, serverId, 'Create Invites')) {
    return res.status(403).json({ error: 'Missing Create Invites permission' });
  }

  const { maxUses, expiryDays } = req.body;
  const code = Math.random().toString(36).substring(2, 9);
  let expiresAt: string | undefined;

  if (expiryDays && expiryDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + Number(expiryDays));
    expiresAt = expDate.toISOString();
  }

  const invite: ServerInvite = {
    code,
    serverId,
    creatorId: user.id,
    maxUses: Number(maxUses) || 0,
    uses: 0,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  db.invites.push(invite);
  saveDB();

  res.json({ invite });
});

app.get('/api/invites/:code', (req, res) => {
  const invite = db.invites.find(i => i.code === req.params.code);
  if (!invite) return res.status(404).json({ error: 'Invite link not found or expired' });

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Invite has expired' });
  }

  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    return res.status(410).json({ error: 'Invite has reached maximum uses' });
  }

  const server = db.servers.find(s => s.id === invite.serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const memberCount = db.members.filter(m => m.serverId === server.id).length;
  res.json({
    invite,
    server: {
      id: server.id,
      name: server.name,
      description: server.description,
      iconUrl: server.iconUrl,
      bannerUrl: server.bannerUrl,
      memberCount
    }
  });
});

app.post('/api/invites/:code/accept', requireAuth, (req, res) => {
  const user = (req as any).user as UserProfile;
  const invite = db.invites.find(i => i.code === req.params.code);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Invite has expired' });
  }

  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    return res.status(410).json({ error: 'Invite limit reached' });
  }

  const server = db.servers.find(s => s.id === invite.serverId);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  invite.uses += 1;

  const existingMember = db.members.find(m => m.serverId === server.id && m.userId === user.id);
  if (!existingMember) {
    const everyoneRole = db.roles.find(r => r.serverId === server.id && r.name === '@everyone');
    db.members.push({
      userId: user.id,
      serverId: server.id,
      joinedAt: new Date().toISOString(),
      roleIds: everyoneRole ? [everyoneRole.id] : []
    });
  }

  saveDB();
  res.json({ serverId: server.id });
});

// --- Uploads Endpoint (Photos, Videos, Files, Audio up to 25MB) ---
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file;
  const fileUrl = `/uploads/${file.filename}`;
  const mime = file.mimetype;

  let type: 'image' | 'video' | 'audio' | 'file' = 'file';
  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('video/')) type = 'video';
  else if (mime.startsWith('audio/')) type = 'audio';

  res.json({
    url: fileUrl,
    name: file.originalname,
    size: file.size,
    type
  });
});

// --- Giphy Proxy (No user API key required!) ---
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0P430'; // Giphy public beta key fallback

app.get('/api/giphy/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 24;
    const offset = parseInt(req.query.offset as string) || 0;
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Giphy responded with ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    // Curated high quality GIF fallback if Giphy network is unreachable
    res.json({
      data: [
        {
          id: 'wave_1',
          title: 'Hello Wave',
          images: {
            fixed_height: { url: 'https://media.giphy.com/media/bcKm48qLic6BIu7WQH/giphy.gif', width: '200', height: '200' },
            original: { url: 'https://media.giphy.com/media/bcKm48qLic6BIu7WQH/giphy.gif' }
          }
        },
        {
          id: 'celebrate_1',
          title: 'Celebration Neon',
          images: {
            fixed_height: { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', width: '200', height: '200' },
            original: { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' }
          }
        },
        {
          id: 'cyber_1',
          title: 'Cyber Vibes',
          images: {
            fixed_height: { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', width: '200', height: '200' },
            original: { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' }
          }
        }
      ]
    });
  }
});

app.get('/api/giphy/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 24;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!query) {
      return res.redirect('/api/giphy/trending');
    }

    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Giphy responded with ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ data: [] });
  }
});

// --- Voice Active Participants API ---
app.get('/api/voice/participants', (_req, res) => {
  res.json({ participants: voiceParticipants });
});

// -----------------------------------------------------------------------------
// WEBSOCKET SERVER & REALTIME ENGINE
// -----------------------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

const clients = new Set<ExtendedWebSocket>();

function broadcast(event: WSEvent | any) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Targeted send to a specific user
function sendToUser(userId: string, event: any) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(message);
    }
  }
}

wss.on('connection', (ws: ExtendedWebSocket) => {
  ws.isAlive = true;
  clients.add(ws);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        case 'AUTH': {
          const userId = data.userId;
          const user = db.users.find(u => u.id === userId);
          if (user) {
            ws.userId = userId;
            user.status = 'online';
            saveDB();
            ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { user } }));
            broadcast({ type: 'PRESENCE_UPDATE', payload: { userId, status: 'online' } });
            // Send current voice participants
            ws.send(JSON.stringify({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants }));
          }
          break;
        }

        case 'TYPING_START': {
          if (ws.userId && data.channelId) {
            const user = db.users.find(u => u.id === ws.userId);
            if (user) {
              broadcast({
                type: 'TYPING_START',
                payload: { channelId: data.channelId, userId: user.id, username: user.displayName || user.username }
              });
            }
          }
          break;
        }

        case 'VOICE_JOIN': {
          const { channelId, serverId } = data;
          if (!ws.userId || !channelId) return;

          // Remove user from any existing voice room first (one voice room at a time like Discord)
          voiceParticipants = voiceParticipants.filter(p => p.userId !== ws.userId);
          venuePlayers.delete(ws.userId);

          const participant: VoiceParticipant = {
            userId: ws.userId,
            channelId,
            serverId,
            joinedAt: new Date().toISOString(),
            isMuted: false,
            isDeafened: false,
            isSpeaking: false
          };
          voiceParticipants.push(participant);

          broadcast({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants });

          // Send current 3D players in this venue to the joining user
          const currentVenuePlayers = Array.from(venuePlayers.values()).filter(p => p.channelId === channelId);
          ws.send(JSON.stringify({
            type: 'VENUE_PLAYERS_SNAPSHOT',
            payload: { channelId, players: currentVenuePlayers }
          }));

          // Send current video if playing in this venue
          const currentVideo = venueVideos.get(channelId);
          if (currentVideo) {
            ws.send(JSON.stringify({ type: 'VENUE_VIDEO_SYNC', payload: currentVideo }));
          }
          break;
        }

        case 'VOICE_LEAVE': {
          if (ws.userId) {
            voiceParticipants = voiceParticipants.filter(p => p.userId !== ws.userId);
            const leftPlayer = venuePlayers.get(ws.userId);
            if (leftPlayer) {
              venuePlayers.delete(ws.userId);
              broadcast({ type: 'VENUE_PLAYER_LEAVE', payload: { channelId: leftPlayer.channelId, userId: ws.userId } });
            }
            broadcast({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants });
          }
          break;
        }

        case 'VENUE_PLAYER_SYNC': {
          const playerState = data.payload;
          if (ws.userId && playerState) {
            playerState.userId = ws.userId;
            venuePlayers.set(ws.userId, playerState);
            // Broadcast to other clients
            for (const client of clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'VENUE_PLAYER_SYNC', payload: playerState }));
              }
            }
          }
          break;
        }

        case 'VENUE_VIDEO_SYNC': {
          const videoState = data.payload;
          if (videoState && videoState.channelId) {
            venueVideos.set(videoState.channelId, videoState);
            broadcast({ type: 'VENUE_VIDEO_SYNC', payload: videoState });
          }
          break;
        }

        case 'VENUE_SCREENSHARE_SYNC': {
          const payload = data.payload;
          if (payload) {
            broadcast({ type: 'VENUE_SCREENSHARE_SYNC', payload });
          }
          break;
        }

        case 'VOICE_STATE': {
          // User updates their mute/deafen/speaking state
          if (ws.userId) {
            const participant = voiceParticipants.find(p => p.userId === ws.userId);
            if (participant) {
              if (data.isMuted !== undefined) participant.isMuted = Boolean(data.isMuted);
              if (data.isDeafened !== undefined) participant.isDeafened = Boolean(data.isDeafened);
              if (data.isSpeaking !== undefined) participant.isSpeaking = Boolean(data.isSpeaking);
              broadcast({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants });
            }
          }
          break;
        }

        case 'VOICE_MOD_ACTION': {
          // Moderator server mute / deafen / disconnect
          const { targetUserId, action } = data;
          if (!ws.userId) return;
          const target = voiceParticipants.find(p => p.userId === targetUserId);
          if (!target) return;

          if (hasPermission(ws.userId, target.serverId, 'Manage Messages')) {
            if (action === 'SERVER_MUTE') target.isServerMuted = !target.isServerMuted;
            if (action === 'SERVER_DEAFEN') target.isServerDeafened = !target.isServerDeafened;
            if (action === 'DISCONNECT') {
              voiceParticipants = voiceParticipants.filter(p => p.userId !== targetUserId);
              sendToUser(targetUserId, { type: 'VOICE_KICKED', channelId: target.channelId });
            }
            broadcast({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants });
          }
          break;
        }

        case 'VOICE_SIGNAL': {
          // WebRTC mesh signaling: offer, answer, ice-candidate
          const { toUserId, signal, channelId } = data;
          if (ws.userId && toUserId && signal) {
            sendToUser(toUserId, {
              type: 'VOICE_SIGNAL',
              payload: {
                fromUserId: ws.userId,
                toUserId,
                signal,
                channelId
              }
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (ws.userId) {
      // Clean up voice participation immediately so no ghost users remain!
      const wasInVoice = voiceParticipants.some(p => p.userId === ws.userId);
      if (wasInVoice) {
        voiceParticipants = voiceParticipants.filter(p => p.userId !== ws.userId);
        broadcast({ type: 'VOICE_STATE_UPDATE', payload: voiceParticipants });
      }

      // Check if user has other open tabs before setting offline
      const hasOtherTabs = Array.from(clients).some(c => c.userId === ws.userId);
      if (!hasOtherTabs) {
        const user = db.users.find(u => u.id === ws.userId);
        if (user) {
          user.status = 'offline';
          saveDB();
          broadcast({ type: 'PRESENCE_UPDATE', payload: { userId: user.id, status: 'offline' } });
        }
      }
    }
  });
});

// Periodic heartbeat to clean dead connections
const pingInterval = setInterval(() => {
  for (const client of clients) {
    if (!client.isAlive) {
      client.terminate();
      clients.delete(client);
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 20000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER OR STATIC SERVE
// -----------------------------------------------------------------------------
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nocturne] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
