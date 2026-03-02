import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import brands from "@/data/brands.json";

const client = new Anthropic();

function calcAudienceScore(ytSubs: number, igFollowers: number, ttFollowers: number) {
    const total = ytSubs + igFollowers + ttFollowers + 1;
    return Math.min(100, (Math.log10(total) / Math.log10(1e9)) * 100)
}

function calcReachScore(totalViews: number) {
    return Math.min(100, (Math.log10(totalViews + 1) / Math.log10(1e12)) * 100);
}

function calcEngagementScore(videos: {views: number; likes: number; comments: number} []) {
    const last12 = videos.slice(0,12);
    const totalViews = last12.reduce((s,v) => s + v.views, 0);
    const totalInteractions = last12.reduce((s,v) => s + v.likes + v.comments, 0);
    if (totalViews == 0) return 0;
    return Math.min(100, (totalInteractions/totalViews) * 1000);
}

function calcFame(audience: number, reach: number, engagement:number) {
    return Math.max(1, Math.round((0.4 * audience + 0.3 * reach + 0.3 * engagement) / 10));
}



function parseFollowers(text: string, platform: "instagram" | "tiktok") {
    const regex = new RegExp('${platform}[^\\d]*([\\d,]+)', "i");
    const match = text.match(regex);
    return match ? parseInt(match[1].replace(/,/g, "") 10) : 0;
}



// Niche detection

async function detectNiche(videos: {title: string}[]) {
    const titles = videos.slice(0,12).map((v,i) => '${i + 1}. ${v.title}').join("\n");
    const msg = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 20,
        messages: [{
            role: "user",
            content: `Given these YouTube video titles, classify this creator into exactly one of: tech, fitness, beauty, gaming, food, lifestyle. Return only the single word.\n\n${titles}`,
        }],
    });
    
    const text = msg.content[0].type == "text" ? msg.content[0].text.trim().toLowerCase() : "";
    const niches = ["tech", "fitness", "beauty", "gaming", "food", "lifestyle"];
    return niches.includes(text) ? text : "lifestyle";
}

// compability Score

async function scoreCompatibility(
    creatorNiche: string,
    videos: {title: string}[],
    brand: {name: string; niche: string; description: string; typicalPartners: string} //brand searcher
) {
    const titles = videos.slice(0,6).map((v) => v.title).join(", ");
    const msg = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 150,
        messages: [{
            role: "user",
            content: `Rate compatibility between this creator and brand (0-100).
            Creator niche: ${creatorNiche}
            Recent videos: ${titles}

            Brand: ${brand.name}
            Brand niche: ${brand.niche}  
            Description: ${brand.description}
            Typical partners: ${brand.typicalCreatorPartners}
            Return ONLY valid JSON: {"score": <0-100>, "reasoning": "<one sentence>"}`,
        }],

    });
    const text = msg.content[0].type == "text" ? msg.content[0].text : '{"score":50,"reasoning":""}';
    try {
        return JSON.parse(text) as { score: number, reasoning: string};
    } catch {
        return '{"score":50,"reasoning":""}';
    }
}

export async function POST(req: NextRequest) {
    try {
        const {ytData, otherPlatforms, niche: nicheOverride} = await req.json();

        const igFollowers = parseFollowers(otherPlatforms || "", "instagram");
        const ttFollowers = parseFollowers(otherPlatforms || "", "tiktok");

        const audienceScore = calcAudienceScore(ytData.subscribers, igFollowers, ttFollowers);
        const reachScore = calcReachScore(ytData.totalViews);
        const engagementScore = calcEngagementScore(ytData.videos);
        const creatorFame = calcFame(audienceScore, reachScore, engagementScore);

        const detectedNiche = nicheOverride || (await detectNiche(ytData.videos));


        const candidates = (brands as any[]).filter((b) => brands.niche === detectNiche);
        const scored = await Promise.all(
            candidates.map(async (brand) => {
                const {score, reasoning} = await scoreCompatibility(detectNiche, ytData.videos, brand);
                const finalScore = 0.5 * score + 0.5 * (creatorFame * 10);

                return {brand, compabilityScore: score, finalScore, reasoning};
            })
        );

        const targets = scored
        .filter(({brand, finalScore}) => {
            const min = Math.max(1, brand.fameScore - 1);
            const max = Math.max(10, brand.fameScore + 2);
            return creatorFame >= min && creatorFame <= max && finalScore >= 50;
        })
        .sort((a,b) => b.finalScore - a.finalScore)
        .slice(0,3);

        const targetNames = new Set(targets.map((t) => t.brand.name));
        const reach = scored
        .filter(({brand}) => !targetNames.has(brand.name) && creatorFame < Math.min(10, brand.fameScore + 4))
        .sort((a,b) => b.compabilityScore - a.compabilityScore)
        .slice(0,1);

        const toCompany = (type: "target" | "reach") => ({ brand, compatibilityScore, finalScore, reasoning }: typeof scored[0]) => ({
            name: brand.name,
            description: brand.description,
            type,
            compatibilityScore: Math.round(compatibilityScore),
            finalScore: Math.round(finalScore),
            acceptanceProbability: finalScore >= 70 ? "High" : finalScore >= 55 ? "Medium" : "Low",
            reasoning,
        });
        
        return NextResponse.json({
            creatorFame,
            niche: detectedNiche,
            audienceScore: Math.round(audienceScore),
            reachScore: Math.round(reachScore),
            engagementScore: Math.round(engagementScore),
            companies: [...targets.map(toCompany("target")), ...reach.map(toCompany("reach"))],
        });

    } catch(err) {
        console.error(err);
        return NextResponse.json({error: "Analysis failed"}, {status: 500})
    }
}