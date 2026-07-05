import crypto from "crypto";
import { listTests, insertTest } from "@/lib/db";

export const runtime = "nodejs";

const RESULTS = new Set(["C", "W", "U"]);
const SUBJECTS = new Set(["Physics", "Chemistry", "Maths"]);

export async function GET() {
  try {
    const tests = await listTests();
    return Response.json({ tests });
  } catch (error) {
    return Response.json({ error: `Database fetch failed: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, date, questions } = body || {};
  if (!name || typeof name !== "string") {
    return Response.json({ error: "Test name is required." }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return Response.json({ error: "Questions array is required." }, { status: 400 });
  }
  for (const q of questions) {
    if (
      !Number.isInteger(q.q) ||
      !SUBJECTS.has(q.subject) ||
      (typeof q.topic !== "string" && typeof q.chapter !== "string") ||
      !RESULTS.has(q.result)
    ) {
      return Response.json({ error: `Malformed question entry: ${JSON.stringify(q)}` }, { status: 400 });
    }
  }

  try {
    const test = await insertTest({
      id: crypto.randomUUID(),
      name,
      date: date || new Date().toISOString().slice(0, 10),
      questions: questions.map(({ q, subject, topic, chapter, subtopic, result, difficulty }) => ({
        q,
        subject,
        ...(topic ? { topic } : {}),
        ...(chapter ? { chapter } : {}),
        ...(subtopic ? { subtopic } : {}),
        result,
        difficulty: difficulty || "Medium",
      })),
    });
    return Response.json(test, { status: 201 });
  } catch (error) {
    return Response.json({ error: `Database insert failed: ${error.message}` }, { status: 500 });
  }
}
