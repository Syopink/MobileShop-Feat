const mongoose = require("../../common/database")();

const bannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    thumbnails: {
      type: String,
      required: true,
    },
    is_delete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const bannerModel = mongoose.model("Banners", bannerSchema, "banners");

module.exports = bannerModel;
