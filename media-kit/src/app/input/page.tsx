export default function InputPage() {
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
              placeholder="Nike, Gymshark, Adidas"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
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
                placeholder="Instagram: 25,000 followers&#10;TikTok: 40,000 followers"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
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
                placeholder="Brand: campaign type or short note&#10;Example: Nike: long-term ambassador"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-500">
                Helps us avoid repeats and tailor outreach.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Niche (optional)
            </label>
            <input
              type="text"
              placeholder="If empty, we&apos;ll infer from your channel"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Generate recommendations
          </button>
        </div>
      </div>
    </main>
  );
}

