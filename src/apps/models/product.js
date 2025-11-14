const mongoose = require("../../common/database")();
const productSchema = new mongoose.Schema(
  {
    thumbnail: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    cat_id: {
      type: mongoose.Types.ObjectId,
      ref: "Categories",
    },
    status: {
      type: String,
      default: "",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    promotion: {
      type: String,
      default: "",
    },
    warranty: {
      type: String,
      default: "",
    },
    accessories: {
      type: String,
      default: "",
    },
    is_stock: {
      type: Boolean,
      require: true,
    },
    name: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      maxlength: [255, "Tên sản phẩm không được vượt quá 255 ký tự"],
      text: true,
      trim: true,
    },
    slug: {
      type: String,
      require: true,
    },
    is_delete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const productModel = mongoose.model("Products", productSchema, "products");
module.exports = productModel;
