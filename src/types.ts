/**
 * Nocturne Community Platform - Core Type Definitions
 */

export type OnlineStatus = 'online' | 'idle' | 'offline';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio?: string;
  status: OnlineStatus;
  customStatus?: string;
  createdAt: string;
}

export type Permission =
  | 'Administrator'
  | 'View Channels'
  | 'Send Messages'
  | 'Attach Files'
  | 'Add Reactions'
  | 'Create Polls'
  | 'Create Forum Posts'
  | 'Create Voice Rooms'
  | 'Connect/Speak in Voice'
  | 'Manage Channels'
  | 'Manage Roles'
  | 'Manage Messages'
  | 'Manage Server'
  | 'Create Invites'
  | 'Kick Members';

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  position: number;
  hoist: boolean; // display separately in member list
  permissions: Permission[];
}

export interface ServerMember {
  userId: string;
  serverId: string;
  joinedAt: string;
  nickname?: string;
  roleIds: string[];
}

export type ChannelType = 'text' | 'voice' | 'forum' | 'rules';
export type VenueType = 'cinema' | 'club' | 'rooftop';
export type CharacterType = 'scout' | 'runner' | 'nomad' | 'walker';

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  isPrivate: boolean;
  allowedRoleIds?: string[];
  userLimit?: number; // for voice
  venueType?: VenueType; // 3D spatial venue type for voice rooms
}

export interface VenuePlayerState {
  userId: string;
  channelId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  isMoving: boolean;
  characterType: CharacterType;
  isSitting?: boolean;
  isSpeaking?: boolean;
}

export interface VenueVideoState {
  channelId: string;
  videoId: string;
  videoTitle: string;
  isPlaying: boolean;
  timestamp: number;
  updatedBy: string;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string; // 'image' | 'video' | 'audio' | 'file'
  width?: number;
  height?: number;
}

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  isMultiChoice: boolean;
  isAnonymous: boolean;
  expiresAt?: string;
  isClosed: boolean;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyToId?: string;
  replyToMessage?: {
    id: string;
    authorName: string;
    content: string;
  };
  poll?: Poll;
  createdAt: string;
  editedAt?: string;
  isPinned?: boolean;
}

export interface ForumPostMedia {
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

export interface ForumPost {
  id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  media?: ForumPostMedia[];
  gifUrl?: string;
  poll?: Poll;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  likes: string[]; // user IDs who liked
  reposts: string[]; // user IDs who reposted
  bookmarks: string[]; // user IDs who bookmarked
  createdAt: string;
  editedAt?: string;
  isPinned?: boolean;
}

export interface ForumComment {
  id: string;
  postId: string;
  parentCommentId?: string | null;
  authorId: string;
  content: string;
  media?: ForumPostMedia[];
  gifUrl?: string;
  likeCount: number;
  likes: string[];
  createdAt: string;
  editedAt?: string;
  replies?: ForumComment[];
}

export interface VoiceParticipant {
  userId: string;
  channelId: string;
  serverId: string;
  joinedAt: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isServerMuted?: boolean;
  isServerDeafened?: boolean;
}

export interface ServerInvite {
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number; // 0 = unlimited
  uses: number;
  expiresAt?: string; // undefined = never
  createdAt: string;
}

export interface ServerTheme {
  accentColor: string;
  bannerTint?: string;
}

export interface UserPreferences {
  accentColor?: string;
  messageDensity: 'compact' | 'comfortable';
  fontSize: 'small' | 'medium' | 'large';
  soundEffects: boolean;
  pushToTalk: boolean;
  pushToTalkKey: string;
}

export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  bannerUrl?: string;
  description: string;
  ownerId: string;
  isPublic: boolean;
  discoverCategory?: string;
  theme: ServerTheme;
  createdAt: string;
}

// WebSocket Event Payloads
export type WSEvent =
  | { type: 'AUTH_SUCCESS'; payload: { user: UserProfile } }
  | { type: 'PRESENCE_UPDATE'; payload: { userId: string; status: OnlineStatus } }
  | { type: 'MESSAGE_CREATE'; payload: Message }
  | { type: 'MESSAGE_UPDATE'; payload: Message }
  | { type: 'MESSAGE_DELETE'; payload: { messageId: string; channelId: string } }
  | { type: 'MESSAGE_REACTION'; payload: { messageId: string; channelId: string; reactions: Reaction[] } }
  | { type: 'TYPING_START'; payload: { channelId: string; userId: string; username: string } }
  | { type: 'FORUM_POST_CREATE'; payload: ForumPost }
  | { type: 'FORUM_POST_UPDATE'; payload: ForumPost }
  | { type: 'FORUM_POST_DELETE'; payload: { postId: string; channelId: string } }
  | { type: 'FORUM_COMMENT_CREATE'; payload: { postId: string; comment: ForumComment } }
  | { type: 'FORUM_COMMENT_UPDATE'; payload: { postId: string; comment: ForumComment } }
  | { type: 'FORUM_COMMENT_DELETE'; payload: { postId: string; commentId: string } }
  | { type: 'VOICE_STATE_UPDATE'; payload: VoiceParticipant[] }
  | { type: 'VOICE_SIGNAL'; payload: { fromUserId: string; toUserId: string; signal: any; channelId: string } }
  | { type: 'VENUE_PLAYER_SYNC'; payload: VenuePlayerState }
  | { type: 'VENUE_PLAYERS_SNAPSHOT'; payload: { channelId: string; players: VenuePlayerState[] } }
  | { type: 'VENUE_PLAYER_LEAVE'; payload: { channelId: string; userId: string } }
  | { type: 'VENUE_VIDEO_SYNC'; payload: VenueVideoState }
  | { type: 'VENUE_SCREENSHARE_SYNC'; payload: { channelId: string; isSharing: boolean; sharerName: string; sharerId: string } }
  | { type: 'CHANNEL_UPDATE'; payload: Channel }
  | { type: 'CHANNEL_DELETE'; payload: { channelId: string; serverId: string } }
  | { type: 'SERVER_UPDATE'; payload: Server }
  | { type: 'ROLE_UPDATE'; payload: { serverId: string; roles: Role[] } };
