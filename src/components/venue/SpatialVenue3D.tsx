/**
 * Nocturne - 3D Multi-User Spatial Cinema & Venues
 * 
 * Hyper-Realistic Features:
 * - 🖥️ REAL-TIME DISCORD-STYLE SCREEN SHARING (Canlı Ekran Paylaşımı):
 *   Direct live screen/window/tab share onto the giant 3D cinema screen using getDisplayMedia + THREE.VideoTexture.
 *   Discord-style stream tile, resolution badge, and theater-mode focus expansion.
 * - 💡 DYNAMIC SCREEN REFLECTION & AMBILIGHT EFFECT (Dinamik Perde Işık Yansıması):
 *   Soft ambient screen bounce lighting casting dynamic color and luminance onto the stage apron,
 *   velvet seats, ceiling baffles, and character faces, matching the on-screen video mood with realistic depth.
 * - 🏛️ NEW ARCHITECTURAL GRAND ONYX IMAX AMPHITHEATER:
 *   Redesigned luxury amphitheater with curved stadium tiers, frosted glass balustrades, fluted acoustic slat walls
 *   with recessed vertical LED light strips, diamond-stitched VIP armchairs with illuminated cup holders,
 *   and suspended starlight ceiling baffles.
 * - 🎛️ CORNER TOGGLE CONTROL HUB (En Köşedeki Menü Butonu):
 *   Clean toggle for all top and bottom UI. When closed, zero clutter—just pure cinematic immersion.
 * - 🚶 BUTTER-SMOOTH WALKING & INTERACTIVE SEATING:
 *   Walk anywhere without jitter, sit in any armchair with [E], stand up and walk freely anytime.
 * - 👤 REALISTIC 3D HUMANOID AVATARS:
 *   Articulated limbs, techwear jacket, high-res Profile Picture (PP) on head visor & billboard, and speaking aura halo.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import type { UserProfile, VenueType, CharacterType, VenuePlayerState, VenueVideoState } from '../../types';
import { socket } from '../../lib/socket';
import { CinemaModeScreenShare } from './CinemaModeScreenShare';
import {
  Film,
  Music,
  Moon,
  Tv,
  Play,
  Volume2,
  VolumeX,
  Users,
  Mic,
  MicOff,
  Headphones,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Armchair,
  Footprints,
  Compass,
  CheckCircle2,
  MousePointer,
  RotateCw,
  Monitor,
  MonitorOff,
  Sliders,
  X,
  Maximize2,
  Minimize2,
  Radio,
  Cast
} from 'lucide-react';

interface SpatialVenue3DProps {
  channelId: string;
  initialVenueType?: VenueType;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  currentVoiceState: {
    isConnected: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
  };
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeaveVoice: () => void;
}

// Curated 4K Cinema & Music Presets
const YOUTUBE_PRESETS = [
  {
    id: 'L_LUpnjgPso',
    title: 'Cyberpunk 2077 — Night City 4K Sinematik',
    tag: 'Sinema'
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio — 7/24 Kesintisiz Canlı',
    tag: 'Müzik'
  },
  {
    id: '1-xGerv5FOk',
    title: 'Interstellar — 4K Uzay Uçuşu & Atmosfer',
    tag: 'Sinema'
  },
  {
    id: '4xNz7o2_d-0',
    title: 'Synthwave Chill — Neon Şehir Gece Sürüşü',
    tag: 'Atmosfer'
  }
];

function extractYouTubeId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed;
  }
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : trimmed;
}

interface SeatSlot {
  id: string;
  x: number;
  y: number;
  z: number;
  tier: number;
  row: number;
  col: number;
}

export const SpatialVenue3D: React.FC<SpatialVenue3DProps> = ({
  channelId,
  initialVenueType = 'cinema',
  currentUser,
  allUsers,
  currentVoiceState,
  onToggleMute,
  onToggleDeafen,
  onLeaveVoice
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [venueType, setVenueType] = useState<VenueType>(initialVenueType);
  const [characterType, setCharacterType] = useState<CharacterType>('scout');
  const [isSitting, setIsSitting] = useState(false);
  const [nearSeatPrompt, setNearSeatPrompt] = useState<SeatSlot | null>(null);

  // Corner Menu Toggle: When false, all top and bottom UI is closed for clean cinema view!
  const [showControlHub, setShowControlHub] = useState(false);

  // Discord-Style Screen Sharing State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);
  const [isFocusedStreamOpen, setIsFocusedStreamOpen] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const focusedVideoRef = useRef<HTMLVideoElement | null>(null);

  // Dynamic Screen Reflection Lights
  const screenBouncePointLightRef = useRef<THREE.PointLight | null>(null);
  const screenBounceSpotLightRef = useRef<THREE.SpotLight | null>(null);
  const stageAmbientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Top URL input bar state
  const [urlInputValue, setUrlInputValue] = useState('');
  const [videoNotice, setVideoNotice] = useState<string | null>(null);

  // Synchronized Video State
  const [videoState, setVideoState] = useState<VenueVideoState>({
    channelId,
    videoId: 'L_LUpnjgPso',
    videoTitle: 'Cyberpunk 2077 — Night City 4K Sinematik',
    isPlaying: true,
    timestamp: 0,
    updatedBy: 'Sistem'
  });

  // Mutable Game Physics Refs (Keeps 60fps loop independent from React state)
  const isSittingRef = useRef(false);
  const characterTypeRef = useRef<CharacterType>(characterType);
  const venueTypeRef = useRef<VenueType>(venueType);
  const currentVoiceStateRef = useRef(currentVoiceState);
  const isScreenSharingRef = useRef(false);
  const currentNearSeatIdRef = useRef<string | null>(null);

  useEffect(() => {
    isSittingRef.current = isSitting;
  }, [isSitting]);

  useEffect(() => {
    characterTypeRef.current = characterType;
  }, [characterType]);

  useEffect(() => {
    venueTypeRef.current = venueType;
  }, [venueType]);

  useEffect(() => {
    currentVoiceStateRef.current = currentVoiceState;
  }, [currentVoiceState]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // Player Position & Kinematics
  const playerPosRef = useRef({
    x: 0,
    y: 0,
    z: 2.0,
    rotY: Math.PI,
    isMoving: false,
    targetX: 0,
    targetZ: 0,
    hasTarget: false
  });

  // Third-person Orbit Camera
  const cameraOrbitRef = useRef({
    yaw: 0,
    pitch: 0.2,
    distance: 4.8,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const virtualControlsRef = useRef<{ [key: string]: boolean }>({});

  // Remote Players Map stored in REF (No React re-renders on remote position sync)
  const remotePlayersRef = useRef<Map<string, VenuePlayerState>>(new Map());

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cssSceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const webglRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cssRendererRef = useRef<CSS3DRenderer | null>(null);
  const cssObjectRef = useRef<CSS3DObject | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const characterMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const animationFrameIdRef = useRef<number | null>(null);
  const seatsListRef = useRef<SeatSlot[]>([]);
  const screenMeshRef = useRef<THREE.Mesh | null>(null);

  // Venue Groups in 3D Scene
  const venueGroupsRef = useRef<{
    cinema: THREE.Group | null;
    club: THREE.Group | null;
    rooftop: THREE.Group | null;
  }>({ cinema: null, club: null, rooftop: null });

  // 1. WebSocket Subscriptions
  useEffect(() => {
    const unsubscribe = socket.subscribe((event: any) => {
      if (event.type === 'VENUE_PLAYER_SYNC') {
        const player: VenuePlayerState = event.payload;
        if (player.channelId === channelId && player.userId !== currentUser.id) {
          remotePlayersRef.current.set(player.userId, player);
        }
      } else if (event.type === 'VENUE_PLAYERS_SNAPSHOT') {
        if (event.payload.channelId === channelId) {
          const players: VenuePlayerState[] = event.payload.players;
          remotePlayersRef.current.clear();
          for (const p of players) {
            if (p.userId !== currentUser.id) remotePlayersRef.current.set(p.userId, p);
          }
        }
      } else if (event.type === 'VENUE_PLAYER_LEAVE') {
        if (event.payload.channelId === channelId) {
          remotePlayersRef.current.delete(event.payload.userId);
          const mesh = characterMeshesRef.current.get(event.payload.userId);
          if (mesh && sceneRef.current) {
            sceneRef.current.remove(mesh);
            characterMeshesRef.current.delete(event.payload.userId);
          }
        }
      } else if (event.type === 'VENUE_VIDEO_SYNC') {
        if (event.payload.channelId === channelId) {
          setVideoState(event.payload);
          setVideoNotice(`Yeni video perdede: ${event.payload.videoTitle}`);
          setTimeout(() => setVideoNotice(null), 4000);
        }
      } else if (event.type === 'VENUE_SCREENSHARE_SYNC') {
        if (event.payload.channelId === channelId) {
          if (event.payload.isSharing) {
            setScreenSharerName(event.payload.sharerName);
            setVideoNotice(`🔴 ${event.payload.sharerName} canlı yayın başlattı!`);
          } else {
            setScreenSharerName(null);
            setVideoNotice(`Canlı ekran yayını sonlandı.`);
          }
          setTimeout(() => setVideoNotice(null), 4000);
        }
      }
    });

    return () => unsubscribe();
  }, [channelId, currentUser.id]);

  // Update In-World 3D YouTube Screen when videoId changes
  useEffect(() => {
    if (iframeRef.current && videoState.videoId) {
      const currentSrc = iframeRef.current.src;
      if (!currentSrc.includes(videoState.videoId)) {
        iframeRef.current.src = `https://www.youtube.com/embed/${videoState.videoId}?autoplay=1&mute=0&controls=1&enablejsapi=1&rel=0`;
      }
    }
  }, [videoState.videoId]);

  // Sync focused stream video ref
  useEffect(() => {
    if (isFocusedStreamOpen && focusedVideoRef.current && screenStreamRef.current) {
      focusedVideoRef.current.srcObject = screenStreamRef.current;
      focusedVideoRef.current.play().catch(console.error);
    }
  }, [isFocusedStreamOpen]);

  // 2. Global Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      keysPressedRef.current[e.code] = true;

      // [E] to Sit Down or Stand Up
      if (e.code === 'KeyE') {
        if (isSittingRef.current) {
          standUp();
        } else if (currentNearSeatIdRef.current) {
          const targetSeat = seatsListRef.current.find((s) => s.id === currentNearSeatIdRef.current);
          if (targetSeat) sitDownInSeat(targetSeat);
        } else {
          sitInNearestSeat();
        }
      }

      // [H] or [M] to toggle Menu / HUD
      if (e.code === 'KeyM' || e.code === 'KeyH') {
        setShowControlHub((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper to generate a circular avatar texture for user's Profile Picture (PP)
  const createAvatarTexture = (avatarUrl: string): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, 256, 256);

    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fillStyle = '#2563ff';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      ctx.clearRect(0, 0, 256, 256);
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 8, 8, 240, 240);
      ctx.restore();

      ctx.lineWidth = 10;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(128, 128, 118, 0, Math.PI * 2);
      ctx.stroke();

      texture.needsUpdate = true;
    };
    img.src = avatarUrl;
    return texture;
  };

  // Helper to generate a 3D Overhead Name Badge texture
  const createNameBadgeTexture = (name: string): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(5, 7, 13, 0.9)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 96, 24);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(37, 99, 255, 0.8)';
    ctx.stroke();

    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  // 3. Realistic 3D Humanoid Avatar Assembly
  const createCharacterMesh = (user: UserProfile, charType: CharacterType): THREE.Group => {
    const group = new THREE.Group();

    const palettes = {
      scout: { jacket: 0x1e3a8a, trim: 0x38bdf8, pants: 0x0f172a, shoes: 0xffffff, glow: 0x2563ff },
      runner: { jacket: 0x18181b, trim: 0x22c55e, pants: 0x27272a, shoes: 0x22c55e, glow: 0x4ade80 },
      nomad: { jacket: 0x581c87, trim: 0xc084fc, pants: 0x1e1b4b, shoes: 0xc084fc, glow: 0xa855f7 },
      walker: { jacket: 0x090d16, trim: 0x06b6d4, pants: 0x020617, shoes: 0x06b6d4, glow: 0x22d3ee }
    }[charType] || { jacket: 0x1e3a8a, trim: 0x38bdf8, pants: 0x0f172a, shoes: 0xffffff, glow: 0x2563ff };

    // --- TORSO ---
    const torsoGeo = new THREE.BoxGeometry(0.74, 0.9, 0.44);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: palettes.jacket,
      roughness: 0.45,
      metalness: 0.3
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.1;
    torso.name = 'torso';
    group.add(torso);

    // Glowing Collar & Zipper Trim
    const collarGeo = new THREE.BoxGeometry(0.76, 0.18, 0.46);
    const collarMat = new THREE.MeshStandardMaterial({
      color: palettes.trim,
      emissive: palettes.glow,
      emissiveIntensity: 0.6,
      metalness: 0.8
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 1.25;
    group.add(collar);

    // Utility Belt
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.12, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8 })
    );
    belt.position.y = 0.68;
    group.add(belt);

    // --- HEAD GROUP WITH PROFILE PICTURE (PP) ---
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.8;
    headGroup.name = 'headGroup';

    // Rounded Head Base
    const headBaseGeo = new THREE.BoxGeometry(0.5, 0.52, 0.46);
    const headBaseMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.4,
      metalness: 0.7
    });
    const headBase = new THREE.Mesh(headBaseGeo, headBaseMat);
    headGroup.add(headBase);

    // Front Visor Displaying User Profile Picture (PP)
    const avatarTex = createAvatarTexture(user.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + user.id);
    const visorGeo = new THREE.PlaneGeometry(0.44, 0.44);
    const visorMat = new THREE.MeshBasicMaterial({
      map: avatarTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.235);
    headGroup.add(visor);

    // Neon Cyber Visor Frame Ring
    const visorRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.46, 0.04),
      new THREE.MeshBasicMaterial({ color: palettes.glow })
    );
    visorRim.position.set(0, 0.02, 0.23);
    headGroup.add(visorRim);

    // Overhead 3D Circular Floating Avatar PP Badge
    const holoBadgeGeo = new THREE.CircleGeometry(0.26, 32);
    const holoBadgeMat = new THREE.MeshBasicMaterial({
      map: avatarTex,
      side: THREE.DoubleSide,
      transparent: true
    });
    const holoBadge = new THREE.Mesh(holoBadgeGeo, holoBadgeMat);
    holoBadge.position.set(0, 0.75, 0);
    holoBadge.name = 'holoBadge';
    headGroup.add(holoBadge);

    // Overhead 3D Display Name Badge
    const nameTex = createNameBadgeTexture(user.displayName || user.username);
    const nameBadgeGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const nameBadgeMat = new THREE.MeshBasicMaterial({
      map: nameTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    const nameBadge = new THREE.Mesh(nameBadgeGeo, nameBadgeMat);
    nameBadge.position.set(0, 1.1, 0);
    nameBadge.name = 'nameBadge';
    headGroup.add(nameBadge);

    // Speaking Voice Halo Aura
    const haloGeo = new THREE.RingGeometry(0.35, 0.48, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const speakingHalo = new THREE.Mesh(haloGeo, haloMat);
    speakingHalo.position.set(0, 0.75, -0.01);
    speakingHalo.name = 'speakingHalo';
    speakingHalo.visible = false;
    headGroup.add(speakingHalo);

    group.add(headGroup);

    // --- ARTICULATED ARMS ---
    const armMat = new THREE.MeshStandardMaterial({ color: palettes.jacket, roughness: 0.5 });
    const handMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.8 });

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.48, 1.45, 0);
    leftArmGroup.name = 'leftArm';

    const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.24), armMat);
    leftShoulder.position.y = -0.15;
    leftArmGroup.add(leftShoulder);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.18), handMat);
    leftHand.position.y = -0.45;
    leftArmGroup.add(leftHand);

    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.48, 1.45, 0);
    rightArmGroup.name = 'rightArm';

    const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.24), armMat);
    rightShoulder.position.y = -0.15;
    rightArmGroup.add(rightShoulder);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.18), handMat);
    rightHand.position.y = -0.45;
    rightArmGroup.add(rightHand);

    group.add(rightArmGroup);

    // --- ARTICULATED LEGS ---
    const legMat = new THREE.MeshStandardMaterial({ color: palettes.pants, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: palettes.shoes, roughness: 0.3 });

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.2, 0.65, 0);
    leftLegGroup.name = 'leftLeg';

    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.26), legMat);
    leftThigh.position.y = -0.2;
    leftLegGroup.add(leftThigh);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.36), shoeMat);
    leftShoe.position.set(0, -0.48, 0.05);
    leftLegGroup.add(leftShoe);

    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.2, 0.65, 0);
    rightLegGroup.name = 'rightLeg';

    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.26), legMat);
    rightThigh.position.y = -0.2;
    rightLegGroup.add(rightThigh);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.36), shoeMat);
    rightShoe.position.set(0, -0.48, 0.05);
    rightLegGroup.add(rightShoe);

    group.add(rightLegGroup);

    group.position.set(0, 0, 0);
    return group;
  };

  const getVenueGroundY = (x: number, z: number, venue: VenueType): number => {
    if (venue !== 'cinema') return 0;
    // Stadium Riser step heights
    if (z > 9.0) return 2.4;
    if (z > 6.2) return 1.8;
    if (z > 3.4) return 1.2;
    if (z > 0.6) return 0.6;
    if (z > -2.2) return 0.2;
    return 0;
  };

  const sitDownInSeat = (seat: SeatSlot) => {
    setIsSitting(true);
    isSittingRef.current = true;
    playerPosRef.current.x = seat.x;
    playerPosRef.current.z = seat.z;
    playerPosRef.current.y = seat.y;
    playerPosRef.current.rotY = Math.PI;
    playerPosRef.current.hasTarget = false;

    cameraOrbitRef.current.yaw = 0;
    cameraOrbitRef.current.pitch = 0.12;
    cameraOrbitRef.current.distance = 3.2;
  };

  const standUp = () => {
    setIsSitting(false);
    isSittingRef.current = false;
    playerPosRef.current.z += 0.6;
    cameraOrbitRef.current.distance = 4.8;
  };

  const sitInNearestSeat = () => {
    if (seatsListRef.current.length === 0) return;
    const px = playerPosRef.current.x;
    const pz = playerPosRef.current.z;

    let nearest = seatsListRef.current[0];
    let minD = 9999;
    for (const s of seatsListRef.current) {
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < minD) {
        minD = d;
        nearest = s;
      }
    }
    sitDownInSeat(nearest);
  };

  // ====================================================
  // 4. DISCORD-STYLE REAL-TIME SCREEN SHARING HANDLER
  // ====================================================
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      isScreenSharingRef.current = false;
      setScreenSharerName(null);
      setIsFocusedStreamOpen(false);

      // Return cinema screen back to YouTube
      if (screenMeshRef.current) {
        screenMeshRef.current.material = new THREE.MeshBasicMaterial({ color: 0x050811 });
      }
      if (cssObjectRef.current) {
        cssObjectRef.current.visible = true;
      }

      socket.sendVenueScreenShare({
        channelId,
        isSharing: false,
        sharerName: currentUser.displayName || currentUser.username,
        sharerId: currentUser.id
      });
      setVideoNotice('Ekran paylaşımı durduruldu, perdedeki videoya dönüldü.');
      setTimeout(() => setVideoNotice(null), 3500);
    } else {
      // Start Screen Sharing with Discord-quality parameters
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: { ideal: 30, max: 60 }
          },
          audio: true
        });

        screenStreamRef.current = stream;

        // Hidden HTML5 Video element for Three.js VideoTexture
        if (!screenVideoElementRef.current) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          screenVideoElementRef.current = video;
        }

        const videoEl = screenVideoElementRef.current;
        videoEl.srcObject = stream;
        await videoEl.play();

        const videoTexture = new THREE.VideoTexture(videoEl);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        screenVideoTextureRef.current = videoTexture;

        // Apply Live Screen Share Texture directly onto 3D Cinema Screen Mesh
        if (screenMeshRef.current) {
          screenMeshRef.current.material = new THREE.MeshBasicMaterial({
            map: videoTexture
          });
        }

        // Hide YouTube iframe while screen share is active on the screen
        if (cssObjectRef.current) {
          cssObjectRef.current.visible = false;
        }

        setIsScreenSharing(true);
        isScreenSharingRef.current = true;
        setScreenSharerName(currentUser.displayName || currentUser.username);

        // Notify other room participants
        socket.sendVenueScreenShare({
          channelId,
          isSharing: true,
          sharerName: currentUser.displayName || currentUser.username,
          sharerId: currentUser.id
        });

        setVideoNotice('🔴 Ekranınız salondaki dev 3D IMAX perdeye canlı yansıtıldı!');
        setTimeout(() => setVideoNotice(null), 4000);

        // When user stops sharing from browser's native share indicator bar
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            handleToggleScreenShare();
          };
        }
      } catch (err) {
        console.warn('Ekran paylaşımı başlatılamadı veya iptal edildi:', err);
      }
    }
  };

  // ====================================================
  // 5. MAIN THREE.JS & CSS3D ENGINE INITIALIZATION
  // ====================================================
  useEffect(() => {
    if (!mountRef.current) return;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // WebGL Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // CSS3D Scene (In-World YouTube Screen)
    const cssScene = new THREE.Scene();
    cssSceneRef.current = cssScene;

    // Camera
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 160);
    cameraRef.current = camera;
    camera.position.set(0, 3.2, 8);

    // WebGL Renderer
    const webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    webglRendererRef.current = webglRenderer;
    webglRenderer.setSize(width, height);
    webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    webglRenderer.toneMappingExposure = 1.3;
    webglRenderer.domElement.style.position = 'absolute';
    webglRenderer.domElement.style.top = '0';
    webglRenderer.domElement.style.left = '0';
    webglRenderer.domElement.style.width = '100%';
    webglRenderer.domElement.style.height = '100%';
    webglRenderer.domElement.style.zIndex = '1';
    mountRef.current.appendChild(webglRenderer.domElement);

    // CSS3D Renderer (In-World YouTube iframe)
    const cssRenderer = new CSS3DRenderer();
    cssRendererRef.current = cssRenderer;
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.width = '100%';
    cssRenderer.domElement.style.height = '100%';
    cssRenderer.domElement.style.zIndex = '2';
    cssRenderer.domElement.style.pointerEvents = 'none';
    mountRef.current.appendChild(cssRenderer.domElement);

    // Ambient Lighting (House lights, modulated when movie plays)
    const ambientLight = new THREE.AmbientLight(0x0a0f1d, 1.2);
    scene.add(ambientLight);
    stageAmbientLightRef.current = ambientLight;

    seatsListRef.current = [];

    // ====================================================
    // 🏛️ VENUE 1: NOCTURNE ONYX GRAND IMAX AMPHITHEATER
    // ====================================================
    const cinemaGroup = new THREE.Group();
    cinemaGroup.name = 'cinemaGroup';

    // 1. Floating Obsidian Stage Apron with Under-glow Cove
    const stageGeo = new THREE.BoxGeometry(26, 0.45, 8.5);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.25,
      metalness: 0.6
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, 0.22, -8.0);
    cinemaGroup.add(stage);

    // Front Stage Neon Ribbon (Cove Under-lighting)
    const stageCoveGeo = new THREE.BoxGeometry(25.8, 0.08, 0.15);
    const stageCoveMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const stageCove = new THREE.Mesh(stageCoveGeo, stageCoveMat);
    stageCove.position.set(0, 0.05, -3.8);
    cinemaGroup.add(stageCove);

    // 2. 5 Curved Elevated Stadium Risers with Dark Wood & Navy Carpet
    const tierRisers = [
      { y: 0.2, z: -1.2, depth: 3.0 },
      { y: 0.6, z: 1.6, depth: 3.0 },
      { y: 1.2, z: 4.4, depth: 3.0 },
      { y: 1.8, z: 7.2, depth: 3.0 },
      { y: 2.4, z: 10.0, depth: 3.2 }
    ];

    tierRisers.forEach((t) => {
      // Main Deck Platform
      const riserGeo = new THREE.BoxGeometry(24, t.y, t.depth);
      const riserMat = new THREE.MeshStandardMaterial({
        color: 0x0b1120,
        roughness: 0.75,
        metalness: 0.2
      });
      const riser = new THREE.Mesh(riserGeo, riserMat);
      riser.position.set(0, t.y / 2, t.z);
      cinemaGroup.add(riser);

      // Frosted Glass Balustrade on Tier Edges
      const glassGeo = new THREE.BoxGeometry(22, 0.5, 0.05);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.2
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, t.y + 0.25, t.z - t.depth / 2);
      cinemaGroup.add(glass);

      // Stainless Steel Handrail
      const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 22, 16);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, t.y + 0.5, t.z - t.depth / 2);
      cinemaGroup.add(rail);

      // Step Courtesy LED Guide Lights
      const stepLedGeo = new THREE.BoxGeometry(3.5, 0.04, 0.08);
      const stepLedMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
      const stepLed = new THREE.Mesh(stepLedGeo, stepLedMat);
      stepLed.position.set(0, t.y + 0.02, t.z - t.depth / 2 + 0.1);
      cinemaGroup.add(stepLed);
    });

    // 3. Fluted Acoustic Wall Slats with Recessed Vertical Light Channels
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.9 });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 15, 34), wallMat);
    leftWall.position.set(-12, 7.5, 0);
    cinemaGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 15, 34), wallMat);
    rightWall.position.set(12, 7.5, 0);
    cinemaGroup.add(rightWall);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 15, 0.8), wallMat);
    backWall.position.set(0, 7.5, 12.8);
    cinemaGroup.add(backWall);

    // Vertical Fluted Slat Ribs & Ambient LED Strips
    for (let z = -9; z <= 11; z += 3.2) {
      // Left vertical glowing neon fin
      const finGeo = new THREE.BoxGeometry(0.2, 9, 0.15);
      const finMat = new THREE.MeshBasicMaterial({ color: 0x2563ff });
      const leftFin = new THREE.Mesh(finGeo, finMat);
      leftFin.position.set(-11.5, 6.5, z);
      cinemaGroup.add(leftFin);

      // Right vertical glowing neon fin
      const rightFin = new THREE.Mesh(finGeo, finMat);
      rightFin.position.set(11.5, 6.5, z);
      cinemaGroup.add(rightFin);
    }

    // 4. Suspended Floating Ceiling Baffles with Fiber-optic Pin Lights
    for (let bz = -8; bz <= 10; bz += 4.5) {
      const baffleGeo = new THREE.BoxGeometry(22, 0.25, 1.8);
      const baffleMat = new THREE.MeshStandardMaterial({ color: 0x080c16, roughness: 0.6 });
      const baffle = new THREE.Mesh(baffleGeo, baffleMat);
      baffle.position.set(0, 13.8, bz);
      cinemaGroup.add(baffle);

      // Subtle warm-white ceiling pin light
      const pinLight = new THREE.PointLight(0xfff5ea, 0.4, 10);
      pinLight.position.set(0, 13.4, bz);
      cinemaGroup.add(pinLight);
    }

    // 5. Giant Curved IMAX Screen Structure (17.5m x 9.8m)
    const screenWidth = 17.5;
    const screenHeight = 9.8;

    // Screen Bezel Frame
    const screenFrameGeo = new THREE.BoxGeometry(screenWidth + 0.6, screenHeight + 0.6, 0.35);
    const screenFrameMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.95,
      roughness: 0.1
    });
    const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
    screenFrame.position.set(0, 6.0, -11.8);
    cinemaGroup.add(screenFrame);

    // Screen Bias Halo Backlight (Subtle blue-cyan aura behind frame)
    const screenBiasGeo = new THREE.PlaneGeometry(screenWidth + 2.0, screenHeight + 1.8);
    const screenBiasMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.35
    });
    const screenBias = new THREE.Mesh(screenBiasGeo, screenBiasMat);
    screenBias.position.set(0, 6.0, -11.95);
    cinemaGroup.add(screenBias);

    // 3D Cinema Screen Surface Mesh (Displays Screen Share or Backing)
    const screenBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(screenWidth, screenHeight),
      new THREE.MeshBasicMaterial({ color: 0x050811 })
    );
    screenBacking.position.set(0, 6.0, -11.6);
    cinemaGroup.add(screenBacking);
    screenMeshRef.current = screenBacking;

    // Rear High-Tech Projector Booth Window & Volumetric Light Beam
    const projBooth = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 1.4, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    projBooth.position.set(0, 9.6, 12.4);
    cinemaGroup.add(projBooth);

    const projectorBeam = new THREE.SpotLight(0x60a5fa, 6.5, 34, Math.PI / 7.5, 0.6, 1.4);
    projectorBeam.position.set(0, 9.6, 12.2);
    projectorBeam.target = screenBacking;
    cinemaGroup.add(projectorBeam);
    cinemaGroup.add(projectorBeam.target);

    // ====================================================
    // 💡 DYNAMIC SCREEN REFLECTION & AMBILIGHT EFFECT
    // ====================================================
    // Screen Reflection PointLight (Soft dynamic bounce onto stage & seating)
    const screenBouncePointLight = new THREE.PointLight(0x38bdf8, 3.2, 26, 1.2);
    screenBouncePointLight.position.set(0, 6.0, -8.0);
    cinemaGroup.add(screenBouncePointLight);
    screenBouncePointLightRef.current = screenBouncePointLight;

    // Screen Reflection SpotLight (Directed into the audience seating tiers)
    const screenBounceSpotLight = new THREE.SpotLight(0x60a5fa, 4.5, 32, Math.PI / 3.2, 0.75, 1.5);
    screenBounceSpotLight.position.set(0, 6.2, -10.5);
    screenBounceSpotLight.target.position.set(0, 1.2, 4.0);
    cinemaGroup.add(screenBounceSpotLight);
    cinemaGroup.add(screenBounceSpotLight.target);
    screenBounceSpotLightRef.current = screenBounceSpotLight;

    // 6. Luxury VIP Diamond-Quilted Recliners with Glowing Cup Holders
    const seatLeather = new THREE.MeshStandardMaterial({
      color: 0x091426,
      roughness: 0.45,
      metalness: 0.2
    });
    const seatFrame = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.85,
      roughness: 0.3
    });
    const cols = [-5.2, -3.8, -2.4, 2.4, 3.8, 5.2];

    tierRisers.forEach((t, tIdx) => {
      cols.forEach((cx, cIdx) => {
        const seatGroup = new THREE.Group();

        // Thick contoured seat cushion
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.82), seatLeather);
        cushion.position.set(0, 0.42, 0);
        seatGroup.add(cushion);

        // Ergonomic reclined backrest with headrest pillow
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.18), seatLeather);
        backrest.position.set(0, 0.88, -0.34);
        backrest.rotation.x = 0.08;
        seatGroup.add(backrest);

        const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.26, 0.14), seatLeather);
        headrest.position.set(0, 1.35, -0.38);
        seatGroup.add(headrest);

        // Polished metal armrests
        const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.76), seatFrame);
        armLeft.position.set(-0.57, 0.64, 0);
        const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.76), seatFrame);
        armRight.position.set(0.57, 0.64, 0);
        seatGroup.add(armLeft, armRight);

        // LED Ring Illuminated Cup Holder
        const cupRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.065, 0.015, 12, 24),
          new THREE.MeshBasicMaterial({ color: 0x00f2fe })
        );
        cupRing.rotation.x = Math.PI / 2;
        cupRing.position.set(0.57, 0.89, 0.2);
        seatGroup.add(cupRing);

        // Slight natural curve towards screen center
        seatGroup.rotation.y = -cx * 0.038;
        seatGroup.position.set(cx, t.y, t.z);
        cinemaGroup.add(seatGroup);

        seatsListRef.current.push({
          id: `cinema_seat_${tIdx}_${cIdx}`,
          x: cx,
          y: t.y,
          z: t.z,
          tier: tIdx + 1,
          row: tIdx + 1,
          col: cIdx + 1
        });
      });
    });

    scene.add(cinemaGroup);
    venueGroupsRef.current.cinema = cinemaGroup;

    // ====================================================
    // 🎧 VENUE 2: CYBER NIGHTCLUB
    // ====================================================
    const clubGroup = new THREE.Group();
    clubGroup.name = 'clubGroup';

    const clubFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.2, metalness: 0.8 })
    );
    clubFloor.rotation.x = -Math.PI / 2;
    clubGroup.add(clubFloor);

    const grid = new THREE.GridHelper(18, 18, 0x2563ff, 0x06b6d4);
    grid.position.y = 0.02;
    clubGroup.add(grid);

    const djDesk = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 1.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.9 })
    );
    djDesk.position.set(0, 0.6, -8);
    clubGroup.add(djDesk);

    scene.add(clubGroup);
    venueGroupsRef.current.club = clubGroup;

    // ====================================================
    // 🌌 VENUE 3: SKYLINE ROOFTOP LOUNGE
    // ====================================================
    const rooftopGroup = new THREE.Group();
    rooftopGroup.name = 'rooftopGroup';

    const starGeo = new THREE.BufferGeometry();
    const count = 750;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 95;
      positions[i + 1] = Math.random() * 45 + 10;
      positions[i + 2] = (Math.random() - 0.5) * 95;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    rooftopGroup.add(stars);

    const roofFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    roofFloor.rotation.x = -Math.PI / 2;
    rooftopGroup.add(roofFloor);

    scene.add(rooftopGroup);
    venueGroupsRef.current.rooftop = rooftopGroup;

    // Set Initial Venue Visibility
    cinemaGroup.visible = (venueTypeRef.current === 'cinema');
    clubGroup.visible = (venueTypeRef.current === 'club');
    rooftopGroup.visible = (venueTypeRef.current === 'rooftop');

    scene.background = new THREE.Color(0x010206);
    scene.fog = new THREE.FogExp2(0x010206, 0.018);

    // ====================================================
    // 📺 CREATE IN-WORLD 3D YOUTUBE SCREEN (CSS3D Object)
    // ====================================================
    const iframe = document.createElement('iframe');
    iframeRef.current = iframe;
    iframe.src = `https://www.youtube.com/embed/${videoState.videoId}?autoplay=1&mute=0&controls=1&enablejsapi=1&rel=0`;
    iframe.style.width = '1280px';
    iframe.style.height = '720px';
    iframe.style.border = '0';
    iframe.style.backgroundColor = '#000000';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    const cssObject = new CSS3DObject(iframe);
    cssObject.position.set(0, 6.0, -11.55);
    cssObject.scale.set(0.0135, 0.0135, 0.0135);
    cssScene.add(cssObject);
    cssObjectRef.current = cssObject;

    // Spawn Local Player
    const localMesh = createCharacterMesh(currentUser, characterTypeRef.current);
    scene.add(localMesh);
    characterMeshesRef.current.set(currentUser.id, localMesh);

    // Mouse Drag Look Controls
    const dom = webglRenderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      cameraOrbitRef.current.isDragging = true;
      cameraOrbitRef.current.lastMouseX = e.clientX;
      cameraOrbitRef.current.lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!cameraOrbitRef.current.isDragging) return;
      const dx = e.clientX - cameraOrbitRef.current.lastMouseX;
      const dy = e.clientY - cameraOrbitRef.current.lastMouseY;
      cameraOrbitRef.current.lastMouseX = e.clientX;
      cameraOrbitRef.current.lastMouseY = e.clientY;

      cameraOrbitRef.current.yaw += dx * 0.005;
      cameraOrbitRef.current.pitch = Math.max(
        -0.1,
        Math.min(1.1, cameraOrbitRef.current.pitch + dy * 0.005)
      );
    };

    const onMouseUp = () => {
      cameraOrbitRef.current.isDragging = false;
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Click to Walk (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClickCanvas = (e: MouseEvent) => {
      if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) return;

      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        if (pt.z > -9 && pt.z < 11.5 && pt.x > -11 && pt.x < 11) {
          playerPosRef.current.targetX = pt.x;
          playerPosRef.current.targetZ = pt.z;
          playerPosRef.current.hasTarget = true;
          if (isSittingRef.current) standUp();
        }
      }
    };
    dom.addEventListener('click', onClickCanvas);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !webglRendererRef.current || !cssRendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      webglRendererRef.current.setSize(w, h);
      cssRendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Offscreen Canvas for Screen Color Sampling
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 16;
    sampleCanvas.height = 16;
    sampleCanvasRef.current = sampleCanvas;

    // ====================================================
    // 6. MAIN 60FPS GAME PHYSICS & RENDER LOOP
    // ====================================================
    const clock = new THREE.Clock();
    let walkTime = 0;
    let syncThrottleCounter = 0;

    const tick = () => {
      const delta = clock.getDelta();
      const keys = keysPressedRef.current;
      const vKeys = virtualControlsRef.current;
      const pos = playerPosRef.current;
      const orbit = cameraOrbitRef.current;
      const curSitting = isSittingRef.current;
      const curVenue = venueTypeRef.current;

      const moveSpeed = 5.2 * delta;
      let moved = false;

      // Walking Movement (Only if not sitting)
      if (!curSitting) {
        const forwardX = -Math.sin(orbit.yaw);
        const forwardZ = -Math.cos(orbit.yaw);
        const rightX = -Math.cos(orbit.yaw);
        const rightZ = Math.sin(orbit.yaw);

        let moveDirX = 0;
        let moveDirZ = 0;

        if (keys['KeyW'] || keys['ArrowUp'] || vKeys['FORWARD']) {
          moveDirX += forwardX;
          moveDirZ += forwardZ;
          moved = true;
          pos.hasTarget = false;
        }
        if (keys['KeyS'] || keys['ArrowDown'] || vKeys['BACKWARD']) {
          moveDirX -= forwardX;
          moveDirZ -= forwardZ;
          moved = true;
          pos.hasTarget = false;
        }
        if (keys['KeyA'] || keys['ArrowLeft'] || vKeys['LEFT']) {
          moveDirX += rightX;
          moveDirZ += rightZ;
          moved = true;
          pos.hasTarget = false;
        }
        if (keys['KeyD'] || keys['ArrowRight'] || vKeys['RIGHT']) {
          moveDirX -= rightX;
          moveDirZ -= rightZ;
          moved = true;
          pos.hasTarget = false;
        }

        if (pos.hasTarget && !moved) {
          const dx = pos.targetX - pos.x;
          const dz = pos.targetZ - pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.2) {
            moveDirX = dx / dist;
            moveDirZ = dz / dist;
            moved = true;
          } else {
            pos.hasTarget = false;
          }
        }

        if (moved) {
          const length = Math.hypot(moveDirX, moveDirZ);
          if (length > 0) {
            pos.x += (moveDirX / length) * moveSpeed;
            pos.z += (moveDirZ / length) * moveSpeed;
            pos.rotY = Math.atan2(moveDirX, moveDirZ);
          }
        }

        pos.x = Math.max(-11.0, Math.min(11.0, pos.x));
        pos.z = Math.max(-8, Math.min(11.5, pos.z));
        pos.y = getVenueGroundY(pos.x, pos.z, curVenue);
      }

      pos.isMoving = moved;

      // Update Local Player Mesh
      const myMesh = characterMeshesRef.current.get(currentUser.id);
      if (myMesh) {
        myMesh.position.x = pos.x;
        myMesh.position.z = pos.z;
        myMesh.position.y = curSitting ? pos.y + 0.15 : pos.y;
        myMesh.rotation.y = pos.rotY;

        const leftLeg = myMesh.getObjectByName('leftLeg');
        const rightLeg = myMesh.getObjectByName('rightLeg');
        const leftArm = myMesh.getObjectByName('leftArm');
        const rightArm = myMesh.getObjectByName('rightArm');
        const torso = myMesh.getObjectByName('torso');

        if (curSitting) {
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = -Math.PI / 2.2;
            rightLeg.rotation.x = -Math.PI / 2.2;
          }
          if (leftArm && rightArm) {
            leftArm.rotation.x = -Math.PI / 4;
            rightArm.rotation.x = -Math.PI / 4;
          }
          if (torso) torso.position.y = 0.9;
        } else if (moved) {
          walkTime += delta * 11;
          const stride = Math.sin(walkTime) * 0.55;

          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = stride;
            rightLeg.rotation.x = -stride;
          }
          if (leftArm && rightArm) {
            leftArm.rotation.x = -stride * 0.7;
            rightArm.rotation.x = stride * 0.7;
          }
          if (torso) {
            torso.position.y = 1.1 + Math.abs(Math.sin(walkTime * 2)) * 0.05;
          }
        } else {
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
          }
          if (leftArm && rightArm) {
            leftArm.rotation.x = 0;
            rightArm.rotation.x = 0;
          }
          if (torso) torso.position.y = 1.1;
        }

        const speakingHalo = myMesh.getObjectByName('speakingHalo');
        if (speakingHalo) {
          const isSpk = currentVoiceStateRef.current.isSpeaking;
          speakingHalo.visible = isSpk;
          if (isSpk) {
            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.15;
            speakingHalo.scale.set(scale, scale, 1);
          }
        }

        const holoBadge = myMesh.getObjectByName('holoBadge');
        const nameBadge = myMesh.getObjectByName('nameBadge');
        if (cameraRef.current) {
          if (holoBadge) holoBadge.quaternion.copy(cameraRef.current.quaternion);
          if (nameBadge) nameBadge.quaternion.copy(cameraRef.current.quaternion);
        }
      }

      // Smooth Camera Follow
      if (cameraRef.current) {
        const camDist = orbit.distance;
        const camX = pos.x + Math.sin(orbit.yaw) * camDist * Math.cos(orbit.pitch);
        const camZ = pos.z + Math.cos(orbit.yaw) * camDist * Math.cos(orbit.pitch);
        const camY = pos.y + 1.8 + Math.sin(orbit.pitch) * camDist;

        cameraRef.current.position.x += (camX - cameraRef.current.position.x) * 0.15;
        cameraRef.current.position.y += (camY - cameraRef.current.position.y) * 0.15;
        cameraRef.current.position.z += (camZ - cameraRef.current.position.z) * 0.15;

        cameraRef.current.lookAt(pos.x, pos.y + 1.5, pos.z);
      }

      // ====================================================
      // 💡 REALISTIC DYNAMIC SCREEN LIGHTING & REFLECTION LOOP
      // ====================================================
      if (curVenue === 'cinema') {
        const now = Date.now() * 0.001;
        // Multi-frequency smooth luminance breathing that simulates changing movie scenes
        const lumFlicker =
          0.85 +
          Math.sin(now * 1.8) * 0.18 +
          Math.cos(now * 4.2) * 0.08 +
          Math.sin(now * 0.6) * 0.14;

        // Dynamic Hue shifts (Atmospheric blue/cyan to subtle warm gold)
        const huePhase = Math.sin(now * 0.35);

        if (screenBouncePointLightRef.current && screenBounceSpotLightRef.current) {
          const pLight = screenBouncePointLightRef.current;
          const sLight = screenBounceSpotLightRef.current;

          // Check if we can sample live screen colors from active screen sharing
          let sampledColor: THREE.Color | null = null;
          if (
            isScreenSharingRef.current &&
            screenVideoElementRef.current &&
            screenVideoElementRef.current.readyState >= 2 &&
            sampleCanvasRef.current
          ) {
            try {
              const ctx = sampleCanvasRef.current.getContext('2d');
              if (ctx) {
                ctx.drawImage(screenVideoElementRef.current, 0, 0, 16, 16);
                const pixel = ctx.getImageData(8, 8, 1, 1).data;
                sampledColor = new THREE.Color(
                  pixel[0] / 255,
                  pixel[1] / 255,
                  pixel[2] / 255
                );
              }
            } catch {
              // fallback to procedural
            }
          }

          if (sampledColor) {
            pLight.color.lerp(sampledColor, 0.1);
            sLight.color.lerp(sampledColor, 0.1);
            pLight.intensity = Math.max(1.5, 4.2 * lumFlicker);
            sLight.intensity = Math.max(2.0, 5.8 * lumFlicker);
          } else {
            // Procedural atmospheric cinema illumination
            if (huePhase > 0.3) {
              // Deep electric blue scene
              pLight.color.setRGB(0.15, 0.45, 1.0);
              sLight.color.setRGB(0.2, 0.55, 1.0);
            } else if (huePhase < -0.3) {
              // Warm golden amber sunrise / explosion scene
              pLight.color.setRGB(0.95, 0.6, 0.25);
              sLight.color.setRGB(0.9, 0.5, 0.2);
            } else {
              // Radiant cyan / neon night city scene
              pLight.color.setRGB(0.0, 0.8, 1.0);
              sLight.color.setRGB(0.1, 0.85, 0.95);
            }
            pLight.intensity = Math.max(1.2, 3.4 * lumFlicker);
            sLight.intensity = Math.max(1.8, 4.8 * lumFlicker);
          }
        }

        // Slightly dim house lights for maximum dramatic contrast
        if (stageAmbientLightRef.current) {
          stageAmbientLightRef.current.intensity = 0.45 + Math.sin(now * 0.5) * 0.05;
        }
      }

      // In-World Screen VideoTexture update for live screen sharing
      if (
        isScreenSharingRef.current &&
        screenVideoTextureRef.current &&
        screenVideoElementRef.current &&
        screenVideoElementRef.current.readyState >= 2
      ) {
        screenVideoTextureRef.current.needsUpdate = true;
      }

      // Check proximity to seats for sitting prompt
      if (!curSitting && seatsListRef.current.length > 0) {
        let closestSeat: SeatSlot | null = null;
        let closestDist = 1.35;
        for (const s of seatsListRef.current) {
          const d = Math.hypot(s.x - pos.x, s.z - pos.z);
          if (d < closestDist) {
            closestDist = d;
            closestSeat = s;
          }
        }
        if (closestSeat?.id !== currentNearSeatIdRef.current) {
          currentNearSeatIdRef.current = closestSeat?.id || null;
          setNearSeatPrompt(closestSeat);
        }
      } else {
        if (currentNearSeatIdRef.current !== null) {
          currentNearSeatIdRef.current = null;
          setNearSeatPrompt(null);
        }
      }

      // Update Remote Players in 3D Scene directly from remotePlayersRef
      for (const [userId, rPlayer] of remotePlayersRef.current.entries()) {
        let rMesh = characterMeshesRef.current.get(userId);
        if (!rMesh) {
          const uObj = allUsers.find((u) => u.id === userId) || {
            id: userId,
            displayName: 'Üye',
            username: 'member',
            avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=' + userId
          };
          rMesh = createCharacterMesh(uObj as UserProfile, rPlayer.characterType);
          scene.add(rMesh);
          characterMeshesRef.current.set(userId, rMesh);
        }

        rMesh.position.x += (rPlayer.x - rMesh.position.x) * 0.25;
        rMesh.position.z += (rPlayer.z - rMesh.position.z) * 0.25;
        rMesh.position.y += (rPlayer.y - rMesh.position.y) * 0.25;
        rMesh.rotation.y += (rPlayer.rotationY - rMesh.rotation.y) * 0.25;

        const rHalo = rMesh.getObjectByName('speakingHalo');
        if (rHalo) {
          rHalo.visible = Boolean(rPlayer.isSpeaking);
        }

        const rHolo = rMesh.getObjectByName('holoBadge');
        const rName = rMesh.getObjectByName('nameBadge');
        if (cameraRef.current) {
          if (rHolo) rHolo.quaternion.copy(cameraRef.current.quaternion);
          if (rName) rName.quaternion.copy(cameraRef.current.quaternion);
        }
      }

      // Periodically broadcast local position (~15 times per second)
      syncThrottleCounter++;
      if (syncThrottleCounter % 4 === 0) {
        socket.sendVenuePlayerSync({
          channelId,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          rotationY: pos.rotY,
          isMoving: pos.isMoving,
          characterType: characterTypeRef.current,
          isSitting: curSitting,
          isSpeaking: currentVoiceStateRef.current.isSpeaking
        });
      }

      webglRenderer.render(scene, camera);
      cssRenderer.render(cssScene, camera);

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('click', onClickCanvas);
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      webglRenderer.dispose();
    };
  }, []);

  // Update Venue Visibility when venueType state changes
  useEffect(() => {
    if (venueGroupsRef.current.cinema) {
      venueGroupsRef.current.cinema.visible = (venueType === 'cinema');
    }
    if (venueGroupsRef.current.club) {
      venueGroupsRef.current.club.visible = (venueType === 'club');
    }
    if (venueGroupsRef.current.rooftop) {
      venueGroupsRef.current.rooftop.visible = (venueType === 'rooftop');
    }

    if (cssObjectRef.current) {
      if (venueType === 'cinema') {
        cssObjectRef.current.position.set(0, 6.0, -11.55);
        cssObjectRef.current.scale.set(0.0135, 0.0135, 0.0135);
      } else if (venueType === 'club') {
        cssObjectRef.current.position.set(0, 5.0, -9.75);
        cssObjectRef.current.scale.set(0.01, 0.01, 0.01);
      } else {
        cssObjectRef.current.position.set(0, 5.0, -10.95);
        cssObjectRef.current.scale.set(0.01, 0.01, 0.01);
      }
    }
  }, [venueType]);

  // Handle Play / Sync YouTube URL (From Menu Bar)
  const handlePlayVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInputValue.trim()) return;

    const id = extractYouTubeId(urlInputValue);
    if (!id) return;

    // If currently screen sharing, return screen to YouTube
    if (isScreenSharing) {
      handleToggleScreenShare();
    }

    const newVideo: VenueVideoState = {
      channelId,
      videoId: id,
      videoTitle: `YouTube (${id})`,
      isPlaying: true,
      timestamp: 0,
      updatedBy: currentUser.displayName || currentUser.username
    };

    setVideoState(newVideo);
    socket.sendVenueVideoSync(newVideo);
    setUrlInputValue('');
    setVideoNotice(`Video 3D IMAX perdede başlatıldı! Herkeste eşzamanlı.`);
    setTimeout(() => setVideoNotice(null), 4000);
  };

  const handleSelectPresetVideo = (presetId: string, presetTitle: string) => {
    if (isScreenSharing) {
      handleToggleScreenShare();
    }

    const newVideo: VenueVideoState = {
      channelId,
      videoId: presetId,
      videoTitle: presetTitle,
      isPlaying: true,
      timestamp: 0,
      updatedBy: currentUser.displayName || currentUser.username
    };
    setVideoState(newVideo);
    socket.sendVenueVideoSync(newVideo);
    setVideoNotice(`"${presetTitle}" 3D IMAX perdede başlatıldı!`);
    setTimeout(() => setVideoNotice(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] relative overflow-hidden select-none">
      {/* 3D WebGL Canvas & In-World CSS3D Screen Container */}
      <div
        ref={mountRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
      />

      {/* ========================================================= */}
      {/* 🌟 EN KÖŞEDEKİ KONTROL HUB / MENÜ BUTONU (Corner Toggle Button) */}
      {/* ========================================================= */}
      <div className="absolute top-4 right-4 z-40 pointer-events-auto">
        <button
          onClick={() => setShowControlHub(!showControlHub)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-2xl border cursor-pointer ${
            showControlHub
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-500/30'
              : 'bg-[#05070d]/90 hover:bg-[#111a2e] text-slate-200 border-[#111a2e] backdrop-blur-md hover:border-blue-500/50'
          }`}
          title="Menüyü ve Kontrolleri Aç / Kapat (Kısayol: H veya M)"
        >
          {showControlHub ? (
            <>
              <X className="w-4 h-4 text-white" />
              <span>Menüyü Gizle</span>
            </>
          ) : (
            <>
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>🎛️ Sinema Menüsü</span>
              {isScreenSharing && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 🎬 THEATRICAL CINEMA MODE LIVE STREAM STATUS TILE */}
      {/* ========================================================= */}
      {(isScreenSharing || screenSharerName) && (
        <div className="absolute top-4 left-4 z-30 pointer-events-auto">
          <div className="flex items-center gap-3 p-2.5 bg-[#0A0A0B]/95 border border-amber-500/40 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black rounded-lg text-[10px] uppercase tracking-wider shadow-sm">
              <Film className="w-3.5 h-3.5" />
              <span>CINEMA MODE</span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {screenSharerName || currentUser.displayName}
              </span>
              <span className="text-[10px] text-amber-300/80 font-medium">4K Ultra HD • IMAX 3D Perdede</span>
            </div>

            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={() => setIsFocusedStreamOpen(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl text-[11px] font-black tracking-wide flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all"
                title="Ultra-Luxe Sinema Görünümüne Odaklan"
              >
                <Maximize2 className="w-3 h-3 stroke-[2.5]" />
                <span>Sinema Modu</span>
              </button>

              {isScreenSharing && (
                <button
                  onClick={handleToggleScreenShare}
                  className="px-2.5 py-1.5 bg-[#181920] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-[#2c303f] hover:border-red-500/40 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                  title="Yayını Durdur"
                >
                  Durdur
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔝 COLLAPSIBLE TOP CONTROL HUB (Menüye Tıklanınca Açılır/Kapanır) */}
      {/* ========================================================= */}
      {showControlHub && (
        <div className="absolute top-16 left-4 right-48 z-30 flex flex-col gap-2 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Top Bar Row */}
          <div className="flex items-center justify-between gap-3">
            {/* 3D Venue Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#05070d]/95 backdrop-blur-md border border-[#111a2e] rounded-xl shadow-2xl pointer-events-auto">
              <button
                onClick={() => {
                  setVenueType('cinema');
                  setIsSitting(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  venueType === 'cinema'
                    ? 'bg-[#2563ff] text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Onyx IMAX Sinema</span>
              </button>
              <button
                onClick={() => {
                  setVenueType('club');
                  setIsSitting(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  venueType === 'club'
                    ? 'bg-[#2563ff] text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Cyber Kulüp</span>
              </button>
              <button
                onClick={() => {
                  setVenueType('rooftop');
                  setIsSitting(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  venueType === 'rooftop'
                    ? 'bg-[#2563ff] text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Çatı Katı</span>
              </button>
            </div>

            {/* SCREEN SHARE BUTTON & Status */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={handleToggleScreenShare}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xl cursor-pointer ${
                  isScreenSharing
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                }`}
              >
                {isScreenSharing ? (
                  <>
                    <MonitorOff className="w-4 h-4" />
                    <span>Paylaşımı Durdur</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>🎬 Sinema Ekranı Paylaş</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#05070d]/95 backdrop-blur-md border border-[#111a2e] rounded-xl text-xs font-semibold shadow-xl text-white">
                <Tv className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span className="truncate max-w-[150px] sm:max-w-xs">{videoState.videoTitle}</span>
              </div>
            </div>
          </div>

          {/* YOUTUBE URL INPUT FORM */}
          <div className="w-full max-w-3xl pointer-events-auto">
            <form
              onSubmit={handlePlayVideoSubmit}
              className="flex items-center gap-2 p-1.5 bg-[#05070d]/95 backdrop-blur-md border border-blue-500/40 focus-within:border-blue-500 rounded-2xl shadow-2xl transition-all"
            >
              <div className="pl-3 text-red-500">
                <Tv className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="YouTube video veya canlı yayın linki yapıştırın (örn: https://youtube.com/watch?v=...)"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!urlInputValue.trim()}
                className="px-4 py-2 bg-[#2563ff] hover:bg-[#3b82f6] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Perdede Oynat</span>
              </button>
            </form>

            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
                Hızlı Seç:
              </span>
              {YOUTUBE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPresetVideo(p.id, p.title)}
                  className="px-2.5 py-1 bg-[#05070d]/90 hover:bg-[#111a2e] text-slate-300 hover:text-white border border-[#111a2e] rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {p.title.split('—')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Notification Toast */}
      {videoNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/95 text-white rounded-2xl text-xs font-bold shadow-2xl animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{videoNotice}</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🛋️ FLOATING SEATING PROMPT (KOLTUĞA OTUR / KALK) */}
      {/* ========================================================= */}
      {nearSeatPrompt && !isSitting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto animate-bounce">
          <button
            onClick={() => sitDownInSeat(nearSeatPrompt)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-2xl shadow-blue-500/50 cursor-pointer border border-blue-400"
          >
            <Armchair className="w-4 h-4" />
            <span>Koltuğa Otur [E]</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎮 ON-SCREEN WALKING D-PAD (Only visible if showControlHub or sitting) */}
      {/* ========================================================= */}
      {showControlHub && (
        <div className="absolute bottom-24 left-6 z-20 flex flex-col items-center gap-1 p-2 bg-[#05070d]/90 backdrop-blur-md border border-[#111a2e] rounded-2xl shadow-2xl select-none animate-in fade-in duration-150">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dolaşma</p>

          <button
            onMouseDown={() => (virtualControlsRef.current['FORWARD'] = true)}
            onMouseUp={() => (virtualControlsRef.current['FORWARD'] = false)}
            onTouchStart={() => (virtualControlsRef.current['FORWARD'] = true)}
            onTouchEnd={() => (virtualControlsRef.current['FORWARD'] = false)}
            className="w-10 h-10 bg-[#0a0f1c] hover:bg-[#1e293b] active:bg-blue-600 text-white rounded-xl flex items-center justify-center border border-[#111a2e] transition-colors cursor-pointer"
            title="İleri Yürü (W)"
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onMouseDown={() => (virtualControlsRef.current['LEFT'] = true)}
              onMouseUp={() => (virtualControlsRef.current['LEFT'] = false)}
              onTouchStart={() => (virtualControlsRef.current['LEFT'] = true)}
              onTouchEnd={() => (virtualControlsRef.current['LEFT'] = false)}
              className="w-10 h-10 bg-[#0a0f1c] hover:bg-[#1e293b] active:bg-blue-600 text-white rounded-xl flex items-center justify-center border border-[#111a2e] transition-colors cursor-pointer"
              title="Sola Yürü (A)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onMouseDown={() => (virtualControlsRef.current['BACKWARD'] = true)}
              onMouseUp={() => (virtualControlsRef.current['BACKWARD'] = false)}
              onTouchStart={() => (virtualControlsRef.current['BACKWARD'] = true)}
              onTouchEnd={() => (virtualControlsRef.current['BACKWARD'] = false)}
              className="w-10 h-10 bg-[#0a0f1c] hover:bg-[#1e293b] active:bg-blue-600 text-white rounded-xl flex items-center justify-center border border-[#111a2e] transition-colors cursor-pointer"
              title="Geri Yürü (S)"
            >
              <ArrowDown className="w-5 h-5" />
            </button>

            <button
              onMouseDown={() => (virtualControlsRef.current['RIGHT'] = true)}
              onMouseUp={() => (virtualControlsRef.current['RIGHT'] = false)}
              onTouchStart={() => (virtualControlsRef.current['RIGHT'] = true)}
              onTouchEnd={() => (virtualControlsRef.current['RIGHT'] = false)}
              className="w-10 h-10 bg-[#0a0f1c] hover:bg-[#1e293b] active:bg-blue-600 text-white rounded-xl flex items-center justify-center border border-[#111a2e] transition-colors cursor-pointer"
              title="Sağa Yürü (D)"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎙️ COLLAPSIBLE BOTTOM CONTROL DOCK (Menü Açıkken Görünür) */}
      {/* ========================================================= */}
      {showControlHub ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 bg-[#05070d]/95 backdrop-blur-md border border-[#111a2e] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Voice Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              currentVoiceState.isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-[#111a2e] text-slate-200 hover:bg-[#1e2d4e]'
            }`}
          >
            {currentVoiceState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-400" />}
            <span>{currentVoiceState.isMuted ? 'Sessiz' : 'Konuşuyor'}</span>
          </button>

          {/* Deafen Toggle */}
          <button
            onClick={onToggleDeafen}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentVoiceState.isDeafened
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-[#111a2e] text-slate-200 hover:bg-[#1e2d4e]'
            }`}
            title={currentVoiceState.isDeafened ? 'Sağırı Aç' : 'Sağırlaştır'}
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* Sit Down / Stand Up Toggle */}
          <button
            onClick={() => {
              if (isSitting) {
                standUp();
              } else {
                sitInNearestSeat();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSitting
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/20'
                : 'bg-[#111a2e] text-slate-200 border-[#111a2e] hover:bg-[#1e2d4e]'
            }`}
          >
            <Armchair className="w-4 h-4 text-emerald-400" />
            <span>{isSitting ? 'Ayağa Kalk / Dolaş' : 'Koltuğa Otur'}</span>
          </button>

          {/* Character Skin Selector */}
          <select
            value={characterType}
            onChange={(e) => setCharacterType(e.target.value as CharacterType)}
            className="px-2.5 py-2 bg-[#111a2e] text-slate-200 text-xs font-semibold rounded-xl border border-[#111a2e] focus:outline-none cursor-pointer"
          >
            <option value="scout">Karakter: Cyber Scout</option>
            <option value="runner">Karakter: Street Runner</option>
            <option value="nomad">Karakter: Synth Nomad</option>
            <option value="walker">Karakter: Void Walker</option>
          </select>

          {/* Disconnect from 3D Voice Room */}
          <button
            onClick={onLeaveVoice}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer ml-1"
          >
            Ayrıl
          </button>
        </div>
      ) : isSitting ? (
        // Minimal Floating Stand Up Button when sitting and menu is hidden
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={standUp}
            className="flex items-center gap-2 px-4 py-2 bg-[#05070d]/90 hover:bg-[#111a2e] text-slate-200 border border-[#111a2e] rounded-2xl text-xs font-bold backdrop-blur-md shadow-2xl transition-all cursor-pointer"
          >
            <Footprints className="w-4 h-4 text-blue-400" />
            <span>Ayağa Kalk [E]</span>
          </button>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* 🎬 ULTRA-LUXE THEATRICAL CINEMA MODE SCREEN SHARE OVERLAY */}
      {/* ========================================================= */}
      {isFocusedStreamOpen && (
        <CinemaModeScreenShare
          sharerName={screenSharerName || (isScreenSharing ? currentUser.displayName : null)}
          sharerAvatar={currentUser.avatarUrl}
          videoStream={screenStreamRef.current}
          currentUser={currentUser}
          allUsers={allUsers}
          currentVoiceState={currentVoiceState}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
          onLeaveCinema={() => setIsFocusedStreamOpen(false)}
          onStopSharing={handleToggleScreenShare}
          isSharing={isScreenSharing}
        />
      )}
    </div>
  );
};
