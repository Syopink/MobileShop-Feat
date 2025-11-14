const CategoryModel = require("../models/category");
const configModel = require("../models/config");
const customerModel = require("../models/customer")
const bannerModel = require("../models/banner")
const sliderModel = require("../models/slider")
module.exports = async(req, res, next) =>{
    res.locals.categories = await CategoryModel.find()
        .sort({id: -1});
    res.locals.totalCartItems = req.session.cart.reduce((total,item) => total + item.qty, 0);
    res.locals.configs = await configModel.findOne({allow: true})
    res.locals.banners = await bannerModel.find()
    res.locals.sliders = await sliderModel.find(
        
    )
    next();
};
