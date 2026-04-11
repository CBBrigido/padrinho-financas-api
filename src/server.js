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

// ── Auto Migration & Seed ───────────────────────────────────────────────
const pool = require("./config/database");

const autoMigrate = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(60) NOT NULL,
        color VARCHAR(7) DEFAULT '#8E99A9',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('receita', 'despesa')),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        is_fixed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query("CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);");

    // Seed categorias padrão
    const defaultCats = [
      ["Moradia", "#E8575A"], ["Alimentação", "#F4A940"], ["Transporte", "#3EAFC4"],
      ["Lazer", "#9B6DD7"], ["Saúde", "#4ACA8B"], ["Educação", "#5B8DEF"],
      ["Serviços", "#E87BAF"], ["Outros", "#8E99A9"],
    ];
    for (const [name, color] of defaultCats) {
      await client.query(
        `INSERT INTO categories (name, color, is_default)
         SELECT $1, $2, true
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = $1 AND is_default = true)`,
        [name, color]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Migration e seed executados com sucesso!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro na migration:", err.message);
  } finally {
    client.release();
  }
};

// ── Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

autoMigrate().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Padrinho Finanças API rodando na porta ${PORT}`);
    console.log(`📍 http://localhost:${PORT}\n`);
  });
});
