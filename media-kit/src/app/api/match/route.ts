// API route for the YouTube-powered sponsorship matchmaking engine.
// Defines request/response contracts and ranking logic for brand recommendations.

import brandsData from "../../../../data/brands.json";

type PlatformName = "instagram" | "tiktok";

type BrandTier = "iconic" | "mid" | "emerging";
type CreatorTierName = "nano" | "micro" | "mid" | "macro" | "mega";

interface Brand {
  name: string;
  niche: string;
  brandTier: BrandTier;
  fameScore: number;
  idealCreatorTier: CreatorTierName[];
  minSubscribers: number;
  maxSubscribers: number | null;
  avgCPM: number;
  collaborationStyle: string;
  brandPersonality: string;
  notes?: string;
}

interface CreatorTierMeta {
  minSubs: number;
  maxSubs: number | null;
}

interface Meta {
  creatorTiers: Record<CreatorTierName, CreatorTierMeta>;
}

interface BrandsFile {
  brands: Brand[];
  meta: Meta;
}

const { brands: ALL_BRANDS, meta: BRANDS_META } = brandsData as BrandsFile;

interface RawMatchRequest {
  name: string;
  youtubeChannelID: string;
  niche?: string;
  email: string;
  targetCompanies?: string;
  excludeBrands?: string[]; // brand names already shown (for refresh)
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
  excludeBrands: string[];
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

interface CreatorProfile {
  estimatedSubscribers: number;
  estimatedAvgViews: number;
  niche: string | null;
  tier: CreatorTierName;
}

function estimateCreatorProfile(request: MatchRequest): CreatorProfile {
  const ig = request.additionalPlatforms.find((p) => p.platform === "instagram");
  const tt = request.additionalPlatforms.find((p) => p.platform === "tiktok");

  const igFollowers = ig?.followers ?? 0;
  const ttFollowers = tt?.followers ?? 0;

  // Rough estimate of total audience based on optional IG/TikTok followers.
  const estimatedSubscribers = Math.max(5000, igFollowers + ttFollowers || 5000);

  // Assume a fraction of audience becomes average views.
  const estimatedAvgViews = Math.max(
    1000,
    Math.round(estimatedSubscribers * 0.3)
  );

  // Map subs into a CreatorTierName using meta.creatorTiers.
  let tier: CreatorTierName = "nano";
  const tiersOrder: CreatorTierName[] = [
    "nano",
    "micro",
    "mid",
    "macro",
    "mega",
  ];

  for (const t of tiersOrder) {
    const meta = BRANDS_META.creatorTiers[t];
    if (!meta) continue;
    const min = meta.minSubs;
    const max = meta.maxSubs ?? Number.MAX_SAFE_INTEGER;
    if (estimatedSubscribers >= min && estimatedSubscribers <= max) {
      tier = t;
      break;
    }
  }

  return {
    estimatedSubscribers,
    estimatedAvgViews,
    niche: request.nicheOverride ?? null,
    tier,
  };
}

function scoreBrand(
  brand: Brand,
  creator: CreatorProfile,
  request: MatchRequest
) {
  // 1) Niche match score
  let nicheScore = 60;
  if (creator.niche) {
    const creatorNiche = creator.niche.toLowerCase();
    const brandNiche = brand.niche.toLowerCase();
    if (creatorNiche === brandNiche) {
      nicheScore = 100;
    } else {
      nicheScore = 40;
    }
  }

  // 2) Creator tier alignment
  const tiersOrder: CreatorTierName[] = [
    "nano",
    "micro",
    "mid",
    "macro",
    "mega",
  ];
  const creatorTierIndex = tiersOrder.indexOf(creator.tier);
  const idealIndexes = brand.idealCreatorTier.map((t) =>
    tiersOrder.indexOf(t)
  );

  let tierScore = 40;
  if (idealIndexes.includes(creatorTierIndex)) {
    tierScore = 100;
  } else if (
    idealIndexes.some((idx) => Math.abs(idx - creatorTierIndex) === 1)
  ) {
    tierScore = 70;
  }

  // 3) Subscriber range fit
  const subs = creator.estimatedSubscribers;
  const minSubs = brand.minSubscribers;
  const maxSubs = brand.maxSubscribers ?? Number.MAX_SAFE_INTEGER;
  let subsScore = 40;
  if (subs >= minSubs && subs <= maxSubs) {
    subsScore = 100;
  } else {
    const lowerBound = minSubs * 0.5;
    const upperBound = maxSubs * 1.5;
    if (subs >= lowerBound && subs <= upperBound) {
      subsScore = 70;
    }
  }

  // 4) Base compatibility score (0–100)
  const compatibilityScore =
    0.5 * nicheScore + 0.25 * tierScore + 0.25 * subsScore;

  // 5) Brand fame (0–100 from fameScore 0–1)
  const fameNumeric = Math.max(0, Math.min(1, brand.fameScore)) * 100;

  // Slight penalty if creator has already collaborated with this brand.
  const alreadyWorkedWith =
    request.pastCollabs.some(
      (c) => c.toLowerCase() === brand.name.toLowerCase()
    ) ?? false;
  const repeatPenalty = alreadyWorkedWith ? 10 : 0;

  // 6) Target company boost
  const targetBoost =
    request.targetCompanies.some(
      (c) => c.toLowerCase() === brand.name.toLowerCase()
    ) ?? false
      ? 8
      : 0;

  // 7) Final score (0–100)
  let finalScore = 0.6 * compatibilityScore + 0.4 * fameNumeric;
  finalScore = finalScore + targetBoost - repeatPenalty;
  finalScore = Math.max(0, Math.min(100, finalScore));

  // 8) Acceptance probability bucket + percent
  let bucket: AcceptanceBucket = "Low";
  let percent = 35;
  if (finalScore >= 80) {
    bucket = "High";
    percent = 70 + Math.round(((finalScore - 80) / 20) * 20); // 70–90
  } else if (finalScore >= 60) {
    bucket = "Medium";
    percent = 45 + Math.round(((finalScore - 60) / 20) * 20); // 45–65
  } else {
    bucket = "Low";
    percent = 25 + Math.round((finalScore / 60) * 10); // roughly 25–35
  }

  // 9) Pricing recommendation based on estimated avg views and brand CPM.
  const basePrice = (creator.estimatedAvgViews * brand.avgCPM) / 1000;
  const min = Math.round(basePrice * 0.8);
  const max = Math.round(basePrice * 1.2);

  const pricing: PricingRange = {
    min,
    max,
    currency: "USD",
  };

  return {
    compatibilityScore,
    finalScore,
    acceptance: { bucket, percent },
    pricing,
  };
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

  const excludeBrands = Array.isArray(raw.excludeBrands)
    ? raw.excludeBrands.filter((n) => typeof n === "string" && n.trim().length > 0)
    : [];

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
    excludeBrands,
    additionalPlatforms,
    pastCollabs,
  };
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as RawMatchRequest;
    const normalized = normalizeMatchRequest(raw);

    const creator = estimateCreatorProfile(normalized);

    const excludeSet = new Set(
      normalized.excludeBrands.map((n) => n.toLowerCase().trim())
    );
    const candidateBrands = ALL_BRANDS.filter(
      (b) => !excludeSet.has(b.name.toLowerCase().trim())
    );

    // Score all brands for this creator.
    const scored = candidateBrands.map((brand) => {
      const scores = scoreBrand(brand, creator, normalized);
      return { brand, ...scores };
    }).sort((a, b) => b.finalScore - a.finalScore);

    // Separate into reach vs target candidates based on fame and acceptance.
    const reachCandidates = scored.filter(
      (s) =>
        (s.brand.brandTier === "iconic" || s.brand.fameScore >= 0.75) &&
        (s.acceptance.bucket === "Medium" || s.acceptance.bucket === "Low")
    );

    const targetCandidates = scored.filter(
      (s) =>
        (s.brand.brandTier === "mid" || s.brand.brandTier === "emerging") &&
        (s.acceptance.bucket === "High" || s.acceptance.bucket === "Medium")
    );

    const chosenReach1 = reachCandidates[0] ?? scored[0];
    const chosenReach2 =
      reachCandidates.find((s) => s.brand.name !== chosenReach1.brand.name) ??
      scored.find((s) => s.brand.name !== chosenReach1.brand.name) ??
      scored[1];

    const remainingForTargets = scored.filter(
      (s) =>
        s.brand.name !== chosenReach1.brand.name &&
        s.brand.name !== chosenReach2.brand.name
    );

    const chosenTargets: typeof scored = [];
    for (const cand of targetCandidates) {
      if (
        cand.brand.name === chosenReach1.brand.name ||
        cand.brand.name === chosenReach2.brand.name
      )
        continue;
      chosenTargets.push(cand);
      if (chosenTargets.length === 2) break;
    }

    let i = 0;
    while (chosenTargets.length < 2 && i < remainingForTargets.length) {
      const cand = remainingForTargets[i++];
      if (chosenTargets.some((c) => c.brand.name === cand.brand.name)) continue;
      chosenTargets.push(cand);
    }

    const picked = [
      chosenReach1,
      chosenReach2,
      chosenTargets[0],
      chosenTargets[1],
    ].filter(Boolean).slice(0, 4);

    const recommendations: BrandRecommendation[] = picked.map((item, index) => {
      const kind: RecommendationKind =
        index < 2 ? "reach" : "target";

      return {
        brandName: item.brand.name,
        kind,
        compatibilityScore: Number(item.compatibilityScore.toFixed(1)),
        acceptance: item.acceptance,
        pricing: item.pricing,
        bio: `This is where a ${kind}-brand tailored bio for ${normalized.name} and ${item.brand.name} will appear.`,
        pitchEmail: `Hi ${item.brand.name},

This is a placeholder pitch email for a ${kind} recommendation. Once GPT is wired in, this will be customized to your channel stats and the ${item.brand.name} brand profile.`,
      };
    });

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

