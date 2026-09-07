export type BoardType = 'public' | 'private';
export type ThemeMode = 'dark' | 'light';

export interface BoardOrRoom {
  id: string;
  name: string;
  type: BoardType;
  pin?: string;
  description?: string;
  creatorId?: string;
  creatorName?: string;
  createdAt: number;
  itemCount?: number;
}

export type ItemType = 'text' | 'code' | 'file' | 'link';

export interface SharedItem {
  id: string;
  targetId: string;
  type: ItemType;
  content?: string;
  language?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileMime?: string;
  creatorId: string;
  creatorName: string;
  senderIp?: string;
  createdAt: number;
  isDeleted: boolean;
  deletedAt?: number;
  deletedBy?: string;
}

export interface UserProfile {
  creatorId: string;
  displayName: string;
  avatarColor: string;
}

export type FilterCategory = 'all' | 'files' | 'snippets' | 'mine';

export interface PresenceState {
  count: number;
  users: Array<{ id: string; name: string; color: string }>;
}
