import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

function createDb() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
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
  return db;
}

// Reuse one connection across Next.js dev hot reloads
const db = globalThis.__testtracker_db ?? createDb();
globalThis.__testtracker_db = db;

export function listTests() {
  return db
    .prepare("SELECT id, name, date, questions FROM tests ORDER BY date, id")
    .all()
    .map((r) => ({ ...r, questions: JSON.parse(r.questions) }));
}

export function insertTest({ id, name, date, questions }) {
  db.prepare("INSERT INTO tests (id, name, date, questions) VALUES (?, ?, ?, ?)").run(
    id,
    name,
    date,
    JSON.stringify(questions)
  );
  return { id, name, date, questions };
}

export function deleteTest(id) {
  return db.prepare("DELETE FROM tests WHERE id = ?").run(id).changes > 0;
}
