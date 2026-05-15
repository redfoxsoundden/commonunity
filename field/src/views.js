// Server-rendered HTML for the cOMmons (the public Field surface).
// Visual language is inherited verbatim from homepage.html — same logo
// lockup, same palette, same floating-frame aesthetic. The Field naming
// collision (Compass point "Field" already exists) is resolved by surfacing
// the public brand name as "cOMmons" while keeping technical paths (/field,
// /field-api) stable.

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// The shared SVG defs block — lifted byte-for-byte from homepage.html so the
// lockup and OM mark are pixel-identical to the homepage. The body inlines
// this once and references it via <use href="#logo-lockup"/> elsewhere.
const SVG_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="om-glow" x="-50%" y="-80%" width="200%" height="260%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <symbol id="logo-lockup" viewBox="-30 0 760 132">
      <text x="350" y="108" text-anchor="middle"
            font-family="Josefin Sans, Plus Jakarta Sans, system-ui, sans-serif"
            font-weight="600" font-size="80" letter-spacing="6"
            text-rendering="geometricPrecision">
        <tspan fill="#FAF8F4" fill-opacity="0.96">C</tspan><tspan fill="#d4a04a" filter="url(#om-glow)">OM</tspan><tspan fill="#FAF8F4" fill-opacity="0.96">MONUNITY</tspan>
      </text>
      <path d="M 92 26 Q 122 38 152 26" fill="none" stroke="#d4a04a"
            stroke-width="2.2" stroke-linecap="round" opacity="0.92"
            filter="url(#om-glow)"/>
      <path d="M 122 4 L 126 9 L 122 14 L 118 9 Z" fill="#d4a04a" opacity="0.96"
            filter="url(#om-glow)"/>
    </symbol>
    <symbol id="logo-mark" viewBox="0 0 96 96">
      <path d="M 28 22 Q 47 32 67 22" fill="none" stroke="#d4a04a" stroke-width="2.4" stroke-linecap="round" opacity="0.94" filter="url(#om-glow)"/>
      <path d="M 47 6 L 51 12 L 47 18 L 43 12 Z" fill="#d4a04a" opacity="0.96" filter="url(#om-glow)"/>
      <text x="48" y="78" text-anchor="middle"
            font-family="Josefin Sans, Plus Jakarta Sans, system-ui, sans-serif"
            font-weight="600" font-size="56" letter-spacing="2"
            filter="url(#om-glow)"
            fill="#d4a04a">OM</text>
    </symbol>
  </defs>
</svg>`;

const baseHead = ({ title, description, og }) => `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#0b1120" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || "")}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description || "")}" />
  ${og && og.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : ""}
  <meta property="og:type" content="profile" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/field-static/style.css" />
`;

function layout({ title, description, og, user, body, extraScripts = "" }) {
  return `<!doctype html>
<html lang="en">
<head>${baseHead({ title, description, og })}</head>
<body>
${SVG_DEFS}
<header class="cu-header">
  <div class="wrap cu-nav">
    <a class="cu-brand" href="/field" aria-label="CommonUnity cOMmons">
      <svg class="cu-lockup" viewBox="-30 0 760 132" aria-hidden="true"><use href="#logo-lockup"/></svg>
    </a>
    <nav class="cu-nav-links" aria-label="Primary">
      <a href="/field">the cOMmons</a>
      ${user
        ? `<span class="cu-nav-name">${escapeHtml(user.display_name || user.email)}</span>
           <form action="/auth/logout" method="POST" style="display:inline"><button type="submit">step out</button></form>`
        : `<a href="/field/enter" class="cu-link-primary">enter</a>`}
    </nav>
  </div>
</header>
<main class="cu-main">
  <div class="wrap">
    ${body}
  </div>
</main>
<footer class="cu-footer">
  <div class="wrap"><p>The cOMmons is a commons. Presence over performance.</p></div>
</footer>
${extraScripts}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────────────────────────────────
function renderGallery({ user, profiles }) {
  const cards = profiles.map(p => `
    <a class="cu-card" href="/field/${escapeHtml(p.handle)}">
      <div class="cu-card-sigil">${p.sigil_svg || ''}</div>
      <h2 class="cu-card-name">${escapeHtml(p.display_name)}</h2>
      ${p.archetype_tagline ? `<p class="cu-card-tagline">${escapeHtml(p.archetype_tagline)}</p>` : ""}
      ${p.essence ? `<p class="cu-card-essence">${escapeHtml(p.essence.slice(0, 180))}${p.essence.length > 180 ? "…" : ""}</p>` : ""}
      <p class="cu-card-presence">${escapeHtml(p.presence_status === "away" ? "Away" : "In the cOMmons")}</p>
    </a>
  `).join("\n");

  const body = `
    <section class="cu-hero">
      <p class="cu-eyebrow">the cOMmons</p>
      <h1 class="cu-h1">You've arrived because something in you is <em>ready</em>.</h1>
      <p class="cu-lede">A living commons of people working from the inside out. Walk through. Notice who you resonate with.</p>
    </section>
    <section class="cu-section cu-section--tight">
      <div class="cu-gallery">
        ${profiles.length === 0
          ? `<p class="cu-empty">No Living Profiles have been published yet. The cOMmons is still gathering itself.</p>`
          : cards}
      </div>
    </section>`;
  return layout({
    title: "CommonUnity · cOMmons",
    description: "The cOMmons — the public commons of CommonUnity. Living Profiles of people working from the inside out.",
    user, body,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Profile page
// ─────────────────────────────────────────────────────────────────────────
function renderProfile({ user, profile, isOwner, presences, attuneCount }) {
  const compass = profile.compass || {};
  const compassPoint = (key, label) => {
    const p = compass[key];
    if (!p) return "";
    const heading = (p.web_heading || p.summary || p.theme || "").trim();
    const intro = (p.web_intro || "").trim();
    const highlights = (p.highlights || []).slice(0, 5);
    const gk = p.gk_num ? `GK ${p.gk_num}${p.gk_line ? "." + p.gk_line : ""}` : "";
    return `
      <article class="cu-compass-point" data-key="${key}">
        <header>
          <p class="cu-eyebrow" style="margin:0">${escapeHtml(label)}</p>
          ${gk ? `<p class="cu-gk">${escapeHtml(gk)}</p>` : ""}
        </header>
        ${heading ? `<h3>${escapeHtml(heading)}</h3>` : ""}
        ${intro ? `<p class="cu-prose">${escapeHtml(intro)}</p>` : ""}
        ${highlights.length ? `<ul class="cu-highlights">${highlights.map(h => `<li>${escapeHtml(h)}</li>`).join("")}</ul>` : ""}
      </article>`;
  };

  const fs = profile.frequency_signature || {};
  const offerings = (profile.offerings || []).slice(0, 6);

  // Owner-only "Field echoes" panel — anti-addiction language; counts are
  // *acknowledgments*, not metrics.
  const ownerPanel = isOwner ? `
    <aside class="cu-field-echoes">
      <h2>cOMmons echoes</h2>
      <p class="cu-sub">Only you can see this. Resonances arrive here — never as a public count, only as awareness.</p>
      <p class="cu-echo-line"><strong>${attuneCount}</strong> ${attuneCount === 1 ? "attunement" : "attunements"} received.</p>
      <h3>Recent presences across your cOMmons</h3>
      ${presences.length === 0
        ? `<p class="cu-sub">No one has visited yet.</p>`
        : `<ul class="cu-presences">
            ${presences.slice(0, 12).map(p => `<li>${escapeHtml(p.visitor_display_name || p.visitor_label || "an anonymous presence")} — <time>${escapeHtml(p.last_seen_at || "")}</time></li>`).join("")}
          </ul>`}
    </aside>` : "";

  const interactBlock = (!isOwner && user) ? `
    <div class="cu-interact">
      <button class="cu-attune" data-handle="${escapeHtml(profile.handle)}" type="button">
        <span class="cu-attune-fork" aria-hidden="true"></span>
        Attune
      </button>
      <details class="cu-tone">
        <summary>Offer a tone</summary>
        <form class="cu-tone-form" data-handle="${escapeHtml(profile.handle)}">
          <input type="text" name="seed" placeholder="seed syllable (e.g. Om)" maxlength="32" />
          <input type="text" name="intention" placeholder="a short intention" maxlength="160" />
          <button type="submit">send</button>
        </form>
      </details>
    </div>` : (!user ? `<p class="cu-sub"><a href="/field/enter" style="color:var(--gold-soft);border-bottom:1px solid rgba(212,160,74,0.35);">Enter the cOMmons</a> to attune.</p>` : "");

  const body = `
    <section class="cu-section cu-section--tight">
      <article class="cu-profile">
        <header class="cu-profile-head">
          <div class="cu-sigil-wrap">${profile.sigil_svg || ""}</div>
          <div class="cu-profile-id">
            <h1 class="cu-name">${escapeHtml(profile.display_name)}</h1>
            ${profile.archetype_tagline ? `<p class="cu-tagline">${escapeHtml(profile.archetype_tagline)}</p>` : ""}
            <p class="cu-presence-badge">${escapeHtml(profile.presence_status === "away" ? "Away" : "In the cOMmons")}</p>
            ${interactBlock}
          </div>
        </header>

        ${profile.essence ? `<section class="cu-essence"><p>${escapeHtml(profile.essence)}</p></section>` : ""}
        ${profile.statement ? `<section class="cu-statement"><blockquote>${escapeHtml(profile.statement)}</blockquote></section>` : ""}

        <section class="cu-compass">
          ${compassPoint("work", "the work")}
          ${compassPoint("lens", "the lens")}
          ${compassPoint("field", "the field")}
          ${compassPoint("call", "the call")}
        </section>

        ${(fs.tonal_center || fs.dominant_hz || fs.elemental_alignment) ? `
          <section class="cu-panel">
            <p class="cu-eyebrow" style="margin-bottom:14px">frequency signature</p>
            <ul>
              ${fs.tonal_center ? `<li><strong>Tonal centre:</strong> ${escapeHtml(fs.tonal_center)}</li>` : ""}
              ${fs.dominant_hz ? `<li><strong>Dominant Hz:</strong> ${escapeHtml(fs.dominant_hz)}</li>` : ""}
              ${fs.elemental_alignment ? `<li><strong>Elemental alignment:</strong> ${escapeHtml(fs.elemental_alignment)}</li>` : ""}
              ${fs.chakra_focus ? `<li><strong>Chakra focus:</strong> ${escapeHtml(fs.chakra_focus)}</li>` : ""}
            </ul>
          </section>` : ""}

        ${offerings.length ? `
          <section class="cu-panel">
            <p class="cu-eyebrow" style="margin-bottom:14px">offerings</p>
            <ul>${offerings.map(o => `<li><strong>${escapeHtml(o.title || "")}</strong>${o.format ? ` — ${escapeHtml(o.format)}` : ""}${o.exchange ? ` · ${escapeHtml(o.exchange)}` : ""}</li>`).join("")}</ul>
          </section>` : ""}

        ${ownerPanel}
      </article>
    </section>`;

  const sigilOg = profile.sigil_svg ? "/field/" + profile.handle + "/sigil.svg" : null;

  return layout({
    title: `${profile.display_name} · CommonUnity cOMmons`,
    description: profile.essence || profile.archetype_tagline || `${profile.display_name} on the CommonUnity cOMmons`,
    og: { image: sigilOg },
    user,
    body,
    extraScripts: `<script src="/field-static/profile.js" defer></script>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Enter / sign-in
// ─────────────────────────────────────────────────────────────────────────
function renderEnter({ user, message }) {
  if (user) {
    return layout({
      title: "Already in the cOMmons · CommonUnity",
      description: "You're already in the cOMmons.",
      user,
      body: `
        <section class="cu-section">
          <div class="cu-enter">
            <p class="cu-eyebrow">threshold</p>
            <h1 class="cu-h2">You're already in the <em>cOMmons</em>.</h1>
            <p><a href="/field" style="color:var(--gold-soft);border-bottom:1px solid rgba(212,160,74,0.35);">Return to the commons</a>.</p>
          </div>
        </section>`,
    });
  }
  return layout({
    title: "Enter the cOMmons · CommonUnity",
    description: "Request a beta link to enter the CommonUnity cOMmons.",
    user: null,
    body: `
      <section class="cu-section">
        <div class="cu-enter">
          <p class="cu-eyebrow">threshold</p>
          <h1 class="cu-h2">Enter the <em>cOMmons</em></h1>
          <p class="cu-lede">The cOMmons is in private beta. Leave your email and, if you're on the list, a link will arrive.</p>
          <form id="cu-enter-form" class="cu-enter-form">
            <input type="email" name="email" placeholder="your email" required />
            <button type="submit">request link</button>
          </form>
          <p id="cu-enter-msg" class="cu-sub" style="margin-top:18px">${escapeHtml(message || "")}</p>
        </div>
      </section>
    `,
    extraScripts: `<script src="/field-static/enter.js" defer></script>`,
  });
}

// 404 page builder reused by routes.js
function renderNotFound({ user }) {
  return layout({
    title: "Not found · CommonUnity cOMmons",
    description: "",
    user,
    body: `
      <section class="cu-section">
        <div class="cu-enter">
          <p class="cu-eyebrow">stillness</p>
          <h1 class="cu-h2">This profile is not in the <em>cOMmons</em>.</h1>
          <p><a href="/field" style="color:var(--gold-soft);border-bottom:1px solid rgba(212,160,74,0.35);">Return to the commons</a>.</p>
        </div>
      </section>`,
  });
}

module.exports = { layout, renderGallery, renderProfile, renderEnter, renderNotFound, escapeHtml };
