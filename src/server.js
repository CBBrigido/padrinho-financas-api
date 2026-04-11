const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const categoryRoutes = require("./routes/categories");

const app = express();

// ── Middlewares ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Rotas ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);

// ── Health check ────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    app: "Padrinho Finanças API",
    status: "online",
    version: "1.0.0",
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ── Error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// ── Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Padrinho Finanças API rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}\n`);
});
