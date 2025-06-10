const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

stateSchema.plugin(timestamps);
module.exports = mongoose.model("State", stateSchema);
