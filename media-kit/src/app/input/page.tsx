"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InputPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [otherPlatforms, setOtherPlatforms] = useState("");
  const [pastCollabs, setPastCollabs] = useState("");
  const [niche, setNiche] = useState("");

  const handleSubmit = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const ytData = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      }).then((r) => r.json());

      const analysis = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ytData, otherPlatforms, niche }),
      }).then((r) => r.json());

      const generated = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ytData, analysis }),
      }).then((r) => r.json());

      localStorage.setItem(
        "results",
        JSON.stringify({ ytData, analysis, generated })
      );
      router.push("/results");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              YouTube channel URL or ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="https://www.youtube.com/@yourchannel or UC..."
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
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
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              If you already know who you want to pitch, list brand names here
              separated by commas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Other platforms (optional)
              </label>
              <textarea
                rows={3}
                value={otherPlatforms}
                onChange={(e) => setOtherPlatforms(e.target.value)}
                placeholder={"Instagram: 25,000 followers\nTikTok: 40,000 followers"}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-500">
                Simple follower counts are enough for now.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Past collaborations (optional)
              </label>
              <textarea
                rows={3}
                value={pastCollabs}
                onChange={(e) => setPastCollabs(e.target.value)}
                placeholder={"Nike: long-term ambassador\nGymshark: sponsored post"}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-500">
                Helps us avoid repeats and tailor outreach.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Niche override (optional)
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Auto-detect from channel</option>
              <option value="tech">Tech</option>
              <option value="fitness">Fitness</option>
              <option value="beauty">Beauty</option>
              <option value="gaming">Gaming</option>
              <option value="food">Food</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !channelId}
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? "Analyzing..." : "Generate recommendations"}
          </button>
        </div>
      </div>
    </main>
  );
}
