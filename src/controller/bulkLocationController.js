const express = require("express");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const { sendResponse } = require("../utils/common");
const multer = require("multer");
require("dotenv").config();

const State = require("../model/state.schema");
const City = require("../model/city.Schema");
const Area = require("../model/area.Schema");
const Pincode = require("../model/pincode.Schema");

const bulkLocationController = express.Router();
const upload = multer({ dest: "/tmp" });

// Helper: Get model by type
const getModelByType = (type) => {
  switch (type.toLowerCase()) {
    case "states": return State;
    case "cities": return City;
    case "areas": return Area;
    case "pincodes": return Pincode;
    default: return null;
  }
};

// Helper: Get fields to populate by model type
const getPopulateFields = (type) => {
  switch (type.toLowerCase()) {
    case "areas": return ["state", "city", "pincode"];
    case "cities": return ["state"];
    default: return [];
  }
};

// Helper: Convert reference names to IDs
const resolveReferences = async (item, locationType) => {
  if (locationType === "Areas") {
    const [state, city, pincode] = await Promise.all([
      State.findOne({ name: item.state }),
      City.findOne({ name: item.city }),
      Pincode.findOne({ pincode: item.pincode }),
    ]);
    item.state = state?._id;
    item.city = city?._id;
    item.pincode = pincode?._id;
  } else if (locationType === "Cities") {
    const state = await State.findOne({ name: item.state });
    item.state = state?._id;
  }
};

// Bulk Upload Endpoint
bulkLocationController.post("/bulk-upload", upload.single("file"), async (req, res) => {
  try {
    const { type, locationType } = req.body;

    if (!req.file) {
      return sendResponse(res, 400, "Failed", {
        message: "No file uploaded",
        statusCode: 400,
      });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = xlsx.utils.sheet_to_json(sheet);
    fs.unlinkSync(filePath); // Delete file after reading

    const Model = getModelByType(locationType);
    if (!Model) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid locationType",
        statusCode: 400,
      });
    }

    for (const item of json) {
      await resolveReferences(item, locationType);
      if (type === "upload") {
        await Model.create(item);
      } else if (type === "update" && item._id) {
        await Model.findByIdAndUpdate(item._id, item);
      }
    }

    return sendResponse(res, 200, "Success", {
      message: `${locationType} ${type} completed`,
      count: json.length,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    return sendResponse(res, 500, "Failed", {
      message: error.message || "Bulk upload failed",
      statusCode: 500,
    });
  }
});

// Bulk Download Endpoint
bulkLocationController.post("/bulk-download", async (req, res) => {
  try {
    const { locationType, format = "excel" } = req.body;

    const Model = getModelByType(locationType);
    if (!Model) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid locationType",
        statusCode: 400,
      });
    }

    const populateFields = getPopulateFields(locationType);
    const data = await Model.find({}).populate(populateFields);

    const formatted = data.map((item) => {
      const obj = item.toObject();
      if (locationType === "Areas") {
        obj.state = obj.state?.name;
        obj.city = obj.city?.name;
        obj.pincode = obj.pincode?.pincode;
      } else if (locationType === "Cities") {
        obj.state = obj.state?.name;
      }
      return obj;
    });

    const exportDir = "/tmp";
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const fileName = `${locationType}_export.${format === "csv" ? "csv" : format === "txt" ? "txt" : "xlsx"}`;
    const filePath = path.join(exportDir, fileName);

    if (format === "csv") {
      const worksheet = xlsx.utils.json_to_sheet(formatted);
      const csvData = xlsx.utils.sheet_to_csv(worksheet);
      fs.writeFileSync(filePath, csvData);
    } else if (format === "txt") {
      const txtData = formatted.map(item => Object.values(item).join(" | ")).join("\n");
      fs.writeFileSync(filePath, txtData);
    } else {
      const worksheet = xlsx.utils.json_to_sheet(formatted);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, locationType);
      xlsx.writeFile(workbook, filePath);
    }

    res.download(filePath, fileName, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("File delete error:", unlinkErr);
      });
    });
  } catch (err) {
    console.error("Bulk Download Error:", err);
    return sendResponse(res, 500, "Failed", {
      message: err.message || "Bulk download failed",
      statusCode: 500,
    });
  }
});

module.exports = bulkLocationController;
