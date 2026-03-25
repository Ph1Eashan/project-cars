import { useMemo, useState } from "react";

import { CarStatusPanel } from "./components/CarStatusPanel";
import { DashboardHeader } from "./components/DashboardHeader";
import { ScoreSummaryCard } from "./components/ScoreSummaryCard";
import { TopRecommendationsPanel } from "./components/TopRecommendationsPanel";
import { TopIssuesPanel } from "./components/TopIssuesPanel";
import { useDashboardData } from "./hooks/useDashboardData";
import { analyzeRepository } from "./lib/api";

const DEFAULT_PROJECT_ID = import.meta.env.VITE_PROJECT_ID || "";

export default function App() {
  const [inputValue, setInputValue] = useState(DEFAULT_PROJECT_ID);
  const [activeProjectId, setActiveProjectId] = useState(DEFAULT_PROJECT_ID);
  const [submissionError, setSubmissionError] = useState("");
  const [analyzingRepository, setAnalyzingRepository] = useState(false);
  const { analysis, carView, rules, loading, error } = useDashboardData(activeProjectId);

  const dashboardReady = useMemo(() => Boolean(analysis && carView), [analysis, carView]);
  const busy = loading || analyzingRepository;

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedInput = inputValue.trim();
    if (!normalizedInput) {
      setSubmissionError("Enter a GitHub repository URL or an analyzed project ID.");
      setActiveProjectId("");
      return;
    }

    setSubmissionError("");

    if (normalizedInput.startsWith("http")) {
      setAnalyzingRepository(true);

      try {
        const result = await analyzeRepository(normalizedInput);
        const projectId = result?.projectId || "";
        setActiveProjectId(projectId);
        setInputValue(projectId || normalizedInput);
      } catch (submitError) {
        setSubmissionError(submitError.message || "Failed to analyze the repository.");
        setActiveProjectId("");
      } finally {
        setAnalyzingRepository(false);
      }

      return;
    }

    setActiveProjectId(normalizedInput);
  }

  return (
    <main className="min-h-screen bg-atmosphere px-4 py-6 text-dashboard-ink md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          loading={busy}
          analyzingRepository={analyzingRepository}
        />

        {submissionError || error ? (
          <div
            data-testid="dashboard-error"
            className="rounded-[24px] border border-red-200 bg-red-50/95 px-5 py-4 text-sm leading-6 text-red-700 shadow-soft"
          >
            {submissionError || error}
          </div>
        ) : null}

        {analyzingRepository ? (
          <div className="rounded-[24px] border border-blue-200 bg-blue-50/95 px-5 py-4 text-sm leading-6 text-blue-700 shadow-soft">
            Analyzing repository...
          </div>
        ) : null}

        <ScoreSummaryCard analysis={analysis} loading={busy} />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <CarStatusPanel carView={carView} />
          <div className="grid gap-6">
            <TopIssuesPanel analysis={analysis} rules={rules} loading={busy} />
            <TopRecommendationsPanel analysis={analysis} loading={busy} />
          </div>
        </section>

        {!dashboardReady && !busy ? (
          <div className="rounded-[24px] border border-dashboard-line/80 bg-white/85 px-5 py-4 text-sm leading-6 text-dashboard-steel shadow-soft">
            Load the dashboard with either a GitHub repository URL or a valid analyzed project ID.
          </div>
        ) : null}
      </div>
    </main>
  );
}
