import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

const TOTAL_SECTIONS = 6;

const SECTION_TITLES = [
  "About you",
  "Consent",
  "Health & safety",
  "How are you today?",
  "Your intention",
  "Preferences",
];

function RadioGroup({
  name, options, value, onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === opt.value
              ? "border-[var(--primary)] bg-[var(--primary)]/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-0.5 accent-[var(--primary)]"
          />
          <span className="text-sm text-white">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckRow({
  label, checked, onChange,
}: {
  label: string;
  checked: number | boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        className="mt-0.5 accent-[var(--primary)]"
      />
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}

export default function Intake() {
  const [section, setSection] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState<Record<string, any>>({
    clientName: "",
    clientEmail: "",
    sessionDate: new Date().toISOString().slice(0, 10),
    consentGiven: 0,
    understandsLimits: 0,
    hasPacemaker: 0,
    hasEpilepsy: 0,
    recentSurgery: 0,
    soundSensitivity: 0,
    acuteCrisis: 0,
    pregnancyStatus: "no",
    implantedDevice: 0,
    priorExperience: "none",
    bodyContact: "comfortable",
    // Body feel questions (maps to dosha scoring internally)
    doshaBody: "",
    doshaMind: "",
    doshaSleep: "",
    doshaEnergy: "",
    // Where you hold things (maps to center scoring internally)
    centerDecisions: "",
    centerStress: "",
    centerNeglected: "",
    intentionText: "",
    stressAreas: "",
    vocalization: "no",
    chakraFamiliarity: "new",
    comfortNotes: "",
    _source: "intake",
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/questionnaires", data);
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => {
      toast({ title: "Something went wrong", description: "Please check your answers and try again.", variant: "destructive" });
    },
  });

  const canProceed = () => {
    if (section === 1) return form.clientName.trim().length > 0;
    if (section === 2) return Boolean(form.consentGiven) && Boolean(form.understandsLimits);
    return true;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Thank you, {form.clientName.split(" ")[0]}.</h1>
            <p className="text-[var(--muted)] text-sm leading-relaxed">
              Your responses have been received. Your practitioner will review your profile
              and prepare a personalised session for you.
            </p>
          </div>
          <div className="bg-[var(--card)] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-[var(--muted)]">
              Nothing more to do — you can close this page. See you at your session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none">
              <circle cx="16" cy="16" r="15" stroke="hsl(239,84%,67%)" strokeWidth="1.5" fill="none" opacity="0.3"/>
              <text x="16" y="22" textAnchor="middle" fontSize="18" fill="hsl(239,84%,67%)" fontFamily="serif">ॐ</text>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Pre-session intake</h1>
          <p className="text-sm text-[var(--muted)]">
            Takes about 5 minutes. Your answers help your practitioner personalise your session.
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>{SECTION_TITLES[section - 1]}</span>
            <span>Step {section} of {TOTAL_SECTIONS}</span>
          </div>
          <Progress value={(section / TOTAL_SECTIONS) * 100} className="h-1.5" />
        </div>

        {/* Section content */}
        <div className="bg-[var(--card)] border border-white/10 rounded-xl p-6 space-y-6">
          <h2 className="font-semibold text-white">{SECTION_TITLES[section - 1]}</h2>

          {/* ── Section 1: About you ── */}
          {section === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">Your name *</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="First and last name"
                  className="bg-[var(--bg)] border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">Email address (optional)</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => set("clientEmail", e.target.value)}
                  placeholder="email@example.com"
                  className="bg-[var(--bg)] border-white/20"
                />
              </div>
            </div>
          )}

          {/* ── Section 2: Consent ── */}
          {section === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Sound healing using tuning forks, singing bowls, and bells is a complementary wellness
                practice. It is not a substitute for medical diagnosis or treatment.
              </p>
              <div className="space-y-3">
                <CheckRow
                  label="I understand this is a wellness practice, not medical treatment."
                  checked={form.understandsLimits}
                  onChange={(v) => set("understandsLimits", v)}
                />
                <CheckRow
                  label="I give my consent to receive sound healing and understand I can stop at any time."
                  checked={form.consentGiven}
                  onChange={(v) => set("consentGiven", v)}
                />
              </div>
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-200">Both boxes must be checked to continue.</p>
              </div>
            </div>
          )}

          {/* ── Section 3: Health & safety ── */}
          {section === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-[var(--muted)]">
                Please answer honestly. Any "yes" won't cancel your session — it helps your practitioner
                work safely with you.
              </p>
              <div className="space-y-3">
                <CheckRow label="I have a pacemaker or implanted cardiac device" checked={form.hasPacemaker} onChange={(v) => set("hasPacemaker", v)} />
                <CheckRow label="I have epilepsy or a seizure disorder" checked={form.hasEpilepsy} onChange={(v) => set("hasEpilepsy", v)} />
                <CheckRow label="I've had surgery or a significant injury in the past 6 months" checked={form.recentSurgery} onChange={(v) => set("recentSurgery", v)} />
                <CheckRow label="I have an active implanted electronic device (cochlear implant, neurostimulator, etc.)" checked={form.implantedDevice} onChange={(v) => set("implantedDevice", v)} />
                <CheckRow label="I am currently in acute emotional crisis or severe mental distress" checked={form.acuteCrisis} onChange={(v) => set("acuteCrisis", v)} />
                <CheckRow label="I have significant tinnitus or am very sensitive to sound" checked={form.soundSensitivity} onChange={(v) => set("soundSensitivity", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">Pregnancy</Label>
                <RadioGroup
                  name="pregnancyStatus"
                  value={form.pregnancyStatus}
                  onChange={(v) => set("pregnancyStatus", v)}
                  options={[
                    { value: "no", label: "Not pregnant" },
                    { value: "first-trimester", label: "Pregnant — first trimester" },
                    { value: "yes", label: "Pregnant — second or third trimester" },
                    { value: "postpartum", label: "Postpartum (within 6 weeks)" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ── Section 4: How are you today? ── */}
          {section === 4 && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--muted)]">
                Choose the option that feels most true right now — not in general, just today.
              </p>
              {[
                {
                  key: "doshaBody",
                  question: "How does your body feel right now?",
                  options: [
                    { value: "vata-like", label: "Light, restless, cold, or scattered" },
                    { value: "pitta-like", label: "Warm, tense, sharp, or intense" },
                    { value: "kapha-like", label: "Heavy, slow, cool, or sluggish" },
                  ],
                },
                {
                  key: "doshaMind",
                  question: "How is your mind right now?",
                  options: [
                    { value: "vata-like", label: "Racing, anxious, or jumping between thoughts" },
                    { value: "pitta-like", label: "Focused but pressured, critical, or irritated" },
                    { value: "kapha-like", label: "Foggy, slow, withdrawn, or flat" },
                  ],
                },
                {
                  key: "doshaSleep",
                  question: "How has your sleep been lately?",
                  options: [
                    { value: "vata-like", label: "Light, interrupted, or not enough" },
                    { value: "pitta-like", label: "Vivid dreams, waking hot, or short and intense" },
                    { value: "kapha-like", label: "Heavy, long, or hard to wake from" },
                  ],
                },
                {
                  key: "doshaEnergy",
                  question: "How is your energy today?",
                  options: [
                    { value: "vata-like", label: "Erratic — bursts of energy then crashes" },
                    { value: "pitta-like", label: "Driven but depleted — pushing hard" },
                    { value: "kapha-like", label: "Low and hard to mobilise" },
                  ],
                },
                {
                  key: "centerDecisions",
                  question: "How do you usually make decisions?",
                  options: [
                    { value: "intellectual", label: "Think it through — analysis and logic" },
                    { value: "emotional", label: "Feel into it — what resonates or feels right" },
                    { value: "physical", label: "Act first — instinct and movement" },
                  ],
                },
                {
                  key: "centerStress",
                  question: "Where do you feel stress most in your body?",
                  options: [
                    { value: "intellectual", label: "Head, eyes, or jaw — mental tension" },
                    { value: "emotional", label: "Chest or throat — emotional tightness" },
                    { value: "physical", label: "Shoulders, belly, or legs — physical holding" },
                  ],
                },
                {
                  key: "centerNeglected",
                  question: "Which part of yourself feels most neglected right now?",
                  options: [
                    { value: "intellectual", label: "Mind — I don't give myself time to reflect" },
                    { value: "emotional", label: "Heart — I suppress or avoid feelings" },
                    { value: "physical", label: "Body — I live mostly in my head" },
                  ],
                },
              ].map(({ key, question, options }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-white text-sm">{question}</Label>
                  <RadioGroup name={key} value={form[key]} onChange={(v) => set(key, v)} options={options} />
                </div>
              ))}
            </div>
          )}

          {/* ── Section 5: Intention ── */}
          {section === 5 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">
                  What brings you to this session? What would you like to release, integrate, or open?
                </Label>
                <Textarea
                  value={form.intentionText}
                  onChange={(e) => set("intentionText", e.target.value)}
                  placeholder="Share as much or as little as you like…"
                  className="bg-[var(--bg)] border-white/20 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">
                  Are there areas of your body, emotions, or life you'd like particular attention on? (optional)
                </Label>
                <Textarea
                  value={form.stressAreas}
                  onChange={(e) => set("stressAreas", e.target.value)}
                  placeholder="Optional…"
                  className="bg-[var(--bg)] border-white/20 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* ── Section 6: Preferences ── */}
          {section === 6 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-[var(--muted)]">How comfortable are you with instruments touching your body?</Label>
                <RadioGroup
                  name="bodyContact"
                  value={form.bodyContact}
                  onChange={(v) => set("bodyContact", v)}
                  options={[
                    { value: "comfortable", label: "Comfortable — instruments can be placed directly on me" },
                    { value: "limited", label: "Gentle — close to the body but not touching" },
                    { value: "field-only", label: "Field only — please work around me without contact" },
                  ]}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[var(--muted)]">Are you open to gently toning or humming during the session?</Label>
                <RadioGroup
                  name="vocalization"
                  value={form.vocalization}
                  onChange={(v) => set("vocalization", v)}
                  options={[
                    { value: "no", label: "No — I prefer to receive in silence" },
                    { value: "maybe", label: "Maybe — guide me if it feels appropriate" },
                    { value: "yes", label: "Yes — I'm open to it" },
                  ]}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[var(--muted)]">How familiar are you with chakras and energy body work?</Label>
                <RadioGroup
                  name="chakraFamiliarity"
                  value={form.chakraFamiliarity}
                  onChange={(v) => set("chakraFamiliarity", v)}
                  options={[
                    { value: "new", label: "New to it — keep explanations simple" },
                    { value: "some", label: "Some familiarity — a basic framework is fine" },
                    { value: "experienced", label: "Experienced — I work with these systems regularly" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--muted)]">Anything else your practitioner should know?</Label>
                <Textarea
                  value={form.comfortNotes}
                  onChange={(e) => set("comfortNotes", e.target.value)}
                  placeholder="Sensitivities, preferences, boundaries…"
                  className="bg-[var(--bg)] border-white/20 min-h-[80px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setSection((s) => s - 1)}
            disabled={section === 1}
            className="border-white/20 text-[var(--muted)]"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {section < TOTAL_SECTIONS ? (
            <Button onClick={() => setSection((s) => s + 1)} disabled={!canProceed()}>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending}
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
            >
              {mutation.isPending ? "Sending…" : "Submit"}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted)] opacity-50">
          CommonUnity Tuner · Sound healing session intake
        </p>
      </div>
    </div>
  );
}
