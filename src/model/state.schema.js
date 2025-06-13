const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const stateSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  status: {
    type: Boolean,
    default: true,
  },
});

stateSchema.plugin(timestamps);
module.exports = mongoose.model("State", stateSchema);
