export const runtime = "nodejs";

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "Gemini API key is not configured in Vercel settings." }, { status: 500 });
  }
  return Response.json({ apiKey: process.env.GEMINI_API_KEY });
}
