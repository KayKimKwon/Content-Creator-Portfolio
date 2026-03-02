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

const REFRESH_USED_KEY = "matchRefreshUsed";

function formatPricing(min: number, max: number): string {
  if (max >= 1_000_000) {
    return `$${(min / 1_000_000).toFixed(1)}M – $${(max / 1_000_000).toFixed(1)}M`;
  }
  if (max >= 1_000) {
    return `$${(min / 1_000).toFixed(0)}k – $${(max / 1_000).toFixed(0)}k`;
  }
  return `$${min} – $${max}`;
}

export default function OutputPage() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshUsed, setRefreshUsed] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    setRefreshError(null);
    const raw = window.sessionStorage.getItem("matchResult");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as MatchResponse;
      setData(parsed);
    } catch {
      // ignore
    }
    const used = window.sessionStorage.getItem(REFRESH_USED_KEY);
    setRefreshUsed(used === "true");
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  async function handleRefresh() {
    const payloadRaw =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("lastMatchPayload")
        : null;
    const shownRaw =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("shownBrandNames")
        : null;
    if (!payloadRaw || refreshUsed) return;
    try {
      const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
      const shown: string[] = shownRaw ? JSON.parse(shownRaw) : [];
      setRefreshLoading(true);
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, excludeBrands: shown }),
      });
      const next = (await res.json()) as MatchResponse & {
        error?: string;
        insufficientNiche?: string;
      };
      if (!res.ok) {
        const nicheMsg =
          typeof next?.insufficientNiche === "string"
            ? `The ${next.insufficientNiche} niche doesn't have enough companies. `
            : "";
        const rest =
          typeof next?.error === "string" ? next.error : "Refresh failed.";
        setRefreshError(nicheMsg + rest);
        return;
      }
      setRefreshError(null);
      const nextNames = (next.recommendations ?? []).map((r) => r.brandName);
      window.sessionStorage.setItem("matchResult", JSON.stringify(next));
      window.sessionStorage.setItem(
        "shownBrandNames",
        JSON.stringify([...shown, ...nextNames]),
      );
      window.sessionStorage.setItem(REFRESH_USED_KEY, "true");
      setRefreshUsed(true);
      setData(next);
      setExpandedKey(null);
    } catch {
      setRefreshError("Refresh failed. Try again or go back to input.");
    } finally {
      setRefreshLoading(false);
    }
  }

  const expandedRec = data?.recommendations.find(
    (r, i) => r.brandName + i === expandedKey,
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-emerald-50/30 px-4 py-12 font-sans text-zinc-900 dark:from-zinc-950 dark:to-emerald-950/20 dark:text-zinc-50 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 animate-slide-down-in">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Sponsorship recommendations
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Four in your niche (2 reach, 2 target) and one from a related
              niche.
            </p>
            {!data && (
              <p className="text-xs text-zinc-500">
                No recommendations found. Start from the{" "}
                <Link
                  href="/input"
                  className="font-medium text-emerald-600 underline dark:text-emerald-400"
                >
                  input page
                </Link>
                .
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/input"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Back to input
            </Link>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshLoading || !data || refreshUsed}
              className="inline-flex items-center justify-center rounded-full border border-emerald-600 bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {refreshLoading
                ? "Loading…"
                : refreshUsed
                  ? "Refresh used"
                  : "Refresh suggestions"}
            </button>
          </div>
        </header>

        {refreshError && (
          <p className="animate-slide-down-in rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {refreshError}
          </p>
        )}

        {data && (
          <div className="flex min-h-[540px] flex-row gap-8">
            {/* Left: companies + overview (~40%) */}
            <section className="flex min-w-0 flex-[2] flex-col gap-3">
              {data.recommendations.map((rec, index) => {
                const key = rec.brandName + index;
                const isExpanded = expandedKey === key;
                const delayClass =
                  index === 0
                    ? ""
                    : index === 1
                      ? "animate-slide-down-in-delay-1"
                      : index === 2
                        ? "animate-slide-down-in-delay-2"
                        : index === 3
                          ? "animate-slide-down-in-delay-3"
                          : "animate-slide-down-in-delay-4";
                return (
                  <article
                    key={key}
                    className={`animate-slide-down-in rounded-xl border bg-white p-4 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${delayClass}`}
                    style={{ animationFillMode: "backwards" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          {rec.kind === "reach"
                            ? "Reach"
                            : rec.kind === "related"
                              ? rec.sourceNiche
                                ? `Related (${rec.sourceNiche})`
                                : "Related"
                              : "Target"}
                        </p>
                        <h2 className="mt-0.5 truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {rec.brandName}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <span>
                            Score: {rec.compatibilityScore.toFixed(1)}
                          </span>
                          <span>
                            {rec.acceptance.bucket} ({rec.acceptance.percent}%)
                          </span>
                          <span>
                            {formatPricing(rec.pricing.min, rec.pricing.max)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                      >
                        {isExpanded ? "Collapse" : "Expand"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Right: expand (detail panel or placeholder) (~60%, more space) */}
            <aside
              className="min-w-0 flex-[3] animate-slide-down-in animate-slide-down-in-delay-5 min-h-[540px] rounded-xl border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              style={{ animationFillMode: "backwards" }}
            >
              {expandedRec ? (
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      {expandedRec.kind === "reach"
                        ? "Reach"
                        : expandedRec.kind === "related"
                          ? "Related"
                          : "Target"}
                    </p>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {expandedRec.brandName}
                    </h3>
                  </div>
                  <div className="space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Tailored professional bio
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                        {expandedRec.bio}
                      </p>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Tailored pitch email
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                        {expandedRec.pitchEmail}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/50 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Expand company info here
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Click &quot;Expand&quot; on a company in the list to view
                    bio and pitch.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
