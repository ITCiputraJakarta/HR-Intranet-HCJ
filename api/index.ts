import type express from "express";
import { createApiApp } from "./_lib/createApiApp.js";

const app = createApiApp();

export default function handler(req: express.Request, res: express.Response) {
  try {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = req.url === "/" ? "/api" : `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
    }
    return app(req, res);
  } catch (err) {
    console.error("API invocation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Layanan API server mengalami gangguan sementara." });
    }
  }
}

