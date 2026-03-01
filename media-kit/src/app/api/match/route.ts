// API route for the YouTube-powered sponsorship matchmaking engine.
// This defines the request/response contracts and returns a stubbed response for now.

type PlatformName = "instagram" | "tiktok";

interface RawMatchRequest {
  name: string;
  youtubeChannelID: string;
  niche?: string;
  email: string;
  targetCompanies?: string;
  platforms?: {
    instagramFollowers?: number | null;
    instagramMaxLikes?: number | null;
    instagramMaxViews?: number | null;
    tiktokFollowers?: number | null;
    tiktokMaxLikes?: number | null;
    tiktokMaxViews?: number | null;
  }[];
  pastCollabs?: string;
}

interface AdditionalPlatformMetrics {
  platform: PlatformName;
  followers?: number | null;
  maxLikes?: number | null;
  maxViews?: number | null;
}

interface MatchRequest {
  name: string;
  youtubeChannelId: string;
  email: string;
  nicheOverride?: string;
  targetCompanies: string[];
  additionalPlatforms: AdditionalPlatformMetrics[];
  pastCollabs: string[];
}

type AcceptanceBucket = "High" | "Medium" | "Low";
type RecommendationKind = "reach" | "target";

interface AcceptanceProbability {
  bucket: AcceptanceBucket;
  percent: number;
}

interface PricingRange {
  min: number;
  max: number;
  currency: "USD";
}

interface BrandRecommendation {
  brandName: string;
  kind: RecommendationKind; // "reach" vs "target"
  compatibilityScore: number; // 0–100
  acceptance: AcceptanceProbability;
  pricing: PricingRange;
  bio: string;
  pitchEmail: string;
}

interface MatchResponse {
  creator: {
    name: string;
    youtubeChannelId: string;
    niche: string | null;
  };
  recommendations: BrandRecommendation[];
}

function normalizeMatchRequest(raw: RawMatchRequest): MatchRequest {
  const targetCompanies =
    raw.targetCompanies
      ?.split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0) ?? [];

  const pastCollabs =
    raw.pastCollabs
      ?.split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0) ?? [];

  const additionalPlatforms: AdditionalPlatformMetrics[] = [];

  if (raw.platforms && raw.platforms.length > 0) {
    const first = raw.platforms[0];
    if (first.instagramFollowers != null) {
      additionalPlatforms.push({
        platform: "instagram",
        followers: first.instagramFollowers,
        maxLikes: first.instagramMaxLikes ?? null,
        maxViews: first.instagramMaxViews ?? null,
      });
    }
    if (first.tiktokFollowers != null) {
      additionalPlatforms.push({
        platform: "tiktok",
        followers: first.tiktokFollowers,
        maxLikes: first.tiktokMaxLikes ?? null,
        maxViews: first.tiktokMaxViews ?? null,
      });
    }
  }

  return {
    name: raw.name,
    youtubeChannelId: raw.youtubeChannelID,
    email: raw.email,
    nicheOverride: raw.niche && raw.niche.trim().length > 0 ? raw.niche : undefined,
    targetCompanies,
    additionalPlatforms,
    pastCollabs,
  };
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as RawMatchRequest;
    const normalized = normalizeMatchRequest(raw);

    // Stubbed recommendations so we can wire the frontend before
    // implementing YouTube enrichment, scoring, and GPT calls.
    const recommendations: BrandRecommendation[] = [
      {
        brandName: "Sample Reach Brand",
        kind: "reach",
        compatibilityScore: 62,
        acceptance: { bucket: "Medium", percent: 48 },
        pricing: { min: 500, max: 900, currency: "USD" },
        bio: `This is where a reach-brand tailored bio for ${normalized.name} will appear.`,
        pitchEmail:
          "Hi [Reach Brand],\n\nThis is a placeholder pitch email. Once the engine is wired, this will be customized to your channel stats and the brand profile.\n",
      },
      {
        brandName: "Sample Target Brand A",
        kind: "target",
        compatibilityScore: 81,
        acceptance: { bucket: "High", percent: 74 },
        pricing: { min: 250, max: 450, currency: "USD" },
        bio: `This is where a target-brand tailored bio for ${normalized.name} will appear.`,
        pitchEmail:
          "Hi [Target Brand A],\n\nThis is a placeholder pitch email for a high-fit brand. It will be generated based on your niche and audience.\n",
      },
      {
        brandName: "Sample Target Brand B",
        kind: "target",
        compatibilityScore: 77,
        acceptance: { bucket: "Medium", percent: 61 },
        pricing: { min: 220, max: 380, currency: "USD" },
        bio: `This is where another target-brand tailored bio for ${normalized.name} will appear.`,
        pitchEmail:
          "Hi [Target Brand B],\n\nThis is a placeholder pitch email for another potential partner brand.\n",
      },
    ];

    const response: MatchResponse = {
      creator: {
        name: normalized.name,
        youtubeChannelId: normalized.youtubeChannelId,
        niche: normalized.nicheOverride ?? null,
      },
      recommendations,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to run sponsorship matchmaking", error);
    return new Response(
      JSON.stringify({ error: "Failed to run sponsorship matchmaking" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

