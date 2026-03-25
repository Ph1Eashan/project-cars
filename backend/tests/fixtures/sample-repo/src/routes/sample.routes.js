const express = require("express");
const sampleService = require("../services/sample.service");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/cars", authMiddleware, async (req, res) => {
  const records = await sampleService.listCars();
  res.json(records);
});

router.post("/cars", authMiddleware, async (req, res) => {
  const record = await sampleService.createCar(req.body);
  res.status(201).json(record);
});

module.exports = router;
