var express = require("express");
const csvGeneratorController = require("../controller/csvGenerator.controller");
const router = express.Router();

router.post("/generateCsv", csvGeneratorController.generateCsv);
module.exports = router;
