const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const productSchema = mongoose.Schema({
  // step 1
  name: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
  },
  productType: {
    type: String,
  },
  tax: {
    type: String,
  },
  categoryId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  venderId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vender",
    },
  ],
  hsnCode: {
    type: Number,
  },
  GTIN: {
    type: Number,
  },

  shortDescription: {
    type: String,
  },

  // step 2
  stockQuantity: {
    type: Number,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },
  price: {
    type: Number,
  },
  discountedPrice: {
    type: Number,
  },
  numberOfPieces: {
    type: Number,
  },

  description: {
    type: String,
  },

  // step 3
  productHeroImage: {
    type: String,
  },

  productGallery: {
    type: [String],
  },
  productVideo: {
    type: String,
  },

  // step 4 attributes
  productOtherDetails: [
    {
      key: { type: String },
      value: [{ type: String }],
    },
  ],
  productVariants: [
    {
      variantKey: { type: String },
      variantValue: { type: String },
      variantPrice: { type: Number },
      variantDiscountedPrice: { type: Number },
      variantImage: { type: String },
    },
  ],
  status: {
    type: Boolean,
    default: true,
  },
});

productSchema.plugin(timestamps);
module.exports = mongoose.model("Product", productSchema);
