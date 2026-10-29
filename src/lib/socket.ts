/**
 * Nocturne WebSocket Client
 * Handles real-time messaging, presence, voice signaling, and forum updates
 */

import type { WSEvent, VoiceParticipant } from '../types';

type EventHandler = (event: WSEvent | any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventHandler> = new Set();
  private reconnectTimeout: any = null;
  private currentUserId: string | null = null;
  private isExplicitlyClosed = false;

  public connect(userId?: string) {
    if (userId) this.currentUserId = userId;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.currentUserId) {
        this.send({ type: 'AUTH', userId: this.currentUserId });
      }
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.currentUserId) {
          this.send({ type: 'AUTH', userId: this.currentUserId });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          for (const listener of this.listeners) {
            listener(data);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 2500);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
      };
    } catch (e) {
      console.error('Could not initialize WebSocket:', e);
    }
  }

  public subscribe(handler: EventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public joinVoice(channelId: string, serverId: string) {
    this.send({ type: 'VOICE_JOIN', channelId, serverId });
  }

  public leaveVoice() {
    this.send({ type: 'VOICE_LEAVE' });
  }

  public updateVoiceState(state: { isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) {
    this.send({ type: 'VOICE_STATE', ...state });
  }

  public sendVoiceSignal(toUserId: string, signal: any, channelId: string) {
    this.send({ type: 'VOICE_SIGNAL', toUserId, signal, channelId });
  }

  public modVoiceAction(targetUserId: string, action: 'SERVER_MUTE' | 'SERVER_DEAFEN' | 'DISCONNECT') {
    this.send({ type: 'VOICE_MOD_ACTION', targetUserId, action });
  }

  public sendTyping(channelId: string) {
    this.send({ type: 'TYPING_START', channelId });
  }

  public sendVenuePlayerSync(playerState: any) {
    this.send({ type: 'VENUE_PLAYER_SYNC', payload: playerState });
  }

  public sendVenueVideoSync(videoState: any) {
    this.send({ type: 'VENUE_VIDEO_SYNC', payload: videoState });
  }

  public sendVenueScreenShare(payload: { channelId: string; isSharing: boolean; sharerName: string; sharerId: string }) {
    this.send({ type: 'VENUE_SCREENSHARE_SYNC', payload });
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socket = new SocketClient();
