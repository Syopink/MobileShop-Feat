const userModel = require("../models/user");
const pagination = require("../../common/pagination");
const sha1 = require("js-sha1");
const bcrypt = require("bcrypt");
const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const users = await userModel
    .find({ is_delete: false })
    .skip(skip)
    .limit(limit);
  const totalRows = await userModel.find({ is_delete: false }).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  res.render("admin/users/user", {
    data: {},
    users,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};
const create = async (req, res) => {
  res.render("admin/users/add_user", { data: {} });
};
const store = async (req, res) => {
  const { body } = req;
  const user = {
    email: body.email,
    role: body.role,
    full_name: body.full_name,
    password: body.password,
  };
  const re_password = body.re_password;
  if (body.password !== re_password) {
    const error = "Mật khẩu không trùng khớp!";
    return res.render("admin/users/add_user", {
      data: { error },
      user,
    });
  }
  const userExists = await userModel.findOne({
    email: { $regex: new RegExp(body.email, "i") },
  });
  if (userExists) {
    const error = "Email đã tồn tại !";
    return res.render("admin/users/add_user", {
      data: { error },
      user,
    });
  }
  const sha1Password = sha1(body.password);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(sha1Password, salt);
  user.password = hashedPassword;
  new userModel(user).save();
  res.redirect("/admin/users");
};
const edit = async (req, res) => {
  const { id } = req.params;
  const user = await userModel.findById(id);
  res.render("admin/users/edit_user", { user, data: {} });
};
const update = async (req, res) => {
  const { id } = req.params;
  const { body } = req;
  const user = {
    email: body.email,
    role: body.role,
    full_name: body.full_name,
    password: body.password,
  };
  const re_password = body.re_password;
  if (body.password !== re_password) {
    const error = "Mật khẩu không trùng khớp!";
    return res.render("admin/users/edit_user", {
      data: { error },
      user,
    });
  }
  const old_password = body.old_password;
  const userData = await userModel.findById(id);
  const sha1Password = sha1(old_password);
  const isValidOldPassword = await bcrypt.compare(
    sha1Password,
    userData.password
  );
  if (!isValidOldPassword) {
    const error = "Mật khẩu cũ không chính xác!";
    return res.render("admin/users/edit_user", {
      data: { error },
      user,
    });
  }
  const newsha1Password = sha1(body.password);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newsha1Password, salt);
  user.password = hashedPassword;
  const userExists = await userModel.findOne({
    email: { $regex: new RegExp(body.email, "i"), $ne: body.email },
  });
  if (userExists) {
    const error = "Email đã tồn tại !";
    return res.render("admin/users/edit_user", {
      data: { error },
      user,
    });
  }
  await userModel.updateOne({ _id: id }, { $set: user });
  res.redirect("/admin/users");
};
const Delete = async (req, res) => {
  const { id } = req.params;
  const arrIds = id.split(",");
  if (!arrIds) return res.redirect("/admin/users");

  await userModel.updateMany(
    { _id: { $in: arrIds } },
    { $set: { is_delete: true } }
  );

  res.redirect("/admin/users");
};
const userTrash = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit - limit;
  const query = {};
  query.is_delete = true;
  const users = await userModel
    .find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);

  const totalRows = await userModel.find(query).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);

  res.render("admin/users/trash_user", {
    users,
    page,
    totalPages,
    pages: pagination(page, limit, totalRows),
  });
};

const userTrashRestore = async (req, res) => {
  try {
    const { id } = req.params;
    const arrayIds = id.split(",");

    for (let id of arrayIds) {
      const user = await userModel.findById(id);

      if (!user) {
        // Nếu không tìm thấy sản phẩm với id này, bỏ qua và tiếp tục với sản phẩm tiếp theo
        continue;
      }
      // Kiểm tra xem sản phẩm có đang bị đưa vào thùng rác không
      if (user.is_delete) {
        await userModel.findByIdAndUpdate(id, { $set: { is_delete: false } });
      } else {
        return res.redirect(
          "/admin/users/trash?restoreError=Sản phẩm đang trong thùng rác!"
        );
      }
    }
    res.redirect("/admin/users");
  } catch (error) {
    console.error(error);
    res.status(500).send("Đã xảy ra lỗi khi khôi phục.");
  }
};

const userTrashDelete = async (req, res) => {
  const { id } = req.params;
  const arrayIds = id.split(",");
  if (!arrayIds) res.redirect("/admin/users/trash");

  await userModel.deleteMany({ _id: { $in: arrayIds } });
  res.redirect("/admin/users/trash");
};
module.exports = {
  index,
  create,
  store,
  edit,
  update,
  Delete,
  userTrash,
  userTrashRestore,
  userTrashDelete,
};
