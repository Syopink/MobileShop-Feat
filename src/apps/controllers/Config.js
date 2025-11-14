const pagination = require("../../common/pagination");
const configModel = require("../models/config");
const config = require("config");
const fs = require("fs");
const path = require("path");

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;

  const configs = await configModel
    .find()
    .sort({ allow: -1, _id: -1 })
    .skip(skip)
    .limit(limit);

  const totalRows = await configModel.find().countDocuments();
  const totalPages = Math.ceil(totalRows / limit);

  res.render("admin/configs/config", {
    configs,
    page,
    totalPages,
    pages: pagination(page, totalPages),
  });
};
const createConfig = async (req, res) => {
  const configs = await configModel.find();
  res.render("admin/configs/add_config", configs);
};
const storeConfig = async (req, res) => {
  const { intro, address, service, hotline_phone, hotline_email, footer } =
    req.body;
  const { logo_header, logo_footer } = req.files;

  const newConfig = new configModel({
    intro,
    address,
    service,
    hotline_phone,
    hotline_email,
    footer,
  });

  if (logo_header && logo_footer) {
    for (let logo of logo_header) {
      //insert
      const logoHeader = `configs/${logo.originalname}`;

      newConfig["logo_header"] = logoHeader;
      fs.renameSync(
        logo.path,
        path.resolve(config.get("app.baseUrlUpload"), logoHeader)
      );
    }
    for (let logo of logo_footer) {
      //insert
      const logoFooter = `configs/${logo.originalname}`;

      newConfig["logo_footer"] = logoFooter;
      fs.renameSync(
        logo.path,
        path.resolve(config.get("app.baseUrlUpload"), logoFooter)
      );
    }
    new configModel(newConfig).save();
    res.redirect("/admin/configs");
  }
};

const editConfig = async (req, res) => {
  const { id } = req.params;
  const config = await configModel.findById(id);
  res.render("admin/configs/edit_config", { config });
};
const updateConfig = async (req, res) => {
  const { id } = req.params;
  const { intro, address, service, hotline_phone, hotline_email, footer } =
    req.body;
  const { logo_header, logo_footer } = req.files;
  const newConfig = {
    intro,
    service,
    address,
    hotline_phone,
    hotline_email,
    footer,
  };
  if (logo_header && logo_footer) {
    for (let logo of logo_header) {
      //insert
      const logoHeader = `configs/${logo.originalname}`;
      console.log(logoHeader);
      newConfig["logo_header"] = logoHeader;
      fs.renameSync(
        logo.path,
        path.resolve(config.get("app.baseUrlUpload"), logoHeader)
      );
    }
    for (let logo of logo_footer) {
      //insert
      const logoFooter = `configs/${logo.originalname}`;
      console.log(logoFooter);
      newConfig["logo_footer"] = logoFooter;
      fs.renameSync(
        logo.path,
        path.resolve(config.get("app.baseUrlUpload"), logoFooter)
      );
    }
    await configModel.updateOne({ _id: id }, { $set: newConfig });
    res.redirect("/admin/configs");
  }
};

const delConfig = async (req, res) => {
  const { id } = req.params;

  await configModel.deleteOne({ _id: id });
  res.redirect("/admin/configs");
};
const approve = async (req, res) => {
  const { id } = req.params;
  const config = await configModel.findById(id);

  if (!config) {
    res.redirect("/admin/configs");
  } else {
    await configModel.updateOne({ _id: id }, { $set: { allow: true } });
    res.redirect("/admin/configs");
  }
};
const hidden = async (req, res) => {
  const { id } = req.params;
  const config = await configModel.findById(id);

  if (!config) {
    res.redirect("/admin/configs");
  } else {
    await configModel.updateOne({ _id: id }, { $set: { allow: false } });
    res.redirect("/admin/configs");
  }
};

module.exports = {
  index,
  createConfig,
  storeConfig,
  editConfig,
  updateConfig,
  delConfig,
  approve,
  hidden,
};
