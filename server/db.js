const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('\n DATABASE_URL is not set.\n'); process.exit(1); }
  const u = new URL(url);
  const isPooler = u.hostname.includes('-pooler.');
  console.log(`  Host: ${u.hostname}`);
  console.log(`  Port: ${isPooler ? 6432 : 5432}`);
  console.log(`  DB:   ${u.pathname.slice(1)}`);
  console.log(`  User: ${u.username}`);
  pool = new Pool({
    host: u.hostname,
    port: isPooler ? 6432 : 5432,
    database: u.pathname.slice(1),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  pool.on('error', (err) => { console.error('Unexpected pool error:', err); });
  return pool;
}

async function initDB() {
  console.log('\nConnecting to database...');
  const db = getPool();
  let client;
  try {
    client = await db.connect();
    console.log('Connected\n');
  } catch (err) {
    console.error('\n Connection failed:', err.message);
    throw err;
  } finally {
    if (client) client.release();
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'reader',
      subscribed_until TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      economist_title TEXT,
      summary TEXT,
      audio_url TEXT,
      pdf_url TEXT,
      theory_explanation TEXT,
      exam_questions TEXT,
      other_media TEXT,
      audio_script TEXT,
      pdf_text TEXT,
      word_annotations TEXT,
      country_tags TEXT[] DEFAULT '{}',
      is_published BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vocab_list (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      translation TEXT,
      context TEXT,
      post_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, word)
    );
    CREATE TABLE IF NOT EXISTS country_profiles (
      country_name TEXT PRIMARY KEY,
      profile_data TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS pdf_text TEXT;`);
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS pdf_url TEXT;`);
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS word_annotations TEXT;`);

  const { rows } = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role, subscribed_until) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), 'admin@readingclub.app', hash, 'Admin', 'admin', '2099-12-31']
    );
    console.log('Admin account created');
  }
  console.log('Database ready\n');
}

module.exports = { get pool() { return getPool(); }, initDB };