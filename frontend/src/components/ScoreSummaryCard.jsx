import { SectionCard } from "./SectionCard";

export function ScoreSummaryCard({ analysis, loading = false }) {
  if (loading && !analysis) {
    return (
      <SectionCard
        title="Analysis Overview"
        subtitle="Score and narrative summary generated from backend analysis rules."
      >
        <p className="text-sm text-dashboard-steel">Loading analysis results for the selected project.</p>
      </SectionCard>
    );
  }

  if (!analysis) {
    return (
      <SectionCard
        title="Analysis Overview"
        subtitle="Connect a project to view the latest backend intelligence."
      >
        <p className="text-sm text-dashboard-steel">
          Enter a project ID to load score, summary, and top rule insights.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Analysis Overview"
      subtitle="Score and narrative summary generated from backend analysis rules."
    >
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <div className="rounded-[28px] border border-dashboard-line/80 bg-dashboard-navy px-6 py-7 text-white shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Health Score</p>
          <p data-testid="analysis-score" className="mt-3 text-6xl font-semibold tracking-[-0.05em]">
            {analysis.score ?? "--"}
          </p>
          <p
            data-testid="system-classification"
            className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white"
          >
            {analysis.systemClassification || "System classification unavailable"}
          </p>
          <div className="mt-4">
            <ConfidenceBadge confidence={analysis.analysisConfidence} />
          </div>
          <p className="mt-3 text-sm leading-6 text-white/75">
            A composite score across security, performance, scalability, and reliability.
          </p>
        </div>
        <div className="grid gap-4">
          <p data-testid="analysis-summary" className="text-base leading-7 text-dashboard-steel">
            {analysis.summary || "No narrative summary is available for this analysis yet."}
          </p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label="Security" value={analysis.security} />
            <Metric label="Performance" value={analysis.performance} />
            <Metric label="Scalability" value={analysis.scalability} />
            <Metric label="Reliability" value={analysis.reliability} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function ConfidenceBadge({ confidence }) {
  const normalizedConfidence = typeof confidence === "string" ? confidence.toLowerCase() : "low";
  const toneClass =
    normalizedConfidence === "high"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalizedConfidence === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      data-testid="analysis-confidence"
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}
    >
      Confidence: {normalizedConfidence}
    </span>
  );
}

function Metric({ label, value }) {
  const numericValue = typeof value === "number" ? value : null;
  const toneClass =
    numericValue === null
      ? "text-dashboard-missing"
      : numericValue >= 85
        ? "text-dashboard-healthy"
        : numericValue >= 65
          ? "text-dashboard-weak"
          : "text-dashboard-broken";

  return (
    <div className="rounded-2xl border border-dashboard-line/70 bg-dashboard-mist px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-dashboard-steel">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value ?? "--"}</p>
    </div>
  );
}
