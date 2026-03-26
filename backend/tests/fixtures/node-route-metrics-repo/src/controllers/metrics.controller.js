const fs = require("fs");
const Car = require("../models/car.model");

const listCars = async (req, res) => {
  const cars = await Car.find({});
  const totals = await Car.aggregate([{ $count: "total" }]);
  res.json({ cars, totals });
};

const getHealth = (req, res) => {
  res.json({ ok: true });
};

const slowCars = async (req, res) => {
  const one = fs.readFileSync("one.txt", "utf-8");
  const two = fs.readFileSync("two.txt", "utf-8");
  res.json({ one, two });
};

module.exports = {
  listCars,
  getHealth,
  slowCars
};
