const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
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
  minimumPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

module.exports = mongoose.model("City", citySchema);
