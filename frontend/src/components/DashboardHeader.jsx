import { DEFAULT_API_BASE_URL } from "../lib/api";

export function DashboardHeader({
  inputValue,
  onInputChange,
  onSubmit,
  loading,
  analyzingRepository = false
}) {
  return (
    <header className="overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-panel backdrop-blur">
      <div className="border-b border-dashboard-line/70 px-6 py-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-dashboard-sky/80">
              Project Cars
            </p>
            <p className="mt-2 text-sm text-dashboard-steel">
              Modern backend observability in one clean control surface.
            </p>
          </div>
          <div className="rounded-full border border-dashboard-line bg-dashboard-soft px-4 py-2 text-xs font-medium text-dashboard-steel">
            Backend API: <span className="text-dashboard-ink">{DEFAULT_API_BASE_URL}</span>
          </div>
        </div>
      </div>
      <div className="grid gap-8 px-6 py-8 md:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-dashboard-navy md:text-5xl">
            Backend Intelligence Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-dashboard-steel">
            Inspect analysis score, car component health, and the top backend risks from your
            Project Cars APIs in a compact, decision-ready workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-dashboard-steel">
            <span className="rounded-full border border-dashboard-line bg-white px-3 py-2 shadow-soft">
              Rule-based backend analysis
            </span>
            <span className="rounded-full border border-dashboard-line bg-white px-3 py-2 shadow-soft">
              Car component visualization
            </span>
            <span className="rounded-full border border-dashboard-line bg-white px-3 py-2 shadow-soft">
              Frontend-ready API outputs
            </span>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-[28px] border border-dashboard-line/80 bg-dashboard-mist/80 p-5 shadow-soft"
        >
          <div>
            <p className="text-sm font-semibold text-dashboard-ink">Load Project</p>
            <p className="mt-1 text-sm leading-6 text-dashboard-steel">
              Paste a GitHub repository URL to analyze it instantly, or enter an existing project ID
              to load saved backend intelligence.
            </p>
          </div>
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dashboard-steel">
              Repository URL or Project ID
            </span>
            <input
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              data-testid="project-id-input"
              className="h-12 rounded-2xl border border-dashboard-line bg-white px-4 text-sm text-dashboard-ink outline-none transition focus:border-dashboard-sky focus:ring-4 focus:ring-blue-100"
              placeholder="https://github.com/org/repo or an analyzed project ID"
            />
          </label>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-dashboard-steel">
              Dashboard syncs analysis, rules, car mapping, and recommendations.
            </p>
            <button
              type="submit"
              disabled={loading}
              data-testid="load-dashboard-button"
              className="h-12 rounded-2xl bg-dashboard-navy px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzingRepository ? "Analyzing repository..." : loading ? "Loading..." : "Load Dashboard"}
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
