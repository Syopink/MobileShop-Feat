const mongoose = require("../../common/database")();

const orderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    provinceId: {
      type: Number,
      required: true,
    },
    districtId: {
      type: Number,
      required: true,
    },
    wardCode: {
      type: String,
      required: true,
    },
    items: [
      {
        prd_id: {
          type: mongoose.Types.ObjectId,
          required: true,
          ref: "Products",
        },
        prd_qty: {
          type: Number,
          required: true,
        },
        prd_name: {
          type: String,
          required: true,
        },
        prd_thumbnail: {
          type: String,
          required: true,
        },
        prd_price: {
          type: Number,
          required: true,
        },
        weight: {
          type: Number,
          default: 500,
        },
        code: {
          type: String,
        },
      },
    ],
    shippingFee: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    ghn_order_code: {
      type: String,
      default: null,
    },
    status: {
      type: Number,
      default: 2,
    },
    status_text: {
      type: String,
      enum: [
        "pending_payment",
        "ready_to_pick",
        "pending_retry",
        "picking",
        "delivering",
        "delivered",
        "cancel",
        "paid",
        "payment_failed",
        "picking",
        "storing",
        "transporting",
        "sorting",
        "delivery_fail",
        "waiting_to_return",
        "return",
        "return_transporting",
        "returned",
        "lost",
        "damage",
        "exception",
      ],
      default: "ready_to_pick",
    },
    status_history: [
      {
        status: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    payment_method: {
      type: String,
      enum: ["cod", "vnpay"],
      default: "cod",
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["unpaid", "paid", "pending_payment", "failed"],
      default: "unpaid",
      required: true,
    },
    vnpay_txn_ref: {
      type: String,
      default: null,
    },
    vnpay_transaction_no: {
      type: String,
      default: null,
    },
    vnpay_paid_at: {
      type: Date,
      default: null,
    },
    vnpay_retry_txn_ref: {
      type: String,
      default: null,
    },
    vnpay_retries: [
      {
        txn_ref: String,
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const orderModel = mongoose.model("Orders", orderSchema, "orders");
module.exports = orderModel;
