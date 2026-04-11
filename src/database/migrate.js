const pool = require("../config/database");
require("dotenv").config();

const migrate = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Tabela de usuários
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
    console.log("✅ Tabela users criada");

    // Tabela de categorias
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
    console.log("✅ Tabela categories criada");

    // Tabela de transações
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
    console.log("✅ Tabela transactions criada");

    // Índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
    `);
    console.log("✅ Índices criados");

    await client.query("COMMIT");
    console.log("\n🎉 Migration concluída com sucesso!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro na migration:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
