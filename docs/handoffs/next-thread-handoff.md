# CommonUnity Next-Thread Handoff

## Why start a new thread

The current thread contains product architecture, implementation, deployment, DNS, SMTP, cOMmons, Studio, and Om Cipher strategy. It is operationally dense and at risk of context confusion. The next thread should start from this handoff and the `CommonUnity Architecture v0.2` brief.

## Current live URLs

- Main Studio/root app: `https://commonunity-production.up.railway.app`
- Studio route: `https://commonunity-production.up.railway.app/studio`
- cOMmons Railway route: `https://commons-production-8914.up.railway.app/field`
- Future main domain: `https://www.commonunity.io`
- Future cOMmons domain: `https://commons.commonunity.io`

## GitHub and Railway

- GitHub repo: `HearthVS/commonunity`
- Main branch is live for the root CommonUnity service.
- cOMmons service deploys from `field-phase-1`.
- Main CommonUnity Railway service ID: `2a5f091f-fbc8-44e2-89a2-a48780531e22`
- cOMmons Railway service ID: `20df4da0-9e34-412c-8427-ee048309a185`
- Railway project: `balanced-illumination`
- Railway environment: `production`

## Recent important commits

- `49cc6af`: cOMmons public projection layer and stable sigil fields.
- `9157897`: Studio Living Profile sigil wiring.
- `ffff277`: fixed Studio sigil population after JSON load / preview path.
- `36b95f0`: fixed Studio Publish to cOMmons URL.
- `9b96775`: added `nodemailer` and hardened magic-link base URL.
- `7ce5d21`: bounded SMTP timeouts and structured mail logs.

## Railway Pro and SMTP

The Railway workspace was upgraded to Pro. After redeploying cOMmons, SMTP delivery through GoDaddy began working.

Confirmed cOMmons mail settings:

- `SMTP_HOST=smtpout.secureserver.net`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=om@commonunity.io`
- `SMTP_FROM=om@commonunity.io`

Railway logs showed `mail delivered` for a test magic link after the Pro upgrade.

## Domains and DNS

Custom domains were added in Railway:

- `commonunity.io` -> main CommonUnity service
- `www.commonunity.io` -> main CommonUnity service
- `commons.commonunity.io` -> cOMmons service

GoDaddy CNAME records:

```text
www -> 231xfgkz.up.railway.app
commons -> 2c4ikjdp.up.railway.app
```

The root/apex CNAME for `@` returned an error in GoDaddy. Current recommended approach:

- Use `www.commonunity.io` as the canonical main domain.
- Forward `commonunity.io` to `https://www.commonunity.io`.
- Do not touch MX, SPF, DKIM, DMARC, or other email records.

As of the last check, DNS/SSL propagation was still settling.

## Current app state

### cOMmons

cOMmons is deployed and live. It has:

- Health endpoint working.
- SQLite active.
- Three beta profiles seeded: Markus, Eda, Vesna.
- Public projection layer for safe cOMmons data.
- Magic-link auth generating and delivering after Railway Pro upgrade.
- CORS updated for future domains:
  - `https://commonunity.io`
  - `https://www.commonunity.io`
  - `https://commons.commonunity.io`

### Studio

Studio is deployed and live at `/studio`.

Recent fixes:

- Publish-to-cOMmons now targets the cOMmons service rather than the Studio host.
- Sigil render hooks exist in Living Profile and Personal Home / Website Preview paths.
- The current sigil renders, but it is still visually primitive and too OM-badge-like.

## Current product architecture

The clarified product model is:

```text
Invitation
  → facilitated Compass process
  → Om Cipher + Living Profile
  → Studio
  → Personal Home Page
  → cOMmons / Field
```

### Compass

Compass is invitation-led and human-facilitated. It is the initial onboarding threshold and source-data process.

### Om Cipher

Om Cipher is the fixed/objective source-code layer. It draws from birthdate, digital root, Gene Keys/I Ching, Human Design, name/gematria, seed syllable, and Bhramari tone capture.

### Living Profile

Living Profile is the subjective/lived qualia layer: what the person has done, is doing, and will do with their source pattern.

### Studio

Studio is the member’s higher-octave toolkit and living workspace. It is downstream of Om Cipher and Living Profile, not their source.

### cOMmons

cOMmons is the relational field. It should default to intention-led resonance, not browsing.

## Om Cipher recovered spec

Om Cipher v1 should map inputs to visual dimensions:

- Seed syllable -> central geometric glyph
- Name numerology/gematria -> radial divisions or petal count
- Handle -> deterministic seed stabilizer
- Birthdate digital root -> primary boundary polygon
- Life’s Work Gene Key -> outer ring geometry
- Evolution Gene Key -> mid-layer geometry
- Radiance Gene Key -> inner expressive geometry
- Human Design type -> compositional axis
- Frequency signature -> color, harmonic interval, cymatic core, motion

Gene Key geometry families:

- 1–8 triangular
- 9–16 square/cross
- 17–24 pentagonal/spiraling
- 25–32 hexagonal/honeycomb
- 33–40 heptagonal/asymmetric
- 41–48 octagonal/octave
- 49–56 nonagonal/complex web
- 57–64 decagonal/completion

Human Design behavior:

- Manifestor: asymmetric, dominant arm/spike
- Generator: radial symmetry
- Manifesting Generator: dual-axis overlap
- Projector: inward arcs
- Reflector: lunar concentric phase layers

Frequency color mapping:

- Map sound frequency to visible-light hue through octave equivalence.
- Use primary tone, perfect fifth, and octave/shadow.
- Avoid neon; use radial gradients and warm dark-field discipline.

## Next recommended work

### First: avoid another broad audit

The next thread should not begin with a large code audit. There is enough context for a targeted spec and implementation plan.

### Next deliverable

Create an implementation-ready Om Cipher v1 spec, then implement in small steps.

### Suggested implementation sequence

1. Define canonical Om Cipher input contract.
2. Create canonical engine module.
3. Ensure Studio and field/cOMmons call the same logic.
4. Implement frequency-to-color mapping.
5. Implement digital-root boundary.
6. Implement Gene Key ring families.
7. Implement Human Design composition behavior.
8. Implement gematria/petal count.
9. Implement full and node render modes.
10. Replace current OM badge visual with richer field geometry.
11. Preserve existing Studio/cOMmons functionality.
12. Run tests and deploy in small passes.

## User preferences and constraints

- Be highly credit-conscious.
- Do not launch broad audits unless truly necessary.
- Prefer targeted implementation passes with explicit acceptance criteria.
- Be proactive with infrastructure/provider recommendations before the user buys or configures services.
- Keep GoDaddy email for now because the user paid for 12 months.
- Keep Railway as beta hosting for now.
- Do not expose secrets or tokens.
- Use files/handoffs for long structured work rather than pasting everything in chat.

