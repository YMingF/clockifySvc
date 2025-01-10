const csvGeneratorService = require("../services/csvGenerator.service");

const generateCsv = async (req, res, next) => {
  try {
    console.log("Controller: Starting CSV generation...");
    const result = await csvGeneratorService.generateTimeReport(req);
    console.log("Controller: Result received:", result);

    if (!result) {
      console.log("Controller: No result received from service");
      return res.status(500).json({ error: "Failed to generate CSV" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Controller: Error occurred:", error);
    next(error);
  }
};

module.exports = {
  generateCsv,
};
