const express = require("express");
const SubscriptionChit = require("../model/subscriptionChit.Schema");
const { sendResponse } = require("../utils/common");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const subscriptionChitController = express.Router();
require("dotenv").config();

subscriptionChitController.post("/create", upload.single("image"), async (req, res) => {
    try {
      const { name, duration, price, discountRate, userId, status } = req.body;
  
      if (duration < 3) {
        return sendResponse(res, 400, "Failed", {
          message: "Minimum duration is 3 months.",
          statusCode: 400
        });
      }
  
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(duration));
  
      let obj = {
        name,
        duration,
        price,
        discountRate,
        startDate,
        endDate,
        userId,
        status
      };
  
      if (req.file) {
        const image = await cloudinary.uploader.upload(req.file.path);
        obj.image = image.url;
      }
  
      const subscriptionCreated = await SubscriptionChit.create(obj);
  
      sendResponse(res, 200, "Success", {
        message: "Subscription chit created successfully!",
        data: subscriptionCreated,
        statusCode: 200
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
        statusCode: 500
      });
    }
  });
  

subscriptionChitController.post("/list", async (req, res) => {
  try {
    const { searchKey = "", status, pageNo = 1, pageCount = 10, sortByField, sortByOrder } = req.body;
    const query = {};
    if (status) query.status = status;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const chitList = await SubscriptionChit.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip(parseInt(pageNo - 1) * parseInt(pageCount));

    const totalCount = await SubscriptionChit.countDocuments(query);
    const activeCount = await SubscriptionChit.countDocuments({ status: true });

    sendResponse(res, 200, "Success", {
      message: "Subscription chit list retrieved successfully!",
      data: chitList,
      documentCount: { totalCount, activeCount, inactiveCount: totalCount - activeCount },
      statusCode: 200
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500
    });
  }
});

subscriptionChitController.put("/update", upload.single("image"), async (req, res) => {
  try {
    const id = req.body._id;
    const chit = await SubscriptionChit.findById(id);

    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404
      });
    }

    let updatedData = { ...req.body };

    // Image upload
    if (req.file) {
      if (chit.image) {
        const publicId = chit.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      const image = await cloudinary.uploader.upload(req.file.path);
      updatedData.image = image.url;
    }

    const updatedChit = await SubscriptionChit.findByIdAndUpdate(id, updatedData, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Subscription chit updated successfully!",
      data: updatedChit,
      statusCode: 200
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500
    });
  }
});

subscriptionChitController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const chit = await SubscriptionChit.findById(id);

    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404
      });
    }

    if (chit.image) {
      const publicId = chit.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await SubscriptionChit.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Subscription chit deleted successfully!",
      statusCode: 200
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500
    });
  }
});

subscriptionChitController.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const chitDetails = await SubscriptionChit.findById(id);
    sendResponse(res, 200, "Success", {
      message: "Subscription chit details retrieved successfully!",
      data: chitDetails,
      statusCode: 200
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500
    });
  }
});

module.exports = subscriptionChitController;
