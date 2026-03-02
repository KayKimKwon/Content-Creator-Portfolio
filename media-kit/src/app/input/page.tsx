"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InputPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [youtubeChannelID, setYoutubeChannelID] = useState("");
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("");
  const [nicheOptions, setNicheOptions] = useState<string[]>([]);
  const [targetCompanies, setTargetCompanies] = useState("");
  const [pastCollabs, setPastCollabs] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  const [instagramMaxLikes, setInstagramMaxLikes] = useState("");
  const [instagramMaxViews, setInstagramMaxViews] = useState("");
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [tiktokMaxLikes, setTiktokMaxLikes] = useState("");
  const [tiktokMaxViews, setTiktokMaxViews] = useState("");
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : { niches: [] }))
      .then((data) => setNicheOptions(data.niches ?? []))
      .catch(() => setNicheOptions([]));
  }, []);

  // Pre-fill from last submission when returning from output (e.g. "Back to input").
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("lastMatchPayload");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as {
        name?: string;
        youtubeChannelID?: string;
        email?: string;
        niche?: string;
        targetCompanies?: string;
        pastCollabs?: string;
        platforms?: Array<{
          instagramFollowers?: number | null;
          instagramMaxLikes?: number | null;
          instagramMaxViews?: number | null;
          tiktokFollowers?: number | null;
          tiktokMaxLikes?: number | null;
          tiktokMaxViews?: number | null;
        }>;
      };
      if (payload.name != null) setName(String(payload.name));
      if (payload.youtubeChannelID != null)
        setYoutubeChannelID(String(payload.youtubeChannelID));
      if (payload.email != null) setEmail(String(payload.email));
      if (payload.niche != null) setNiche(String(payload.niche));
      if (payload.targetCompanies != null)
        setTargetCompanies(String(payload.targetCompanies));
      if (payload.pastCollabs != null)
        setPastCollabs(String(payload.pastCollabs));
      const p0 = payload.platforms?.[0];
      if (p0) {
        if (p0.instagramFollowers != null)
          setInstagramFollowers(String(p0.instagramFollowers));
        if (p0.instagramMaxLikes != null)
          setInstagramMaxLikes(String(p0.instagramMaxLikes));
        if (p0.instagramMaxViews != null)
          setInstagramMaxViews(String(p0.instagramMaxViews));
        if (p0.tiktokFollowers != null)
          setTiktokFollowers(String(p0.tiktokFollowers));
        if (p0.tiktokMaxLikes != null)
          setTiktokMaxLikes(String(p0.tiktokMaxLikes));
        if (p0.tiktokMaxViews != null)
          setTiktokMaxViews(String(p0.tiktokMaxViews));
      }
    } catch {
      // ignore invalid stored payload
    }
  }, []);

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

    if (!niche.trim()) {
      setError("Please select your niche from the dropdown.");
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

      const data = await res.json();

      if (!res.ok) {
        const nicheMsg =
          typeof data?.insufficientNiche === "string"
            ? `The ${data.insufficientNiche} niche doesn't have enough companies. `
            : "";
        const message =
          typeof data?.error === "string"
            ? nicheMsg + data.error
            : nicheMsg || "Failed to generate recommendations.";
        throw new Error(message);
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("matchResult", JSON.stringify(data));
        window.sessionStorage.setItem(
          "lastMatchPayload",
          JSON.stringify(payload),
        );
        const shown = (data.recommendations ?? []).map(
          (r: { brandName: string }) => r.brandName,
        );
        window.sessionStorage.setItem("shownBrandNames", JSON.stringify(shown));
        window.sessionStorage.setItem("matchRefreshUsed", "false");
      }

      router.push("/output");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-emerald-50/30 px-4 py-12 font-sans text-zinc-900 dark:from-zinc-950 dark:to-emerald-950/20 dark:text-zinc-50 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="space-y-3 animate-slide-down-in">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Creator sponsorship profile
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Start by sharing your YouTube channel. You can optionally refine
            targeting with a few extra details.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="animate-slide-down-in animate-slide-down-in-delay-1 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          style={{ animationFillMode: "backwards" }}
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
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              YouTube channel ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={youtubeChannelID}
              onChange={(e) => setYoutubeChannelID(e.target.value)}
              placeholder="e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
            />
            <p className="text-xs text-zinc-500">
              Your channel ID (starts with UC…). We fetch your stats and recent
              videos via the YouTube API — no login required.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Niche <span className="text-red-500">*</span>
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
            >
              <option value="">Select a niche</option>
              {nicheOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Recommendations will focus on this niche plus one from a related
              niche.
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
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
            />
            <p className="text-xs text-zinc-500">
              If you already know who you want to pitch, list brand names here
              separated by commas.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Past collaborations (optional)
            </label>
            <textarea
              rows={2}
              value={pastCollabs}
              onChange={(e) => setPastCollabs(e.target.value)}
              placeholder="Brand names or notes, comma-separated"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
            />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvancedMetrics((v) => !v)}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {showAdvancedMetrics ? "− Hide" : "+"} Advanced — platform metrics
            </button>
            {showAdvancedMetrics && (
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
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
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                    />
                  </div>
                </div>
              </div>
            )}
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
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {isLoading ? "Generating..." : "Generate recommendations"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
