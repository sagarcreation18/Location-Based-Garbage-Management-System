const express = require("express");
const auth = require("../middleware/authMiddleware");
const audit = require("../middleware/audit");
const support = require("../controllers/supportController");
const router = express.Router();
router.use(auth, audit("support"));
router.post("/tickets", support.createTicket);
router.post("/assistant", support.askAssistant);
module.exports = router;
