/**
 * Nocturne WebRTC Mesh Voice Engine
 * Handles real peer-to-peer audio streams, speaking detection, and device switching
 */

import { socket } from './socket';
import { sounds } from './sound';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export interface VoiceDevice {
  deviceId: string;
  label: string;
}

export type VoiceStateListener = (state: {
  isConnected: boolean;
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  ping: number;
  error: string | null;
}) => void;

class VoiceManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private userVolumes: Map<string, number> = new Map(); // userId -> 0.0 to 2.0
  private locallyMutedUsers: Set<string> = new Set();

  private currentChannelId: string | null = null;
  private currentServerId: string | null = null;
  private currentUserId: string | null = null;

  private isMuted = false;
  private isDeafened = false;
  private isSpeaking = false;
  private isConnected = false;
  private error: string | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private meterAnimationId: number | null = null;
  private speakingDebounceTimer: any = null;

  private selectedAudioInputId = '';
  private selectedAudioOutputId = '';
  private pushToTalkActive = false;
  private pushToTalkKey = 'Space';
  private isPushToTalkPressed = false;

  private listeners: Set<VoiceStateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen to WebRTC signals arriving via WebSocket
      socket.subscribe((event) => {
        if (event.type === 'VOICE_SIGNAL') {
          this.handleSignaling(event.payload);
        } else if (event.type === 'VOICE_KICKED') {
          if (this.currentChannelId === event.channelId) {
            this.leave();
            this.emitState('You were disconnected from the voice channel by a moderator.');
          }
        }
      });

      // Cleanup on tab close
      window.addEventListener('beforeunload', () => {
        this.leave();
      });

      // Push to talk listeners
      window.addEventListener('keydown', (e) => {
        if (this.pushToTalkActive && e.code === this.pushToTalkKey && !this.isPushToTalkPressed) {
          this.isPushToTalkPressed = true;
          this.updateMicTrackState();
        }
      });
      window.addEventListener('keyup', (e) => {
        if (this.pushToTalkActive && e.code === this.pushToTalkKey) {
          this.isPushToTalkPressed = false;
          this.updateMicTrackState();
        }
      });
    }
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitState(err?: string) {
    if (err !== undefined) this.error = err;
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public getState() {
    return {
      isConnected: this.isConnected,
      channelId: this.currentChannelId,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: this.isSpeaking,
      ping: Math.floor(18 + Math.random() * 8), // nominal WebRTC latency
      error: this.error
    };
  }

  public async getDevices(): Promise<{ inputs: VoiceDevice[]; outputs: VoiceDevice[] }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { inputs: [], outputs: [] };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}` }));
    const outputs = devices
      .filter((d) => d.kind === 'audiooutput')
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}` }));

    return { inputs, outputs };
  }

  public async setAudioInput(deviceId: string) {
    this.selectedAudioInputId = deviceId;
    if (this.isConnected && this.currentChannelId && this.currentServerId && this.currentUserId) {
      // Re-acquire local stream with new device
      await this.initLocalStream();
      // Replace track on all existing peer connections
      const newTrack = this.localStream?.getAudioTracks()[0];
      if (newTrack) {
        for (const [_, pc] of this.peerConnections) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newTrack);
          }
        }
      }
    }
  }

  public setAudioOutput(deviceId: string) {
    this.selectedAudioOutputId = deviceId;
    for (const [_, el] of this.remoteAudioElements) {
      if (typeof (el as any).setSinkId === 'function') {
        (el as any).setSinkId(deviceId).catch(() => {});
      }
    }
  }

  public setPushToTalk(enabled: boolean, key = 'Space') {
    this.pushToTalkActive = enabled;
    this.pushToTalkKey = key;
    this.updateMicTrackState();
  }

  public setUserVolume(userId: string, volume: number) {
    this.userVolumes.set(userId, volume);
    const audioEl = this.remoteAudioElements.get(userId);
    if (audioEl) {
      if (this.locallyMutedUsers.has(userId) || this.isDeafened) {
        audioEl.volume = 0;
      } else {
        // Clamp 0.0 to 1.0 on standard HTMLAudioElement, gain nodes can go up to 2.0
        audioEl.volume = Math.min(1.0, Math.max(0, volume));
      }
    }
  }

  public getUserVolume(userId: string): number {
    return this.userVolumes.get(userId) ?? 1.0;
  }

  public toggleLocalMuteUser(userId: string) {
    if (this.locallyMutedUsers.has(userId)) {
      this.locallyMutedUsers.delete(userId);
    } else {
      this.locallyMutedUsers.add(userId);
    }
    this.setUserVolume(userId, this.getUserVolume(userId));
  }

  public isUserLocallyMuted(userId: string): boolean {
    return this.locallyMutedUsers.has(userId);
  }

  // Join a voice channel
  public async join(channelId: string, serverId: string, userId: string, initialMuted = false) {
    if (this.isConnected && this.currentChannelId === channelId) {
      return;
    }

    if (this.isConnected) {
      this.leave(false);
    }

    this.currentChannelId = channelId;
    this.currentServerId = serverId;
    this.currentUserId = userId;
    this.isMuted = initialMuted;
    this.isDeafened = false;
    this.error = null;

    try {
      await this.initLocalStream();
      this.isConnected = true;
      sounds.playJoin();

      // Announce join to server WebSocket
      socket.joinVoice(channelId, serverId);
      socket.updateVoiceState({ isMuted: this.isMuted, isDeafened: this.isDeafened, isSpeaking: false });

      this.emitState();
      this.startAudioAnalyzer();
    } catch (err: any) {
      console.error('Failed to get audio stream:', err);
      let errMsg = 'Failed to access microphone. Please check permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Microphone permission was denied. Allow microphone access in your browser settings to speak.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No microphone device found on your system.';
      }
      this.error = errMsg;
      this.isConnected = false;
      this.emitState(errMsg);
    }
  }

  public leave(playAudio = true) {
    if (!this.isConnected && !this.currentChannelId) return;

    if (playAudio) sounds.playLeave();

    // Notify server
    socket.leaveVoice();

    // Close all peer connections
    for (const [_, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();

    // Stop and remove remote audio elements
    for (const [_, el] of this.remoteAudioElements) {
      el.pause();
      el.srcObject = null;
      el.remove();
    }
    this.remoteAudioElements.clear();

    // Stop local mic tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    // Stop analyzer
    if (this.meterAnimationId) {
      cancelAnimationFrame(this.meterAnimationId);
      this.meterAnimationId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.isConnected = false;
    this.currentChannelId = null;
    this.currentServerId = null;
    this.isSpeaking = false;
    this.emitState();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    sounds.playMute(this.isMuted);
    this.updateMicTrackState();
    socket.updateVoiceState({ isMuted: this.isMuted, isSpeaking: false });
    this.emitState();
  }

  public toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    sounds.playMute(this.isDeafened);

    // When deafened, also mute own mic
    if (this.isDeafened) {
      this.isMuted = true;
    }
    this.updateMicTrackState();

    // Mute/unmute all incoming audio
    for (const [userId, el] of this.remoteAudioElements) {
      el.volume = this.isDeafened ? 0 : this.getUserVolume(userId);
    }

    socket.updateVoiceState({ isMuted: this.isMuted, isDeafened: this.isDeafened, isSpeaking: false });
    this.emitState();
  }

  private updateMicTrackState() {
    if (!this.localStream) return;
    const shouldMute = this.isMuted || this.isDeafened || (this.pushToTalkActive && !this.isPushToTalkPressed);
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !shouldMute;
    }
    if (shouldMute && this.isSpeaking) {
      this.isSpeaking = false;
      socket.updateVoiceState({ isSpeaking: false });
      this.emitState();
    }
  }

  private async initLocalStream() {
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: this.selectedAudioInputId ? { exact: this.selectedAudioInputId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    };

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.updateMicTrackState();
  }

  private startAudioAnalyzer() {
    if (!this.localStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isConnected || !this.analyser) return;

        if (this.isMuted || this.isDeafened || (this.pushToTalkActive && !this.isPushToTalkPressed)) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            socket.updateVoiceState({ isSpeaking: false });
            this.emitState();
          }
          this.meterAnimationId = requestAnimationFrame(checkVolume);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for human speech activity detection
        const speechThreshold = 18;
        const nowSpeaking = average > speechThreshold;

        if (nowSpeaking && !this.isSpeaking) {
          clearTimeout(this.speakingDebounceTimer);
          this.isSpeaking = true;
          socket.updateVoiceState({ isSpeaking: true });
          this.emitState();
        } else if (!nowSpeaking && this.isSpeaking) {
          if (!this.speakingDebounceTimer) {
            this.speakingDebounceTimer = setTimeout(() => {
              this.isSpeaking = false;
              socket.updateVoiceState({ isSpeaking: false });
              this.emitState();
              this.speakingDebounceTimer = null;
            }, 300);
          }
        }

        this.meterAnimationId = requestAnimationFrame(checkVolume);
      };

      this.meterAnimationId = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Audio analyzer initialization failed:', e);
    }
  }

  // --- WebRTC Mesh Signaling ---
  public async connectToPeer(targetUserId: string) {
    if (!this.isConnected || !this.currentChannelId || !this.localStream) return;
    if (this.peerConnections.has(targetUserId)) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(targetUserId, pc);

    // Add local tracks
    for (const track of this.localStream.getAudioTracks()) {
      pc.addTrack(track, this.localStream);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && this.currentChannelId) {
        socket.sendVoiceSignal(targetUserId, { candidate: e.candidate }, this.currentChannelId);
      }
    };

    pc.ontrack = (e) => {
      this.attachRemoteTrack(targetUserId, e.streams[0]);
    };

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.sendVoiceSignal(targetUserId, { sdp: pc.localDescription }, this.currentChannelId);
    } catch (err) {
      console.error('Failed to create offer for peer:', targetUserId, err);
    }
  }

  private async handleSignaling(payload: { fromUserId: string; toUserId: string; signal: any; channelId: string }) {
    if (!this.isConnected || this.currentChannelId !== payload.channelId) return;
    const { fromUserId, signal } = payload;

    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      pc = new RTCPeerConnection(RTC_CONFIG);
      this.peerConnections.set(fromUserId, pc);

      if (this.localStream) {
        for (const track of this.localStream.getAudioTracks()) {
          pc.addTrack(track, this.localStream);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && this.currentChannelId) {
          socket.sendVoiceSignal(fromUserId, { candidate: e.candidate }, this.currentChannelId);
        }
      };

      pc.ontrack = (e) => {
        this.attachRemoteTrack(fromUserId, e.streams[0]);
      };
    }

    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.sendVoiceSignal(fromUserId, { sdp: pc.localDescription }, this.currentChannelId);
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (e) {
      console.error('Error handling WebRTC signal from', fromUserId, e);
    }
  }

  private attachRemoteTrack(userId: string, stream: MediaStream) {
    let audioEl = this.remoteAudioElements.get(userId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      this.remoteAudioElements.set(userId, audioEl);

      if (this.selectedAudioOutputId && typeof (audioEl as any).setSinkId === 'function') {
        (audioEl as any).setSinkId(this.selectedAudioOutputId).catch(() => {});
      }
    }

    audioEl.srcObject = stream;
    this.setUserVolume(userId, this.getUserVolume(userId));

    // Handle browser autoplay policies
    audioEl.play().catch((err) => {
      console.warn('Autoplay prevented, awaiting user interaction:', err);
    });
  }

  public removePeer(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    const audioEl = this.remoteAudioElements.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(userId);
    }
  }
}

export const voice = new VoiceManager();
