const categoryModel = require("../models/category");
const productModel = require("../models/product");
const pagination = require("../../common/pagination");
const slug = require("slug");
const vndPrice = require("../../lib/VnPrice");
const category = async (req, res) => {
  const query = {};
  query.is_delete = false;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const categories = await categoryModel.find(query).skip(skip).limit(limit);
  const totalRows = await categoryModel.find(query).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  res.render("admin/categories/category", {
    categories,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};
const create = (req, res) => {
  res.render("admin/categories/add_category", { data: {} });
};
const store = async (req, res) => {
  const { body } = req;
  const category = {
    title: body.title,
    slug: slug(body.title),
  };
  const categoryExists = await categoryModel.findOne({
    title: { $regex: new RegExp(body.title, "i") },
  });
  if (categoryExists) {
    const error = "Danh mục đã tồn tại !";
    return res.render("admin/categories/add_category", {
      data: { error },
      category,
    });
  }
  new categoryModel(category).save();
  res.redirect("/admin/category");
};
const edit = async (req, res) => {
  const { id } = req.params;
  const categories = await categoryModel.findById(id);
  res.render("admin/categories/edit_category", { categories, data: {} });
};
const update = async (req, res) => {
  const { id } = req.params;
  const { body } = req;
  const category = {
    title: body.title,
    slug: slug(body.title),
  };
  const categoryExists = await categoryModel.findOne({
    title: { $regex: new RegExp(body.title, "i") },
  });
  if (categoryExists) {
    const error = "Danh mục đã tồn tại !";
    return res.render("admin/categories/edit_category", {
      data: { error },
      category,
    });
  }
  await categoryModel.updateOne({ _id: id }, { $set: category });
  res.redirect("/admin/category");
};
const Delete = async (req, res) => {
  const { id } = req.params;
  const arrIds = id.split(",");

  // 1. Tìm danh mục gốc trong cơ sở dữ liệu
  const rootCategory = await categoryModel.findOne({ is_root: true });

  // 2. Lấy tất cả các sản phẩm của các danh mục bị xoá
  const productsToUpdate = await productModel.find({ cat_id: { $in: arrIds } });

  // 3. Cập nhật danh mục của các sản phẩm đó thành danh mục gốc
  const productUpdatePromises = productsToUpdate.map((product) => {
    product.is_delete = true;
    return product.save();
  });
  await Promise.all(productUpdatePromises);

  // 4. Tiến hành xoá danh mục bị xoá
  await categoryModel.updateMany(
    { _id: { $in: arrIds } },
    { $set: { is_delete: true } }
  );

  res.redirect("/admin/category");
};

const categoryTrash = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const query = {};
  query.is_delete = true;
  const categories = await categoryModel
    .find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);

  const totalRows = await categoryModel.find(query).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);

  res.render("admin/categories/trash_category", {
    categories,
    page,
    totalPages,
    pages: pagination(page, limit, totalRows),
  });
};
const categoryTrashRestore = async (req, res) => {
  try {
    const { id } = req.params;
    const arrayIds = id.split(",");

    for (let id of arrayIds) {
      const category = await categoryModel.findById(id);

      if (!category) {
        // Nếu không tìm thấy danh mục với id này, bỏ qua và tiếp tục với danh mục tiếp theo
        continue;
      }
      // Kiểm tra xem danh mục có đang bị đưa vào thùng rác không
      if (category.is_delete) {
        // Cập nhật trạng thái của danh mục để khôi phục
        await categoryModel.findByIdAndUpdate(id, {
          $set: { is_delete: false },
        });

        // Cập nhật trạng thái của các sản phẩm liên quan để khôi phục
      } else {
        // Nếu danh mục không trong thùng rác, chuyển hướng về trang thùng rác và hiển thị thông báo lỗi
        return res.redirect(
          "/admin/category/trash?restoreError=Danh mục đang trong thùng rác. Hãy khôi phục trước!"
        );
      }
    }
    // Sau khi hoàn thành vòng lặp, chuyển hướng về trang danh sách danh mục
    res.redirect("/admin/category");
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error(error);
    res.status(500).send("Đã xảy ra lỗi khi khôi phục danh mục.");
  }
};

/** Xóa cứng */
const categoryTrashDelete = async (req, res) => {
  const { id } = req.params;
  const arrayIds = id.split(",");
  const rootCategory = await categoryModel.findOne({ is_root: true });
  const productsToUpdate = await productModel.find({
    cat_id: { $in: arrayIds },
  });
  const productsUpdatePromises = productsToUpdate.map((product) => {
    product.cat_id = rootCategory._id;
    product.is_delete = false;
    return product.save();
  });
  await Promise.all(productsUpdatePromises);
  await categoryModel.deleteMany({ _id: { $in: arrayIds } });
  res.redirect("/admin/category/trash");
};
module.exports = {
  category,
  create,
  store,
  edit,
  update,
  Delete,
  categoryTrash,
  categoryTrashRestore,
  categoryTrashDelete,
};
