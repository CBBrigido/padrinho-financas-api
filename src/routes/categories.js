const { Router } = require("express");
const { list, create, remove } = require("../controllers/categoryController");
const auth = require("../middleware/auth");

const router = Router();

router.use(auth);

router.get("/", list);
router.post("/", create);
router.delete("/:id", remove);

module.exports = router;
