import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Initialize Neon client if DATABASE_URL is present
let pgSql = null;
if (process.env.DATABASE_URL) {
  try {
    pgSql = neon(process.env.DATABASE_URL);
  } catch (e) {
    console.error("Failed to initialize Neon Postgres client:", e);
  }
}

// Lazy-loaded SQLite database
let sqliteDb = null;
async function getSqliteDb() {
  if (sqliteDb) return sqliteDb;

  const isVercel = !!process.env.VERCEL;
  const projectDbPath = path.join(process.cwd(), "data", "tests.db");
  const targetDbPath = isVercel ? "/tmp/tests.db" : projectDbPath;

  if (isVercel) {
    if (!fs.existsSync(targetDbPath) && fs.existsSync(projectDbPath)) {
      try {
        fs.copyFileSync(projectDbPath, targetDbPath);
      } catch (e) {
        console.error("Failed to copy seed database to /tmp:", e);
      }
    }
  } else {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
  }

  // Dynamic import better-sqlite3 so it is not evaluated on Vercel runtime
  const Database = (await import("better-sqlite3")).default;
  sqliteDb = new Database(targetDbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      questions TEXT NOT NULL
    )
  `);
  return sqliteDb;
}

// Ensure Neon Postgres tables exist on startup
async function initPg() {
  if (pgSql) {
    try {
      await pgSql(`
        CREATE TABLE IF NOT EXISTS tests (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          questions TEXT NOT NULL
        )
      `);
    } catch (e) {
      console.error("Failed to create Neon Postgres tests table:", e);
    }
  }
}

if (pgSql) {
  initPg();
}

export async function listTests() {
  if (pgSql) {
    const rows = await pgSql("SELECT id, name, date, questions FROM tests ORDER BY date, id");
    return rows.map((r) => ({ ...r, questions: JSON.parse(r.questions) }));
  }

  const db = await getSqliteDb();
  return db
    .prepare("SELECT id, name, date, questions FROM tests ORDER BY date, id")
    .all()
    .map((r) => ({ ...r, questions: JSON.parse(r.questions) }));
}

export async function insertTest({ id, name, date, questions }) {
  const questionsStr = JSON.stringify(questions);
  if (pgSql) {
    await pgSql(
      "INSERT INTO tests (id, name, date, questions) VALUES ($1, $2, $3, $4)",
      [id, name, date, questionsStr]
    );
    return { id, name, date, questions };
  }

  const db = await getSqliteDb();
  db.prepare("INSERT INTO tests (id, name, date, questions) VALUES (?, ?, ?, ?)").run(
    id,
    name,
    date,
    questionsStr
  );
  return { id, name, date, questions };
}

export async function deleteTest(id) {
  if (pgSql) {
    await pgSql("DELETE FROM tests WHERE id = $1", [id]);
    return true;
  }

  const db = await getSqliteDb();
  return db.prepare("DELETE FROM tests WHERE id = ?").run(id).changes > 0;
}
