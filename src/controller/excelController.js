const express = require("express");
require("dotenv").config();
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { sendResponse } = require("../utils/common");
const upload = require("../utils/multer");
const Product = require("../model/product.Schema");

const excelController = express.Router();

// Convert string to ObjectId safely
const toObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId(id.trim());
  } catch {
    return null;
  }
};

// Normalize each row before insert
const normalizeProductData = (item) => {
  if (item.categoryId && typeof item.categoryId === "string") {
    item.categoryId = item.categoryId
      .split(",")
      .map(id => toObjectId(id))
      .filter(Boolean);
  }

  if (item.venderId && typeof item.venderId === "string") {
    item.venderId = item.venderId
      .split(",")
      .map(id => toObjectId(id))
      .filter(Boolean);
  }

  if (item.brandId && typeof item.brandId === "string") {
    item.brandId = toObjectId(item.brandId);
  }

  if (item.productGallery && typeof item.productGallery === "string") {
    try {
      item.productGallery = JSON.parse(item.productGallery);
    } catch {
      item.productGallery = item.productGallery
        .split(",")
        .map(img => img.trim());
    }
  }

  if (item.productOtherDetails && typeof item.productOtherDetails === "string") {
    try {
      item.productOtherDetails = JSON.parse(item.productOtherDetails);
    } catch {
      item.productOtherDetails = [];
    }
  }

  if (item.productVariants && typeof item.productVariants === "string") {
    try {
      item.productVariants = JSON.parse(item.productVariants);
    } catch {
      item.productVariants = [];
    }
  }

  return item;
};

// BULK UPLOAD
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

    fs.unlinkSync(filePath); // Clean up

    if (!jsonData || jsonData.length === 0) {
      return sendResponse(res, 422, "Failed", {
        message: "Excel file is empty or invalid",
        statusCode: 422,
      });
    }

    const processedData = jsonData
      .filter(item => item.name && item.price)
      .map(normalizeProductData);

    const insertedProducts = await Product.insertMany(processedData);

    return sendResponse(res, 200, "Success", {
      message: "Excel data uploaded and saved successfully!",
      data: insertedProducts,
      statusCode: 200,
    });

  } catch (error) {
    console.error("Excel Upload Error:", error);
    return sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
      statusCode: 500,
    });
  }
});

// EXPORT PRODUCTS
excelController.post("/export", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      categoryId,
      sortByField,
      sortByOrder,
      format = "excel",
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };
    if (categoryId) query.categoryId = categoryId;

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const productList = await Product.find(query)
      .populate("venderId")
      .populate("categoryId")
      .sort(sortOption);

    const formattedData = productList.map((product) => ({
      Name: product.name,
      Tags: product.tags?.join(", "),
      Type: product.productType,
      Tax: product.tax,
      Category: product.categoryId?.map((cat) => cat.name).join(", "),
      Vender: product.venderId?.map((v) => v.name).join(", "),
      HSN: product.hsnCode,
      GTIN: product.GTIN,
      Price: product.price,
      DiscountedPrice: product.discountedPrice,
      Stock: product.stockQuantity,
      Pieces: product.numberOfPieces,
      Status: product.status ? "Active" : "Inactive",
      CreatedAt: product.createdAt,
    }));

    const exportDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const fileName = `productList.${
      format === "txt" ? "txt" : format === "csv" ? "csv" : "xlsx"
    }`;
    const filePath = path.join(exportDir, fileName);

    if (format === "csv") {
      const worksheet = xlsx.utils.json_to_sheet(formattedData);
      const csvData = xlsx.utils.sheet_to_csv(worksheet);
      fs.writeFileSync(filePath, csvData);
    } else if (format === "txt") {
      const txtData = formattedData
        .map((item) => Object.values(item).join(" | "))
        .join("\n");
      fs.writeFileSync(filePath, txtData);
    } else {
      const worksheet = xlsx.utils.json_to_sheet(formattedData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Products");
      xlsx.writeFile(workbook, filePath);
    }

    res.download(filePath, fileName, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("File delete error:", unlinkErr);
      });
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
    });
  }
});

module.exports = excelController;
