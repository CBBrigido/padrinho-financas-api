const pool = require("../config/database");
require("dotenv").config();

const defaultCategories = [
  { name: "Moradia", color: "#E8575A" },
  { name: "Alimentação", color: "#F4A940" },
  { name: "Transporte", color: "#3EAFC4" },
  { name: "Lazer", color: "#9B6DD7" },
  { name: "Saúde", color: "#4ACA8B" },
  { name: "Educação", color: "#5B8DEF" },
  { name: "Serviços", color: "#E87BAF" },
  { name: "Outros", color: "#8E99A9" },
];

const seed = async () => {
  const client = await pool.connect();

  try {
    // Inserir categorias padrão (sem user_id = globais)
    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (name, color, is_default)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [cat.name, cat.color]
      );
    }

    console.log("🌱 Categorias padrão inseridas com sucesso!");
  } catch (err) {
    console.error("❌ Erro no seed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
