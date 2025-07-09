const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const subscriptionChitSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String },
  email: { type: String },
  location: { type: String },
  duration: { type: Number },
  price: { type: String },
  discountRate: { type: Number, default: 0 },
  image: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: Boolean, default: true },
});

subscriptionChitSchema.plugin(timestamps);
module.exports = mongoose.model("SubscriptionChit", subscriptionChitSchema);
