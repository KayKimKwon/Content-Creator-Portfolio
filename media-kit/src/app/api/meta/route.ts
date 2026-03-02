import { getMeta } from "@/lib/brands";

export async function GET() {
  const meta = getMeta();
  return new Response(JSON.stringify({ niches: meta.niches }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
