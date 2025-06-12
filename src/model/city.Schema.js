const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  minimumPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("City", citySchema);
