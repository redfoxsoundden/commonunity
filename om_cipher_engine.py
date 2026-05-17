"""
Om Cipher v1 — canonical Compass-sealed identity engine (Python side).

Pure, deterministic, no external dependencies beyond `hashlib`. Mirrors the
JS engine in `sdk/om_cipher.js`. Stand-alone module: importable and
independently testable; never imports back into existing generation paths.

Reference: docs/product/om-cipher-v1-implementation-plan.md

Canonical derivation (engine-first):
  Layer 1  Life Path = reduce(day) + reduce(month) + reduce(year), then
           reduce preserving master numbers 11/22/33. Expression /
           Soul Urge / Personality from Pythagorean gematria of
           legal_name (reduced to single digit; master preservation
           applies to Life Path only).
  Layer 2  Temporal — lunar phase (synodic approx; baseline 2000-01-06,
           29.53059), solar quarter by month (0 winter Dec–Feb,
           1 spring Mar–May, 2 summer Jun–Aug, 3 autumn Sep–Nov),
           temporal gate hour//2 (null if no birth_time).
  Layer 3  Gene Keys gate/line read from sealed Compass input. V1
           does not compute Gene Keys internally; pre-resolved
           activation lines are surfaced from a static 4x6 table.
  Layer 4  Canonical seed string
           `LP:..|EX:..|SU:..|PE:..|LUN:..|SOL:..|TG:..`
           (TG omitted when birth_time is null). SHA-256 of that
           string is the 64-char om_cipher_seed.
  Layer 5  Sigil scaffold: 11 points if birth_time, else 9.
  Layer 6  Palette — primary hue from Life Path (22→72, 11→36,
           33→108; else lp × 40 mod 360); lunar phase modulates
           saturation; secondary hue is the complement.

Bhramari:
  - Optional measured input. Missing baseline never blocks generation.
  - Sealed alongside identity, but excluded from the canonical seed so
    identical identity records hash identically regardless of whether
    the member hummed.
  - Subsequent captures are append-only refinement events (see
    `append_resonance_event`); they never alter seed or input_hash.

Privacy:
  - `generate()` returns the *internal* record (full sealed inputs +
    metadata). Always pass through `to_public_projection()` before
    surfacing on cOMmons / Field.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Optional


# ── Feature flags ────────────────────────────────────────────────────────

def is_enabled(override: Optional[bool] = None) -> bool:
    if override is True or override is False:
        return override
    val = os.environ.get("OM_CIPHER_ENABLED", "").lower()
    return val in ("1", "true", "yes", "on")


def is_bhramari_enabled(override: Optional[bool] = None) -> bool:
    if override is True or override is False:
        return override
    val = os.environ.get("BHRAMARI_CAPTURE_ENABLED", "").lower()
    return val in ("1", "true", "yes", "on")


# ── Reductions ──────────────────────────────────────────────────────────

def _digital_root_keep_master(n: int) -> int:
    x = abs(int(n or 0))
    while x > 9 and x not in (11, 22, 33):
        x = sum(int(d) for d in str(x))
    return x


def _digital_root(n: int) -> int:
    x = abs(int(n or 0))
    while x >= 10:
        x = sum(int(d) for d in str(x))
    return x


def birth_root(iso_date: Optional[str]) -> Optional[dict]:
    """Pure digit-sum reduction of the ISO date (master-preserving).

    Retained for compatibility. Not the canonical Life Path — see
    `life_path()` for the v1 reduction.
    """
    if not iso_date:
        return None
    digits = re.sub(r"\D", "", str(iso_date))
    if not digits:
        return None
    raw = sum(int(d) for d in digits)
    return {"raw": raw, "reduced": _digital_root_keep_master(raw)}


def life_path(iso_date: Optional[str]) -> Optional[dict]:
    """Canonical Life Path: reduce day, month, year individually (keeping
    masters), sum, then reduce once more (keeping masters)."""
    if not iso_date:
        return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", str(iso_date))
    if not m:
        return None
    year = int(m[1])
    month = int(m[2])
    day = int(m[3])
    r_day = _digital_root_keep_master(day)
    r_month = _digital_root_keep_master(month)
    r_year = _digital_root_keep_master(year)
    raw = r_day + r_month + r_year
    return {
        "day": r_day,
        "month": r_month,
        "year": r_year,
        "raw": raw,
        "reduced": _digital_root_keep_master(raw),
    }


# ── Gematria ────────────────────────────────────────────────────────────

_PYTHAGOREAN = {chr(ord("A") + i): ((i % 9) + 1) for i in range(26)}
_VOWELS = set("AEIOU")


def _normalise_name(name: str) -> str:
    s = unicodedata.normalize("NFC", str(name or "")).upper()
    return re.sub(r"[^A-Z]", "", s)


def _gematria_sum(name: str, vowels_only: Optional[bool] = None) -> Optional[dict]:
    cleaned = _normalise_name(name)
    if not cleaned:
        return None
    total = 0
    for ch in cleaned:
        if vowels_only is True and ch not in _VOWELS:
            continue
        if vowels_only is False and ch in _VOWELS:
            continue
        total += _PYTHAGOREAN.get(ch, 0)
    if total == 0:
        return None
    # Expression/SU/PE always reduce to a single digit — master numbers
    # are preserved only for Life Path.
    return {"raw": total, "reduced": _digital_root(total)}


def name_resonance(legal_name: Optional[str]) -> Optional[dict]:
    if not legal_name:
        return None
    return {
        "expression":  _gematria_sum(legal_name),
        "soul_urge":   _gematria_sum(legal_name, vowels_only=True),
        "personality": _gematria_sum(legal_name, vowels_only=False),
    }


# ── Gene Keys / I Ching ─────────────────────────────────────────────────

_GK_LINE_NAMES = {
    "work":  {1:"Creator",2:"Dancer",3:"Changer",4:"Server",5:"Fixer",6:"Teacher"},
    "lens":  {1:"Solitude",2:"Marriage",3:"Interaction",4:"Friendship",5:"Impact",6:"Nurture"},
    "field": {1:"Self & Empowerment",2:"Passion & Relationships",3:"Energy & Experience",
              4:"Love & Community",5:"Power & Projection",6:"Education & Surrender"},
    "call":  {1:"Physicality",2:"Posture",3:"Movement",4:"Breath",5:"Voice",6:"Intent"},
}


def _parse_gate(raw_num: Any, raw_line: Any) -> Optional[dict]:
    try:
        num = int(re.sub(r"[^\d]", "", str(raw_num or "")))
    except ValueError:
        return None
    if not (1 <= num <= 64):
        return None
    try:
        line = int(re.sub(r"[^\d]", "", str(raw_line or "")))
    except ValueError:
        line = None
    if line is not None and not (1 <= line <= 6):
        line = None
    return {"gate": num, "line": line}


def gk_layer(compass: Optional[dict]) -> Optional[dict]:
    if not compass:
        return None
    out = {}
    for slot in ("work", "lens", "field", "call"):
        p = compass.get(slot)
        if not p:
            continue
        g = _parse_gate(p.get("gk_num"), p.get("gk_line"))
        if not g:
            continue
        out[slot] = {
            "gate": g["gate"],
            "line": g["line"],
            "label": _GK_LINE_NAMES[slot].get(g["line"]) if g["line"] else None,
        }
    return out or None


# ── Temporal resonance ──────────────────────────────────────────────────

def _solar_quarter(mo: int) -> int:
    if mo in (12, 1, 2):
        return 0
    if 3 <= mo <= 5:
        return 1
    if 6 <= mo <= 8:
        return 2
    return 3


def _lunar_phase(y: int, mo: int, d: int) -> int:
    if mo <= 2:
        Y, M = y - 1, mo + 12
    else:
        Y, M = y, mo
    A = Y // 100
    B = 2 - A + (A // 4)
    JD = int(365.25 * (Y + 4716)) + int(30.6001 * (M + 1)) + d + B - 1524.5
    synodic = 29.53059
    ref_jd = 2451550.1  # 2000-01-06
    phase = ((JD - ref_jd) % synodic + synodic) % synodic
    return int((phase / synodic) * 8) % 8


def temporal_layer(iso_date: Optional[str], hhmm: Optional[str]) -> Optional[dict]:
    if not iso_date:
        return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", str(iso_date))
    if not m:
        return None
    y, mo, d = int(m[1]), int(m[2]), int(m[3])
    try:
        dt = datetime(y, mo, d, tzinfo=timezone.utc)
    except ValueError:
        return None
    # Align dow to JS Sun=0 convention.
    dow = (dt.weekday() + 1) % 7
    temporal_gate = None
    if hhmm:
        t = re.match(r"^(\d{1,2}):(\d{2})", str(hhmm))
        if t:
            hh = max(0, min(23, int(t[1])))
            temporal_gate = hh // 2
    return {
        "day_of_week": dow,
        "solar_quarter": _solar_quarter(mo),
        "lunar_phase": _lunar_phase(y, mo, d),
        "temporal_gate": temporal_gate,
    }


# ── Bhramari helpers ────────────────────────────────────────────────────

_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]


def hz_to_semitone(hz: Optional[float]) -> Optional[dict]:
    if not hz or hz <= 0:
        return None
    midi = 69 + 12 * math.log2(hz / 440)
    rounded = round(midi)
    return {
        "note": _NOTES[((rounded % 12) + 12) % 12],
        "octave": (rounded // 12) - 1,
        "midi": rounded,
    }


def hz_to_visible_hue_deg(hz: Optional[float]) -> Optional[int]:
    if not hz or hz <= 0:
        return None
    f = hz
    while f < 440:
        f *= 2
    while f >= 880:
        f /= 2
    return round((f - 440) / (880 - 440) * 360) % 360


def round_hz(hz: Optional[float]) -> Optional[float]:
    if not hz or hz <= 0:
        return None
    return round(hz * 10) / 10


# ── Palette ─────────────────────────────────────────────────────────────

_MASTER_HUES = {11: 36, 22: 72, 33: 108}


def life_path_hue(lp: Optional[int]) -> int:
    if lp is None:
        return 0
    if lp in _MASTER_HUES:
        return _MASTER_HUES[lp]
    return (lp * 40) % 360


def _build_palette(lp: Optional[int],
                   lunar_phase: Optional[int],
                   primary_gate: Optional[int],
                   bhramari_hue_deg: Optional[int]) -> dict:
    base_hue = life_path_hue(lp)
    lunar = lunar_phase if isinstance(lunar_phase, int) else 0
    sat_mod = ((lunar - 3.5) / 3.5) * 0.15
    sat = max(0.25, min(0.85, 0.55 + sat_mod))
    lit = 0.5
    primary = f"oklch({lit:.2f} {sat:.2f} {base_hue})"
    secondary = f"oklch({lit:.2f} {sat:.2f} {(base_hue + 180) % 360})"
    gate_offset = (primary_gate * 7) % 360 if primary_gate else 30
    accent = f"oklch({lit:.2f} {(sat * 0.9):.2f} {(base_hue + gate_offset) % 360})"
    out = {
        "primary_hue": base_hue,
        "secondary_hue": (base_hue + 180) % 360,
        "palette": [primary, secondary, accent],
    }
    if isinstance(bhramari_hue_deg, int):
        blended = round(base_hue * 0.9 + bhramari_hue_deg * 0.1) % 360
        out["palette_resonance_accent"] = f"oklch({lit:.2f} {sat:.2f} {blended})"
    return out


# ── Canonical seed string + SHA-256 ────────────────────────────────────

_CANONICAL_SEED_ORDER = ["LP", "EX", "SU", "PE", "LUN", "SOL", "TG", "BHR"]


def _canonical(parts: dict) -> str:
    return "|".join(f"{k}:{parts[k]}" for k in _CANONICAL_SEED_ORDER if parts.get(k) is not None)


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# Stable JSON of identity inputs for input_hash.
def _canonical_input_json(payload: dict) -> str:
    bp = payload.get("birth_place") or {}
    obj = {
        "birth_date": payload.get("birth_date") or None,
        "birth_time": payload.get("birth_time") or None,
        "birth_place": {
            "lat": float(bp.get("lat")) if bp.get("lat") is not None else None,
            "lng": float(bp.get("lng")) if bp.get("lng") is not None else None,
            "city": bp.get("city") or None,
            "country": bp.get("country") or None,
        } if bp else None,
        "legal_name": unicodedata.normalize("NFC", payload.get("legal_name")) if payload.get("legal_name") else None,
        "preferred_name": unicodedata.normalize("NFC", payload.get("preferred_name")) if payload.get("preferred_name") else None,
    }
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


# ── Sigil ───────────────────────────────────────────────────────────────

def _build_sigil_svg(point_count: int, seed_hex: str, palette: dict) -> str:
    n = 11 if point_count == 11 else 9
    cx, cy, r = 256, 256, 200
    points = []
    for i in range(n):
        a = (math.pi * 2 * i) / n - math.pi / 2
        points.append((round(cx + r * math.cos(a), 3), round(cy + r * math.sin(a), 3)))
    seed_num = int(seed_hex[:8], 16) if seed_hex else 1
    stride = (seed_num % (n - 2)) + 2
    def _gcd(a, b):
        while b:
            a, b = b, a % b
        return a
    while _gcd(stride, n) != 1:
        stride = (stride % (n - 1)) + 1
    order = []
    cur = 0
    for _ in range(n):
        order.append(cur)
        cur = (cur + stride) % n
    path_d_parts = []
    for i, idx in enumerate(order):
        p = points[idx]
        path_d_parts.append(("M" if i == 0 else "L") + str(p[0]) + "," + str(p[1]))
    path_d = " ".join(path_d_parts) + " Z"
    primary = (palette or {}).get("palette", ["oklch(0.5 0.55 200)"])[0]
    pal = (palette or {}).get("palette") or []
    accent = pal[2] if len(pal) > 2 else primary
    nodes = "".join(
        f'<circle cx="{p[0]}" cy="{p[1]}" r="6" fill="{accent}"/>' for p in points
    )
    nodes += f'<circle cx="{cx}" cy="{cy}" r="10" fill="{primary}"/>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        'width="512" height="512">'
        f'<path d="{path_d}" fill="none" stroke="{primary}" '
        'stroke-width="2" stroke-linejoin="round"/>'
        f'{nodes}</svg>'
    )


# ── Static label tables (short, original; no copyrighted text) ──────────

NUMEROLOGY_LABELS = {
    1:  "Initiator — independence, beginnings",
    2:  "Mediator — partnership, balance",
    3:  "Expresser — creativity, communication",
    4:  "Builder — structure, foundation",
    5:  "Voyager — change, freedom",
    6:  "Nurturer — service, harmony",
    7:  "Seeker — introspection, study",
    8:  "Manifestor — power, mastery",
    9:  "Completer — release, compassion",
    11: "Illuminator — intuition, vision",
    22: "Master Builder — material vision realized",
    33: "Master Teacher — devotion, healing",
}

LUNAR_PHASE_LABELS = {
    0: "New Moon — seed",
    1: "Waxing Crescent — intention",
    2: "First Quarter — decision",
    3: "Waxing Gibbous — refine",
    4: "Full Moon — illumination",
    5: "Waning Gibbous — share",
    6: "Last Quarter — release",
    7: "Waning Crescent — rest",
}

SOLAR_QUARTER_LABELS = {
    0: "Winter — incubation",
    1: "Spring — emergence",
    2: "Summer — fullness",
    3: "Autumn — harvest",
}


# ── Entry points ────────────────────────────────────────────────────────

def generate(payload: dict, *, feature_flag: Optional[bool] = None,
             bhramari_flag: Optional[bool] = None,
             now: Optional[str] = None) -> dict:
    """Return the internal (private) Om Cipher record for `payload`.

    Wrap with `to_public_projection()` before exposing to public surfaces.
    """
    if not is_enabled(feature_flag):
        return {"pending": True, "reason": "om_cipher_disabled"}
    if not payload or not payload.get("birth_date"):
        return {"pending": True, "reason": "missing_birth_date"}

    lp = life_path(payload.get("birth_date"))
    name = name_resonance(payload.get("legal_name") or payload.get("preferred_name"))
    gk = gk_layer(payload.get("compass"))
    temporal = temporal_layer(payload.get("birth_date"), payload.get("birth_time"))
    primary_gate = None
    if gk:
        if gk.get("work"):
            primary_gate = gk["work"]["gate"]
        elif gk.get("lens"):
            primary_gate = gk["lens"]["gate"]

    bhramari_on = is_bhramari_enabled(bhramari_flag)
    bhramari_in = payload.get("bhramari_baseline") or {}
    baseline_hz = None
    baseline_metadata = None
    if bhramari_on and bhramari_in:
        try:
            hz = float(bhramari_in.get("hz") or 0)
        except (TypeError, ValueError):
            hz = 0
        if hz > 0:
            baseline_hz = hz
            baseline_metadata = bhramari_in.get("metadata") or None

    parts: dict = {}
    if lp:
        parts["LP"] = lp["reduced"]
    if name and name.get("expression"):
        parts["EX"] = name["expression"]["reduced"]
    if name and name.get("soul_urge"):
        parts["SU"] = name["soul_urge"]["reduced"]
    if name and name.get("personality"):
        parts["PE"] = name["personality"]["reduced"]
    if temporal:
        parts["LUN"] = temporal["lunar_phase"]
        parts["SOL"] = temporal["solar_quarter"]
        if temporal["temporal_gate"] is not None:
            parts["TG"] = temporal["temporal_gate"]
    if baseline_hz:
        parts["BHR"] = baseline_hz

    canonical = _canonical(parts)
    seed = _sha256(canonical)
    identity_parts = {k: v for k, v in parts.items() if k != "BHR"}
    seed_identity = _sha256(_canonical(identity_parts))
    input_hash = _sha256(_canonical_input_json(payload))

    bhramari_hue_deg = hz_to_visible_hue_deg(baseline_hz) if baseline_hz else None
    palette = _build_palette(
        lp["reduced"] if lp else None,
        temporal["lunar_phase"] if temporal else None,
        primary_gate,
        bhramari_hue_deg,
    )
    sigil_points = 11 if payload.get("birth_time") else 9
    sigil_svg = _build_sigil_svg(sigil_points, seed, palette)

    metadata = {
        "life_path": ({
            "value": lp["reduced"],
            "raw": lp["raw"],
            "day": lp["day"], "month": lp["month"], "year": lp["year"],
            "is_master": lp["reduced"] in (11, 22, 33),
            "label": NUMEROLOGY_LABELS.get(lp["reduced"]),
        }) if lp else None,
        # Back-compat alias.
        "digital_root": ({"value": lp["reduced"], "raw": lp["raw"]}) if lp else None,
        "expression": ({
            "value": name["expression"]["reduced"],
            "raw": name["expression"]["raw"],
            "label": NUMEROLOGY_LABELS.get(name["expression"]["reduced"]),
        }) if name and name.get("expression") else None,
        "soul_urge": ({
            "value": name["soul_urge"]["reduced"],
            "raw": name["soul_urge"]["raw"],
            "label": NUMEROLOGY_LABELS.get(name["soul_urge"]["reduced"]),
        }) if name and name.get("soul_urge") else None,
        "personality": ({
            "value": name["personality"]["reduced"],
            "raw": name["personality"]["raw"],
            "label": NUMEROLOGY_LABELS.get(name["personality"]["reduced"]),
        }) if name and name.get("personality") else None,
        "gk_primary": gk.get("work") if gk else None,
        "gk_all": gk,
        "hd_type": (payload.get("human_design") or {}).get("type"),
        "hd_authority": (payload.get("human_design") or {}).get("authority"),
        "hd_profile": (payload.get("human_design") or {}).get("profile"),
        "hd_definition": (payload.get("human_design") or {}).get("definition"),
        "seed_syllable": payload.get("seed_syllable"),
        "lunar_phase": ({
            "value": temporal["lunar_phase"],
            "label": LUNAR_PHASE_LABELS.get(temporal["lunar_phase"]),
        }) if temporal else None,
        "solar_quarter": ({
            "value": temporal["solar_quarter"],
            "label": SOLAR_QUARTER_LABELS.get(temporal["solar_quarter"]),
        }) if temporal else None,
        "temporal_gate": ({
            "value": temporal["temporal_gate"],
            "label": (
                f"Two-hour window {temporal['temporal_gate']} "
                f"({temporal['temporal_gate']*2:02d}:00–{temporal['temporal_gate']*2+2:02d}:00 UTC)"
            ) if temporal["temporal_gate"] is not None else None,
        }) if temporal else None,
        "seed_string": canonical,
        "palette_rationale": (
            f"Hue {palette['primary_hue']}° from Life Path "
            f"{lp['reduced'] if lp else '-'}; "
            f"lunar phase {temporal['lunar_phase'] if temporal else '-'} "
            f"modulates saturation; secondary {palette['secondary_hue']}° "
            f"is the complement"
            + (f"; gate {primary_gate} sets accent offset" if primary_gate else "")
            + (f"; Bhramari accent at {bhramari_hue_deg}°" if bhramari_hue_deg is not None else "")
        ),
        "sigil_points": sigil_points,
        "seed_hash": seed[:16] + "..." + seed[-4:],
    }
    if baseline_hz:
        tone = hz_to_semitone(baseline_hz)
        metadata["bhramari"] = {
            "baseline_hz": baseline_hz,
            "nearest_semitone": f"{tone['note']}{tone['octave']}" if tone else None,
            "octave_visible_hue_deg": bhramari_hue_deg,
            "captured_at": (baseline_metadata or {}).get("captured_at"),
            "stability": (baseline_metadata or {}).get("stability"),
            "confidence": (baseline_metadata or {}).get("confidence"),
            "note": "Optional measured resonance. Refinement history via /resonance-events.",
        }

    return {
        "version": 1,
        "pending": False,
        "generated_at": now or datetime.now(timezone.utc).isoformat(),
        "seed": seed,
        "seed_string": canonical,
        "seed_identity": seed_identity,
        "input_hash": input_hash,
        "palette": palette,
        "sigil_svg": sigil_svg,
        "metadata": metadata,
        "sealed_inputs": {
            "birth_date": payload.get("birth_date"),
            "birth_time": payload.get("birth_time"),
            "birth_place": payload.get("birth_place"),
            "legal_name": payload.get("legal_name"),
            "preferred_name": payload.get("preferred_name"),
            "compass": payload.get("compass"),
            "human_design": payload.get("human_design"),
            "seed_syllable": payload.get("seed_syllable"),
        },
        "bhramari_baseline_hz": baseline_hz,
        "bhramari_baseline_metadata": baseline_metadata,
        "visibility_tier": "private",
    }


def to_public_projection(record: Optional[dict], tier: str = "badge") -> Optional[dict]:
    if not record or record.get("pending"):
        return None
    meta = record.get("metadata") or {}
    gk = meta.get("gk_primary") or {}
    lp = meta.get("life_path") or {}
    out: dict = {
        "version": record.get("version", 1),
        "palette": record.get("palette"),
        "gk_primary_label": (
            f"Gate {gk['gate']}" + (f".{gk['line']}" if gk.get("line") else "") +
            (f" · {gk['label']}" if gk.get("label") else "")
        ) if gk else None,
        "life_path_label": lp.get("value"),
        "digital_root_label": lp.get("value"),
        "sigil_points": meta.get("sigil_points", 9),
    }
    if tier == "shared":
        bh = meta.get("bhramari") or {}
        if bh.get("nearest_semitone"):
            out["bhramari_semitone"] = bh["nearest_semitone"]
            out["bhramari_hz_rounded"] = round_hz(record.get("bhramari_baseline_hz"))
        if meta.get("lunar_phase"):
            out["lunar_phase"] = meta["lunar_phase"]["value"]
        if meta.get("solar_quarter"):
            out["solar_quarter"] = meta["solar_quarter"]["value"]
    return out


def append_resonance_event(record: dict, capture: dict, *,
                           event_id: Optional[str] = None,
                           now: Optional[str] = None) -> dict:
    """Build an append-only resonance event row. Caller persists it."""
    try:
        hz = float(capture.get("hz") or 0)
    except (TypeError, ValueError):
        hz = 0
    if hz <= 0:
        raise ValueError("resonance event requires hz")
    metadata = capture.get("metadata") or {}
    return {
        "id": event_id,
        "member_id": (record or {}).get("member_id"),
        "captured_at": metadata.get("captured_at") or now or datetime.now(timezone.utc).isoformat(),
        "bhramari_hz": hz,
        "metadata": metadata or None,
        "capture_method": metadata.get("capture_method") or "bhramari-shanmukhi-v1",
        "source_surface": capture.get("source_surface") or "unknown",
    }
