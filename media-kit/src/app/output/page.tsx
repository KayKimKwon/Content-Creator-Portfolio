export default function OutputPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Sponsorship recommendations
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Based on your YouTube channel and optional inputs, here are three
              high-fit brands to pitch.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Refresh suggestions
          </button>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((slot) => (
            <article
              key={slot}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div>
                <p className="text-xs text-zinc-500">Brand recommendation {slot}</p>
                <h2 className="mt-1 text-base font-semibold">Brand name</h2>
              </div>

              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    Compatibility score:
                  </span>{" "}
                  0.00
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    Acceptance probability:
                  </span>{" "}
                  Medium (0%)
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    Suggested pricing:
                  </span>{" "}
                  $0 – $0 per integration
                </p>
              </div>

              <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <p className="font-medium">Tailored professional bio</p>
                <p className="text-xs">
                  This is where a brand-specific, GPT-generated bio for your
                  channel will appear.
                </p>
              </div>

              <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <p className="font-medium">Tailored pitch email</p>
                <p className="text-xs">
                  This is where a brand-specific, GPT-generated pitch email will
                  appear, ready to copy into your outreach.
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

