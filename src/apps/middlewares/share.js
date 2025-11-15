const CategoryModel = require("../models/category");
const configModel = require("../models/config");
const customerModel = require("../models/customer");
const bannerModel = require("../models/banner");
const sliderModel = require("../models/slider");

module.exports = async (req, res, next) => {
  try {
    res.locals.categories = await CategoryModel.find().sort({ id: -1 });

    const cart = req.session.cart || [];
    res.locals.totalCartItems = cart.reduce(
      (total, item) => total + item.qty,
      0
    );

    res.locals.configs = await configModel.findOne({ allow: true });
    res.locals.banners = await bannerModel.find();
    res.locals.sliders = await sliderModel.find();

    next();
  } catch (err) {
    console.error("Middleware error:", err);
    next(err);
  }
};
