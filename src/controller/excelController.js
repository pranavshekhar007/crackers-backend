const express = require("express");
const xlsx = require("xlsx");
const fs = require("fs");
const { sendResponse } = require("../utils/common");
const upload = require("../utils/multer");

const excelController = express.Router();

excelController.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, "Failed", {
        message: "No file uploaded",
        statusCode: 400,
      });
    }

    const filePath = req.file.path;

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    fs.unlinkSync(filePath);

    return sendResponse(res, 200, "Success", {
      message: "Excel data parsed successfully!",
      data: jsonData,
      statusCode: 200,
    });

  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
      statusCode: 500,
    });
  }
});

module.exports = excelController;
