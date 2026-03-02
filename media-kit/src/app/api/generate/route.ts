import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface RecInput {
  brandName: string;
  kind: "reach" | "target" | "related";
  compatibilityScore: number;
  acceptance: { bucket: string; percent: number };
  pricing: { min: number; max: number; currency: string };
  sourceNiche?: string;
}

interface GenerateRequest {
  creator: {
    name: string;
    youtubeChannelId: string;
    niche: string | null;
  };
  recommendations: RecInput[];
}

export async function POST(req: NextRequest) {
  try {
    const { creator, recommendations } = (await req.json()) as GenerateRequest;

    const results = await Promise.all(
      recommendations.map(async (rec) => {
        const kindLabel =
          rec.kind === "reach"
            ? "aspirational reach brand (high visibility, lower acceptance chance)"
            : rec.kind === "related"
            ? `related-niche brand from the ${rec.sourceNiche ?? "related"} niche`
            : "best-fit target brand (high acceptance chance)";

        const context = `Creator: ${creator.name}
YouTube: ${creator.youtubeChannelId}
Creator niche: ${creator.niche ?? "general"}
Brand: ${rec.brandName}
Match type: ${kindLabel}
Compatibility: ${rec.compatibilityScore}/100
Acceptance: ${rec.acceptance.bucket} (${rec.acceptance.percent}%)
Suggested rate: $${rec.pricing.min}–$${rec.pricing.max} per integration`;

        const [bioMsg, emailMsg] = await Promise.all([
          client.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 150,
            messages: [{
              role: "user",
              content: `Write a 2-3 sentence professional creator bio for ${creator.name} tailored for a sponsorship pitch to ${rec.brandName}. Highlight why they are a strong fit.\n\n${context}\n\nReturn only the bio text, no labels or quotes.`,
            }],
          }),
          client.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 350,
            messages: [{
              role: "user",
              content: `Write a short personalized sponsorship pitch email from ${creator.name} to ${rec.brandName}. Under 150 words. Be specific about why they are a good fit. Mention a rate of $${rec.pricing.min}–$${rec.pricing.max}.\n\n${context}\n\nReturn only the email body, no subject line or labels.`,
            }],
          }),
        ]);

        const bio =
          bioMsg.content[0].type === "text" ? bioMsg.content[0].text.trim() : "";
        const pitchEmail =
          emailMsg.content[0].type === "text" ? emailMsg.content[0].text.trim() : "";

        return { brandName: rec.brandName, bio, pitchEmail };
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
