const express = require("express");
const subscriptionChitController = express.Router();
const { sendResponse } = require("../utils/common");
const SubscriptionChit = require("../model/subscriptionChit.Schema");
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
require("dotenv").config();
const SchemeConfig = require("../model/schemeConfig.Schema");

subscriptionChitController.post("/create", async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;

    const config = await SchemeConfig.findOne();
    if (!config) {
      return sendResponse(res, 404, "Failed", {
        message: "Scheme config not found. Contact admin.",
        statusCode: 404,
      });
    }

    const enrolmentDate = new Date();
    const start = config.schemeStartDate;
    const end = config.schemeEndDate;

    const monthsDiff =
      (end.getFullYear() - enrolmentDate.getFullYear()) * 12 +
      (end.getMonth() - enrolmentDate.getMonth()) +
      1;

    const monthlyAmount = Math.ceil(totalAmount / monthsDiff);

    const chitCreated = await SubscriptionChit.create({
      userId,
      totalAmount,
      monthlyAmount,
      totalMonths: monthsDiff,
      schemeStartDate: start,
      schemeEndDate: end,
      enrolmentDate,
    });

    sendResponse(res, 200, "Success", {
      message: "Subscription chit created successfully!",
      data: chitCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});


/**
 * List chit subscriptions
 */
subscriptionChitController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      userId,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      status,
    } = req.body;

    const query = {};
    if (userId) query.userId = userId;
    if (status !== undefined && status !== "") query.status = status;

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const chitList = await SubscriptionChit.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((parseInt(pageNo) - 1) * parseInt(pageCount))
      .populate("userId");

    const totalCount = await SubscriptionChit.countDocuments(query);
    const activeCount = await SubscriptionChit.countDocuments({
      ...query,
      status: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Subscription chit list retrieved successfully!",
      data: chitList,
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
      statusCode: 500,
    });
  }
});

/**
 * Update chit subscription or payment approval
 */
subscriptionChitController.put("/update", async (req, res) => {
  try {
    const { _id, monthNumber, paymentDate, action } = req.body;

    const chit = await SubscriptionChit.findById(_id);
    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404,
      });
    }

    const monthIndex = chit.paidMonths.findIndex((m) => m.monthNumber == monthNumber);

    if (monthIndex >= 0) {
      chit.paidMonths[monthIndex].paymentDate = paymentDate || chit.paidMonths[monthIndex].paymentDate;
      chit.paidMonths[monthIndex].status = action || chit.paidMonths[monthIndex].status;
    } else {
      chit.paidMonths.push({
        monthNumber,
        paymentDate,
        status: action || "pending",
      });
    }

    await chit.save();

    sendResponse(res, 200, "Success", {
      message: "Subscription chit updated successfully!",
      data: chit,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

/**
 * Get chit subscription details by ID
 */
subscriptionChitController.get("/details/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const chit = await SubscriptionChit.findById(id).populate("userId");
    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404,
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Subscription chit details retrieved successfully!",
      data: chit,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

/**
 * Delete chit subscription by ID
 */
subscriptionChitController.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const chit = await SubscriptionChit.findById(id);
    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404,
      });
    }

    await SubscriptionChit.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Subscription chit deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

subscriptionChitController.put("/upload/payment-ss", upload.single("paymentSs"), async (req, res) => {
  try {
    const { chitId, monthNumber } = req.body;

    const chit = await SubscriptionChit.findById(chitId);
    if (!chit) {
      return sendResponse(res, 404, "Failed", {
        message: "Subscription chit not found",
        statusCode: 404,
      });
    }

    if (!monthNumber) {
      return sendResponse(res, 400, "Failed", {
        message: "monthNumber is required",
        statusCode: 400,
      });
    }

    let screenshotURL = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path);
      screenshotURL = uploaded.url;
    } else {
      return sendResponse(res, 400, "Failed", {
        message: "No payment screenshot uploaded",
        statusCode: 400,
      });
    }

    const monthIndex = chit.paidMonths.findIndex((m) => m.monthNumber == monthNumber);

    if (monthIndex >= 0) {
      chit.paidMonths[monthIndex].screenshotURL = screenshotURL;
      chit.paidMonths[monthIndex].status = "pending";
    } else {
      chit.paidMonths.push({
        monthNumber,
        paymentDate: new Date(),
        screenshotURL,
        status: "pending",
      });
    }

    await chit.save();

    sendResponse(res, 200, "Success", {
      message: "Payment screenshot uploaded successfully!",
      data: chit,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});


module.exports = subscriptionChitController;
