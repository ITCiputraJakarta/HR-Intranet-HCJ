import path from "path";
import express from "express";
import dotenv from "dotenv";
import { createApiApp } from "./api/_lib/createApiApp.ts";

dotenv.config();

const app = createApiApp();

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = Number(process.argv[portArgIndex + 1]);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  const portArgEqual = process.argv.find((a) => a.startsWith("--port="));
  if (portArgEqual) {
    const p = Number(portArgEqual.split("=")[1]);
    if (!Number.isNaN(p) && p > 0) return p;
  }

  if (process.env.DEFAULT_APP_PORT) {
    const p = Number(process.env.DEFAULT_APP_PORT);
    if (!Number.isNaN(p) && p > 0) return p;
  }

  const isDev = process.env.npm_lifecycle_event === "dev" || process.env.NODE_ENV !== "production";
  if (isDev) {
    return 3000;
  }

  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();

async function startServer() {
  const isDevScript = process.env.npm_lifecycle_event === "dev";
  const isProduction =
    !isDevScript &&
    (process.env.NODE_ENV === "production" ||
      process.env.npm_lifecycle_event === "start");

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          res.status(500).send("Portal sedang diinisialisasi. Silakan muat ulang beberapa saat lagi.");
        }
      });
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Critical server startup failure:", err);
    process.exit(1);
  });
}

export default app;
export { app };
