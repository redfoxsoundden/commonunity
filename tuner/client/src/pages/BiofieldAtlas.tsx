import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { parseArr } from "@/lib/utils";
import type { BiofieldZone } from "@shared/schema";

const ZONE_COLORS: Record<string, string> = {
  ROOT:    "#CC0000",
  SACRAL:  "#FF8C00",
  SOLAR:   "#FFD700",
  HEART:   "#228B22",
  THROAT:  "#1E90FF",
  "3RD":   "#8b5cf6",
  CROWN:   "#9b59b6",
  SUN:     "#f59e0b",
  EARTH:   "#6b7280",
  ANCESTRAL: "#14b8a6",
};

const SIDE_LABELS: Record<string, { label: string; color: string }> = {
  left:   { label: "Left — Feminine", color: "#ec4899" },
  right:  { label: "Right — Masculine", color: "#6366f1" },
  front:  { label: "Front", color: "#14b8a6" },
  back:   { label: "Back (Receiving)", color: "#f59e0b" },
  center: { label: "Central / Vertical", color: "#a78bfa" },
};

const LEVEL_ORDER = ["SUN-STAR","EARTH-STAR","ANCESTRAL","CROWN","3RD-EYE","THROAT","HEART","SOLAR","SACRAL","ROOT"];
const LEVEL_LABELS: Record<string, string> = {
  "SUN-STAR":   "Sun Star",
  "EARTH-STAR": "Earth Star",
  "ANCESTRAL":  "Ancestral Rivers",
  "CROWN":      "Crown",
  "3RD-EYE":    "Third Eye",
  "THROAT":     "Throat",
  "HEART":      "Heart",
  "SOLAR":      "Solar Plexus",
  "SACRAL":     "Sacral",
  "ROOT":       "Root",
};

function getZoneLevel(id: string): string {
  if (id.includes("SUN-STAR") || id.includes("CROWN-ABOVE")) return "CROWN";
  if (id.includes("EARTH-STAR")) return "EARTH-STAR";
  if (id.includes("ANCESTRAL")) return "ANCESTRAL";
  if (id.includes("3RD")) return "3RD-EYE";
  for (const lvl of ["THROAT","HEART","SOLAR","SACRAL","ROOT"]) {
    if (id.includes(lvl)) return lvl;
  }
  return "OTHER";
}

function getZoneColor(id: string) {
  for (const [k, v] of Object.entries(ZONE_COLORS)) {
    if (id.includes(k)) return v;
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

      {/* Polarity key */}
      <div className="bg-[var(--card)] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">Field Polarity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(SIDE_LABELS).map(([side, { label, color }]) => (
            <div key={side} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zones grouped by level */}
      {LEVEL_ORDER.map((lvl) => {
        const lvlZones = zones.filter((z) => getZoneLevel(z.id ?? "") === lvl);
        if (lvlZones.length === 0) return null;
        return (
          <div key={lvl} className="space-y-3">
            <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
              {LEVEL_LABELS[lvl] ?? lvl}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lvlZones.map((zone) => {
                const instruments = parseArr(zone.suggestedForks as unknown as string);
                const themes = parseArr(zone.themes as unknown as string);
                const color = getZoneColor(zone.id ?? "");
                const sideInfo = SIDE_LABELS[zone.fieldSide ?? ""] ?? { label: zone.fieldSide, color: "#6366f1" };

                return (
                  <div
                    key={zone.id}
                    className="bg-[var(--card)] border border-white/10 rounded-xl overflow-hidden"
                    data-testid={`card-zone-${zone.id}`}
                  >
                    <div className="h-1" style={{ background: color }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white text-sm">{zone.label}</h3>
                          <p className="text-xs text-[var(--muted)] mt-0.5">{zone.location}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                          style={{ borderColor: sideInfo.color, color: sideInfo.color }}
                        >
                          {sideInfo.label}
                        </Badge>
                      </div>

                      {themes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">Themes</p>
                          <div className="flex flex-wrap gap-1">
                            {themes.map((t) => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--muted)]">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {zone.techniqueLocate && (
                        <div className="grid grid-cols-1 gap-1.5 text-xs text-[var(--muted)]">
                          <div><span className="text-white/50">Locate: </span>{zone.techniqueLocate}</div>
                          {zone.techniqueListen && <div><span className="text-white/50">Listen: </span>{zone.techniqueListen}</div>}
                          {zone.techniqueTreat && <div><span className="text-white/50">Treat: </span>{zone.techniqueTreat}</div>}
                        </div>
                      )}

                      {instruments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {instruments.map((id) => (
                            <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] font-mono">
                              {id}
                            </span>
                          ))}
                        </div>
                      )}

                      {zone.sourceAttribution && (
                        <p className="text-[10px] text-[var(--muted)] italic pt-1 border-t border-white/5">{zone.sourceAttribution}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
