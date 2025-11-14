const productModel = require("../models/product");
const categoryModel = require("../models/category");
const pagination = require("../../common/pagination");
const fs = require("fs");
const path = require("path");
const slug = require("slug");
const config = require("config");
const vndPrice = require("../../lib/VnPrice");
const commentModel = require("../models/comment");
const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = page * limit - limit;

  let products, totalRows;
  const rootCategory = await categoryModel.findOne({ is_root: true });
  const categories = await categoryModel.find();

  const categoryId = req.query.category;
  const search = req.query.search ? req.query.search.trim() : "";

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

  const filter = { is_delete: false };

  if (categoryId) filter.cat_id = categoryId;
  if (search) filter.name = { $regex: search, $options: "i" };

  if (minPrice !== null || maxPrice !== null) {
    filter.price = {};
    if (minPrice !== null && !isNaN(minPrice)) filter.price.$gte = minPrice;
    if (maxPrice !== null && !isNaN(maxPrice)) filter.price.$lte = maxPrice;
  }

  products = await productModel
    .find(filter)
    .populate({ path: "cat_id" })
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);

  totalRows = await productModel.find(filter).countDocuments();

  res.render("admin/products/product", {
    products,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages: Math.ceil(totalRows / limit),
    categories,
    categoryId,
    search,
    minPrice,
    maxPrice,
    vndPrice,
    rootCategory,
  });
};

const productsCreate = async (req, res) => {
  const categories = await categoryModel
    .find({ is_delete: false })
    .sort({ _id: 1 });
  res.render("admin/products/add_product", { categories });
};

const productsStore = (req, res) => {
  const { body, file } = req;
  const product = {
    name: body.name,
    price: body.price,
    status: body.status,
    cat_id: body.cat_id,
    featured: body.featured == "on",
    is_stock: body.is_stock,
    promotion: body.promotion,
    accessories: body.accessories,
    warranty: body.warranty,
    description: body.description,
    slug: slug(body.name),
  };
  //upload
  if (file) {
    //insert
    const thumbnail = `products/${file.originalname}`;
    product["thumbnail"] = thumbnail;
    fs.renameSync(
      file.path,
      path.resolve(config.get("app.baseUrlUpload"), thumbnail)
    );
    new productModel(product).save();
    res.redirect("/admin/products");
  }
};
const productsEdit = async (req, res) => {
  const { id } = req.params;
  const product = await productModel.findById(id);
  const categories = await categoryModel
    .find({ is_delete: false })
    .sort({ _id: 1 });
  res.render("admin/products/edit_product", {
    product,
    categories,
  });
};
const productsUpdate = async (req, res) => {
  const { id } = req.params;
  const { body, file } = req;
  const product = {
    name: body.name,
    price: body.price,
    status: body.status,
    cat_id: body.cat_id,
    featured: body.featured === "on",
    is_stock: body.is_stock,
    promotion: body.promotion,
    accessories: body.accessories,
    warranty: body.warranty,
    description: body.description,
    slug: slug(body.name),
  };
  if (file) {
    //insert
    const thumbnail = `products/${file.originalname}`;
    fs.renameSync(
      file.path,
      path.resolve(config.get("app.baseUrlUpload"), thumbnail)
    );
    product["thumbnail"] = thumbnail;
  }
  await productModel.updateOne({ _id: id }, { $set: product });
  res.redirect("/admin/products");
};
const productsDelete = async (req, res) => {
  const { id } = req.params;
  const arrIds = id.split(",");
  if (!arrIds) return res.redirect("/admin/products");

  const idsProduct = await productModel.find({ _id: { $in: arrIds } });
  if (idsProduct.length == 0) {
    return res.redirect("/admin/products");
  }
  await productModel.updateMany(
    { _id: { $in: arrIds } },
    { $set: { is_delete: true } }
  );
  await commentModel.updateMany(
    { prd_id: { $in: arrIds } },
    {
      $set: { allow: false, is_delete: false },
    }
  );
  res.redirect(`/admin/products`);
};

const productsTrash = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const query = {};
  query.is_delete = true;
  const products = await productModel
    .find(query)
    .populate({ path: "cat_id" })
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);

  const totalRows = await productModel.find(query).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);

  res.render("admin/products/trash_product", {
    products,
    vndPrice,
    page,
    totalPages,
    pages: pagination(page, limit, totalRows),
  });
};

const productsTrashRestore = async (req, res) => {
  try {
    const { id } = req.params;
    const arrayIds = id.split(",");

    for (let id of arrayIds) {
      const product = await productModel.findById(id);

      if (!product) {
        // Nếu không tìm thấy sản phẩm với id này, bỏ qua và tiếp tục với sản phẩm tiếp theo
        continue;
      }
      // Kiểm tra xem sản phẩm có đang bị đưa vào thùng rác không
      if (product.is_delete) {
        await productModel.findByIdAndUpdate(id, {
          $set: { is_delete: false },
        });
      } else {
        return res.redirect(
          "/admin/products/trash?restoreError=Sản phẩm không trong thùng rác"
        );
      }
    }
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    res.status(500).send("Đã xảy ra lỗi khi khôi phục sản phẩm.");
  }
};

const productsTrashDelete = async (req, res) => {
  const { id } = req.params;
  const arrayIds = id.split(",");
  if (!arrayIds) res.redirect("/admin/products/trash");

  for (let id of arrayIds) {
    const product = await productModel.findById(id);
    await commentModel.deleteMany({ prd_id: id });
    const thumbnail = product.thumbnail;

    const imagePath = path.resolve(config.get("app.baseUrlUpload"), thumbnail);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  await productModel.deleteMany({ _id: { $in: arrayIds } });
  res.redirect("/admin/products/trash");
};
module.exports = {
  index,
  productsStore,
  productsCreate,
  productsEdit,
  productsUpdate,
  productsDelete,
  productsTrash,
  productsTrashRestore,
  productsTrashDelete,
};
