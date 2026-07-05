import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Storage policy:
//  - DATABASE_URL set  -> Neon Postgres (required on Vercel)
//  - no DATABASE_URL   -> local SQLite at data/tests.db (persistent on disk)
// On Vercel the filesystem is ephemeral, so falling back to SQLite there
// silently loses data — refuse instead.

let pgSql = null;
if (process.env.DATABASE_URL) {
  pgSql = neon(process.env.DATABASE_URL);
}

let pgInitialized = false;
async function getPg() {
  if (!pgInitialized) {
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
  }
  return pgSql;
}

async function getSqliteDb() {
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. On Vercel the filesystem is wiped on every deploy, so SQLite would lose your data — add the Neon connection string as DATABASE_URL in the Vercel project settings."
    );
  }
  if (globalThis.__testtracker_sqlite) return globalThis.__testtracker_sqlite;

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });

  const Database = (await import("better-sqlite3")).default;
  const db = new Database(path.join(dir, "tests.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      questions TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS revision_plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      plan TEXT NOT NULL
    )
  `);

  globalThis.__testtracker_sqlite = db;
  return db;
}

export async function listTests() {
  if (pgSql) {
    const sql = await getPg();
    const rows = await sql.query("SELECT id, name, date, questions FROM tests ORDER BY date, id");
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
    const sql = await getPg();
    await sql.query(
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
    const sql = await getPg();
    const rows = await sql.query("DELETE FROM tests WHERE id = $1 RETURNING id", [id]);
    return rows.length > 0;
  }
  const db = await getSqliteDb();
  return db.prepare("DELETE FROM tests WHERE id = ?").run(id).changes > 0;
}

export async function listRevisionPlans() {
  if (pgSql) {
    const sql = await getPg();
    return await sql.query("SELECT id, date, plan FROM revision_plans ORDER BY date DESC");
  }
  const db = await getSqliteDb();
  return db.prepare("SELECT id, date, plan FROM revision_plans ORDER BY date DESC").all();
}

export async function insertRevisionPlan({ id, date, plan }) {
  if (pgSql) {
    const sql = await getPg();
    await sql.query(
      "INSERT INTO revision_plans (id, date, plan) VALUES ($1, $2, $3)",
      [id, date, plan]
    );
    return { id, date, plan };
  }
  const db = await getSqliteDb();
  db.prepare("INSERT INTO revision_plans (id, date, plan) VALUES (?, ?, ?)").run(id, date, plan);
  return { id, date, plan };
}
