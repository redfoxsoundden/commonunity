import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve instrument images and audio from /assets
  const assetsPath = path.resolve(process.cwd(), "assets");
  if (fs.existsSync(assetsPath)) {
    app.use("/assets", express.static(assetsPath, {
      maxAge: "7d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".mp3")) {
          res.setHeader("Content-Type", "audio/mpeg");
        }
      }
    }));
  }

  // CommonUnity public homepage + Studio mirror — served from the Tuner
  // deployment so the shared Railway domain has a public landing page at /home
  // and a Studio mirror at /studio. Routes are registered before the SPA
  // catch-all so they take precedence over Tuner's index.html.
  const noStoreHeaders: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
  app.get("/home", (_req, res) => {
    res.set(noStoreHeaders);
    res.sendFile(path.resolve(distPath, "homepage.html"));
  });
  app.get("/studio", (_req, res) => {
    res.set(noStoreHeaders);
    res.sendFile(path.resolve(distPath, "studio.html"));
  });
  // /source-code is the canonical public URL for the CommonUnity Source Code
  // page (formerly the Manifesto). /manifesto stays as a permanent alias so
  // existing inbound links don't break. Both serve manifesto.html.
  const serveSourceCode = (_req: express.Request, res: express.Response) => {
    res.set(noStoreHeaders);
    res.sendFile(path.resolve(distPath, "manifesto.html"));
  };
  app.get("/source-code", serveSourceCode);
  app.get("/manifesto", serveSourceCode);

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
