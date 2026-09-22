import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Announcement drafter endpoint
app.post("/api/ai/draft-announcement", async (req, res) => {
  try {
    const { title, department } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Judul pengumuman diperlukan." });
    }

    const ai = getGenAI();
    if (!ai) {
      // Fallback template when GEMINI_API_KEY is not configured
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
app.post("/api/ai/performance-feedback", async (req, res) => {
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

// Ping and test connection to Google Apps Script Web App
app.post("/api/gas/ping", async (req, res) => {
  try {
    const { webAppUrl } = req.body;
    if (!webAppUrl || typeof webAppUrl !== "string" || !webAppUrl.startsWith("https://script.google.com/macros/s/")) {
      return res.status(400).json({
        success: false,
        message: "URL Google Apps Script tidak valid. URL harus diawali dengan https://script.google.com/macros/s/.../exec",
      });
    }

    const cleanUrl = webAppUrl.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const pingUrl = cleanUrl.includes("?")
      ? `${cleanUrl}&action=ping`
      : `${cleanUrl}?action=ping`;

    let response: Response;
    try {
      response = await fetch(pingUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return res.status(504).json({
          success: false,
          message: "Timeout saat menghubungi Google Apps Script (lebih dari 12 detik). Pastikan deployment script aktif.",
        });
      }
      return res.status(502).json({
        success: false,
        message: `Koneksi jaringan gagal: ${fetchErr.message || "Network error"}`,
      });
    }

    clearTimeout(timeoutId);

    const rawText = await response.text();

    if (!rawText || rawText.trim().length === 0) {
      return res.status(502).json({
        success: false,
        message:
          "Google Apps Script mengembalikan respon kosong. Pastikan Web App dideploy dengan hak akses 'Anyone' (Siapa saja) dan fungsi doGet mengembalikan ContentService.createTextOutput().",
      });
    }

    // Check if Google returned an HTML error/login page
    if (rawText.includes("<!DOCTYPE") || rawText.includes("<html") || rawText.includes("<body")) {
      let detailHint = "Google Apps Script mengembalikan halaman web Google (bukan output JSON API).";
      if (rawText.includes("Page not found") || rawText.includes("unable to open the file")) {
        detailHint =
          "Google Drive mengembalikan 'Page not found / Unable to open file'.\n\nSolusi:\n1. Di Google Apps Script editor, klik tombol 'Deploy' > 'New deployment'.\n2. Pilih jenis 'Web app'.\n3. Pada 'Execute as', pilih 'Me (email Anda)'.\n4. Pada 'Who has access', pilih 'Anyone' (bukan Only myself).\n5. Klik 'Deploy' lalu izinkan akses (Authorize Access). Salin URL Web App yang baru berakhiran /exec.";
      } else if (rawText.includes("accounts.google.com") || rawText.includes("Sign in") || rawText.includes("ServiceLogin")) {
        detailHint =
          "Google meminta autentikasi akun Google (Akses publik tertutup).\n\nSolusi: Edit deployment di Apps Script, ubah 'Who has access' menjadi 'Anyone' (Siapa saja).";
      }

      return res.status(502).json({
        success: false,
        message: detailHint,
        isHtmlResponse: true,
      });
    }

    // Attempt JSON parse
    try {
      const data = JSON.parse(rawText);
      return res.json({
        success: data.success !== false,
        message: data.message || "Koneksi ke Google Apps Script Web App BERHASIL!",
        serverTime: data.timestamp || data.serverTime || new Date().toLocaleString("id-ID"),
        raw: data,
      });
    } catch {
      if (response.ok && rawText.length > 0) {
        return res.json({
          success: true,
          message: `Koneksi terhubung ke Google Apps Script (${rawText.slice(0, 100)})`,
          serverTime: new Date().toLocaleString("id-ID"),
        });
      }
      return res.status(502).json({
        success: false,
        message: `Format respon dari Google bukan JSON valid: "${rawText.slice(0, 120)}..."`,
      });
    }
  } catch (error: any) {
    console.error("GAS Ping Error:", error);
    return res.status(500).json({
      success: false,
      message: `Terjadi galat server proxy: ${error?.message || "Internal server error"}`,
    });
  }
});

// Proxy to user's Google Apps Script web app if configured (bypasses CORS in browser)
app.post("/api/proxy-gas", async (req, res) => {
  try {
    const { gasUrl, payload } = req.body;
    if (!gasUrl || !gasUrl.startsWith("https://script.google.com/macros/s/")) {
      return res.status(400).json({ error: "URL Google Apps Script tidak valid." });
    }

    const response = await fetch(gasUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const rawText = await response.text();
    if (!rawText || rawText.trim().length === 0) {
      return res.status(502).json({ error: "Respon dari Google Apps Script kosong." });
    }

    try {
      const data = JSON.parse(rawText);
      return res.json(data);
    } catch {
      if (rawText.includes("Page not found") || rawText.includes("unable to open the file")) {
        return res.status(502).json({
          error:
            "Google Apps Script tidak dapat diakses ('Page not found / Unable to open file'). Pastikan Web App dideploy dengan hak akses 'Anyone' dan 'Execute as: Me'.",
        });
      }
      return res.status(502).json({
        error: `Respon Google Apps Script bukan JSON yang valid: ${rawText.slice(0, 150)}`,
      });
    }
  } catch (error: any) {
    console.error("GAS Proxy Error:", error);
    return res.status(500).json({ error: error?.message || "Gagal menghubungi Google Apps Script." });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust detection of dist folder across various Cloud Run container mount points
    const candidatePaths = [
      path.join(process.cwd(), "dist"),
      process.cwd(),
      path.resolve("dist"),
    ];

    if (typeof __dirname !== "undefined") {
      candidatePaths.unshift(__dirname);
      candidatePaths.push(path.join(__dirname, "../dist"));
    }

    const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || path.join(process.cwd(), "dist");

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

startServer().catch((err) => {
  console.error("Critical server startup failure:", err);
  process.exit(1);
});
