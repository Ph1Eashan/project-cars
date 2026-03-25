export function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-panel backdrop-blur ${className}`}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-dashboard-sky/80">
            Dashboard Section
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-dashboard-ink">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-dashboard-steel">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
