const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const subscriptionChitSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  totalAmount: {
    type: Number,
  },
  monthlyAmount: {
    type: Number,
  },
  totalMonths: {
    type: Number,
  },
  enrolmentDate: {
    type: Date,
    default: Date.now,
  },
  schemeStartDate: {
    type: Date,
  },
  schemeEndDate: {
    type: Date,
  },
  paidMonths: [
    {
      monthNumber: Number,
      paymentDate: Date,
      screenshotURL: String,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
    },
  ],
  paymentSs: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

subscriptionChitSchema.plugin(timestamps);
module.exports = mongoose.model("SubscriptionChit", subscriptionChitSchema);
