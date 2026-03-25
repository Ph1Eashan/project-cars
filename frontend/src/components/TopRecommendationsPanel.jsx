import { SectionCard } from "./SectionCard";

export function TopRecommendationsPanel({ analysis, loading = false }) {
  const topRecommendations = getTopRecommendations(analysis);

  return (
    <SectionCard
      title="Top Recommendations"
      subtitle="Practical next steps distilled from the highest-impact analysis findings."
      className="h-full"
    >
      {loading && !analysis ? (
        <p className="text-sm text-dashboard-steel">Loading targeted recommendations for this project.</p>
      ) : !analysis ? (
        <p className="text-sm text-dashboard-steel">Load a project to surface the next best backend improvements.</p>
      ) : topRecommendations.length === 0 ? (
        <p className="text-sm text-dashboard-steel">
          No immediate recommendations were needed for the current top issues.
        </p>
      ) : (
        <div className="space-y-4">
          {topRecommendations.map((recommendation, index) => (
            <article
              key={`${recommendation}-${index}`}
              data-testid="recommendation-item"
              className="rounded-[24px] border border-dashboard-line/80 bg-dashboard-mist/70 p-5 shadow-soft"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dashboard-sky">
                Recommended Action
              </p>
              <p className="mt-3 text-sm leading-6 text-dashboard-steel">{recommendation}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function getTopRecommendations(analysis) {
  const topIssues = Array.isArray(analysis?.topIssues) ? analysis.topIssues : [];
  const uniqueRecommendations = [...new Set(topIssues.map((issue) => issue?.recommendation).filter(Boolean))];
  return uniqueRecommendations.slice(0, 3);
}
