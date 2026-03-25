const express = require("express");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.post("/cars", (_req, res) => res.json({ created: true }));

module.exports = router;
