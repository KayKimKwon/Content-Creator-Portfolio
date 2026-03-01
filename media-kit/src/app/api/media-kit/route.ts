// Basic types for the creator media kit payload and response.
// These can evolve with your frontend form.

type PlatformName = "instagram" | "tiktok" | "youtube" | "twitter" | "other";

interface PlatformStats {
  platform: PlatformName;
  handle: string;
  followers: number;
  avgViews?: number;
  mostViews: number;
  avgLikes?: number;
  mostLikes: number;
  avgComments?: number;
  mostComments: number;
}

interface Collaboration {
  brandName: string;
  campaignType?: string;
  deliverables?: string;
  year: number;
}

type BrandCategory = "fitness" | "tech" | "beauty" | "fashion" | "gaming" | "art" | "lifestyle" | "other";


interface Contact {
  email: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

interface CreatorMediaKitRequest {
  name: string;
  niche: string;
  shortBio: string;
  contact: Contact;
  website?: string;
  targetBrandCategory: BrandCategory;
  platforms: PlatformStats[];
  collaborations: Collaboration[];
  profileImageUrl?: string;
  contentThumbnails?: string[];
}

interface PricingGuidance {
  perPost: number;
  perPackage: number;
  currency: string;
}

interface EngagementSummary {
  overallEngagementRate: number;
  byPlatform: {
    platform: PlatformName;
    engagementRate: number;
  }[];
}

interface CreatorMediaKitResponse {
  kitId: string;
  engagement: EngagementSummary;
  pricing: PricingGuidance;
  // following fields will eventually come from GPT
  professionalBio: string;
  audienceSummary: string;
  pitchEmail: string;
}

function calculateEngagementRate(stats: PlatformStats[]): EngagementSummary {
  const byPlatform = stats.map((s) => {
    // define averages if not defined - most / 2
    const avgLikes = s.avgLikes ?? (s.mostLikes / 2);
    const avgComments = s.avgComments ?? (s.mostComments / 2);
    const avgViews = s.avgViews ?? (s.mostViews / 2);
    
    const coreEngagement = (avgLikes + avgComments + (avgViews / 10)) / s.followers;
    const peakBoost = (s.mostLikes + s.mostComments + (s.mostViews / 10)) / s.followers;
    
    // engagement rate calc using core and peak boost
    const engagementRate = s.followers > 0 
      ? (0.6 * coreEngagement + 0.4 * peakBoost) * 100 
      : 0;

    return {
      platform: s.platform,
      engagementRate,
    };
  });

  // Overall: Use same logic on aggregated stats
  const totalFollowers = stats.reduce((sum, s) => sum + s.followers, 0);
  
  // Aggregate avgs/mosts first, then apply formula
  const aggAvgLikes = stats.reduce((sum, s) => sum + (s.avgLikes ?? s.mostLikes / 2), 0);
  const aggAvgComments = stats.reduce((sum, s) => sum + (s.avgComments ?? s.mostComments / 2), 0);
  const aggAvgViews = stats.reduce((sum, s) => sum + (s.avgViews ?? s.mostViews / 2), 0);
  const aggMostLikes = stats.reduce((sum, s) => sum + s.mostLikes, 0);
  const aggMostComments = stats.reduce((sum, s) => sum + s.mostComments, 0);
  const aggMostViews = stats.reduce((sum, s) => sum + s.mostViews, 0);
  
  const aggCore = (aggAvgLikes + aggAvgComments + (aggAvgViews / 10)) / totalFollowers;
  const aggPeak = (aggMostLikes + aggMostComments + (aggMostViews / 10)) / totalFollowers;
  const overallEngagementRate = totalFollowers > 0 
    ? (0.6 * aggCore + 0.4 * aggPeak) * 100 
    : 0;

  return {
    overallEngagementRate,
    byPlatform,
  };
}


function calculateSuggestedPricing(
  engagement: EngagementSummary,
  stats: PlatformStats[]
): PricingGuidance {
  // pricing based on total followers and overall engagement
  const totalFollowers = stats.reduce((sum, s) => sum + s.followers, 0);
  const engagementRate = engagement.overallEngagementRate;

  let baseRate = 50;

  if (totalFollowers >= 10000 && totalFollowers < 50000) {
    baseRate = 150;
  } else if (totalFollowers >= 50000 && totalFollowers < 200000) {
    baseRate = 400;
  } else if (totalFollowers >= 200000) {
    baseRate = 1000;
  }

  // Apply a multiplier based on engagement rate.
  let engagementMultiplier = 1;

  if (engagementRate >= 3 && engagementRate < 6) {
    engagementMultiplier = 1.2;
  } else if (engagementRate >= 6 && engagementRate < 10) {
    engagementMultiplier = 1.5;
  } else if (engagementRate >= 10) {
    engagementMultiplier = 2;
  }

  const perPost = Math.round(baseRate * engagementMultiplier);
  const perPackage = Math.round(perPost * 3);

  return {
    perPost,
    perPackage,
    currency: "USD",
  };
}

// gpt integration placeholder; generates professional bio, audience summary, and pitch email
async function generateAiCopy(input: CreatorMediaKitRequest, engagement: EngagementSummary) {
  const professionalBio = `${input.name} is a ${input.niche} creator who shares content across ${input.platforms
    .map((p) => p.platform)
    .join(", ")}. ${input.shortBio}`;

  const audienceSummary = `With an overall engagement rate of ${engagement.overallEngagementRate.toFixed(
    2
  )}%, ${input.name}'s audience is highly responsive and invested in ${
    input.niche
  } content.`;

  const pitchEmail = `Hi there,

My name is ${input.name}, a ${input.niche} creator with an engaged audience across ${input.platforms
    .map((p) => p.platform)
    .join(", ")}. I'm reaching out to explore a potential partnership with your ${
    input.targetBrandCategory
  } brand.

I'd love to collaborate on a campaign that brings your products to my community in an authentic way.

Best,
${input.name}
${input.contact.email}`;

  return {
    professionalBio,
    audienceSummary,
    pitchEmail,
  };
}

// placeholder for database persistence. generates a random UUID
async function saveCreatorMediaKit(
  _payload: CreatorMediaKitRequest & {
    engagement: EngagementSummary;
    pricing: PricingGuidance;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  return id;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatorMediaKitRequest;

    const engagement = calculateEngagementRate(body.platforms);
    const pricing = calculateSuggestedPricing(engagement, body.platforms);

    const aiCopy = await generateAiCopy(body, engagement);

    const kitId = await saveCreatorMediaKit({
      ...body,
      engagement,
      pricing,
    });

    const response: CreatorMediaKitResponse = {
      kitId,
      engagement,
      pricing,
      professionalBio: aiCopy.professionalBio,
      audienceSummary: aiCopy.audienceSummary,
      pitchEmail: aiCopy.pitchEmail,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create media kit", error);
    return new Response(
      JSON.stringify({ error: "Failed to create media kit" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

