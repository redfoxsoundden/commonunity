import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { parseArr } from "@/lib/utils";
import type { BiofieldZone } from "@shared/schema";

const LAYER_COLORS: Record<string, string> = {
  etheric: "#6366f1",
  emotional: "#ec4899",
  mental: "#f59e0b",
  astral: "#14b8a6",
  causal: "#8b5cf6",
  celestial: "#06b6d4",
};

const ZONE_COLORS: Record<string, string> = {
  "bf-head": "#8b5cf6",
  "bf-throat": "#1E90FF",
  "bf-chest": "#228B22",
  "bf-abdomen": "#FFD700",
  "bf-pelvis": "#FF8C00",
  "bf-legs": "#CC0000",
};

function getZoneColor(id: string) {
  const key = id.toLowerCase();
  for (const [k, v] of Object.entries(ZONE_COLORS)) {
    if (key.includes(k.replace("bf-", ""))) return v;
  }
  return "#6366f1";
}

export default function BiofieldAtlas() {
  const { data: zones = [], isLoading } = useQuery<BiofieldZone[]>({
    queryKey: ["/api/biofield-zones"],
    queryFn: () => apiRequest("GET", "/api/biofield-zones").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white">Biofield Atlas</h1>
        <p className="text-sm text-[var(--muted)]">
          The human biofield extends 1–3 cm to several metres from the physical body. Each zone carries
          distinct energetic, emotional, and mental resonance. Sound healing instruments are applied to
          specific zones to support coherent field organisation.
        </p>
      </div>

      {/* Auric Layer Key */}
      <div className="bg-[var(--card)] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">Auric Layers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(LAYER_COLORS).map(([layer, color]) => (
            <div key={layer} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-sm text-white capitalize">{layer}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {zones.map((zone) => {
          const instruments = parseArr(zone.suggestedForks as unknown as string);
          const themes = parseArr(zone.themes as unknown as string);
          const physicalCorrelates = parseArr(zone.physicalCorrelates as unknown as string);
          const color = getZoneColor(zone.id ?? "");

          return (
            <div
              key={zone.id}
              className="bg-[var(--card)] border border-white/10 rounded-xl overflow-hidden"
              data-testid={`card-zone-${zone.id}`}
            >
              {/* Color strip */}
              <div className="h-1.5" style={{ background: color }} />
              <div className="p-5 space-y-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{zone.label}</h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{zone.location}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 capitalize" style={{ borderColor: color, color }}>
                    {zone.fieldSide}
                  </Badge>
                </div>

                {/* Themes */}
                {themes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {themes.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--muted)]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Physical correlates */}
                {physicalCorrelates.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Physical Correlates</p>
                    <p className="text-xs text-[var(--muted)]">{physicalCorrelates.join(", ")}</p>
                  </div>
                )}

                {/* Technique */}
                {zone.techniqueLocate && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">Locate Technique</p>
                    <p className="text-xs text-[var(--muted)]">{zone.techniqueLocate}</p>
                  </div>
                )}

                {/* Instruments */}
                {instruments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Suggested Forks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {instruments.map((id) => (
                        <span key={id} className="text-xs px-2 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] font-mono">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source */}
                {zone.sourceAttribution && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-[var(--muted)] italic">{zone.sourceAttribution}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modesty note */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
        <p className="text-sm text-amber-200">
          <span className="font-semibold">Modesty principle:</span> Every biofield zone can be worked
          off-body (hovering 5–30 cm above the surface) or via surrogate. Default to field work for
          new clients or where direct contact is contraindicated.
        </p>
      </div>
    </div>
  );
}
