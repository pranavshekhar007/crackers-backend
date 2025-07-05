const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const subscriptionChitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  price: { type: Number, required: true },
  discountRate: { type: Number, default: 0 },
  image: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

subscriptionChitSchema.plugin(timestamps);
module.exports = mongoose.model("SubscriptionChit", subscriptionChitSchema);
