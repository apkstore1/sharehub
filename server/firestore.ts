import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Firestore,
} from 'firebase/firestore';

let firestoreDb: Firestore | null = null;
let isConnected = false;
let projectId = '';

export async function initServerFirestore(): Promise<boolean> {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firestore] firebase-applet-config.json not found.');
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    projectId = config.projectId || '';

    const app = !getApps().length ? initializeApp(config) : getApp();
    firestoreDb = getFirestore(app, config.firestoreDatabaseId || '(default)');

    // Seed default boards in Firestore if not already present
    await seedDefaultBoards();

    isConnected = true;
    console.log(`[Firestore] Cloud database initialized successfully for project: ${projectId}`);
    return true;
  } catch (err: any) {
    console.error('[Firestore] Failed to initialize cloud database:', err?.message || err);
    isConnected = false;
    return false;
  }
}

export function isFirestoreActive(): boolean {
  return isConnected && firestoreDb !== null;
}

export function getFirestoreProjectId(): string {
  return projectId;
}

const DEFAULT_BOARDS = [
  {
    id: 'general',
    name: 'General Share',
    type: 'public',
    hasPin: false,
    description: 'Instant office-wide clipboard, quick announcements, and files',
    creatorId: 'system',
    creatorName: 'System',
    createdAt: 1700000000000,
  },
  {
    id: 'dev',
    name: 'Dev & Engineering',
    type: 'public',
    hasPin: false,
    description: 'Code snippets, logs, config dumps, and technical diffs',
    creatorId: 'system',
    creatorName: 'System',
    createdAt: 1700000001000,
  },
  {
    id: 'design',
    name: 'Design & Assets',
    type: 'public',
    hasPin: false,
    description: 'UI mockups, vector icons, SVG exports, and color palettes',
    creatorId: 'system',
    creatorName: 'System',
    createdAt: 1700000002000,
  },
  {
    id: 'links',
    name: 'Quick Links & Docs',
    type: 'public',
    hasPin: false,
    description: 'Team bookmarks, documentation references, and staging links',
    creatorId: 'system',
    creatorName: 'System',
    createdAt: 1700000003000,
  },
];

async function seedDefaultBoards() {
  if (!firestoreDb) return;
  try {
    const boardsRef = collection(firestoreDb, 'boards');
    const snap = await getDocs(boardsRef);
    if (snap.empty) {
      console.log('[Firestore] Seeding default boards in Cloud Firestore...');
      for (const b of DEFAULT_BOARDS) {
        await setDoc(doc(firestoreDb, 'boards', b.id), b);
      }
      console.log('[Firestore] Default boards seeded!');
    }
  } catch (err: any) {
    console.warn('[Firestore] Error checking/seeding boards:', err?.message || err);
  }
}

export async function fetchBoardsFromFirestore() {
  if (!firestoreDb) return null;
  try {
    const boardsRef = collection(firestoreDb, 'boards');
    const snap = await getDocs(boardsRef);
    const boards: any[] = [];
    snap.forEach((d) => {
      boards.push(d.data());
    });
    // Sort: public first, then by createdAt
    boards.sort((a, b) => {
      if (a.type === 'public' && b.type !== 'public') return -1;
      if (a.type !== 'public' && b.type === 'public') return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    return boards;
  } catch (err) {
    console.error('[Firestore] fetchBoards error:', err);
    return null;
  }
}

export async function saveBoardToFirestore(board: any) {
  if (!firestoreDb) return false;
  try {
    await setDoc(doc(firestoreDb, 'boards', board.id), board);
    return true;
  } catch (err) {
    console.error('[Firestore] saveBoard error:', err);
    return false;
  }
}

export async function getBoardFromFirestore(boardId: string) {
  if (!firestoreDb) return null;
  try {
    const snap = await getDoc(doc(firestoreDb, 'boards', boardId));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    console.error('[Firestore] getBoard error:', err);
    return null;
  }
}

export async function fetchItemsFromFirestore(targetId: string, includeDeleted = false) {
  if (!firestoreDb) return null;
  try {
    const itemsRef = collection(firestoreDb, 'items');
    const q = query(itemsRef, where('targetId', '==', targetId));
    const snap = await getDocs(q);
    const items: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (includeDeleted || !data.isDeleted) {
        items.push(data);
      }
    });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return items;
  } catch (err) {
    console.error('[Firestore] fetchItems error:', err);
    return null;
  }
}

export async function saveItemToFirestore(item: any) {
  if (!firestoreDb) return false;
  try {
    await setDoc(doc(firestoreDb, 'items', item.id), item);
    return true;
  } catch (err) {
    console.error('[Firestore] saveItem error:', err);
    return false;
  }
}

export async function updateItemInFirestore(itemId: string, updates: any) {
  if (!firestoreDb) return false;
  try {
    await updateDoc(doc(firestoreDb, 'items', itemId), updates);
    return true;
  } catch (err) {
    console.error('[Firestore] updateItem error:', err);
    return false;
  }
}

export async function getItemFromFirestore(itemId: string) {
  if (!firestoreDb) return null;
  try {
    const snap = await getDoc(doc(firestoreDb, 'items', itemId));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    console.error('[Firestore] getItem error:', err);
    return null;
  }
}

export async function fetchTrashFromFirestore() {
  if (!firestoreDb) return null;
  try {
    const itemsRef = collection(firestoreDb, 'items');
    const q = query(itemsRef, where('isDeleted', '==', true));
    const snap = await getDocs(q);
    const items: any[] = [];
    snap.forEach((d) => {
      items.push(d.data());
    });
    items.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    return items;
  } catch (err) {
    console.error('[Firestore] fetchTrash error:', err);
    return null;
  }
}
