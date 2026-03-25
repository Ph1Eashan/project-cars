import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";

const COMPONENT_LABELS = {
  engine: "Engine",
  turbo: "Turbo",
  brakes: "Brakes",
  transmission: "Transmission",
  suspension: "Suspension",
  security: "Security"
};

export function CarStatusPanel({ carView }) {
  const car = carView?.car;

  return (
    <SectionCard
      title="Car Mapping"
      subtitle="Backend health translated into car component states."
      className="h-full"
    >
      {!car ? (
        <p className="text-sm text-dashboard-steel">
          Car status will appear here after the analysis report loads.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(car).map(([component, state]) => (
            <article
              key={component}
              data-testid={`car-component-${component}`}
              className={`rounded-[24px] border p-5 shadow-soft ${getComponentCardTone(state.status)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dashboard-steel">
                    Component
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-dashboard-ink">
                    {COMPONENT_LABELS[component] || component}
                  </h3>
                </div>
                <StatusPill status={state.status} />
              </div>
              <div className="mt-4 min-h-16 space-y-2">
                {Array.isArray(state.reasons) && state.reasons.length > 0 ? (
                  state.reasons.map((reason) => (
                    <div
                      key={`${component}-${reason.rule}`}
                      className="rounded-2xl border border-white/80 bg-white px-3 py-3"
                    >
                      <p className="text-sm font-medium text-dashboard-ink">{reason.rule}</p>
                      <p className="mt-1 text-sm leading-6 text-dashboard-steel">{reason.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-dashboard-steel">
                    {state.status === "healthy"
                      ? "No failing rules are mapped to this component."
                      : "No mapped rules were available for this component."}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function getComponentCardTone(status) {
  if (status === "healthy") {
    return "border-green-100 bg-green-50/70";
  }

  if (status === "weak") {
    return "border-amber-100 bg-amber-50/80";
  }

  if (status === "broken") {
    return "border-red-100 bg-red-50/80";
  }

  return "border-slate-200 bg-slate-50/80";
}
