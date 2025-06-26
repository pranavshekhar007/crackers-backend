const express = require("express");
const { sendResponse } = require("../utils/common");
const Area = require("../model/area.Schema");
require("dotenv").config();

const areaController = express.Router();

// Create Area
areaController.post("/create", async (req, res) => {
  try {
    const { name, state, city, pincode, minimumPrice, deliveryCharge } = req.body;

    const areaCreated = await Area.create({
      name,
      state,
      city,
      pincode,
      minimumPrice,
      deliveryCharge,
    });

    sendResponse(res, 200, "Success", {
      message: "Area created successfully!",
      data: areaCreated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

// List Areas
areaController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      stateId,
      cityId,
      pincodeId,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };
    if (stateId) query.state = stateId;
    if (cityId) query.city = cityId;
    if (pincodeId) query.pincode = pincodeId;

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const areas = await Area.find(query)
      .populate("state", "name")
      .populate("city", "name")
      .populate("pincode", "pincode")
      .sort({ [sortField]: sortOrder })
      .limit(parseInt(pageCount))
      .skip((parseInt(pageNo) - 1) * parseInt(pageCount));

    const totalCount = await Area.countDocuments({});
    const filteredCount = await Area.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Area list retrieved successfully!",
      data: areas,
      documentCount: {
        totalCount,
        filteredCount,
      },
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

// Update Area
areaController.put("/update", async (req, res) => {
  try {
    const { _id } = req.body;
    const area = await Area.findById(_id);
    if (!area) {
      return sendResponse(res, 404, "Failed", {
        message: "Area not found",
        statusCode: 404,
      });
    }

    const updatedArea = await Area.findByIdAndUpdate(_id, req.body, { new: true });
    sendResponse(res, 200, "Success", {
      message: "Area updated successfully!",
      data: updatedArea,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

// Delete Area
areaController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const area = await Area.findById(id);
    if (!area) {
      return sendResponse(res, 404, "Failed", {
        message: "Area not found",
        statusCode: 404,
      });
    }

    await Area.findByIdAndDelete(id);
    sendResponse(res, 200, "Success", {
      message: "Area deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

module.exports = areaController;
