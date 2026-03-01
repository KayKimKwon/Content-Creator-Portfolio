"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InputPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [youtubeChannelID, setYoutubeChannelID] = useState("");
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [pastCollabs, setPastCollabs] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  const [instagramMaxLikes, setInstagramMaxLikes] = useState("");
  const [instagramMaxViews, setInstagramMaxViews] = useState("");
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [tiktokMaxLikes, setTiktokMaxLikes] = useState("");
  const [tiktokMaxViews, setTiktokMaxViews] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!youtubeChannelID.trim()) {
      setError("Please enter your YouTube channel URL or ID.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    const parseNumberOrNull = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const n = Number(trimmed.replace(/,/g, ""));
      return Number.isNaN(n) ? null : n;
    };

    const payload = {
      name,
      youtubeChannelID,
      niche,
      email,
      targetCompanies,
      pastCollabs,
      platforms: [
        {
          instagramFollowers: parseNumberOrNull(instagramFollowers),
          instagramMaxLikes: parseNumberOrNull(instagramMaxLikes),
          instagramMaxViews: parseNumberOrNull(instagramMaxViews),
          tiktokFollowers: parseNumberOrNull(tiktokFollowers),
          tiktokMaxLikes: parseNumberOrNull(tiktokMaxLikes),
          tiktokMaxViews: parseNumberOrNull(tiktokMaxViews),
        },
      ],
    };

    try {
      setIsLoading(true);
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to generate recommendations.");
      }

      const data = await res.json();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("matchResult", JSON.stringify(data));
      }
      router.push("/output");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Creator sponsorship profile
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Start by sharing your YouTube channel. You can optionally refine
            targeting with a few extra details.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              YouTube channel URL or ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={youtubeChannelID}
              onChange={(e) => setYoutubeChannelID(e.target.value)}
              placeholder="https://www.youtube.com/@yourchannel or UC..."
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              We&apos;ll use the YouTube API to fetch your stats and recent
              videos. No password or auth needed.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Target companies (optional)
            </label>
            <textarea
              rows={3}
              value={targetCompanies}
              onChange={(e) => setTargetCompanies(e.target.value)}
              placeholder="Nike, Gymshark, Adidas"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              If you already know who you want to pitch, list brand names here
              separated by commas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium">Instagram (optional)</p>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Followers
                </label>
                <input
                  type="text"
                  value={instagramFollowers}
                  onChange={(e) => setInstagramFollowers(e.target.value)}
                  placeholder="25,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Max likes (best video)
                </label>
                <input
                  type="text"
                  value={instagramMaxLikes}
                  onChange={(e) => setInstagramMaxLikes(e.target.value)}
                  placeholder="10,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Max views (best video)
                </label>
                <input
                  type="text"
                  value={instagramMaxViews}
                  onChange={(e) => setInstagramMaxViews(e.target.value)}
                  placeholder="150,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">TikTok (optional)</p>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Followers
                </label>
                <input
                  type="text"
                  value={tiktokFollowers}
                  onChange={(e) => setTiktokFollowers(e.target.value)}
                  placeholder="40,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Max likes (best video)
                </label>
                <input
                  type="text"
                  value={tiktokMaxLikes}
                  onChange={(e) => setTiktokMaxLikes(e.target.value)}
                  placeholder="20,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Max views (best video)
                </label>
                <input
                  type="text"
                  value={tiktokMaxViews}
                  onChange={(e) => setTiktokMaxViews(e.target.value)}
                  placeholder="300,000"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Niche (optional)
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="If empty, we&apos;ll infer from your channel"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isLoading ? "Generating..." : "Generate recommendations"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

