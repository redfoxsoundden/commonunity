import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMFORT_TIERS, DOSHA_LABELS, CHAKRA_COLORS, parseArr } from "@/lib/utils";
import { AlertTriangle, CheckCircle, ArrowRight, BookOpen } from "lucide-react";
import type { QuestionnaireResponse } from "@shared/schema";
import RadianceCard from "@/components/RadianceCard";
import { setNexusContext } from "../components/NexusPanel";
import type { RadianceProfile } from "@shared/genekeys";

const DOSHA_COLORS: Record<string, string> = {
  vata: "#a78bfa",
  pitta: "#f97316",
  kapha: "#34d399",
  balanced: "#6ee7b7", // emerald — sattvic
};

const CONTRA_LABELS: Record<string, string> = {
  "pacemaker-caution": "Pacemaker / cardiac device — no direct body contact over chest",
  "epilepsy-seizure-caution": "Epilepsy / seizure history — avoid strong binaural or strobing patterns",
  "pregnancy-caution": "Pregnancy — avoid weighted forks on lower abdomen/sacrum in first trimester",
  "recent-surgery-caution": "Recent surgery / fracture — avoid direct contact over healing sites",
  "implanted-device-caution": "Implanted electronic device — work off-body only",
  "sound-sensitivity-caution": "Sound sensitivity / tinnitus — reduce volume; watch for distress",
  "tinnitus-caution": "Tinnitus present — avoid prolonged high-frequency tones near ears",
  "acute-trauma-caution": "Acute trauma / crisis — grounding-only protocols; no deep emotional excavation",
  "severe-mental-health-caution": "Acute mental health episode — work only with GP/therapist permission",
};

export default function QuestionnaireResult() {
  const { id } = useParams<{ id: string }>();

  const { data: result, isLoading } = useQuery<QuestionnaireResponse>({
    queryKey: ["/api/questionnaires", id],
    queryFn: () => apiRequest("GET", `/api/questionnaires/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const birthDate = (result as any)?.birthDate as string | undefined;
  const birthTime = (result as any)?.birthTime as string | undefined;

  const { data: radianceProfile } = useQuery<RadianceProfile>({
    queryKey: ["/api/radiance", birthDate, birthTime],
    queryFn: () => apiRequest("POST", "/api/radiance", { birthDate, birthTime }).then(r => r.json()),
    enabled: !!birthDate,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!result) return;
    const lines = [
      `Session Profile — ${result.clientName ?? "Client"} (${result.sessionDate ?? "today"})`,
      `Dominant dosha: ${result.dominantDosha ?? "unknown"} | Center: ${result.dominantCenter ?? "unknown"}`,
      `Protocol: ${result.recommendedProtocolId ?? "pending"} | Tier: ${result.recommendedComfortTier ?? "3"}`,
      radianceProfile ? radianceProfile.nexusSummary : "Radiance sphere: birth data not provided.",
    ];
    setNexusContext(lines.join("\n"));
    return () => setNexusContext("Sound healing practitioner tool — CommonUnity Tuner");
  }, [result, radianceProfile]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 text-center text-[var(--muted)]">
        <p>Session profile not found.</p>
        <Link href="/questionnaire">
          <Button variant="outline" className="mt-4 border-white/20">New Questionnaire</Button>
        </Link>
      </div>
    );
  }

  const flags = parseArr(result.contraindicationFlags as unknown as string);
  const dominantDosha = result.dominantDosha ?? "vata";
  const dominantCenter = result.dominantCenter ?? "emotional";
  const comfortTier = result.recommendedComfortTier ?? 3;
  const tierInfo = COMFORT_TIERS.find((t) => t.tier === comfortTier) ?? COMFORT_TIERS[2];
  const doshaColor = DOSHA_COLORS[dominantDosha] ?? "#6366f1";
  const chakraColor = CHAKRA_COLORS[result.suggestedChakraFocus ?? "CH-HEART"] ?? "#228B22";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Session Profile</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Generated for {result.clientName ?? "Client"} · {result.sessionDate ?? "Today"}
          </p>
        </div>
        <Link href={`/protocols/${result.recommendedProtocolId}`}>
          <Button className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 shrink-0" data-testid="button-view-protocol">
            View Protocol
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Contraindication flags */}
      {flags.length > 0 ? (
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-red-300 text-sm">
              {flags.length} Contraindication Flag{flags.length > 1 ? "s" : ""} — Review Before Session
            </span>
          </div>
          <ul className="space-y-2">
            {flags.map((flag) => (
              <li key={flag} className="flex items-start gap-2 text-sm text-red-200">
                <span className="text-red-400 mt-0.5">·</span>
                <span>{CONTRA_LABELS[flag] ?? flag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-200">No contraindication flags — full protocol range available</span>
        </div>
      )}

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Dosha */}
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-4 space-y-1.5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Dominant Dosha</p>
          <p className="font-bold capitalize" style={{ color: doshaColor }}>{dominantDosha}</p>
          <p className="text-xs text-[var(--muted)]">{DOSHA_LABELS[dominantDosha]?.split(" (")[1]?.replace(")", "") ?? ""}</p>
        </div>

        {/* Center */}
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-4 space-y-1.5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Dominant Center</p>
          <p className="font-bold capitalize text-white">{dominantCenter}</p>
          <p className="text-xs text-[var(--muted)]">Center focus</p>
        </div>

        {/* Chakra */}
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-4 space-y-1.5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Chakra Focus</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: chakraColor }} />
            <p className="font-bold text-white text-sm">{result.suggestedChakraFocus?.replace("CH-", "") ?? "Heart"}</p>
          </div>
        </div>

        {/* Comfort tier */}
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-4 space-y-1.5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Comfort Tier</p>
          <p className="font-bold text-[var(--primary)]">Tier {comfortTier}</p>
          <p className="text-xs text-[var(--muted)]">{tierInfo.label.replace(`Tier ${comfortTier} — `, "")}</p>
        </div>
      </div>

      {/* Tier description */}
      <div className="bg-[var(--card)] border border-white/10 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/40">
            {tierInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-[var(--muted)]">{tierInfo.desc}</p>
      </div>

      {/* Recommended protocol */}
      {result.recommendedProtocolId && (
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Recommended Protocol</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-white">{result.recommendedProtocolId}</span>
            <Link href={`/protocols/${result.recommendedProtocolId}`}>
              <Button variant="outline" size="sm" className="border-white/20 text-[var(--muted)]">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Open
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Intentions */}
      {result.intentionText && (
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-5 space-y-2">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Client Intentions</p>
          <p className="text-sm text-white leading-relaxed italic">"{result.intentionText}"</p>
        </div>
      )}

      {/* Gene Keys Radiance Sphere */}
      <RadianceCard
        birthDate={(result as any).birthDate}
        birthTime={(result as any).birthTime}
        birthPlace={(result as any).birthPlace}
        questionnaireId={result.id}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/sessions">
          <Button variant="outline" className="border-white/20 text-[var(--muted)]" data-testid="button-log-session">
            Log a Session
          </Button>
        </Link>
        <Link href="/questionnaire">
          <Button variant="outline" className="border-white/20 text-[var(--muted)]" data-testid="button-new-questionnaire">
            New Questionnaire
          </Button>
        </Link>
      </div>
    </div>
  );
}
