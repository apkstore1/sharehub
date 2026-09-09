import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import initSqlJs, { type Database } from 'sql.js';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  initServerFirestore,
  isFirestoreActive,
  getFirestoreProjectId,
  fetchBoardsFromFirestore,
  saveBoardToFirestore,
  getBoardFromFirestore,
  fetchItemsFromFirestore,
  saveItemToFirestore,
  updateItemInFirestore,
  getItemFromFirestore,
  fetchTrashFromFirestore,
} from './server/firestore';
import {
  initNeon,
  isNeonActive,
  neonBoards,
  neonBoard,
  neonItems,
  neonCreateBoard,
  neonCreateItem,
  neonTrash,
} from './server/neon';

dotenv.config();

const PORT = 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

// Resolve writable application data independently from the process working directory.
// Production hosts may start the bundled server from the dist directory.
  // Use deployment-independent roots. The bundled production server is CommonJS,
  // while the dev server runs as ESM, so __dirname is not available consistently.
  const runtimeRoot = process.cwd();
  const appRoot = process.env.VERCEL
    ? path.join('/tmp', 'sharehub')
    : fs.existsSync(path.join(runtimeRoot, 'package.json'))
      ? runtimeRoot
      : path.resolve(runtimeRoot, '..');
const dataDir = path.join(appRoot, 'data');
const uploadsDir = path.join(appRoot, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbFilePath = path.join(dataDir, 'sharehub.sqlite');

let db: Database;

// Helper to save sqlite memory state to disk
function persistDatabase() {
  try {
    const binaryArray = db.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

// Database initialization
async function setupDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Error reading existing sqlite file, creating fresh database:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      pin TEXT,
      description TEXT,
      creator_id TEXT,
      creator_name TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      language TEXT,
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_mime TEXT,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      sender_ip TEXT,
      created_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      deleted_at INTEGER,
      deleted_by TEXT
    );
  `);

  // Seed default public boards if none exist
  const res = db.exec("SELECT COUNT(*) as count FROM boards WHERE type = 'public'");
  const boardCount = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;

  if (boardCount === 0) {
    const defaultBoards = [
      {
        id: 'general',
        name: 'General Share',
        type: 'public',
        description: 'Instant office-wide clipboard, quick announcements, and files',
        creatorName: 'System',
      },
      {
        id: 'dev',
        name: 'Dev & Engineering',
        type: 'public',
        description: 'Code snippets, logs, config dumps, and technical diffs',
        creatorName: 'System',
      },
      {
        id: 'design',
        name: 'Design & Assets',
        type: 'public',
        description: 'UI mockups, vector icons, SVG exports, and color palettes',
        creatorName: 'System',
      },
      {
        id: 'links',
        name: 'Quick Links & Docs',
        type: 'public',
        description: 'Team bookmarks, documentation references, and staging links',
        creatorName: 'System',
      },
    ];

    const now = Date.now();
    for (const b of defaultBoards) {
      db.run(
        `INSERT INTO boards (id, name, type, pin, description, creator_id, creator_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.name, b.type, null, b.description, 'system', b.creatorName, now]
      );
    }
  }

  persistDatabase();
}

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${base || 'file'}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB file size limit
});

export async function createApp() {
  await setupDatabase();
  if (isNeonActive()) {
    await initNeon();
    console.log('[Neon] Production persistence enabled');
  } else {
    await initServerFirestore();
  }

  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Socket room presence tracking
  // room -> Map(socketId -> { id, name, color })
  const roomPresences = new Map<string, Map<string, { id: string; name: string; color: string }>>();

  function broadcastPresence(roomId: string) {
    const map = roomPresences.get(roomId);
    const users = map ? Array.from(map.values()) : [];
    io.to(`room:${roomId}`).emit('presence_update', {
      targetId: roomId,
      count: users.length,
      users,
    });
  }

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentUser: { id: string; name: string; color: string } | null = null;

    socket.on('join_board', (data: { boardId: string; user: { id: string; name: string; color: string } }) => {
      const { boardId, user } = data;
      if (currentRoomId) {
        socket.leave(`room:${currentRoomId}`);
        const oldMap = roomPresences.get(currentRoomId);
        if (oldMap) {
          oldMap.delete(socket.id);
          broadcastPresence(currentRoomId);
        }
      }

      currentRoomId = boardId;
      currentUser = user;
      socket.join(`room:${boardId}`);

      if (!roomPresences.has(boardId)) {
        roomPresences.set(boardId, new Map());
      }
      roomPresences.get(boardId)!.set(socket.id, user);
      broadcastPresence(boardId);
    });

    socket.on('leave_board', () => {
      if (currentRoomId) {
        socket.leave(`room:${currentRoomId}`);
        const map = roomPresences.get(currentRoomId);
        if (map) {
          map.delete(socket.id);
          broadcastPresence(currentRoomId);
        }
        currentRoomId = null;
      }
    });

    socket.on('disconnect', () => {
      if (currentRoomId) {
        const map = roomPresences.get(currentRoomId);
        if (map) {
          map.delete(socket.id);
          broadcastPresence(currentRoomId);
        }
      }
    });
  });

  // Helper to query single/multiple rows cleanly from sql.js
  function queryAll(sql: string, params: any[] = []): any[] {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  function queryOne(sql: string, params: any[] = []): any | null {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: Date.now(),
      cloudDatabase: isFirestoreActive() ? 'connected' : 'offline',
      projectId: getFirestoreProjectId(),
    });
  });

  // Get all boards and rooms
  app.get('/api/boards', async (req: Request, res: Response) => {
    try {
      if (isNeonActive()) {
        const cloudBoards = await neonBoards();
        if (cloudBoards) return res.json({ boards: cloudBoards, database: 'neon' });
      }
      if (isFirestoreActive()) {
        const cloudBoards = await fetchBoardsFromFirestore();
        if (cloudBoards && cloudBoards.length > 0) {
          const boardsWithCounts = await Promise.all(
            cloudBoards.map(async (b: any) => {
              const cloudItems = await fetchItemsFromFirestore(b.id, false);
              return {
                id: b.id,
                name: b.name,
                type: b.type,
                hasPin: Boolean(b.hasPin || (b.pin && b.pin.length > 0)),
                description: b.description || '',
                creatorId: b.creatorId || 'system',
                creatorName: b.creatorName || 'System',
                createdAt: b.createdAt || Date.now(),
                itemCount: cloudItems ? cloudItems.length : 0,
              };
            })
          );
          return res.json({ boards: boardsWithCounts, database: 'cloud-firestore' });
        }
      }

      const rows = queryAll(`
        SELECT b.*,
          (SELECT COUNT(*) FROM items i WHERE i.target_id = b.id AND i.is_deleted = 0) as item_count
        FROM boards b
        ORDER BY b.type DESC, b.created_at ASC
      `);

      const boards = rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        hasPin: Boolean(r.pin && r.pin.length > 0),
        description: r.description,
        creatorId: r.creator_id,
        creatorName: r.creator_name,
        createdAt: r.created_at,
        itemCount: Number(r.item_count || 0),
      }));

      res.json({ boards, database: 'sqlite' });
    } catch (err: any) {
      console.error('Error fetching boards:', err);
      res.status(500).json({ error: 'Failed to fetch boards' });
    }
  });

  // Create a board or private room
  app.post('/api/boards', async (req: Request, res: Response) => {
    try {
      const { name, type, pin, description, creatorId, creatorName } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required' });
      }

      const boardType = type === 'private' ? 'private' : 'public';
      let id = req.body.id;
      if (!id || typeof id !== 'string') {
        if (boardType === 'private') {
          id = `room-${Math.random().toString(36).substring(2, 7)}`;
        } else {
          id = name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').slice(0, 30);
        }
      }

      // Check if board already exists in Firestore or SQLite
      if (isFirestoreActive()) {
        const cloudExisting = await getBoardFromFirestore(id);
        if (cloudExisting) {
          return res.status(400).json({ error: `Board or room with id "${id}" already exists.` });
        }
      }

      const existing = queryOne('SELECT id FROM boards WHERE id = ?', [id]);
      if (existing) {
        return res.status(400).json({ error: `Board or room with id "${id}" already exists.` });
      }

      const cleanPin = boardType === 'private' && pin ? String(pin).trim() : null;
      const now = Date.now();

      if (isNeonActive()) {
        const newBoard = { id, name: name.trim(), type: boardType, hasPin: Boolean(cleanPin), description: description || '', creatorId: creatorId || 'anon', creatorName: creatorName || 'Anonymous', createdAt: now, itemCount: 0 };
        await neonCreateBoard({ ...newBoard, pin: cleanPin });
        io.emit('board:created', newBoard);
        return res.status(201).json({ board: newBoard });
      }

      db.run(
        `INSERT INTO boards (id, name, type, pin, description, creator_id, creator_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), boardType, cleanPin, description || '', creatorId || 'anon', creatorName || 'Anonymous', now]
      );
      persistDatabase();

      const newBoard = {
        id,
        name: name.trim(),
        type: boardType,
        hasPin: Boolean(cleanPin),
        description: description || '',
        creatorId: creatorId || 'anon',
        creatorName: creatorName || 'Anonymous',
        createdAt: now,
        itemCount: 0,
      };

      if (isFirestoreActive()) {
        const savedToCloud = await saveBoardToFirestore({
          ...newBoard,
          pin: cleanPin,
        });
        if (!savedToCloud) {
          console.warn(`[Boards] Cloud save failed for ${id}; keeping SQLite copy.`);
        }
      }

      // Notify clients about new board
      io.emit('board:created', newBoard);

      res.status(201).json({ board: newBoard });
    } catch (err: any) {
      console.error('Error creating board:', err);
      res.status(500).json({ error: 'Failed to create board or room' });
    }
  });

  // Verify room PIN
  app.post('/api/rooms/verify', async (req: Request, res: Response) => {
    const { roomId, pin } = req.body;
    if (!roomId) return res.status(400).json({ error: 'Room ID required' });

    let room: any = null;
    if (isFirestoreActive()) {
      room = await getBoardFromFirestore(roomId);
    }
    if (!room) {
      const sqliteRoom = queryOne('SELECT pin, type FROM boards WHERE id = ?', [roomId]);
      if (sqliteRoom) room = { pin: sqliteRoom.pin, type: sqliteRoom.type };
    }

    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.type === 'public' || !room.pin) {
      return res.json({ valid: true });
    }

    const isValid = String(pin || '').trim() === String(room.pin).trim();
    if (isValid) {
      return res.json({ valid: true });
    } else {
      return res.status(401).json({ valid: false, error: 'Incorrect PIN' });
    }
  });

  // Get items for board/room
  app.get('/api/boards/:id/items', async (req: Request, res: Response) => {
    try {
      const boardId = req.params.id;
      const pin = req.headers['x-room-pin'] || req.query.pin;
      const includeDeleted = req.query.includeDeleted === 'true';

      let board: any = null;
      if (isNeonActive()) {
        board = await neonBoard(boardId);
      }
      if (!board && isFirestoreActive()) {
        board = await getBoardFromFirestore(boardId);
      }
      if (!board) {
        const sqliteBoard = queryOne('SELECT * FROM boards WHERE id = ?', [boardId]);
        if (sqliteBoard) board = sqliteBoard;
      }

      if (!board) {
        return res.status(404).json({ error: 'Board or room not found' });
      }

      // Check pin if private
      if (board.type === 'private' && board.pin) {
        if (String(pin || '').trim() !== String(board.pin).trim()) {
          return res.status(401).json({ error: 'PIN required or invalid', requiresPin: true });
        }
      }

      if (isNeonActive()) {
        const neonItemRows = await neonItems(boardId, includeDeleted);
        if (neonItemRows) return res.json({ items: neonItemRows, database: 'neon' });
      }
      if (isFirestoreActive()) {
        const cloudItems = await fetchItemsFromFirestore(boardId, includeDeleted);
        if (cloudItems) {
          return res.json({ items: cloudItems, database: 'cloud-firestore' });
        }
      }

      const sql = includeDeleted
        ? 'SELECT * FROM items WHERE target_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM items WHERE target_id = ? AND is_deleted = 0 ORDER BY created_at DESC';

      const rows = queryAll(sql, [boardId]);

      const items = rows.map((r) => ({
        id: r.id,
        targetId: r.target_id,
        type: r.type,
        content: r.content,
        language: r.language,
        fileUrl: r.file_url,
        fileName: r.file_name,
        fileSize: r.file_size,
        fileMime: r.file_mime,
        creatorId: r.creator_id,
        creatorName: r.creator_name,
        senderIp: r.sender_ip,
        createdAt: r.created_at,
        isDeleted: Boolean(r.is_deleted),
        deletedAt: r.deleted_at,
        deletedBy: r.deleted_by,
      }));

      res.json({ items, database: 'sqlite' });
    } catch (err: any) {
      console.error('Error fetching items:', err);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  // Post a text snippet, code snippet, or link
  app.post('/api/items/text', async (req: Request, res: Response) => {
    try {
      const { targetId, type, content, language, creatorId, creatorName, pin } = req.body;

      if (!targetId || !content || !content.trim()) {
        return res.status(400).json({ error: 'targetId and content are required' });
      }

      // Check board existence and PIN if private
      let board: any = null;
      if (isFirestoreActive()) {
        board = await getBoardFromFirestore(targetId);
      }
      if (!board) {
        board = queryOne('SELECT * FROM boards WHERE id = ?', [targetId]);
      }

      if (!board) {
        return res.status(404).json({ error: 'Board or room not found' });
      }
      if (board.type === 'private' && board.pin) {
        if (String(pin || '').trim() !== String(board.pin).trim()) {
          return res.status(401).json({ error: 'PIN invalid for this private room' });
        }
      }

      const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = Date.now();
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      if (isNeonActive()) {
        const newItem = { id, targetId, type: type || 'text', content, language: language || null, fileUrl: null, fileName: null, fileSize: content.length, fileMime: 'text/plain', creatorId: creatorId || 'anon', creatorName: creatorName || 'Anonymous', senderIp: ip, createdAt: now, isDeleted: false };
        await neonCreateItem(newItem);
        io.to(`room:${targetId}`).emit('item:created', newItem);
        return res.status(201).json({ item: newItem });
      }

      db.run(
        `INSERT INTO items (
          id, target_id, type, content, language, file_url, file_name, file_size, file_mime,
          creator_id, creator_name, sender_ip, created_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          id,
          targetId,
          type || 'text',
          content,
          language || null,
          null,
          null,
          content.length,
          'text/plain',
          creatorId || 'anon',
          creatorName || 'Anonymous',
          ip,
          now,
        ]
      );
      persistDatabase();

      const newItem = {
        id,
        targetId,
        type: type || 'text',
        content,
        language: language || null,
        fileUrl: null,
        fileName: null,
        fileSize: content.length,
        fileMime: 'text/plain',
        creatorId: creatorId || 'anon',
        creatorName: creatorName || 'Anonymous',
        senderIp: ip,
        createdAt: now,
        isDeleted: false,
      };

      if (isFirestoreActive()) {
        const savedToCloud = await saveItemToFirestore(newItem);
        if (!savedToCloud) {
          console.warn(`[Items] Cloud save failed for ${id}; keeping SQLite copy.`);
        }
      }

      // Broadcast to room clients
      io.to(`room:${targetId}`).emit('item:created', newItem);

      res.status(201).json({ item: newItem });
    } catch (err: any) {
      console.error('Error posting text item:', err);
      res.status(500).json({ error: 'Failed to post item' });
    }
  });

  // Upload file(s)
  app.post('/api/upload', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { targetId, creatorId, creatorName, caption, pin } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }
      if (!targetId) {
        return res.status(400).json({ error: 'targetId is required' });
      }

      // Check board existence and PIN if private
      let board: any = null;
      if (isFirestoreActive()) {
        board = await getBoardFromFirestore(targetId);
      }
      if (!board) {
        board = queryOne('SELECT * FROM boards WHERE id = ?', [targetId]);
      }

      if (!board) {
        return res.status(404).json({ error: 'Board or room not found' });
      }
      if (board.type === 'private' && board.pin) {
        if (String(pin || '').trim() !== String(board.pin).trim()) {
          return res.status(401).json({ error: 'PIN invalid for this private room' });
        }
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const createdItems = [];

      for (const file of files) {
        const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = Date.now();
        const fileUrl = `/api/files/${encodeURIComponent(file.filename)}`;

        db.run(
          `INSERT INTO items (
            id, target_id, type, content, language, file_url, file_name, file_size, file_mime,
            creator_id, creator_name, sender_ip, created_at, is_deleted
          ) VALUES (?, ?, 'file', ?, null, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            id,
            targetId,
            caption || file.originalname,
            fileUrl,
            file.originalname,
            file.size,
            file.mimetype,
            creatorId || 'anon',
            creatorName || 'Anonymous',
            ip,
            now,
          ]
        );

        const item = {
          id,
          targetId,
          type: 'file' as const,
          content: caption || file.originalname,
          language: null,
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          fileMime: file.mimetype,
          creatorId: creatorId || 'anon',
          creatorName: creatorName || 'Anonymous',
          senderIp: ip,
          createdAt: now,
          isDeleted: false,
        };

        if (isFirestoreActive()) {
          await saveItemToFirestore(item);
        }

        createdItems.push(item);
        io.to(`room:${targetId}`).emit('item:created', item);
      }

      persistDatabase();
      res.status(201).json({ items: createdItems, item: createdItems[0] });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Serve uploaded files directly
  app.get('/api/files/:filename', (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      const download = req.query.download === '1';
      if (download) {
        res.download(filePath);
      } else {
        res.sendFile(filePath);
      }
    } catch (err: any) {
      console.error('Error serving file:', err);
      res.status(500).send('Internal file error');
    }
  });

  // Soft delete item with permission checks
  app.delete('/api/items/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { creatorId, adminSecret, deletedByName } = req.body;

      let item: any = null;
      if (isFirestoreActive()) {
        item = await getItemFromFirestore(id);
      }
      if (!item) {
        const row = queryOne('SELECT * FROM items WHERE id = ?', [id]);
        if (row) {
          item = {
            id: row.id,
            targetId: row.target_id,
            creatorId: row.creator_id,
            creatorName: row.creator_name,
          };
        }
      }

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check ownership or admin secret
      const isAuthor = creatorId && (item.creatorId === creatorId || item.creator_id === creatorId);
      const isAdmin = adminSecret && adminSecret.trim() === ADMIN_SECRET;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          error: 'Permission denied. Only the author or system admin can delete this item.',
          canDelete: false,
        });
      }

      const now = Date.now();
      const deletedBy = isAdmin ? 'System Admin' : (deletedByName || item.creatorName || item.creator_name || 'User');

      // Soft delete: is_deleted = 1
      db.run(
        `UPDATE items SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?`,
        [now, deletedBy, id]
      );
      persistDatabase();

      if (isFirestoreActive()) {
        await updateItemInFirestore(id, {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
        });
      }

      const targetRoom = item.targetId || item.target_id;
      io.to(`room:${targetRoom}`).emit('item:deleted', {
        id,
        targetId: targetRoom,
        deletedAt: now,
        deletedBy,
      });

      res.json({ success: true, id, message: 'Item soft-deleted safely. Can be recovered from Trash.' });
    } catch (err: any) {
      console.error('Error deleting item:', err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // Restore soft-deleted item
  app.post('/api/items/:id/restore', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let item: any = null;
      if (isFirestoreActive()) {
        item = await getItemFromFirestore(id);
      }
      if (!item) {
        item = queryOne('SELECT * FROM items WHERE id = ?', [id]);
      }

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      db.run(`UPDATE items SET is_deleted = 0, deleted_at = null, deleted_by = null WHERE id = ?`, [id]);
      persistDatabase();

      if (isFirestoreActive()) {
        await updateItemInFirestore(id, {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        });
      }

      const restoredItem = {
        id: item.id,
        targetId: item.targetId || item.target_id,
        type: item.type,
        content: item.content,
        language: item.language,
        fileUrl: item.fileUrl || item.file_url,
        fileName: item.fileName || item.file_name,
        fileSize: item.fileSize || item.file_size,
        fileMime: item.fileMime || item.file_mime,
        creatorId: item.creatorId || item.creator_id,
        creatorName: item.creatorName || item.creator_name,
        senderIp: item.senderIp || item.sender_ip,
        createdAt: item.createdAt || item.created_at,
        isDeleted: false,
      };

      io.to(`room:${restoredItem.targetId}`).emit('item:restored', restoredItem);

      res.json({ success: true, item: restoredItem });
    } catch (err: any) {
      console.error('Error restoring item:', err);
      res.status(500).json({ error: 'Failed to restore item' });
    }
  });

  // Hard purge item (Permanently remove)
  app.delete('/api/items/:id/purge', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminSecret } = req.body;

      if (!adminSecret || adminSecret.trim() !== ADMIN_SECRET) {
        return res.status(403).json({ error: 'Admin permission required to permanently purge items' });
      }

      const item = queryOne('SELECT * FROM items WHERE id = ?', [id]);
      if (item && item.type === 'file' && item.file_url) {
        const filename = path.basename(item.file_url);
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('Could not remove file on disk:', e);
          }
        }
      }

      db.run('DELETE FROM items WHERE id = ?', [id]);
      persistDatabase();

      if (item) {
        io.to(`room:${item.target_id}`).emit('item:purged', { id, targetId: item.target_id });
      }

      res.json({ success: true, message: 'Item permanently purged from storage and database' });
    } catch (err: any) {
      console.error('Error purging item:', err);
      res.status(500).json({ error: 'Failed to purge item' });
    }
  });

  // Get deleted items for a board (or all boards) for Recovery / Trash
  app.get('/api/trash', async (req: Request, res: Response) => {
    try {
      const targetId = req.query.targetId as string;

      if (isFirestoreActive()) {
        const cloudTrash = await fetchTrashFromFirestore();
        if (cloudTrash) {
          const filtered = targetId ? cloudTrash.filter((i: any) => i.targetId === targetId) : cloudTrash;
          return res.json({ items: filtered, database: 'cloud-firestore' });
        }
      }

      let sql = 'SELECT * FROM items WHERE is_deleted = 1';
      const params: any[] = [];

      if (targetId) {
        sql += ' AND target_id = ?';
        params.push(targetId);
      }
      sql += ' ORDER BY deleted_at DESC LIMIT 100';

      const rows = queryAll(sql, params);
      const items = rows.map((r) => ({
        id: r.id,
        targetId: r.target_id,
        type: r.type,
        content: r.content,
        language: r.language,
        fileUrl: r.file_url,
        fileName: r.file_name,
        fileSize: r.file_size,
        fileMime: r.file_mime,
        creatorId: r.creator_id,
        creatorName: r.creator_name,
        senderIp: r.sender_ip,
        createdAt: r.created_at,
        isDeleted: true,
        deletedAt: r.deleted_at,
        deletedBy: r.deleted_by,
      }));

      res.json({ items });
    } catch (err: any) {
      console.error('Error fetching trash items:', err);
      res.status(500).json({ error: 'Failed to fetch trash items' });
    }
  });

  // System Stats
  app.get('/api/stats', (_req: Request, res: Response) => {
    try {
      const totalItemsRow = queryOne('SELECT COUNT(*) as c FROM items WHERE is_deleted = 0');
      const totalDeletedRow = queryOne('SELECT COUNT(*) as c FROM items WHERE is_deleted = 1');
      const totalBoardsRow = queryOne('SELECT COUNT(*) as c FROM boards');
      const totalFilesSizeRow = queryOne('SELECT SUM(file_size) as s FROM items WHERE type = "file"');

      res.json({
        activeItems: Number(totalItemsRow?.c || 0),
        deletedItems: Number(totalDeletedRow?.c || 0),
        totalBoards: Number(totalBoardsRow?.c || 0),
        totalFileSizeBytes: Number(totalFilesSizeRow?.s || 0),
        serverTime: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return { app, httpServer };
}

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) appPromise = createApp();
  const { app } = await appPromise;
  return app(req, res);
}

if (!process.env.VERCEL) {
  createApp()
    .then(({ httpServer }) => {
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server listening at http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Fatal server startup error:', err);
      process.exit(1);
    });
}
