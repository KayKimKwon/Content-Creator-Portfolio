// API route for the YouTube-powered sponsorship matchmaking engine.
// Defines request/response contracts and ranking logic for brand recommendations.
// Uses per-niche brand files: first step is to load only the user's niche, then
// add one recommendation from a similar niche.
//
// Similar-niche source: static data/similar-niches.json (not GPT per request).
// Static JSON: no API cost, fast, deterministic, easy to tune. GPT each time would
// allow context-aware related niches but adds latency, cost, and variability.

import Anthropic from "@anthropic-ai/sdk";
import {
  getMeta,
  getBrandsForNiche,
  getSimilarNiches,
  getBrandsForNiches,
  type Brand,
} from "@/lib/brands";
import {
  parseChannelId,
  fetchYouTubeCreatorData,
} from "@/lib/youtube";

const anthropic = new Anthropic();

type PlatformName = "instagram" | "tiktok";

type CreatorTierName = "nano" | "micro" | "mid" | "macro" | "mega";

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
type RecommendationKind = "reach" | "target" | "related";

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
  kind: RecommendationKind; // "reach" | "target" | "related"
  compatibilityScore: number; // 0–100
  acceptance: AcceptanceProbability;
  pricing: PricingRange;
  bio: string;
  pitchEmail: string;
  sourceNiche?: string; // set for kind === "related"
  // Company–creator relationship (for expanded panel)
  brandTier?: "iconic" | "mid" | "emerging";
  collaborationStyle?: string;
  idealCreatorTier?: CreatorTierName[];
  avgCPM?: number;
  tierFit?: boolean; // true if creator's tier is in brand's idealCreatorTier
  // Score breakdown and range context
  nicheScore?: number;
  tierScore?: number;
  subsScore?: number;
  contentScore?: number;
  fameNumeric?: number;
  targetBoost?: number;
  repeatPenalty?: number;
  alreadyWorkedWith?: boolean;
  minSubscribers?: number;
  maxSubscribers?: number | null;
}

interface NicheProbability {
  niche: string;
  probability: number;
}

interface MatchResponse {
  creator: {
    name: string;
    youtubeChannelId: string;
    niche: string | null;
    nicheProbabilities?: NicheProbability[];
    estimatedSubscribers: number;
    estimatedAvgViews: number;
    tier: CreatorTierName;
    channelDescription?: string | null;
    recentVideoTitles?: string[];
  };
  recommendations: BrandRecommendation[];
}

interface CreatorProfile {
  estimatedSubscribers: number;
  estimatedAvgViews: number;
  niche: string | null;
  tier: CreatorTierName;
  contentTokens?: Set<string>;
}

interface YouTubeCreatorData {
  subscriberCount: number;
  avgViewsPerVideo: number;
  channelDescription: string;
  recentVideoTitles: string[];
}

function tokenizeTextToSet(text: string | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!text) return set;
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  for (const t of tokens) set.add(t);
  return set;
}

function inferNicheFromTokens(contentTokens: Set<string>): string | null {
  const top = inferNicheProbabilities(contentTokens, 1);
  return top.length > 0 ? top[0].niche : null;
}

/** Returns up to 3 niches with probabilities that sum to 100. */
function inferNicheProbabilities(
  contentTokens: Set<string>,
  maxNiches: number = 3
): { niche: string; probability: number }[] {
  const metaConfig = getMeta();
  const niches = metaConfig.niches ?? [];
  if (!niches.length || contentTokens.size === 0) return [];

  const scored: { niche: string; score: number }[] = [];

  for (const niche of niches) {
    const brands = getBrandsForNiche(niche);
    if (!brands.length) continue;
    let score = 0;
    for (const brand of brands) {
      const brandText = `${brand.collaborationStyle ?? ""} ${brand.brandPersonality ?? ""} ${brand.notes ?? ""}`;
      const brandTokens = tokenizeTextToSet(brandText);
      for (const token of brandTokens) {
        if (contentTokens.has(token)) score++;
      }
    }
    if (score > 0) scored.push({ niche, score });
  }

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(maxNiches, scored.length));
  const total = top.reduce((s, x) => s + x.score, 0);
  if (total === 0) return [];

  const probs = top.map(({ niche, score }) => ({
    niche,
    probability: Math.round((100 * score) / total),
  }));

  // Ensure sum is exactly 100 (rounding can give 99 or 101).
  const sum = probs.reduce((s, p) => s + p.probability, 0);
  if (sum !== 100 && probs.length > 0) {
    probs[0].probability += 100 - sum;
  }

  return probs;
}

function getTierFromSubscribers(subscribers: number): CreatorTierName {
  const tiersOrder: CreatorTierName[] = [
    "nano",
    "micro",
    "mid",
    "macro",
    "mega",
  ];
  const metaConfig = getMeta();
  for (const t of tiersOrder) {
    const meta = metaConfig.creatorTiers[t];
    if (!meta) continue;
    const min = meta.minSubs;
    const max = meta.maxSubs ?? Number.MAX_SAFE_INTEGER;
    if (subscribers >= min && subscribers <= max) return t;
  }
  return "nano";
}

function estimateCreatorProfile(
  request: MatchRequest,
  youtubeData?: YouTubeCreatorData | null
): CreatorProfile {
  if (youtubeData) {
    const combinedText = [
      youtubeData.channelDescription ?? "",
      ...(youtubeData.recentVideoTitles ?? []),
    ].join(" ");
    return {
      estimatedSubscribers: youtubeData.subscriberCount,
      estimatedAvgViews: youtubeData.avgViewsPerVideo,
      niche: request.nicheOverride ?? null,
      tier: getTierFromSubscribers(youtubeData.subscriberCount),
      contentTokens: tokenizeTextToSet(combinedText),
    };
  }

  const ig = request.additionalPlatforms.find((p) => p.platform === "instagram");
  const tt = request.additionalPlatforms.find((p) => p.platform === "tiktok");
  const igFollowers = ig?.followers ?? 0;
  const ttFollowers = tt?.followers ?? 0;
  const estimatedSubscribers = Math.max(5000, igFollowers + ttFollowers || 5000);
  const estimatedAvgViews = Math.max(
    1000,
    Math.round(estimatedSubscribers * 0.3)
  );

  return {
    estimatedSubscribers,
    estimatedAvgViews,
    niche: request.nicheOverride ?? null,
    tier: getTierFromSubscribers(estimatedSubscribers),
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

  // 4) Content-fit score based on overlap between channel description/titles
  //    and the brand's collaboration style, personality, and notes.
  let contentScore = 60;
  if (creator.contentTokens && creator.contentTokens.size > 0) {
    const brandText = `${brand.collaborationStyle ?? ""} ${brand.brandPersonality ?? ""} ${brand.notes ?? ""}`;
    const brandTokens = Array.from(tokenizeTextToSet(brandText));
    if (brandTokens.length > 0) {
      let overlap = 0;
      for (const token of brandTokens) {
        if (creator.contentTokens.has(token)) overlap++;
      }
      const ratio = overlap / brandTokens.length;
      // Map overlap ratio into a 40–100 range, capped so a few strong overlaps
      // are rewarded without overpowering other factors.
      contentScore = Math.round(40 + Math.min(ratio, 0.5) * 120);
    }
  }

  // 5) Base compatibility score (0–100), now including content-fit.
  const compatibilityScore =
    0.4 * nicheScore + 0.2 * tierScore + 0.2 * subsScore + 0.2 * contentScore;

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
  // Scale down for huge creators so numbers don't explode (no fixed cap).
  const rawBase = (creator.estimatedAvgViews * brand.avgCPM) / 1000;
  const SCALE_THRESHOLD = 500_000;
  const basePrice =
    rawBase <= SCALE_THRESHOLD
      ? rawBase
      : SCALE_THRESHOLD * Math.pow(rawBase / SCALE_THRESHOLD, 0.6);
  const isHigh = rawBase > SCALE_THRESHOLD;
  const minMult = isHigh ? 0.92 : 0.8;
  const maxMult = isHigh ? 1.08 : 1.2;
  let min = Math.round(basePrice * minMult);
  let max = Math.round(basePrice * maxMult);

  // Ensure sensible minimums so we never show $0–$0,
  // especially for nano creators.
  if (creator.tier === "nano" && max <= 0) {
    min = 50;
    max = 150;
  } else if (max <= 0) {
    min = 100;
    max = 300;
  }

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
    nicheScore,
    tierScore,
    subsScore,
    contentScore,
    fameNumeric,
    targetBoost,
    repeatPenalty,
    alreadyWorkedWith,
    minSubscribers: minSubs,
    maxSubscribers: brand.maxSubscribers,
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

    let youtubeData: YouTubeCreatorData | null = null;
    const channelId = parseChannelId(normalized.youtubeChannelId);
    if (channelId && process.env.YOUTUBE_API_KEY) {
      try {
        const data = await fetchYouTubeCreatorData(channelId);
        youtubeData = {
          subscriberCount: data.channel.subscriberCount,
          avgViewsPerVideo: data.avgViewsPerVideo,
          channelDescription: data.channel.description,
          recentVideoTitles: data.recentVideos.map((v) => v.title),
        };
      } catch (err) {
        console.warn("YouTube API failed, using fallback profile:", err);
      }
    }

    // If the user did not supply a niche, infer it locally from channel content.
    let nicheProbabilities: NicheProbability[] | undefined;
    if (youtubeData) {
      const combined = [
        youtubeData.channelDescription ?? "",
        ...(youtubeData.recentVideoTitles ?? []),
      ].join(" ");
      const tokens = tokenizeTextToSet(combined);
      nicheProbabilities = inferNicheProbabilities(tokens, 3);
      if (!normalized.nicheOverride && nicheProbabilities.length > 0) {
        normalized.nicheOverride = nicheProbabilities[0].niche;
      }
    }

    const creator = estimateCreatorProfile(normalized, youtubeData);

    // Niche is required; use it to load only that niche's brands first.
    const userNiche = (normalized.nicheOverride ?? "").toLowerCase().trim();
    if (!userNiche) {
      return new Response(
        JSON.stringify({ error: "Niche is required. Please select a niche from the dropdown." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const excludeSet = new Set(
      normalized.excludeBrands.map((n) => n.toLowerCase().trim())
    );

    // Step 1: Only look at the user's niche file.
    const inNicheBrands = getBrandsForNiche(userNiche).filter(
      (b) => !excludeSet.has(b.name.toLowerCase().trim())
    );

    if (inNicheBrands.length < 4) {
      return new Response(
        JSON.stringify({
          error: `Not enough brands in the "${userNiche}" niche to generate recommendations (found ${inNicheBrands.length}, need at least 4). Try another niche or add more brands to data/niches/${userNiche}.json.`,
          insufficientNiche: userNiche,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const scoreOne = (brand: Brand) => {
      const scores = scoreBrand(brand, creator, normalized);
      return { brand, ...scores };
    };

    const scoredInNiche = inNicheBrands.map(scoreOne).sort((a, b) => b.finalScore - a.finalScore);

    const reachCandidates = scoredInNiche.filter(
      (s) =>
        (s.brand.brandTier === "iconic" || s.brand.fameScore >= 0.75) &&
        (s.acceptance.bucket === "Medium" || s.acceptance.bucket === "Low")
    );
    const targetCandidates = scoredInNiche.filter(
      (s) =>
        (s.brand.brandTier === "mid" || s.brand.brandTier === "emerging") &&
        (s.acceptance.bucket === "High" || s.acceptance.bucket === "Medium")
    );

    const chosenReach1 = reachCandidates[0] ?? scoredInNiche[0];
    const chosenReach2 =
      reachCandidates.find((s) => s.brand.name !== chosenReach1.brand.name) ??
      scoredInNiche.find((s) => s.brand.name !== chosenReach1.brand.name);
    const chosenTargets: typeof scoredInNiche = [];
    for (const cand of targetCandidates) {
      if (cand.brand.name === chosenReach1.brand.name || cand.brand.name === chosenReach2?.brand.name) continue;
      chosenTargets.push(cand);
      if (chosenTargets.length === 2) break;
    }
    let i = 0;
    while (chosenTargets.length < 2 && i < scoredInNiche.length) {
      const cand = scoredInNiche[i++];
      if (cand.brand.name === chosenReach1.brand.name || cand.brand.name === chosenReach2?.brand.name) continue;
      if (chosenTargets.some((c) => c.brand.name === cand.brand.name)) continue;
      chosenTargets.push(cand);
    }

    const inNichePicked = [
      chosenReach1,
      chosenReach2,
      chosenTargets[0],
      chosenTargets[1],
    ].filter((s): s is NonNullable<typeof s> => s != null).slice(0, 4);
    const chosenNames = new Set(inNichePicked.map((s) => s.brand.name));

    // Step 2: One recommendation from a similar (but not same) niche.
    const similarNiches = getSimilarNiches(userNiche).filter((n) => n !== userNiche);
    const relatedBrands = getBrandsForNiches(similarNiches).filter(
      (b) => !excludeSet.has((b.name ?? "").toLowerCase().trim()) && !chosenNames.has(b.name)
    );
    const scoredRelated = relatedBrands.map(scoreOne).sort((a, b) => b.finalScore - a.finalScore);
    const chosenRelated = scoredRelated[0];
    const relatedNiche = chosenRelated?.brand.niche;

    const picked = [
      ...inNichePicked,
      ...(chosenRelated ? [chosenRelated] : []),
    ].slice(0, 5);

    // Build kind labels once so we can use them in the prompt and in the output.
    const pickedWithKind = picked
      .filter((item): item is NonNullable<typeof item> => item != null && item.brand != null)
      .map((item, index) => {
        const isRelated = index === 4 && chosenRelated != null;
        const kind: RecommendationKind = isRelated
          ? "related"
          : index < 2
            ? "reach"
            : "target";
        return { item, kind, isRelated };
      });

    const subsK = Math.round(creator.estimatedSubscribers / 1000);
    const avgViews = Math.round(creator.estimatedAvgViews);
    const pastCollabNote =
      normalized.pastCollabs.length > 0
        ? `Past brand collabs: ${normalized.pastCollabs.join(", ")}.`
        : "";

    // One API call for all brands to stay within free-tier rate limits (5 req/min).
    const brandList = pickedWithKind
      .map(
        ({ item, kind }, i) =>
          `${i + 1}. Brand: ${item.brand.name} | Personality: ${item.brand.brandPersonality} | Collab style: ${item.brand.collaborationStyle} | Rate: $${item.pricing.min}–$${item.pricing.max} | Match type: ${kind}`
      )
      .join("\n");

    const batchPrompt =
      `You are helping a ${userNiche} content creator named ${normalized.name} pitch brands for sponsorships.\n` +
      `Creator stats: ~${subsK}k subscribers, ~${avgViews.toLocaleString()} avg views/video (${creator.tier} tier). ${pastCollabNote}\n\n` +
      `For each brand below, write:\n` +
      `1. A 2-sentence creator bio tailored to that brand (highlight audience fit and content style)\n` +
      `2. A short, professional cold-pitch email (under 150 words) that:\n` +
      `   - Opens with a hook about why they are a natural fit\n` +
      `   - Mentions channel stats\n` +
      `   - Proposes a specific collaboration format matching the brand's collab style\n` +
      `   - Includes the rate range naturally\n` +
      `   - Closes with a CTA to schedule a call or reply\n` +
      `   - Has no subject line, plain text only, no placeholders\n\n` +
      `Brands:\n${brandList}\n\n` +
      `Return ONLY valid JSON in this exact shape, with no extra text:\n` +
      `[\n` +
      `  { "brandName": "<name>", "bio": "<2-sentence bio>", "pitchEmail": "<email body>" },\n` +
      `  ...\n` +
      `]`;

    let generated: { brandName: string; bio: string; pitchEmail: string }[] = [];
    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: batchPrompt }],
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
      const jsonStart = raw.indexOf("[");
      const jsonEnd = raw.lastIndexOf("]");
      generated = jsonStart !== -1 && jsonEnd !== -1
        ? (JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as typeof generated)
        : [];
    } catch {
      // If Claude call fails, leave generated empty; placeholders will be used below.
    }

    // Match by index: prompt lists brands in fixed order, so generated[i] corresponds to pickedWithKind[i].
    // Fallback to name lookup if the model returns the same count and we want to tolerate reordering.
    const recommendations: BrandRecommendation[] = pickedWithKind.map(
      ({ item, kind, isRelated }, index) => {
        const genByIndex = generated[index];
        const genByName = generated.find((g) => g.brandName?.trim() === item.brand.name?.trim());
        const gen = genByIndex ?? genByName;
        const tierFit = item.brand.idealCreatorTier?.includes(creator.tier) ?? false;
        return {
          brandName: item.brand.name,
          kind,
          compatibilityScore: Number(item.compatibilityScore.toFixed(1)),
          acceptance: item.acceptance,
          pricing: item.pricing,
          ...(isRelated && relatedNiche ? { sourceNiche: relatedNiche } : {}),
          brandTier: item.brand.brandTier,
          collaborationStyle: item.brand.collaborationStyle,
          idealCreatorTier: item.brand.idealCreatorTier,
          avgCPM: item.brand.avgCPM,
          tierFit,
          nicheScore: item.nicheScore,
          tierScore: item.tierScore,
          subsScore: item.subsScore,
          contentScore: item.contentScore,
          fameNumeric: item.fameNumeric,
          targetBoost: item.targetBoost,
          repeatPenalty: item.repeatPenalty,
          alreadyWorkedWith: item.alreadyWorkedWith,
          minSubscribers: item.minSubscribers,
          maxSubscribers: item.maxSubscribers,
          bio: (gen?.bio?.trim() || "") || `Creator bio for ${normalized.name} and ${item.brand.name} will appear here.`,
          pitchEmail: (gen?.pitchEmail?.trim() || "") || `Pitch email for ${item.brand.name} will appear here once generated.`,
        };
      }
    );

    const response: MatchResponse = {
      creator: {
        name: normalized.name,
        youtubeChannelId: normalized.youtubeChannelId,
        niche: normalized.nicheOverride ?? null,
        ...(nicheProbabilities && nicheProbabilities.length > 0 && { nicheProbabilities }),
        estimatedSubscribers: creator.estimatedSubscribers,
        estimatedAvgViews: creator.estimatedAvgViews,
        tier: creator.tier,
        ...(youtubeData && {
          channelDescription: youtubeData.channelDescription || null,
          recentVideoTitles: youtubeData.recentVideoTitles ?? [],
        }),
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

