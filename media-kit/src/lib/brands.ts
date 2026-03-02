/**
 * Loads brand data from per-niche JSON files and meta.
 * Used by the match API; niche is required so we only load that niche's file first.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

import metaData from "../../data/meta.json";
import similarNichesData from "../../data/similar-niches.json";

export type CreatorTierName = "nano" | "micro" | "mid" | "macro" | "mega";

export interface CreatorTierMeta {
  minSubs: number;
  maxSubs: number | null;
}

export interface Meta {
  version: string;
  lastUpdated?: string;
  niches: string[];
  tiers?: Record<string, { fameScoreRange: number[]; fameScore_numeric: number[] }>;
  creatorTiers: Record<CreatorTierName, CreatorTierMeta>;
  schema?: { required: string[]; optional: string[] };
}

export interface Brand {
  name: string;
  niche: string;
  brandTier: "iconic" | "mid" | "emerging";
  fameScore: number;
  idealCreatorTier: CreatorTierName[];
  minSubscribers: number;
  maxSubscribers: number | null;
  avgCPM: number;
  collaborationStyle: string;
  brandPersonality: string;
  notes?: string;
}

const dataDir = join(process.cwd(), "data");
const nichesDir = join(dataDir, "niches");

export function getMeta(): Meta {
  return metaData as Meta;
}

export function getSimilarNiches(niche: string): string[] {
  const key = niche.toLowerCase().trim();
  const map = similarNichesData as Record<string, string[]>;
  return map[key] ?? [];
}

export function getBrandsForNiche(niche: string): Brand[] {
  const key = niche.toLowerCase().trim();
  const filePath = join(nichesDir, `${key}.json`);
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, "utf8");
    const arr = JSON.parse(raw) as Brand[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getBrandsForNiches(nicheList: string[]): Brand[] {
  const seen = new Set<string>();
  const out: Brand[] = [];
  for (const n of nicheList) {
    const brands = getBrandsForNiche(n);
    for (const b of brands) {
      if (seen.has(b.name)) continue;
      seen.add(b.name);
      out.push(b);
    }
  }
  return out;
}
