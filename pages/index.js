import { useEffect, useMemo, useState } from "react";

const LOADING_STEPS = [
  "Searching commercial land listings",
  "Reading listing details",
  "Evaluating sites against your criteria",
  "Ranking the shortlist",
];

function parseAcres(size) {
  const match = String(size || "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}

function fitLevel(score) {
  if (score >= 75) {
    return {
      label: "Strong fit",
      stripe: "bg-emerald-500",
      bar: "bg-emerald-500",
      chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      score: "text-emerald-600",
    };
  }
  if (score >= 50) {
    return {
      label: "Moderate fit",
      stripe: "bg-amber-400",
      bar: "bg-amber-400",
      chip: "bg-amber-50 text-amber-800 ring-amber-600/20",
      score: "text-orange-500",
    };
  }
  return {
    label: "Limited fit",
    stripe: "bg-rose-500",
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-600/20",
    score: "text-rose-500",
  };
}

function Icon({ name, className = "h-4 w-4" }) {
  const paths = {
    pin: (
      <>
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    area: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M4 10h16M10 4v16" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5z" />
        <path d="m3 13 9 5 9-5" />
      </>
    ),
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Stylised site plan used in place of listing photography.
function SitePlan({ seed = 0, className = "" }) {
  const parcels = [
    "M112 30 L248 24 L250 136 L118 138 Z",
    "M98 40 L250 40 L250 136 L172 136 L172 96 L98 96 Z",
    "M140 22 L250 34 L248 136 L128 130 Z",
    "M104 28 L250 28 L250 92 L206 136 L104 136 Z",
  ];
  const d = parcels[seed % parcels.length];
  const id = `hatch-${seed}`;
  return (
    <svg viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="360" height="180" fill="var(--map)" />
      <g fill="var(--map-block)">
        <rect x="0" y="0" width="80" height="66" rx="3" />
        <rect x="0" y="78" width="80" height="62" rx="3" />
        <rect x="290" y="0" width="70" height="140" rx="3" />
      </g>
      <g fill="var(--map-tree)">
        <circle cx="34" cy="112" r="13" />
        <circle cx="322" cy="44" r="17" />
        <circle cx="54" cy="26" r="9" />
      </g>
      <path d="M0 156 H360" stroke="var(--map-road)" strokeWidth="20" />
      <path d="M272 0 V180" stroke="var(--map-road)" strokeWidth="18" />
      <path d="M0 156 H360 M272 0 V180" stroke="var(--map-block)" strokeWidth="1" strokeDasharray="6 6" />
      <path d={d} fill="var(--primary)" fillOpacity="0.18" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      <path d={d} fill={`url(#${id})`} />
    </svg>
  );
}

function Explanation({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 180;
  return (
    <div>
      <p className={`text-sm leading-relaxed text-ink-soft ${!open && long ? "line-clamp-2" : ""}`}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[13px] font-semibold text-primary-ink hover:text-primary-strong"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function ResultCard({ item, index, top }) {
  const score = clampScore(item.score);
  const fit = fitLevel(score);
  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-surface transition hover:shadow-md ${
        top ? "border-primary-muted shadow-md ring-1 ring-primary-muted" : "border-line shadow-sm"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${fit.stripe}`} />
      <div className="grid gap-4 p-4 pl-5 sm:grid-cols-[140px_minmax(0,1fr)_120px] sm:items-start">
        <div>
          <div className="relative h-28 overflow-hidden rounded-lg sm:h-24">
            <SitePlan seed={index} className="h-full w-full" />
            <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-on-accent shadow-sm">
              #{item.rank || index + 1}
            </span>
          </div>
          {item.size && (
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-ink">
              <Icon name="area" className="h-3.5 w-3.5" />
              {item.size}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {top && (
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-on-primary">
              <Icon name="spark" className="h-3.5 w-3.5" /> Top recommendation
            </div>
          )}
          <h3 className="text-[17px] font-semibold leading-snug text-ink break-words">
            {item.property || "Unnamed property"}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <Icon name="pin" className="h-3.5 w-3.5" /> Nashville, TN
            </span>
            <span className={`rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset ${fit.chip}`}>{fit.label}</span>
          </div>
          <div className="mt-2.5">
            <Explanation text={item.whyItMayFit} />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Match</div>
          <div className={`text-2xl font-bold tabular-nums ${fit.score}`}>
            {score}
            <span className="text-sm font-medium text-ink-faint">/100</span>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:mt-2">
            <div className={`h-full rounded-full ${fit.bar} transition-all duration-700`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="grid animate-pulse gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[140px_1fr_120px]">
      <div className="h-24 rounded-lg bg-muted" />
      <div className="space-y-2.5 py-1">
        <div className="h-5 w-2/3 rounded bg-line" />
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
      <div className="hidden space-y-2 py-1 sm:block">
        <div className="ml-auto h-6 w-16 rounded bg-muted" />
        <div className="h-1.5 w-full rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Home() {
  const [purpose, setPurpose] = useState("");
  const [preferences, setPreferences] = useState("");

  const [bestFits, setBestFits] = useState([]);
  const [tokenUsage, setTokenUsage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const canSearch = purpose.trim().length > 0 && preferences.trim().length > 0 && !loading;
  const sorted = useMemo(
    () => [...bestFits].sort((a, b) => clampScore(b.score) - clampScore(a.score)),
    [bestFits]
  );
  const topScore = sorted.length ? Math.max(...sorted.map((r) => clampScore(r.score))) : 0;

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const timer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [loading]);

  const findLands = async () => {
    if (!canSearch) return;

    setLoading(true);
    setError("");
    setHasSearched(true);

    setBestFits([]);
    setTokenUsage(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose,
          preferences,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Search failed");
      }

      setBestFits(data.bestFits || []);
      setTokenUsage(data.tokenUsage || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    findLands();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
  };

  return (
    <div className="flex min-h-screen flex-col text-ink">
      {/* App bar */}
      <header className="sticky top-0 z-20 [background:var(--header)] shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white shadow-sm ring-1 ring-white/30">
              <Icon name="layers" />
            </span>
            <span className="whitespace-nowrap text-[15px] font-semibold text-white">AI Land Finder</span>
            <span className="hidden h-5 w-px bg-white/30 sm:block" />
            <span className="hidden items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 sm:inline-flex">
              <Icon name="pin" className="h-3.5 w-3.5 text-accent" /> Nashville, TN
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Search panel */}
        <aside className="border-b border-line [background:var(--sidebar)] lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <form onSubmit={handleSubmit} className="flex h-full flex-col p-5 sm:p-6">
            <div>
              <h1 className="text-base font-semibold text-ink">New site search</h1>
              <p className="mt-1 text-sm text-ink-faint">
                Describe the project and the criteria that matter. Fields marked <span className="text-rose-500">*</span> are required.
              </p>
            </div>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Intended use <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                placeholder="e.g. a drive-thru coffee shop"
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Site criteria <span className="text-rose-500">*</span>
              </span>
              <textarea
                rows={5}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                onKeyDown={handleKeyDown}
                required
                placeholder="e.g. 2+ acres, corner lot, high traffic, no competitors within 2 km, commercial zoning"
                className="w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
              />
            </label>

            <div className="mt-6 lg:mt-auto lg:pt-6">
              <button
                type="submit"
                disabled={!canSearch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg [background:var(--cta)] px-5 py-3 text-[15px] font-semibold text-on-primary shadow-md shadow-primary/25 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:cursor-not-allowed disabled:[background:var(--line)] disabled:text-ink-faint disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" /> Searching…
                  </>
                ) : (
                  <>
                    <Icon name="search" /> Find sites
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-ink-faint">⌘/Ctrl + Enter to search</p>
            </div>
          </form>
        </aside>

        {/* Results */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {error && (
            <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Search failed</div>
                <div className="mt-0.5 break-words">{error}</div>
              </div>
            </div>
          )}

          {loading && (
            <div aria-live="polite">
              <div className="mb-5 rounded-xl border border-primary-muted bg-primary-soft p-4">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-primary-ink">
                  <Spinner className="h-4 w-4 text-primary" />
                  {LOADING_STEPS[loadingStep]}…
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-colors duration-500 ${i <= loadingStep ? "bg-primary" : "bg-primary-muted"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <div aria-live="polite">
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  ["Sites found", sorted.length, "text-ink"],
                  ["Best score", topScore, "text-primary-ink"],
                  ["Strong fits", sorted.filter((r) => clampScore(r.score) >= 75).length, "text-emerald-600"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="text-xs font-medium text-ink-faint">{label}</div>
                    <div className={`mt-0.5 text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
                  </div>
                ))}
              </div>

              <h2 className="mb-3 text-sm font-semibold text-ink-soft">
                Results for <span className="text-ink">{purpose.trim() || "your project"}</span>
              </h2>

              <div className="grid gap-3">
                {sorted.map((item, i) => (
                  <ResultCard key={`${item.property}-${i}`} item={item} index={i} top={i === 0} />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-2 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
                <span>Preliminary AI screen. Confirm zoning, availability and pricing with the listing broker.</span>
                {tokenUsage && (
                  <span className="tabular-nums" title={`Input ${tokenUsage.inputTokens} · Output ${tokenUsage.outputTokens}`}>
                    {tokenUsage.totalTokens} tokens · ${tokenUsage.approxCostUSD}
                  </span>
                )}
              </div>
            </div>
          )}

          {!loading && hasSearched && !error && sorted.length === 0 && (
            <EmptyState
              title="No matching sites found"
              body="Try relaxing one or two criteria, such as the minimum lot size or competitor distance."
            />
          )}

          {!loading && !hasSearched && (
            <EmptyState
              title="No search yet"
              body="Fill in the intended use and site criteria, then select Find sites. Ranked results will appear here."
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-primary-muted bg-surface/80 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl [background:var(--cta)] text-on-primary shadow-md shadow-primary/25">
        <Icon name="search" className="h-6 w-6" />
      </div>
      <div className="mt-4 text-base font-semibold text-ink">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-ink-faint">{body}</p>
    </div>
  );
}
