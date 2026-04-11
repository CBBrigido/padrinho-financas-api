const pool = require("../config/database");

// GET /api/categories
const list = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM categories
       WHERE is_default = true OR user_id = $1
       ORDER BY is_default DESC, name ASC`,
      [req.userId]
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error("Erro ao listar categorias:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// POST /api/categories
const create = async (req, res) => {
  const { name, color } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `INSERT INTO categories (user_id, name, color, is_default)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [req.userId, name, color || "#8E99A9"]
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    console.error("Erro ao criar categoria:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// DELETE /api/categories/:id
const remove = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false RETURNING id",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoria não encontrada ou não pode ser removida" });
    }

    res.json({ message: "Categoria removida com sucesso" });
  } catch (err) {
    console.error("Erro ao remover categoria:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { list, create, remove };
