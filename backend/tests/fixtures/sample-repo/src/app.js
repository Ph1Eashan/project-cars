const express = require("express");
const router = require("./routes/sample.routes");

const app = express();

app.use(express.json());
app.use("/api", router);
app.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;
