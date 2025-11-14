const commentModel = require("../models/comment");
const productModel = require("../models/product");
const pagination = require("../../common/pagination");
const timesAgo = require("../../lib/timesAgo");
const profanity = require("profanity-check");

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const comments = await commentModel
    .find({})
    .skip(skip)
    .limit(limit)
    .sort({ _id: -1 })
    .populate("prd_id");
  const totalRows = await commentModel.countDocuments({});
  const totalPages = Math.ceil(totalRows / limit);
  const products = await productModel.find({}); // Hoặc thích hợp với điều kiện của bạn
  res.render("admin/comments/comment", {
    comments,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
    timesAgo,
    products,
  });
};
//lọc từ ngữ phản cảm

const commentsAdmit = async (req, res) => {
  const { id } = req.params;
  const comment = await commentModel.findById(id);
  if (comment) {
    comment.is_allowed = !comment.is_allowed; // Đảo ngược trạng thái duyệt
    await comment.save();
  }
  res.redirect("/admin/comments");
};

const commentsCreate = async (req, res) => {
  const comment = await commentModel.find();
  res.render("admin/comments/add_comment", {
    comment,
  });
};

const commentsEdit = async (req, res) => {
  const { id } = req.params;
  const product = await productModel.findById(id);
  const comment = await commentModel.find({ prd_id: id });
  res.render("admin/comments/edit_comment", {
    product,
    comment,
  });
};

const commentsUpdate = async (req, res) => {
  const { id } = req.params;
  const { body } = req;
  const comment = {
    body: body.body,
  };
  await commentModel.updateOne({ _id: id }, { $set: comment });
  res.redirect("/admin/comments");
};

const commentsDelete = async (req, res) => {
  const { id } = req.params;
  await commentModel.deleteOne({ _id: id });
  res.redirect("/admin/comments");
};
module.exports = {
  index,
  commentsDelete,
  commentsAdmit,
  commentsCreate,
  commentsEdit,
  commentsUpdate,
};
