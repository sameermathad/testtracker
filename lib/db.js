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

// Ensure Neon Postgres tables exist (lazy-loaded before first query)
let pgInitialized = false;
async function ensurePgTables() {
  if (!pgSql || pgInitialized) return;
  try {
    await pgSql.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        questions TEXT NOT NULL
      )
    `);
    await pgSql.query(`
      CREATE TABLE IF NOT EXISTS revision_plans (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        plan TEXT NOT NULL
      )
    `);
    pgInitialized = true;
  } catch (e) {
    console.error("Failed to create Neon Postgres tables:", e);
    throw new Error(`Neon Postgres tables initialization failed: ${e.message}`);
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
  
  // Create tests table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      questions TEXT NOT NULL
    )
  `);
  
  // Create revision_plans table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS revision_plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      plan TEXT NOT NULL
    )
  `);
  
  return sqliteDb;
}

export async function listTests() {
  if (pgSql) {
    await ensurePgTables();
    const rows = await pgSql.query("SELECT id, name, date, questions FROM tests ORDER BY date, id");
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
    await ensurePgTables();
    await pgSql.query(
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
    await ensurePgTables();
    await pgSql.query("DELETE FROM tests WHERE id = $1", [id]);
    return true;
  }

  const db = await getSqliteDb();
  return db.prepare("DELETE FROM tests WHERE id = ?").run(id).changes > 0;
}

export async function listRevisionPlans() {
  if (pgSql) {
    await ensurePgTables();
    return await pgSql.query("SELECT id, date, plan FROM revision_plans ORDER BY date DESC");
  }
  const db = await getSqliteDb();
  return db.prepare("SELECT id, date, plan FROM revision_plans ORDER BY date DESC").all();
}

export async function insertRevisionPlan({ id, date, plan }) {
  if (pgSql) {
    await ensurePgTables();
    await pgSql.query(
      "INSERT INTO revision_plans (id, date, plan) VALUES ($1, $2, $3)",
      [id, date, plan]
    );
    return { id, date, plan };
  }
  const db = await getSqliteDb();
  db.prepare("INSERT INTO revision_plans (id, date, plan) VALUES (?, ?, ?)").run(id, date, plan);
  return { id, date, plan };
}
