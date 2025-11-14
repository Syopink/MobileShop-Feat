const mongoose = require("../../common/database")();
const customerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
      maxlength: [128, "Mật khẩu quá dài"],
    },
    full_name: {
      type: String,
      required: [true, "Họ tên là bắt buộc"],
      maxlength: [100, "Họ tên quá dài"],
    },
    address: {
      type: String,
      required: [true, "Địa chỉ là bắt buộc"],
      trim: true,
      minlength: [5, "Địa chỉ quá ngắn"],
      maxlength: [255, "Địa chỉ quá dài"],
    },
    phone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      trim: true,
      match: [
        /^(0|\+84)(\d{9})$/,
        "Số điện thoại không hợp lệ (ví dụ: 0987654321 hoặc +84987654321)",
      ],
    },
    province_id: { type: Number, default: null },
    district_id: { type: Number, default: null },
    ward_code: { type: String, default: null },
  },
  { timestamps: true }
);

const customerModel = mongoose.model("Customers", customerSchema, "customers");
module.exports = customerModel;
