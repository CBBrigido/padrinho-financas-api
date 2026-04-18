const pool = require("../config/database");

// GET /api/transactions?month=4&year=2026&category=moradia&type=despesa
// GET /api/transactions?start_date=2026-01-15&end_date=2026-02-15
const list = async (req, res) => {
  const { month, year, category, type, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];
    let paramIndex = 2;

    if (start_date && end_date) {
      query += ` AND t.date >= $${paramIndex} AND t.date <= $${paramIndex + 1}`;
      params.push(start_date, end_date);
      paramIndex += 2;
    } else if (month && year) {
      query += ` AND EXTRACT(MONTH FROM t.date) = $${paramIndex}
                 AND EXTRACT(YEAR FROM t.date) = $${paramIndex + 1}`;
      params.push(parseInt(month), parseInt(year));
      paramIndex += 2;
    }

    if (type && ["receita", "despesa", "reserva"].includes(type)) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      query += ` AND c.name ILIKE $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += " ORDER BY t.date DESC, t.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error("Erro ao listar transações:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// GET /api/transactions/:id
const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    res.json({ transaction: result.rows[0] });
  } catch (err) {
    console.error("Erro ao buscar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// POST /api/transactions
const create = async (req, res) => {
  const { type, description, amount, category_id, date, is_fixed } = req.body;

  try {
    if (!type || !description || !amount || !date) {
      return res.status(400).json({ error: "Tipo, descrição, valor e data são obrigatórios" });
    }

    if (!["receita", "despesa", "reserva"].includes(type)) {
      return res.status(400).json({ error: "Tipo deve ser 'receita', 'despesa' ou 'reserva'" });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Valor deve ser maior que zero" });
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, description, amount, category_id, date, is_fixed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, type, description, parseFloat(amount), category_id || null, date, is_fixed || false]
    );

    // Buscar com dados da categoria
    const full = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ transaction: full.rows[0] });
  } catch (err) {
    console.error("Erro ao criar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// PUT /api/transactions/:id
const update = async (req, res) => {
  const { type, description, amount, category_id, date, is_fixed } = req.body;

  try {
    // Verificar se pertence ao usuário
    const existing = await pool.query(
      "SELECT id FROM transactions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET type = COALESCE($1, type),
           description = COALESCE($2, description),
           amount = COALESCE($3, amount),
           category_id = COALESCE($4, category_id),
           date = COALESCE($5, date),
           is_fixed = COALESCE($6, is_fixed),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [type, description, amount ? parseFloat(amount) : null, category_id, date, is_fixed, req.params.id, req.userId]
    );

    // Buscar com dados da categoria
    const full = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json({ transaction: full.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// DELETE /api/transactions/:id
const remove = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    res.json({ message: "Transação removida com sucesso" });
  } catch (err) {
    console.error("Erro ao remover transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// GET /api/transactions/summary?months=6&year=2026&month=4
const summary = async (req, res) => {
  const { months = 6, year, month } = req.query;

  try {
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;

    // Resumo do mês atual (reserva separada de despesa)
    const monthSummary = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as total_receita,
        COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as total_despesa,
        COALESCE(SUM(CASE WHEN type = 'reserva' THEN amount ELSE 0 END), 0) as total_reserva
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [req.userId, currentMonth, currentYear]
    );

    // Gastos por categoria (apenas despesas, sem reserva)
    const categoryBreakdown = await pool.query(
      `SELECT c.id, c.name, c.color,
              COALESCE(SUM(t.amount), 0) as total
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
         AND t.user_id = $1
         AND t.type = 'despesa'
         AND EXTRACT(MONTH FROM t.date) = $2
         AND EXTRACT(YEAR FROM t.date) = $3
       WHERE (c.is_default = true OR c.user_id = $1)
         AND c.name != 'Reserva'
       GROUP BY c.id, c.name, c.color
       HAVING COALESCE(SUM(t.amount), 0) > 0
       ORDER BY total DESC`,
      [req.userId, currentMonth, currentYear]
    );

    // Comparação últimos N meses (inclui reserva)
    const monthlyComparison = await pool.query(
      `SELECT
        EXTRACT(MONTH FROM date) as month,
        EXTRACT(YEAR FROM date) as year,
        COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as total_receita,
        COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as total_despesa,
        COALESCE(SUM(CASE WHEN type = 'reserva' THEN amount ELSE 0 END), 0) as total_reserva
       FROM transactions
       WHERE user_id = $1
         AND date >= (DATE_TRUNC('month', MAKE_DATE($2, $3, 1)) - INTERVAL '${parseInt(months) - 1} months')
         AND date < DATE_TRUNC('month', MAKE_DATE($2, $3, 1)) + INTERVAL '1 month'
       GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
       ORDER BY year, month`,
      [req.userId, currentYear, currentMonth]
    );

    const s = monthSummary.rows[0];

    res.json({
      current_month: {
        receita: parseFloat(s.total_receita),
        despesa: parseFloat(s.total_despesa),
        reserva: parseFloat(s.total_reserva),
        saldo: parseFloat(s.total_receita) - parseFloat(s.total_despesa) - parseFloat(s.total_reserva),
        over_budget: parseFloat(s.total_despesa) + parseFloat(s.total_reserva) > parseFloat(s.total_receita),
      },
      category_breakdown: categoryBreakdown.rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        total: parseFloat(r.total),
      })),
      monthly_comparison: monthlyComparison.rows.map((r) => ({
        month: parseInt(r.month),
        year: parseInt(r.year),
        receita: parseFloat(r.total_receita),
        despesa: parseFloat(r.total_despesa),
        reserva: parseFloat(r.total_reserva),
      })),
    });
  } catch (err) {
    console.error("Erro no summary:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { list, getById, create, update, remove, summary };
