const pagination = require("../../common/pagination");
const bannerModel = require("../models/banner");

const config = require("config");
const fs = require("fs");
const path = require("path");
const sliderModel = require("../models/slider");

const banner = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = page * limit - limit;
  const banners = await bannerModel
    .find()
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit);
  const totalRows = await bannerModel.find().countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  res.render("admin/advertises/banners/banner", {
    banners,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};
const createBanner = async (req, res) => {
  res.render("admin/advertises/banners/add_banner", { data: {} });
};
const storeBanner = (req, res) => {
  const { body, file } = req;

  const banner = {
    name: body.name,
  };
  //upload
  if (file) {
    //insert
    const thumbnails = `banners/${file.originalname}`;
    banner["thumbnails"] = thumbnails;
    fs.renameSync(
      file.path,
      path.resolve(config.get("app.baseUrlUpload"), thumbnails)
    );
    new bannerModel(banner).save();
    res.redirect("/admin/banners");
  }
};
const delBanner = async (req, res) => {
  const { id } = req.params;

  const banner = await bannerModel.findById(id);

  await bannerModel.deleteOne({ _id: id });
  res.redirect("/admin/banners");
};

const slider = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = page * limit - limit;
  const sliders = await sliderModel
    .find()
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit);
  const totalRows = await sliderModel.find().countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  res.render("admin/advertises/sliders/slider", {
    sliders,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};
const createSlider = (req, res) => {
  res.render("admin/advertises/sliders/add_slider", { data: {} });
};
const storeSlider = (req, res) => {
  const { body, file } = req;

  const slider = {
    name: body.name,
  };
  //upload
  if (file) {
    //insert
    const thumbnails = `sliders/${file.originalname}`;
    slider["thumbnails"] = thumbnails;
    fs.renameSync(
      file.path,
      path.resolve(config.get("app.baseUrlUpload"), thumbnails)
    );
    new sliderModel(slider).save();
    res.redirect("/admin/sliders");
  }
};
const delSlider = async (req, res) => {
  const { id } = req.params;

  const banner = await sliderModel.findById(id);

  await sliderModel.deleteOne({ _id: id });
  res.redirect("/admin/sliders");
};
module.exports = {
  banner,
  createBanner,
  storeBanner,
  delBanner,
  slider,
  createSlider,
  storeSlider,
  delSlider,
};
