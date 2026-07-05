import { deleteTest } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  const removed = deleteTest(params.id);
  if (!removed) {
    return Response.json({ error: "Test not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
