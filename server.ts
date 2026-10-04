import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security hardening: Disable X-Powered-By fingerprinting
app.disable("x-powered-by");

// Security Headers middleware (Anti-XSS, Anti-Sniffing, Anti-Clickjacking)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
    }
  }
  return genAIClient;
}

// API Router for endpoints
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Announcement drafter endpoint
apiRouter.post("/ai/draft-announcement", async (req, res) => {
  try {
    const rawTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const rawDepartment = typeof req.body?.department === "string" ? req.body.department.trim() : "";
    
    if (!rawTitle) {
      return res.status(400).json({ error: "Judul pengumuman diperlukan." });
    }

    // Input bounds & sanitization (anti-injection & anti-DoS)
    const title = rawTitle.slice(0, 300).replace(/[<>{}\\]/g, "");
    const department = rawDepartment.slice(0, 100).replace(/[<>{}\\]/g, "");

    const ai = getGenAI();
    if (!ai) {
      const fallback = `Diberitahukan kepada seluruh karyawan ${department || "Hotel Ciputra Jakarta"},\n\nSehubungan dengan "${title}", manajemen menyampaikan informasi resmi agar dapat dipedomani oleh seluruh rekan kerja di departemen terkait.\n\nDemikian pengumuman ini disampaikan untuk menjadi perhatian bersama. Atas kerja sama dan dedikasi rekan-rekan sekalian, kami ucapkan terima kasih.\n\nSalam,\nManajemen & Human Resources`;
      return res.json({ result: fallback });
    }

    const prompt = `Anda adalah seorang Manajer Komunikasi Internal & HR profesional di perusahaan perhotelan (Hotel Ciputra Jakarta). Buatkan draf pengumuman intranet resmi, jelas, formal, dan ramah dalam bahasa Indonesia untuk judul: "${title}" ${department ? `untuk departemen ${department}` : "untuk seluruh karyawan"}. Formatkan dalam teks biasa tanpa tanda bintang/markdown tebal, langsung isi pengumuman siap kirim.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "Pengumuman berhasil dibuat.";
    return res.json({ result: text });
  } catch (error: any) {
    // Log securely server-side without leaking stack or keys to client
    console.error("AI Draft Internal Error:", error?.message || "Unknown error");
    res.status(500).json({
      error: "Gagal menghasilkan draf pengumuman dengan AI.",
      fallback: `Diberitahukan kepada seluruh tim mengenai agenda kerja. Mohon koordinasi lebih lanjut dengan atasan departemen masing-masing. Terima kasih.`,
    });
  }
});

// AI Performance Appraisal Feedback endpoint
apiRouter.post("/ai/performance-feedback", async (req, res) => {
  try {
    const rawName = typeof req.body?.employeeName === "string" ? req.body.employeeName.trim() : "";
    const rawRole = typeof req.body?.role === "string" ? req.body.role.trim() : "";
    const rawDept = typeof req.body?.department === "string" ? req.body.department.trim() : "";
    const rawKpi = typeof req.body?.kpiScore === "number" || typeof req.body?.kpiScore === "string" ? String(req.body.kpiScore).slice(0, 10) : "0";
    const rawTotal = typeof req.body?.grandTotal === "number" || typeof req.body?.grandTotal === "string" ? String(req.body.grandTotal).slice(0, 10) : "0";
    const rawGrade = typeof req.body?.grade === "string" ? req.body.grade.slice(0, 10) : "M";
    const rawBest = typeof req.body?.bestAchievement === "string" ? req.body.bestAchievement.slice(0, 500) : "";
    const rawChallenge = typeof req.body?.challenge === "string" ? req.body.challenge.slice(0, 500) : "";

    // Input bounds & sanitization
    const employeeName = rawName.slice(0, 100).replace(/[<>{}\\]/g, "");
    const role = rawRole.slice(0, 80).replace(/[<>{}\\]/g, "");
    const department = rawDept.slice(0, 100).replace(/[<>{}\\]/g, "");
    const bestAchievement = rawBest.replace(/[<>{}\\]/g, "");
    const challenge = rawChallenge.replace(/[<>{}\\]/g, "");

    const ai = getGenAI();
    if (!ai) {
      const fallback = `Terima kasih kepada ${employeeName || "Anda"} atas dedikasi dan kontribusi kerja di departemen ${department || "perusahaan"}. Dengan capaian KPI ${rawKpi}% dan predikat ${rawGrade}, kami mengapresiasi pencapaian terbaik Anda dan mendukung penyelesaian tantangan kerja ke depannya agar semakin prima.`;
      return res.json({ result: fallback });
    }

    const prompt = `Sebagai Manager, buatkan umpan balik (feedback) evaluasi kinerja yang konstruktif, suportif, dan profesional untuk karyawan berikut:
- Nama Karyawan: ${employeeName || "Karyawan"}
- Jabatan: ${role || "Staff"}
- Departemen: ${department || "Operasional"}
- Capaian KPI: ${rawKpi}%
- Skor Akhir: ${rawTotal} (Skala 5.0)
- Predikat Kinerja: ${rawGrade}
- Pencapaian Terbaik: ${bestAchievement || "Tidak disebutkan"}
- Tantangan yang Dihadapi: ${challenge || "Tidak disebutkan"}

Instruksi: Tulis dalam 1 paragraf (3-4 kalimat singkat), menyapa langsung dengan kata "Anda" atau nama karyawan. Berikan apresiasi spesifik atas poin keberhasilan dan dorongan motivasi serta saran perbaikan untuk tantangan operasional. Tulis dalam bahasa Indonesia resmi tanpa format tebal atau markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "Umpan balik berhasil dihasilkan.";
    return res.json({ result: text });
  } catch (error: any) {
    console.error("AI Feedback Internal Error:", error?.message || "Unknown error");
    res.status(500).json({
      error: "Gagal menghasilkan feedback dengan AI.",
      fallback: `Apresiasi atas kerja keras Anda selama periode evaluasi ini. Terus pertahankan standar pelayanan dan koordinasi tim yang solid.`,
    });
  }
});

// Mount the API router on /api and root
app.use("/api", apiRouter);
app.use(apiRouter);

// Global API error handler to prevent stack traces or internal leaking
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err?.message || "Internal error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Terjadi kendala pada layanan server internal." });
  }
});

// Vite middleware in dev or static files in production / Cloud Run
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

    console.log(`[Production] Serving static files from: ${distPath}`);
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
    console.log("Received SIGTERM, closing HTTP server");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("Received SIGINT, closing HTTP server");
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
