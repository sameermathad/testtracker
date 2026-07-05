import { GoogleGenAI } from "@google/genai";
import taxonomy from "@/data/taxonomy.json";

export const runtime = "nodejs";
export const maxDuration = 120;

const SUBJECTS = ["Physics", "Chemistry", "Maths"];

const PROMPT = `This is a scanned, hand-graded JEE weekend test (75 questions: Physics 1-25, Chemistry 26-50, Maths 51-75). Grader marks: +4 = correct, -1 = wrong, 0 or a circle "O" or no mark = unattempted.
Output ONLY these lines, nothing else:
Line 1: TEST|<short test name from header>|<date as YYYY-MM-DD if visible, else unknown>
Then one line per question, all 75: <qno>|<Physics/Chemistry/Maths>|<chapter>|<subtopic>|<C/W/U>

You MUST classify each question's topic into the standard taxonomy. Here is the allowed taxonomy:
${JSON.stringify(taxonomy, null, 2)}

For each question:
1. Determine the subject (Physics for 1-25, Chemistry for 26-50, Maths for 51-75).
2. Choose the correct <chapter> and <subtopic> from the taxonomy for that subject.
3. If it doesn't fit, use "Other" for chapter and the actual topic name or "Other" for subtopic.
4. Output the result marker: C (Correct = +4), W (Wrong = -1), U (Unattempted = 0/circle/no mark).
Be extremely terse and precise.`;

// Same parsing as the reference UI, moved server-side: tolerate partial or
// malformed lines and fill any missing question so the grid is complete.
function parseExtraction(text, fallbackName) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let name = fallbackName;
  let date = "";
  const questions = [];
  for (const l of lines) {
    const p = l.split("|").map((x) => x.trim());
    if (p[0] === "TEST") {
      name = p[1] || name;
      date = p[2] && p[2] !== "unknown" ? p[2] : "";
      continue;
    }
    const q = parseInt(p[0], 10);
    if (!q || q < 1 || q > 75 || p.length < 4) continue;
    if (questions.find((x) => x.q === q)) continue;
    const subject =
      SUBJECTS.find((s) => s.toLowerCase().startsWith((p[1] || "").slice(0, 4).toLowerCase())) ||
      (q <= 25 ? "Physics" : q <= 50 ? "Chemistry" : "Maths");

    let chapter = "Other";
    let subtopic = "Other";
    let result = "U";

    if (p.length >= 5) {
      chapter = p[2] || "Other";
      subtopic = p[3] || "Other";
      result = ["C", "W", "U"].includes(p[4]) ? p[4] : "U";
    } else {
      chapter = p[2] || "Other";
      subtopic = p[2] || "Other";
      result = ["C", "W", "U"].includes(p[3]) ? p[3] : "U";
    }

    questions.push({ q, subject, chapter, subtopic, result });
  }
  for (let i = 1; i <= 75; i++) {
    if (!questions.find((x) => x.q === i)) {
      questions.push({
        q: i,
        subject: i <= 25 ? "Physics" : i <= 50 ? "Chemistry" : "Maths",
        chapter: "Other",
        subtopic: "Not read — set manually",
        result: "U",
      });
    }
  }
  questions.sort((a, b) => a.q - b.q);
  return {
    name,
    date,
    questions,
    partial: questions.some((x) => x.subtopic === "Not read — set manually"),
  };
}

export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  let file;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return Response.json({ error: "Expected multipart form data with a 'file' field." }, { status: 400 });
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "No PDF file uploaded." }, { status: 400 });
  }
  if (file.size > 30 * 1024 * 1024) {
    return Response.json({ error: "PDF is larger than 30 MB — rescan at a lower resolution." }, { status: 413 });
  }

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: b64,
              },
            },
          ],
        },
      ],
    });
    const text = response.text;
    const fallbackName = (file.name || "Test").replace(/\.pdf$/i, "");
    return Response.json(parseExtraction(text, fallbackName));
  } catch (error) {
    if (error.message && (error.message.includes("API key") || error.message.includes("API_KEY"))) {
      return Response.json({ error: "Invalid Gemini API key — check GEMINI_API_KEY in .env.local." }, { status: 500 });
    }
    if (error.message && (error.message.includes("429") || error.message.includes("quota"))) {
      return Response.json({ error: "Rate limited by the Gemini API — wait a minute and retry." }, { status: 429 });
    }
    return Response.json({ error: `Extraction failed: ${error.message}` }, { status: 500 });
  }
}
