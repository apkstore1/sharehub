import { UserProfile } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'airshare_user_profile',
  UNLOCKED_ROOMS: 'airshare_unlocked_rooms',
  ADMIN_KEY: 'airshare_admin_key',
  LAST_BOARD: 'airshare_last_board',
};

const AVATAR_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
];

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse user profile:', e);
  }

  // Generate default identity
  const randomNum = Math.floor(100 + Math.random() * 900);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const creatorId = 'usr_' + Math.random().toString(36).substring(2, 11);
  const defaultProfile: UserProfile = {
    creatorId,
    displayName: `Colleague-${randomNum}`,
    avatarColor: color,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
  } catch (e) {}

  return defaultProfile;
}

export function saveUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated = { ...current, ...profile };
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

// Room PIN memory
export function getUnlockedRoomPin(roomId: string): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_ROOMS);
    if (raw) {
      const map = JSON.parse(raw);
      return map[roomId] || null;
    }
  } catch (e) {}
  return null;
}

export function saveUnlockedRoomPin(roomId: string, pin: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_ROOMS);
    const map = raw ? JSON.parse(raw) : {};
    map[roomId] = pin;
    sessionStorage.setItem(STORAGE_KEYS.UNLOCKED_ROOMS, JSON.stringify(map));
  } catch (e) {}
}

// Admin secret
export function getAdminKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function saveAdminKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_KEY, key);
  } catch (e) {}
}

export function getLastActiveBoard(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_BOARD) || 'general';
  } catch (e) {
    return 'general';
  }
}

export function saveLastActiveBoard(boardId: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_BOARD, boardId);
  } catch (e) {}
}
