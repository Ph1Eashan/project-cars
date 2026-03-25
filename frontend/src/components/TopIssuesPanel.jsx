import { SectionCard } from "./SectionCard";

export function TopIssuesPanel({ analysis, rules, loading = false }) {
  const issueCount = rules
    ? Object.values(rules).reduce(
        (total, categoryRules) => total + (Array.isArray(categoryRules) ? categoryRules.length : 0),
        0
      )
    : 0;
  const topIssues = Array.isArray(analysis?.topIssues) ? analysis.topIssues : [];

  return (
    <SectionCard
      title="Top Issues"
      subtitle={`Showing the top backend concerns. Active rules loaded: ${issueCount}.`}
      className="h-full"
    >
      {loading && !analysis ? (
        <p className="text-sm text-dashboard-steel">
          Loading the highest-impact failed rules for this project.
        </p>
      ) : !analysis ? (
        <p className="text-sm text-dashboard-steel">
          Load a project to see the highest-impact failed rules.
        </p>
      ) : topIssues.length === 0 ? (
        <p className="text-sm text-dashboard-steel">
          No critical issues surfaced in the latest backend analysis.
        </p>
      ) : (
        <div className="space-y-4">
          {topIssues.map((issue, index) => (
            <article
              key={`${issue.rule}-${index}`}
              data-testid="top-issue-item"
              className="rounded-[24px] border border-dashboard-line/80 bg-dashboard-mist/70 p-5 shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dashboard-broken">
                    Priority Issue
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-dashboard-ink">{issue.rule}</h3>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${getSeverityTone(issue.severity)}`}>
                    {issue.severity || "unknown"}
                  </span>
                  <span className="rounded-full border border-dashboard-broken/20 bg-dashboard-broken/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-dashboard-broken">
                    Impact {issue.impact}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-dashboard-steel">{issue.message}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function getSeverityTone(severity) {
  if (severity === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}
