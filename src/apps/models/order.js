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
      required: true, // GHN yêu cầu có mã tỉnh
    },
    districtId: {
      type: Number,
      required: true, // GHN yêu cầu có mã quận/huyện
    },
    wardCode: {
      type: String,
      required: true, // GHN yêu cầu có mã phường/xã
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
      },
    ],
    shippingFee: {
      type: Number,
      default: 0, // phí ship (tính từ GHN)
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
    // ✅ Thêm các trường thanh toán
    payment_method: {
      type: String,
      enum: ["cod", "vnpay"],
      default: "cod",
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
      required: true,
    },
    // ✅ Thông tin giao dịch VNPay (nếu có)
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
  },
  { timestamps: true }
);

const orderModel = mongoose.model("Orders", orderSchema, "orders");
module.exports = orderModel;
