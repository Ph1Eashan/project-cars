const STATUS_STYLES = {
  healthy: "border-dashboard-healthy/20 bg-dashboard-healthy/10 text-dashboard-healthy",
  weak: "border-dashboard-weak/20 bg-dashboard-weak/10 text-dashboard-weak",
  broken: "border-dashboard-broken/20 bg-dashboard-broken/10 text-dashboard-broken",
  missing: "border-dashboard-missing/20 bg-dashboard-missing/10 text-dashboard-missing"
};

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        STATUS_STYLES[status] || STATUS_STYLES.missing
      }`}
    >
      {status}
    </span>
  );
}
