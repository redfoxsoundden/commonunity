import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  // If loaded at /intake URL, deep-link to #/intake
  if (window.location.pathname.endsWith("/intake")) {
    window.location.hash = "#/intake";
  } else {
    window.location.hash = "#/";
  }
}

createRoot(document.getElementById("root")!).render(<App />);
