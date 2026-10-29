/**
 * Nocturne API Client
 */

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
  ServerInvite
} from '../types';

const TOKEN_KEY = 'nocturne_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // --- Auth ---
  async register(data: { email: string; password: string; username: string; displayName?: string }) {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  logout() {
    setStoredToken(null);
  },

  async getMe() {
    return request<{ user: UserProfile }>('/api/auth/me');
  },

  async updateProfile(updates: Partial<UserProfile>) {
    return request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async getUsers() {
    return request<{ users: UserProfile[] }>('/api/users');
  },

  async getUserForumProfile(userId: string) {
    return request<{ posts: ForumPost[]; comments: ForumComment[]; likes: ForumPost[] }>(`/api/users/${userId}/forum`);
  },

  // --- Servers ---
  async getServers() {
    return request<{ servers: Server[] }>('/api/servers');
  },

  async getDiscoverServers() {
    return request<{ servers: (Server & { memberCount: number })[] }>('/api/servers/discover');
  },

  async createServer(data: Partial<Server> & { themeColor?: string }) {
    return request<{ server: Server; channels: Channel[]; inviteCode: string }>('/api/servers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getServer(id: string) {
    return request<{ server: Server & { memberCount: number } }>(`/api/servers/${id}`);
  },

  async updateServer(id: string, updates: Partial<Server>) {
    return request<{ server: Server }>(`/api/servers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteServer(id: string) {
    return request<{ success: boolean }>(`/api/servers/${id}`, {
      method: 'DELETE'
    });
  },

  async joinServer(id: string) {
    return request<{ success: boolean; server: Server }>(`/api/servers/${id}/join`, {
      method: 'POST'
    });
  },

  async leaveServer(id: string) {
    return request<{ success: boolean }>(`/api/servers/${id}/leave`, {
      method: 'POST'
    });
  },

  async getServerMembers(serverId: string) {
    return request<{ members: (ServerMember & { user?: UserProfile; roles: Role[] })[] }>(
      `/api/servers/${serverId}/members`
    );
  },

  async updateMemberRoles(serverId: string, userId: string, roleIds: string[]) {
    return request<{ success: boolean; member: ServerMember }>(`/api/servers/${serverId}/members/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roleIds })
    });
  },

  async kickMember(serverId: string, userId: string) {
    return request<{ success: boolean }>(`/api/servers/${serverId}/members/${userId}`, {
      method: 'DELETE'
    });
  },

  // --- Channels ---
  async getChannels(serverId: string) {
    return request<{ channels: Channel[] }>(`/api/servers/${serverId}/channels`);
  },

  async createChannel(serverId: string, data: Partial<Channel>) {
    return request<{ channel: Channel }>(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateChannel(channelId: string, updates: Partial<Channel>) {
    return request<{ channel: Channel }>(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteChannel(channelId: string) {
    return request<{ success: boolean }>(`/api/channels/${channelId}`, {
      method: 'DELETE'
    });
  },

  // --- Chat Messages ---
  async getMessages(channelId: string, before?: string, limit = 50) {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    if (limit) params.set('limit', limit.toString());
    return request<{ messages: Message[] }>(`/api/channels/${channelId}/messages?${params.toString()}`);
  },

  async sendMessage(
    channelId: string,
    data: {
      content: string;
      attachments?: any[];
      replyToId?: string;
      poll?: { question: string; options: string[]; isMultiChoice?: boolean; isAnonymous?: boolean };
    }
  ) {
    return request<{ message: Message }>(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async editMessage(messageId: string, content: string) {
    return request<{ message: Message }>(`/api/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  },

  async deleteMessage(messageId: string) {
    return request<{ success: boolean }>(`/api/messages/${messageId}`, {
      method: 'DELETE'
    });
  },

  async toggleReaction(messageId: string, emoji: string) {
    return request<{ reactions: any[] }>(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  },

  // --- Polls ---
  async votePoll(pollId: string, optionId: string) {
    return request<{ poll: Poll }>(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId })
    });
  },

  async closePoll(pollId: string) {
    return request<{ poll: Poll }>(`/api/polls/${pollId}/close`, {
      method: 'POST'
    });
  },

  // --- Forum (PART 1) ---
  async getForumPosts(channelId: string, sort: 'latest' | 'top' = 'latest', limit = 20) {
    return request<{ posts: ForumPost[] }>(`/api/channels/${channelId}/forum/posts?sort=${sort}&limit=${limit}`);
  },

  async createForumPost(
    channelId: string,
    data: {
      content: string;
      media?: any[];
      gifUrl?: string;
      poll?: { question: string; options: string[]; isMultiChoice?: boolean; isAnonymous?: boolean };
    }
  ) {
    return request<{ post: ForumPost }>(`/api/channels/${channelId}/forum/posts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getForumPostThread(postId: string) {
    return request<{ post: ForumPost & { author?: UserProfile }; comments: (ForumComment & { author?: UserProfile })[] }>(
      `/api/forum/posts/${postId}`
    );
  },

  async editForumPost(postId: string, content: string) {
    return request<{ post: ForumPost }>(`/api/forum/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  },

  async deleteForumPost(postId: string) {
    return request<{ success: boolean }>(`/api/forum/posts/${postId}`, {
      method: 'DELETE'
    });
  },

  async toggleLikePost(postId: string) {
    return request<{ likes: string[]; likeCount: number }>(`/api/forum/posts/${postId}/like`, {
      method: 'POST'
    });
  },

  async toggleRepost(postId: string) {
    return request<{ reposts: string[]; repostCount: number }>(`/api/forum/posts/${postId}/repost`, {
      method: 'POST'
    });
  },

  async toggleBookmark(postId: string) {
    return request<{ bookmarks: string[] }>(`/api/forum/posts/${postId}/bookmark`, {
      method: 'POST'
    });
  },

  async togglePinPost(postId: string) {
    return request<{ isPinned: boolean }>(`/api/forum/posts/${postId}/pin`, {
      method: 'POST'
    });
  },

  async addForumComment(
    postId: string,
    data: { content: string; parentCommentId?: string | null; media?: any[]; gifUrl?: string }
  ) {
    return request<{ comment: ForumComment }>(`/api/forum/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async editForumComment(commentId: string, content: string) {
    return request<{ comment: ForumComment }>(`/api/forum/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  },

  async deleteForumComment(commentId: string) {
    return request<{ success: boolean }>(`/api/forum/comments/${commentId}`, {
      method: 'DELETE'
    });
  },

  async toggleLikeComment(commentId: string) {
    return request<{ likes: string[]; likeCount: number }>(`/api/forum/comments/${commentId}/like`, {
      method: 'POST'
    });
  },

  // --- Roles ---
  async getRoles(serverId: string) {
    return request<{ roles: Role[] }>(`/api/servers/${serverId}/roles`);
  },

  async createRole(serverId: string, roleData: Partial<Role>) {
    return request<{ role: Role }>(`/api/servers/${serverId}/roles`, {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
  },

  async updateRole(roleId: string, roleData: Partial<Role>) {
    return request<{ role: Role }>(`/api/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(roleData)
    });
  },

  async deleteRole(roleId: string) {
    return request<{ success: boolean }>(`/api/roles/${roleId}`, {
      method: 'DELETE'
    });
  },

  // --- Invites ---
  async createInvite(serverId: string, options: { maxUses?: number; expiryDays?: number }) {
    return request<{ invite: ServerInvite }>(`/api/servers/${serverId}/invites`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  async getInvite(code: string) {
    return request<{
      invite: ServerInvite;
      server: { id: string; name: string; description: string; iconUrl?: string; bannerUrl?: string; memberCount: number };
    }>(`/api/invites/${code}`);
  },

  async acceptInvite(code: string) {
    return request<{ serverId: string }>(`/api/invites/${code}/accept`, {
      method: 'POST'
    });
  },

  // --- File Upload ---
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string; name: string; size: number; type: 'image' | 'video' | 'audio' | 'file' }>(
      '/api/upload',
      {
        method: 'POST',
        body: formData
      }
    );
  },

  // --- Giphy Proxy ---
  async getTrendingGifs(offset = 0) {
    return request<{ data: any[] }>(`/api/giphy/trending?offset=${offset}`);
  },

  async searchGifs(query: string, offset = 0) {
    return request<{ data: any[] }>(`/api/giphy/search?q=${encodeURIComponent(query)}&offset=${offset}`);
  },

  // --- Voice ---
  async getVoiceParticipants() {
    return request<{ participants: VoiceParticipant[] }>('/api/voice/participants');
  }
};
