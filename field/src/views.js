// Server-rendered HTML for the Field. Keeps the surface SEO-friendly,
// OG-shareable, and free of build-step ceremony.

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const baseHead = ({ title, description, og }) => `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
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
  <header class="cu-header">
    <a href="/field" class="cu-mark" aria-label="CommonUnity Field">
      <span class="cu-mark-glyph">ॐ</span>
      <span class="cu-mark-text">CommonUnity · the Field</span>
    </a>
    <nav class="cu-nav">
      ${user
        ? `<span class="cu-nav-name">${escapeHtml(user.display_name || user.email)}</span>
           <form action="/auth/logout" method="POST" style="display:inline"><button type="submit" class="cu-link-btn">step out</button></form>`
        : `<a href="/field/enter" class="cu-link">enter</a>`}
    </nav>
  </header>
  <main class="cu-main">${body}</main>
  <footer class="cu-footer">
    <p>The Field is a commons. Presence over performance.</p>
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
      <div class="cu-card-meta">
        <h2 class="cu-card-name">${escapeHtml(p.display_name)}</h2>
        ${p.archetype_tagline ? `<p class="cu-card-tagline">${escapeHtml(p.archetype_tagline)}</p>` : ""}
        ${p.essence ? `<p class="cu-card-essence">${escapeHtml(p.essence.slice(0, 160))}${p.essence.length > 160 ? "…" : ""}</p>` : ""}
        <p class="cu-card-presence">${escapeHtml(p.presence_status === "away" ? "Away" : "In the Field")}</p>
      </div>
    </a>
  `).join("\n");

  const body = `
    <section class="cu-hero">
      <p class="cu-eyebrow">the commons</p>
      <h1 class="cu-h1">You've arrived here because something in you is ready.</h1>
      <p class="cu-lede">A living commons of people working from the inside out. Walk through. Notice who you resonate with.</p>
    </section>
    <section class="cu-gallery">
      ${profiles.length === 0
        ? `<p class="cu-empty">No Living Profiles have been published yet. The Field is still gathering itself.</p>`
        : cards}
    </section>`;
  return layout({
    title: "The CommonUnity Field",
    description: "The public commons of CommonUnity — Living Profiles of people working from the inside out.",
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
          <p class="cu-eyebrow">${escapeHtml(label)}</p>
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
      <h2>Field echoes</h2>
      <p class="cu-sub">Only you can see this. Resonances arrive here — never as a public count, only as awareness.</p>
      <p class="cu-echo-line"><strong>${attuneCount}</strong> ${attuneCount === 1 ? "attunement" : "attunements"} received.</p>
      <h3>Recent presences in your Field</h3>
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
    </div>` : (!user ? `<p class="cu-sub"><a href="/field/enter">Enter the Field</a> to attune.</p>` : "");

  const body = `
    <article class="cu-profile">
      <header class="cu-profile-head">
        <div class="cu-sigil-wrap">${profile.sigil_svg || ""}</div>
        <div class="cu-profile-id">
          <h1 class="cu-name">${escapeHtml(profile.display_name)}</h1>
          ${profile.archetype_tagline ? `<p class="cu-tagline">${escapeHtml(profile.archetype_tagline)}</p>` : ""}
          <p class="cu-presence-badge">${escapeHtml(profile.presence_status === "away" ? "Away" : "In the Field")}</p>
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
        <section class="cu-frequency">
          <p class="cu-eyebrow">frequency signature</p>
          <ul>
            ${fs.tonal_center ? `<li><strong>Tonal centre:</strong> ${escapeHtml(fs.tonal_center)}</li>` : ""}
            ${fs.dominant_hz ? `<li><strong>Dominant Hz:</strong> ${escapeHtml(fs.dominant_hz)}</li>` : ""}
            ${fs.elemental_alignment ? `<li><strong>Elemental alignment:</strong> ${escapeHtml(fs.elemental_alignment)}</li>` : ""}
            ${fs.chakra_focus ? `<li><strong>Chakra focus:</strong> ${escapeHtml(fs.chakra_focus)}</li>` : ""}
          </ul>
        </section>` : ""}

      ${offerings.length ? `
        <section class="cu-offerings">
          <p class="cu-eyebrow">offerings</p>
          <ul>${offerings.map(o => `<li><strong>${escapeHtml(o.title || "")}</strong>${o.format ? ` — ${escapeHtml(o.format)}` : ""}${o.exchange ? ` · ${escapeHtml(o.exchange)}` : ""}</li>`).join("")}</ul>
        </section>` : ""}

      ${ownerPanel}
    </article>`;

  const sigilOg = profile.sigil_svg ? "/field/" + profile.handle + "/sigil.svg" : null;

  return layout({
    title: `${profile.display_name} · The CommonUnity Field`,
    description: profile.essence || profile.archetype_tagline || `${profile.display_name} on the CommonUnity Field`,
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
      title: "Already in the Field",
      description: "You're already in the Field.",
      user,
      body: `<section class="cu-enter"><h1>You're already in the Field.</h1><p><a href="/field">Return to the commons</a>.</p></section>`,
    });
  }
  return layout({
    title: "Enter the Field",
    description: "Request a beta link to enter the CommonUnity Field.",
    user: null,
    body: `
      <section class="cu-enter">
        <p class="cu-eyebrow">threshold</p>
        <h1>Enter the Field</h1>
        <p class="cu-lede">The Field is in private beta. Leave your email and, if you're on the list, a link will arrive.</p>
        <form id="cu-enter-form" class="cu-enter-form">
          <input type="email" name="email" placeholder="your email" required />
          <button type="submit">request link</button>
        </form>
        <p id="cu-enter-msg" class="cu-sub">${escapeHtml(message || "")}</p>
      </section>
    `,
    extraScripts: `<script src="/field-static/enter.js" defer></script>`,
  });
}

module.exports = { layout, renderGallery, renderProfile, renderEnter, escapeHtml };
