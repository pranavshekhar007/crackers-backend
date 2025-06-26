const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const City = require("../model/city.Schema");

const cityController = express.Router();

cityController.post("/create", async (req, res) => {
  try {
    const { name, state, minimumPrice } = req.body;
    const cityCreated = await City.create({ name, state, minimumPrice });
    sendResponse(res, 200, "Success", {
      message: "City created successfully!",
      data: cityCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

cityController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      stateId,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };
    if (stateId) query.state = stateId;

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const cities = await City.find(query)
      .populate("state", "name")
      .sort({ [sortField]: sortOrder })
      .limit(parseInt(pageCount))
      .skip((parseInt(pageNo) - 1) * parseInt(pageCount));

    const totalCount = await City.countDocuments({});
    const stateCount = stateId ? await City.countDocuments({ state: stateId }) : 0;

    sendResponse(res, 200, "Success", {
      message: "City list retrieved successfully!",
      data: cities,
      documentCount: {
        totalCount,
        filteredCount: stateId ? stateCount : totalCount,
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

cityController.put("/update", async (req, res) => {
  try {
    const { _id } = req.body;
    const city = await City.findById(_id);
    if (!city) {
      return sendResponse(res, 404, "Failed", {
        message: "City not found",
        statusCode: 404,
      });
    }

    const updatedCity = await City.findByIdAndUpdate(_id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "City updated successfully!",
      data: updatedCity,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

cityController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findById(id);
    if (!city) {
      return sendResponse(res, 404, "Failed", {
        message: "City not found",
        statusCode: 404,
      });
    }

    await City.findByIdAndDelete(id);
    sendResponse(res, 200, "Success", {
      message: "City deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});

// Get all cities by stateId (for dropdowns)
cityController.get("/", async (req, res) => {
  try {
    const { stateId } = req.query;

    const query = {};
    if (stateId) query.state = stateId;

    const cities = await City.find(query).sort({ name: 1 });

    sendResponse(res, 200, "Success", {
      message: "City list fetched successfully",
      data: cities,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message,
      statusCode: 500,
    });
  }
});


module.exports = cityController;
