import { SectionCard } from "./SectionCard";

export function WorstRoutesPanel({ analysis, loading = false }) {
  const worstRoutes = Array.isArray(analysis?.worstRoutes) ? analysis.worstRoutes : [];

  return (
    <SectionCard
      title="Worst Routes"
      subtitle="Routes carrying the heaviest combined database and blocking-operation pressure."
      className="h-full"
    >
      {loading && !analysis ? (
        <p className="text-sm text-dashboard-steel">Loading route-level load hotspots for this project.</p>
      ) : !analysis ? (
        <p className="text-sm text-dashboard-steel">Load a project to surface the heaviest routes.</p>
      ) : worstRoutes.length === 0 ? (
        <p className="text-sm text-dashboard-steel">
          No route-level hotspots were identified in the latest analysis.
        </p>
      ) : (
        <div className="space-y-4">
          {worstRoutes.map((route, index) => {
            const loadScore = (route.dbCallCount || 0) + (route.bottleneckCount || 0);

            return (
              <article
                key={`${route.path}-${index}`}
                data-testid="worst-route-item"
                className="rounded-[24px] border border-dashboard-line/80 bg-dashboard-mist/70 p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dashboard-steel">
                      Route Load
                    </p>
                    <h3 className="mt-2 break-all text-base font-semibold text-dashboard-ink">{route.path}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${getLoadTone(loadScore)}`}
                  >
                    Load {loadScore}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="DB Calls" value={route.dbCallCount} />
                  <Metric label="Bottlenecks" value={route.bottleneckCount} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-dashboard-line/70 bg-white px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-dashboard-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dashboard-ink">{value ?? 0}</p>
    </div>
  );
}

function getLoadTone(loadScore) {
  if (loadScore >= 5) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (loadScore >= 2) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}
