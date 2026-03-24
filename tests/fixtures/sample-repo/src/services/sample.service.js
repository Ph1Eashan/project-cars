const CarModel = require("../models/car.model");

async function listCars() {
  return CarModel.find();
}

async function createCar(payload) {
  return CarModel.create(payload);
}

module.exports = {
  listCars,
  createCar
};
