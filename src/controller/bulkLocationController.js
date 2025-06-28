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

// Helper: Auto-increment IDs for all rows efficiently
const getStartingIdField = async (Model, field) => {
  const last = await Model.findOne().sort({ [field]: -1 });
  return last && Number.isInteger(last[field]) ? last[field] + 1 : 1;
};

// Helper: Convert reference names to IDs for upload with sequential IDs
const resolveReferences = async (item, locationType, idCounters) => {
  if (locationType === "Areas") {
    const state = await State.findOne({ name: item.state });
    const city = await City.findOne({ name: item.city });
    const pincode = await Pincode.findOne({ pincode: item.pincode });

    item.stateId = state ? state.stateId : null;
    item.cityId = city ? city.cityId : null;
    item.pincodeId = pincode ? pincode.pincodeId : null;

    delete item.state;
    delete item.city;
    delete item.pincode;

    if (!item.areaId) {
      item.areaId = idCounters.areaId++;
    }

  } else if (locationType === "Cities") {
    const state = await State.findOne({ name: item.state });
    item.stateId = state ? state.stateId : null;
    delete item.state;

    if (!item.cityId) {
      item.cityId = idCounters.cityId++;
    }

  } else if (locationType === "States") {
    if (!item.stateId) {
      item.stateId = idCounters.stateId++;
    }

  } else if (locationType === "Pincodes") {
    if (!item.pincodeId) {
      item.pincodeId = idCounters.pincodeId++;
    }
  }
};


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
    fs.unlinkSync(filePath);

    const Model = getModelByType(locationType);
    if (!Model) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid locationType",
        statusCode: 400,
      });
    }

    // Initialize ID counters
    const idCounters = {};
    if (locationType === "States") {
      idCounters.stateId = await getStartingIdField(State, "stateId");
    } else if (locationType === "Cities") {
      idCounters.cityId = await getStartingIdField(City, "cityId");
    } else if (locationType === "Areas") {
      idCounters.areaId = await getStartingIdField(Area, "areaId");
    } else if (locationType === "Pincodes") {
      idCounters.pincodeId = await getStartingIdField(Pincode, "pincodeId");
    }

    for (const item of json) {
      await resolveReferences(item, locationType, idCounters);

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

    const data = await Model.find({});

    const formatted = data.map((item) => {
      const obj = item.toObject();
      return obj; // Now contains stateId, cityId, pincodeId, areaId fields
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
