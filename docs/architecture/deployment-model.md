# Deployment Model

Status: v0.1. Snapshot at the time of writing; verify against Railway and `handoffs/next-thread-handoff.md` for current truth.

## Hosting

CommonUnity is hosted on **Railway** (project: `balanced-illumination`, environment: `production`). The workspace is on the Railway Pro plan; the upgrade unblocked outbound SMTP.

## Services

| Service | Role | Service ID | Deploys from |
| --- | --- | --- | --- |
| Main CommonUnity | Studio + root | `2a5f091f-fbc8-44e2-89a2-a48780531e22` | `main` |
| cOMmons | Field surface | `20df4da0-9e34-412c-8427-ee048309a185` | `field-phase-1` |

## Live URLs

- Main Studio/root: `https://commonunity-production.up.railway.app`
- Studio route: `https://commonunity-production.up.railway.app/studio`
- cOMmons: `https://commons-production-8914.up.railway.app/field`

## Future canonical domains

- `https://www.commonunity.io` — main CommonUnity service
- `https://commons.commonunity.io` — cOMmons
- `https://commonunity.io` — forwards to `https://www.commonunity.io`

## DNS

Custom domains added in Railway:

- `commonunity.io` → main service
- `www.commonunity.io` → main service
- `commons.commonunity.io` → cOMmons

GoDaddy CNAME records:

```text
www      → 231xfgkz.up.railway.app
commons  → 2c4ikjdp.up.railway.app
```

The apex `@` CNAME could not be set in GoDaddy. The accepted approach is to use `www.commonunity.io` as canonical and forward the apex.

**Do not touch** MX, SPF, DKIM, DMARC, or other email records — these support GoDaddy email and must remain intact.

## SMTP (cOMmons magic-link auth)

Confirmed working after the Railway Pro upgrade.

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtpout.secureserver.net` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `om@commonunity.io` |
| `SMTP_FROM` | `om@commonunity.io` |

Magic-link delivery confirmed via Railway logs (`mail delivered`).

## CORS

cOMmons accepts:

- `https://commonunity.io`
- `https://www.commonunity.io`
- `https://commons.commonunity.io`

## Runtime notes

- `Procfile`, `nixpacks.toml`, `railway.json`, `runtime.txt`, and `requirements.txt` define the runtime contract at repo root.
- cOMmons currently uses SQLite as its data store.
- Three beta cOMmons profiles seeded: Markus, Eda, Vesna.

## Operational rules

- Do not expose secrets or tokens in commits or docs.
- Keep GoDaddy email for the remainder of the prepaid period.
- Keep Railway as beta hosting for now.
- Treat the architecture brief and the next-thread handoff as primary sources of truth; reconcile this doc with them on every milestone.
