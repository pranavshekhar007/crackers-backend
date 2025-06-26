const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
    required: true,
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
  },
  pincode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pincode",
  },
  minimumPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharge: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

areaSchema.plugin(timestamps);
module.exports = mongoose.model("Area", areaSchema);
