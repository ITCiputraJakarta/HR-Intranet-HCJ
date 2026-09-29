import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
    const { title, department } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Judul pengumuman diperlukan." });
    }

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
    console.error("AI Draft Error:", error);
    res.status(500).json({
      error: error?.message || "Gagal menghasilkan draf pengumuman dengan AI.",
      fallback: `Diberitahukan kepada seluruh tim mengenai ${req.body?.title || "agenda kerja"}. Mohon koordinasi lebih lanjut dengan atasan departemen masing-masing. Terima kasih.`,
    });
  }
});

// AI Performance Appraisal Feedback endpoint
apiRouter.post("/ai/performance-feedback", async (req, res) => {
  try {
    const { employeeName, role, department, kpiScore, grandTotal, grade, bestAchievement, challenge } = req.body;

    const ai = getGenAI();
    if (!ai) {
      const fallback = `Terima kasih kepada ${employeeName || "Anda"} atas dedikasi dan kontribusi kerja di departemen ${department || "perusahaan"}. Dengan capaian KPI ${kpiScore || "0"}% dan predikat ${grade || "Good"}, kami mengapresiasi pencapaian terbaik Anda dan mendukung penyelesaian tantangan kerja ke depannya agar semakin prima.`;
      return res.json({ result: fallback });
    }

    const prompt = `Sebagai Manager, buatkan umpan balik (feedback) evaluasi kinerja yang konstruktif, suportif, dan profesional untuk karyawan berikut:
- Nama Karyawan: ${employeeName || "Karyawan"}
- Jabatan: ${role || "Staff"}
- Departemen: ${department || "Operasional"}
- Capaian KPI: ${kpiScore || "0"}%
- Skor Akhir: ${grandTotal || "0"} (Skala 5.0)
- Predikat Kinerja: ${grade || "M"}
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
    console.error("AI Feedback Error:", error);
    res.status(500).json({
      error: error?.message || "Gagal menghasilkan feedback dengan AI.",
      fallback: `Apresiasi atas kerja keras ${req.body?.employeeName || "Anda"} selama periode evaluasi ini. Terus pertahankan standar pelayanan dan koordinasi tim yang solid.`,
    });
  }
});

// Mount the API router on /api and root
app.use("/api", apiRouter);
app.use(apiRouter);

// Vite middleware in dev or static files in production / Cloud Run
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.K_SERVICE) ||
    process.env.npm_lifecycle_event === "start";

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidatePaths = [
      path.join(process.cwd(), "dist"),
      path.resolve("dist"),
      process.cwd(),
    ];

    const distPath =
      candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html"))) ||
      path.join(process.cwd(), "dist");

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
