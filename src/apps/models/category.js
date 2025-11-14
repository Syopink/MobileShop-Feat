const mongoose = require("../../common/database")();
const categorySchema = new mongoose.Schema(
  {
    description: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    is_delete: {
      type: Boolean,
      default: false,
    },
    is_root: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
const categoryModel = mongoose.model(
  "Categories",
  categorySchema,
  "categories"
);
module.exports = categoryModel;
