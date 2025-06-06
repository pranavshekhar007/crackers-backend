const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const bookingSchema = mongoose.Schema({
  totalAmount: {
    type: String,
  },
  status: {
    type: String,
    default: "orderPlaced",
    enum: ["orderPlaced", "orderPacked", "outForDelivery", "completed", "cancelled"],
  },
  signature: {
    type: String,
    require: true,
  },

  modeOfPayment: {
    type: String,
    enum: ["COD", "Online"],
  },
  paymentId: {
    type: String,
  },
  product: [
    {
      productId: { type: String, ref: "Product" },
      quantity: { type: Number },
      totalPrice: { type: Number },
      productHeroImage: { type: String }
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
});

bookingSchema.plugin(timestamps);
module.exports = mongoose.model("Booking", bookingSchema);
