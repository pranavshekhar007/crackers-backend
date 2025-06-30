const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Address = require("../model/address.Schema");
const Area = require("../model/area.Schema");
const addressController = express.Router();
require("dotenv").config();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const auth = require("../utils/auth");

addressController.post("/create", async (req, res) => {
  try {
    const { area, ...rest } = req.body;

    // Fetch area ObjectId from areaId number or name sent from frontend
    const areaDetails =
      (await Area.findOne({ areaId: area })) || (await Area.findById(area));
    if (!areaDetails) {
      return sendResponse(res, 404, "Failed", { message: "Area not found" });
    }

    const addressCreated = await Address.create({
      ...rest,
      area: areaDetails._id, // store ObjectId
    });

    sendResponse(res, 200, "Success", {
      message: "Address created successfully!",
      data: addressCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

addressController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      userId,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    // Construct sorting object
    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    // Fetch the category list
    const addressList = await Address.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip(parseInt(pageNo - 1) * parseInt(pageCount))
      .populate({
        path: "userId",
        select: "name description email",
      })
      .populate({
        path: "area",
        select: "name minimumPrice deliveryCharge", // fetch needed area fields
      });

    const totalCount = await Address.countDocuments({});
    const activeCount = await Address.countDocuments({ status: true });

    sendResponse(res, 200, "Success", {
      message: "Address list retrieved successfully!",
      data: addressList,
      documentCount: {
        totalCount,
        activeCount,
        inactiveCount: totalCount - activeCount,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

addressController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const addressData = await Address.findById(id);
    if (!addressData) {
      return sendResponse(res, 404, "Failed", { message: "Address not found" });
    }

    let updatedData = { ...req.body };

    if (updatedData.area) {
      const areaDetails =
        (await Area.findOne({ areaId: updatedData.area })) ||
        (await Area.findById(updatedData.area));
      if (!areaDetails) {
        return sendResponse(res, 404, "Failed", { message: "Area not found" });
      }
      updatedData.area = areaDetails._id;
    }

    const updatedAddress = await Address.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    sendResponse(res, 200, "Success", {
      message: "Address updated successfully!",
      data: updatedAddress,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

addressController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const addressItem = await Address.findById(id);
    if (!addressItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Address not found",
      });
    }
    // Delete the address from the database
    await Address.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Address deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = addressController;
