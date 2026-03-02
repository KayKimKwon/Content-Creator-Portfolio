"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type CreatorTierName = "nano" | "micro" | "mid" | "macro" | "mega";

interface CreatorStats {
  name: string;
  youtubeChannelId: string;
  niche: string | null;
  estimatedSubscribers?: number;
  estimatedAvgViews?: number;
  tier?: CreatorTierName;
  channelDescription?: string | null;
  recentVideoTitles?: string[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function tierLabel(tier: CreatorTierName): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function StatsPage() {
  const [creator, setCreator] = useState<CreatorStats | null>(null);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("matchResult");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { creator?: CreatorStats };
      if (parsed.creator) setCreator(parsed.creator);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-emerald-50/30 px-4 py-12 font-sans text-zinc-900 dark:from-zinc-950 dark:to-emerald-950/20 dark:text-zinc-50 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Creator stats
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Profile and metrics used for your recommendations.
            </p>
          </div>
          <Link
            href="/output"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Back to recommendations
          </Link>
        </header>

        {!creator ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No creator stats yet. Run a match from the{" "}
              <Link
                href="/input"
                className="font-medium text-emerald-600 underline dark:text-emerald-400"
              >
                input page
              </Link>{" "}
              to see your profile and metrics here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Profile
              </h2>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                    Name
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {creator.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                    YouTube channel ID
                  </dt>
                  <dd className="mt-0.5 break-all text-sm text-zinc-700 dark:text-zinc-300">
                    {creator.youtubeChannelId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                    Niche
                  </dt>
                  <dd className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {creator.niche ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>

            {(creator.estimatedSubscribers != null ||
              creator.estimatedAvgViews != null ||
              creator.tier) && (
              <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Metrics
                </h2>
                <dl className="mt-4 space-y-3">
                  {creator.estimatedSubscribers != null && (
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                        Estimated subscribers
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {formatNumber(creator.estimatedSubscribers)}
                      </dd>
                    </div>
                  )}
                  {creator.estimatedAvgViews != null && (
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                        Estimated avg views per video
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {formatNumber(creator.estimatedAvgViews)}
                      </dd>
                    </div>
                  )}
                  {creator.tier && (
                    <div>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                        Creator tier
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {tierLabel(creator.tier)}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {creator.channelDescription != null &&
              creator.channelDescription !== "" && (
                <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Channel description
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                    {creator.channelDescription}
                  </p>
                </section>
              )}

            {creator.recentVideoTitles &&
              creator.recentVideoTitles.length > 0 && (
                <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Recent video titles
                  </h2>
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {creator.recentVideoTitles.slice(0, 10).map((title, i) => (
                      <li key={i} className="truncate">
                        {title}
                      </li>
                    ))}
                  </ul>
                  {creator.recentVideoTitles.length > 10 && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      +{creator.recentVideoTitles.length - 10} more
                    </p>
                  )}
                </section>
              )}
          </div>
        )}
      </div>
    </main>
  );
}
