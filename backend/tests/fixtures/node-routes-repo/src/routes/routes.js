const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => res.json({ ok: true }));
router.get("/cars", (req, res) => res.json([]));
router.post("/cars", (req, res) => res.status(201).json({ ok: true }));
router.patch("/cars/:id", (req, res) => res.json({ ok: true }));
router.delete("/cars/:id", (req, res) => res.status(204).send());

module.exports = router;
