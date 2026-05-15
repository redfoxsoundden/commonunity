// Profile-page interactions: Attune (bidirectional ripple) and Tone send.
(function () {
  function ripple(x, y) {
    const el = document.createElement("div");
    el.className = "cu-ripple";
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function bidirectionalRipple(originX, originY) {
    ripple(originX, originY);
    // Second ripple from "their" side — represented by the sigil top-centre.
    const sigil = document.querySelector(".cu-sigil-wrap");
    if (sigil) {
      const r = sigil.getBoundingClientRect();
      ripple(r.left + r.width / 2, r.top + r.height / 2);
    }
  }

  document.querySelectorAll(".cu-attune").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const handle = btn.dataset.handle;
      const rect = btn.getBoundingClientRect();
      bidirectionalRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
      btn.disabled = true;
      try {
        const res = await fetch(`/field-api/attune/${encodeURIComponent(handle)}`, {
          method: "POST", credentials: "include",
        });
        const j = await res.json();
        btn.textContent = j.ok ? "Attuned" : "Could not attune";
      } catch (err) {
        btn.textContent = "Could not attune";
      }
    });
  });

  document.querySelectorAll(".cu-tone-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const handle = form.dataset.handle;
      try {
        const res = await fetch(`/field-api/tone/${encodeURIComponent(handle)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            seed_syllable: fd.get("seed") || "",
            intention: fd.get("intention") || "",
          }),
        });
        const j = await res.json();
        if (j.ok) {
          form.innerHTML = '<p class="cu-sub">tone sent — it will arrive in their inbox.</p>';
        }
      } catch (err) {
        // silent
      }
    });
  });
})();
