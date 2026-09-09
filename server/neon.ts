import { Pool } from 'pg';

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } }) : null;
let ready = false;

const defaults = [
  ['general', 'General Share', 'public', 'Instant office-wide clipboard, quick announcements, and files'],
  ['dev', 'Dev & Engineering', 'public', 'Code snippets, logs, config dumps, and technical diffs'],
  ['design', 'Design & Assets', 'public', 'UI mockups, vector icons, SVG exports, and color palettes'],
  ['links', 'Quick Links & Docs', 'public', 'Team bookmarks, documentation references, and staging links'],
];

export function isNeonActive() { return Boolean(pool); }

export async function initNeon() {
  if (!pool || ready) return Boolean(pool);
  await pool.query(`CREATE TABLE IF NOT EXISTS boards (id text PRIMARY KEY, name text NOT NULL, type text NOT NULL, pin text, description text DEFAULT '', creator_id text, creator_name text, created_at bigint NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS items (id text PRIMARY KEY, target_id text NOT NULL, type text NOT NULL, content text, language text, file_url text, file_name text, file_size bigint, file_mime text, creator_id text NOT NULL, creator_name text NOT NULL, sender_ip text, created_at bigint NOT NULL, is_deleted boolean DEFAULT false, deleted_at bigint, deleted_by text)`);
  for (const [id, name, type, description] of defaults) {
    await pool.query(`INSERT INTO boards (id,name,type,description,creator_id,creator_name,created_at) VALUES ($1,$2,$3,$4,'system','System',$5) ON CONFLICT (id) DO NOTHING`, [id, name, type, description, Date.now()]);
  }
  ready = true;
  return true;
}

export async function neonBoards() {
  if (!pool) return null;
  const { rows } = await pool.query(`SELECT b.*, COUNT(i.id) FILTER (WHERE i.is_deleted = false) AS item_count FROM boards b LEFT JOIN items i ON i.target_id=b.id GROUP BY b.id ORDER BY (b.type='public') DESC, b.created_at ASC`);
  return rows.map((r) => ({ id:r.id, name:r.name, type:r.type, hasPin:Boolean(r.pin), description:r.description || '', creatorId:r.creator_id || 'system', creatorName:r.creator_name || 'System', createdAt:Number(r.created_at), itemCount:Number(r.item_count || 0) }));
}

export async function neonBoard(id: string) { if (!pool) return null; const { rows } = await pool.query('SELECT * FROM boards WHERE id=$1', [id]); return rows[0] || null; }
export async function neonItems(targetId: string, includeDeleted=false) { if (!pool) return null; const { rows } = await pool.query(`SELECT * FROM items WHERE target_id=$1 ${includeDeleted ? '' : 'AND is_deleted=false'} ORDER BY created_at DESC`, [targetId]); return rows.map((r) => ({ id:r.id, targetId:r.target_id, type:r.type, content:r.content, language:r.language, fileUrl:r.file_url, fileName:r.file_name, fileSize:Number(r.file_size || 0), fileMime:r.file_mime, creatorId:r.creator_id, creatorName:r.creator_name, senderIp:r.sender_ip, createdAt:Number(r.created_at), isDeleted:Boolean(r.is_deleted), deletedAt:r.deleted_at ? Number(r.deleted_at) : null, deletedBy:r.deleted_by })); }
export async function neonCreateBoard(b:any) { if (!pool) return; await pool.query(`INSERT INTO boards (id,name,type,pin,description,creator_id,creator_name,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [b.id,b.name,b.type,b.pin,b.description,b.creatorId,b.creatorName,b.createdAt]); }
export async function neonCreateItem(i:any) { if (!pool) return; await pool.query(`INSERT INTO items (id,target_id,type,content,language,file_url,file_name,file_size,file_mime,creator_id,creator_name,sender_ip,created_at,is_deleted) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false)`, [i.id,i.targetId,i.type,i.content,i.language,i.fileUrl,i.fileName,i.fileSize,i.fileMime,i.creatorId,i.creatorName,i.senderIp,i.createdAt]); }
export async function neonTrash() { if (!pool) return null; const { rows } = await pool.query('SELECT * FROM items WHERE is_deleted=true ORDER BY deleted_at DESC'); return rows; }
