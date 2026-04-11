const { Router } = require("express");
const { list, getById, create, update, remove, summary } = require("../controllers/transactionController");
const auth = require("../middleware/auth");

const router = Router();

// Todas as rotas precisam de autenticação
router.use(auth);

router.get("/summary", summary);
router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;
