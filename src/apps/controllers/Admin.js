const userModel = require("../models/user");
const productModel = require("../models/product");
const commentModel = require("../models/comment");
const bannerModel = require("../models/banner");
const sliderModel = require("../models/slider");
const configModel = require("../models/config");
const index = async (req, res) => {
  const total_product = await productModel.find().countDocuments();
  const total_user = await userModel.find().countDocuments();
  const total_comment = await commentModel.find().countDocuments();
  const total_banner = await bannerModel.find().countDocuments();
  const total_slider = await sliderModel.find().countDocuments();
  const total_config = await configModel.find().countDocuments();

  res.render("admin/dashboard", {
    total_user,
    total_product,
    total_comment,
    total_banner,
    total_slider,
    total_config,
  });
};
module.exports = {
  index,
};
