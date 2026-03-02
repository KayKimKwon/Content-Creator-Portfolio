"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
  kind: RecommendationKind;
  compatibilityScore: number;
  acceptance: AcceptanceProbability;
  pricing: PricingRange;
  bio: string;
  pitchEmail: string;
  sourceNiche?: string;
}

interface MatchResponse {
  creator: {
    name: string;
    youtubeChannelId: string;
    niche: string | null;
  };
  recommendations: BrandRecommendation[];
}

export default function OutputPage() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("matchResult");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as MatchResponse;
      setData(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  async function handleRefresh() {
    const payloadRaw = typeof window !== "undefined" ? window.sessionStorage.getItem("lastMatchPayload") : null;
    const shownRaw = typeof window !== "undefined" ? window.sessionStorage.getItem("shownBrandNames") : null;
    if (!payloadRaw) return;
    try {
      const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
      const shown: string[] = shownRaw ? JSON.parse(shownRaw) : [];
      setRefreshLoading(true);
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, excludeBrands: shown }),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const next = (await res.json()) as MatchResponse;
      const nextNames = (next.recommendations ?? []).map((r) => r.brandName);
      window.sessionStorage.setItem("matchResult", JSON.stringify(next));
      window.sessionStorage.setItem("shownBrandNames", JSON.stringify([...shown, ...nextNames]));
      setData(next);
      setExpandedKey(null);
    } catch {
      // could set error state
    } finally {
      setRefreshLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Sponsorship recommendations
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Three in your niche (1 reach, 2 target) and one from a related niche.
            </p>
            {!data && (
              <p className="text-xs text-zinc-500">
                No recommendations found. Start from the{" "}
                <Link href="/input" className="text-emerald-600 underline dark:text-emerald-400">
                  input page
                </Link>
                .
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshLoading || !data}
            className="inline-flex items-center justify-center rounded-full border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
          >
            {refreshLoading ? "Loading…" : "Refresh suggestions"}
          </button>
        </header>

        {data && (
          <section className="grid gap-6 sm:grid-cols-2">
            {data.recommendations.map((rec, index) => {
              const key = rec.brandName + index;
              const isExpanded = expandedKey === key;

              return (
                <article
                  key={key}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-zinc-500">
                        {rec.kind === "reach"
                          ? "Reach recommendation"
                          : rec.kind === "related"
                            ? `Related niche${rec.sourceNiche ? ` (${rec.sourceNiche})` : ""}`
                            : "Target recommendation"}
                      </p>
                      <h2 className="mt-1 text-base font-semibold">{rec.brandName}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      className="text-xs font-medium text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      {isExpanded ? "Hide details" : "View details"}
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <p>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Compatibility score:
                      </span>{" "}
                      {rec.compatibilityScore.toFixed(1)}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Acceptance probability:
                      </span>{" "}
                      {rec.acceptance.bucket} ({rec.acceptance.percent}%)
                    </p>
                    <p>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Suggested pricing:
                      </span>{" "}
                      ${rec.pricing.min} – ${rec.pricing.max} per integration
                    </p>
                  </div>

                  {isExpanded && (
                    <>
                      <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <p className="font-medium">Tailored professional bio</p>
                        <p className="text-xs whitespace-pre-line">{rec.bio}</p>
                      </div>

                      <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <p className="font-medium">Tailored pitch email</p>
                        <p className="text-xs whitespace-pre-line">{rec.pitchEmail}</p>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

