import Link from "next/link";

export default function IntroPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Sponsorship Matchmaking
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            YouTube-powered AI Sponsorship Matchmaking Engine
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Paste your YouTube channel, and we&apos;ll analyze your real stats,
            match you to high-fit brands, estimate fair pricing, and generate
            tailored outreach materials you can send today.
          </p>
        </header>

        <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium">What this tool does</h2>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>• Enriches your YouTube channel with live metrics</li>
            <li>• Classifies your niche and audience positioning</li>
            <li>• Scores brand fit and acceptance probability</li>
            <li>• Recommends sponsorship pricing ranges</li>
            <li>• Generates brand-tailored bios and pitch emails</li>
          </ul>
        </section>

        <div>
          <Link
            href="/input"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}

