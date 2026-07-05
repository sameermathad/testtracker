import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { listRevisionPlans, insertRevisionPlan } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const plans = await listRevisionPlans();
    return Response.json({ plans });
  } catch (error) {
    return Response.json({ error: `Failed to load revision plans: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }

  const { weakTopics } = body;
  if (!weakTopics || !Array.isArray(weakTopics) || weakTopics.length === 0) {
    return Response.json({ error: "No weak topics provided." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `You are an expert tutor for JEE Main and EAMCET preparation.
Based on the student's actual weekend test results, the following are their weakest chapters/topics (ordered starting with the worst accuracy):
${weakTopics.map((t) => `- ${t.subject}: ${t.chapter} (Accuracy: ${Math.round(t.acc * 100)}%, Net Marks: ${t.score})`).join("\n")}

Draft a concise, encouraging, and highly actionable weekly Revision Plan for this student.
Keep your response short and structured (max 250 words). Format the output cleanly in standard Markdown with:
1. **Focus Areas**: Which 1 or 2 chapters should they prioritize this week.
2. **Actionable Study Tasks**: Specifically what they should do (e.g., revise formulas, practice numericals, redo incorrect questions).
3. **Practice Goals**: Suggest target questions or test practice strategy to improve confidence and speed.
Use bullet points and bold formatting where appropriate. Do not include any HTML tags.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    // Save to the database
    const newPlan = await insertRevisionPlan({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      plan: response.text
    });
    
    return Response.json(newPlan, { status: 201 });
  } catch (error) {
    return Response.json({ error: `Failed to generate revision plan: ${error.message}` }, { status: 500 });
  }
}
