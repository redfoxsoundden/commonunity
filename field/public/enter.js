// Enter-the-Field form: requests a magic link.
(function () {
  const form = document.getElementById("cu-enter-form");
  const msg = document.getElementById("cu-enter-msg");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get("email");
    msg.textContent = "Listening for resonance…";
    try {
      const res = await fetch("/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (j.ok) {
        msg.textContent = "If you are on the list, a link is on its way.";
        if (j.dev && j.dev.link) {
          // dev fallback so the developer can click straight through
          msg.innerHTML += `<br/><a href="${j.dev.link}">dev link</a>`;
        }
      } else {
        msg.textContent = j.error || "Something went still.";
      }
    } catch (err) {
      msg.textContent = "The Field could not be reached.";
    }
  });
})();
