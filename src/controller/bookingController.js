const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Booking = require("../model/booking.Schema");
const bookingController = express.Router();
require("dotenv").config();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const auth = require("../utils/auth");
const fs = require("fs");
const path = require("path");


bookingController.post("/create", async (req, res) => {
  try {
    const { userId, totalAmount, product, modeOfPayment, paymentId, signature, address, status } = req.body;

    // Validate required fields
    if (!userId) {
      return sendResponse(res, 400, "Failed", {
        message: "userId is required in the request body",
        statusCode: 400,
      });
    }

    const bookingData = {
      userId,
      totalAmount,
      product,
      modeOfPayment,
      paymentId,
      signature,
      address,
      status,
    };

    const bookingCreated = await Booking.create(bookingData);

    sendResponse(res, 200, "Success", {
      message: "Booking created successfully!",
      data: bookingCreated,
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

bookingController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) query.status = { $regex: searchKey, $options: "i" };

    // Construct sorting object
    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    // Fetch the booking list
    const bookingList = await Booking.find(query)
      .populate("userId", "firstName lastName")
      .populate({
        path: "product.productId",
        select: "name description productHeroImage",
      })
      .sort(sortOption)
      .skip(parseInt(pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount))
      

    const totalCount = await Booking.countDocuments(query);

    const statusCounts = await Booking.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Map status counts
    const statusCountMap = {
      orderPlaced: 0,
      orderPacked: 0,
      orderDispatch: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      statusCountMap[_id] = count;
    });

    // 📌 Date calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 📌 Counts based on createdAt date
    const todaysOrder = await Booking.countDocuments({
      ...query,
      createdAt: { $gte: todayStart },
    });

    const thisWeekOrder = await Booking.countDocuments({
      ...query,
      createdAt: { $gte: weekStart },
    });

    const thisMonthOrder = await Booking.countDocuments({
      ...query,
      createdAt: { $gte: monthStart },
    });

    sendResponse(res, 200, "Success", {
      message: "Booking list retrieved successfully!",
      data: bookingList,
      documentCount: {
        totalCount,
        ...statusCountMap,
        todaysOrder,
        thisWeekOrder,
        thisMonthOrder,
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


bookingController.get("/details/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const booking = await Booking.find({ userId: userId })
      .populate("product.productId")
      .populate("userId");

    if (booking.length > 0) {
      return sendResponse(res, 200, "Success", {
        message: "Booking details fetched successfully",
        data: booking,
        statusCode: 200,
      });
    } else {
      return sendResponse(res, 404, "Failed", {
        message: "No bookings found for this user",
        statusCode: 404,
      });
    }
  } catch (error) {
    return sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error.",
      statusCode: 500,
    });
  }
});

bookingController.put("/update",async (req, res) => {
    try {
      const id = req.body.id;
      const venderData = await Vender.findById(id);
      if (!venderData) {
        return sendResponse(res, 404, "Failed", {
          message: "Vender not found",
        });
      }

      let updateData = { ...req.body }
      const updatedUserData = await Vender.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      if(req.body.profileStatus=="reUploaded"){
        sendNotification({
          icon:updatedUserData.profilePic,
          title:`${updatedUserData.firstName} has re-uploaded the details`,
          subTitle:`${updatedUserData.firstName} has re-uploaded the details`,
          notifyUserId:"Admin",
          category:"Vender",
          subCategory:"Profile update",
          notifyUser:"Admin",
        }, req.io)
      }
         if(req.body.profileStatus=="rejected"){
                sendNotification({
                  icon:updatedUserData.profilePic,
                  title:`${updatedUserData.firstName} your details has been rejected`,
                  subTitle:`${updatedUserData.firstName} please go through the details once more`,
                  notifyUserId:updatedUserData._id,
                  category:"Vender",
                  subCategory:"Profile update",
                  notifyUser:"Vender",
                }, req.io)
              }
      if(req.body.profileStatus=="approved"){
        sendNotification({
          icon:updatedUserData.profilePic,
          title:`${updatedUserData.firstName} your profile has been approved`,
          subTitle:`${updatedUserData.firstName} congratulations!! your profile has been approved`,
          notifyUserId:updatedUserData._id,
          category:"Vender",
          subCategory:"Profile update",
          notifyUser:"Vender",
        }, req.io)
      }
      if(req.body.profileStatus=="storeDetailsCompleted"){
        sendNotification({
          icon:updatedUserData.profilePic,
          title:`${updatedUserData.firstName} your storeDetails has been Completed`,
          subTitle:`${updatedUserData.firstName} congratulations!! your storeDetails has been Completed`,
          notifyUserId:updatedUserData._id,
          category:"Vender",
          subCategory:"Profile update",
          notifyUser:"Vender",
        }, req.io)
      }
      sendResponse(res, 200, "Success", {
        message: "Vendor updated successfully!",
        data: updatedUserData,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error.",
      });
    }
  }
);

bookingController.put("/upload/payment-ss", upload.single("paymentSs"), async (req, res) => {
    try {
      const bookingId = req.body.id;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return sendResponse(res, 404, "Failed", {
          message: "Booking not found",
          statusCode: 404,
        });
      }

      let updatedData = { ...req.body };

      if (req.file) {
        const paymentScreenshot = await cloudinary.uploader.upload(req.file.path);
        updatedData.paymentSs = paymentScreenshot.url;
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        updatedData,
        { new: true }
      );

      sendResponse(res, 200, "Success", {
        message: "Payment screenshot uploaded successfully!",
        data: updatedBooking,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
        statusCode: 500,
      });
    }
  }
);


module.exports = bookingController;
