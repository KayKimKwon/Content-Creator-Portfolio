# SponsorsMatch — AI Sponsorship Matchmaking for Content Creators

SponsorsMatch analyzes your YouTube channel and matches you with brands that are the right fit — then writes your pitch email for you.

Built at **HOTH XIII** with Next.js, Claude AI, and the YouTube Data API.

---

## What It Does

1. **You enter your YouTube channel** — the app pulls your real subscriber count, average views, and recent video titles
2. **Pick your niche** — lifestyle, fitness, beauty, food, tech, finance, gaming, or travel
3. **Get 5 brand recommendations** ranked by compatibility:
   - 2 **Reach** brands — iconic names that are a stretch but worth shooting for
   - 2 **Target** brands — best-fit brands with high acceptance odds
   - 1 **Related** brand — a brand from a similar niche to broaden your options
4. **Claude writes your pitch** — each recommendation includes a personalized creator bio and cold-pitch email ready to send

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Data API | YouTube Data API v3 |
| Runtime | Node.js via Next.js API routes |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/KayKimKwon/Content-Creator-Portfolio
cd Content-Creator-Portfolio/media-kit
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the `media-kit/` folder:

```
ANTHROPIC_API_KEY=sk-ant-...
YOUTUBE_API_KEY=AIza...
```

- **`ANTHROPIC_API_KEY`** — required for AI-generated bios and pitch emails. Get one at [console.anthropic.com](https://console.anthropic.com)
- **`YOUTUBE_API_KEY`** — optional but recommended. Without it, the app estimates your stats from Instagram/TikTok followers instead. Get one from [Google Cloud Console](https://console.cloud.google.com)

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## How the Matching Works

Each brand is scored against your profile across three factors:

| Factor | Weight | How it's measured |
|--------|--------|------------------|
| Niche match | 50% | Exact match = 100, different niche = 40 |
| Creator tier alignment | 25% | Based on subscriber count (nano → mega) |
| Subscriber range fit | 25% | Whether your subs fall within the brand's target range |

Brand fame (0–1 scale) is then blended in at 40% weight for the final score. Brands you've worked with before get a -10 penalty; brands you listed as targets get a +8 boost.

**Acceptance probability** is bucketed as High (score ≥ 80), Medium (60–79), or Low (< 60).

**Pricing estimates** are calculated as `avg views × brand CPM / 1000`, with a scaling curve for large creators.

### Creator Tiers

| Tier | Subscribers |
|------|------------|
| Nano | 500 – 4,999 |
| Micro | 5,000 – 49,999 |
| Mid | 50,000 – 249,999 |
| Macro | 250,000 – 1,999,999 |
| Mega | 2,000,000+ |

---

## Project Structure

```
media-kit/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── input/page.tsx    # Creator input form
│   │   ├── output/page.tsx   # Brand recommendations
│   │   ├── stats/page.tsx    # Creator stats view
│   │   └── api/
│   │       ├── match/        # Core matchmaking + AI pitch generation
│   │       ├── meta/         # Returns available niches
│   │       ├── analyze/      # Creator analysis
│   │       └── generate/     # Standalone pitch generation
│   └── lib/
│       ├── brands.ts         # Loads brand data from per-niche JSON files
│       └── youtube.ts        # YouTube Data API integration
└── data/
    ├── meta.json             # Niche list, creator tier config
    ├── similar-niches.json   # Related niches map
    └── niches/               # Brand data per niche
        ├── gaming.json
        ├── fitness.json
        ├── beauty.json
        └── ...
```

---

## Adding Brands / Niches

Each niche has its own JSON file under `data/niches/`. To add a brand:

```json
[
  {
    "name": "BrandName",
    "brandTier": "iconic",
    "fameScore": 0.9,
    "idealCreatorTier": ["micro", "mid"],
    "minSubscribers": 10000,
    "maxSubscribers": 500000,
    "avgCPM": 25,
    "collaborationStyle": "dedicated video",
    "brandPersonality": "innovative, youthful"
  }
]
```

To add a new niche, create `data/niches/<niche>.json` and add the niche name to the `niches` array in `data/meta.json`.

---

## Team

Built at HOTH XIII (UCLA Hackathon) — March 2026.
