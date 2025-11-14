const userModel = require("../models/user");
const sha1 = require("js-sha1"); // cài 2 thư viện mã hóa
const bcrypt = require("bcrypt");
const alert = require("alert-node");
const { sign } = require("../../common/jwt");
const ejs = require("ejs");
const path = require("path");
const transporter = require("../../common/transporter");
const login = (req, res) => {
  const savedEmail = req.cookies.savedEmail || "";
  const savedPassword = req.cookies.savedPassword || "";
  res.render("admin/login", {
    data: {},
    cookie: {
      savedEmail,
      savedPassword,
    },
  });
};
const postLogin = async (req, res) => {
  const { email, password, remember } = req.body; // email và mk: 0123456
  const savedEmail = req.cookies.savedEmail || "";
  const savedPassword = req.cookies.savedPassword || "";
  const user = await userModel.findOne({ email });
  if (user) {
    const sha1Password = sha1(password); // b1 // khai báo 1 biến sha1 mã hóa abcxyz -> password mã hóa ngược lại cái bcrypt  qwer -> abcxyz
    const validPassword = await bcrypt.compare(sha1Password, user.password); //mix -> bỏ đi qwer -> abcxyz
    if (validPassword) {
      if (remember) {
        res.cookie("savedEmail", email, { maxAge: 3600000 });
        res.cookie("savedPassword", password, { maxAge: 3600000 });
      } else {
        res.clearCookie("savedEmail");
        res.clearCookie("savedPassword");
      }
      req.session.email = email;
      req.session.password = password;
      res.redirect("/admin/dashboard");
    } else {
      const error = "Tài khoản không chính xác ! ";
      res.render("admin/login", {
        data: { error },
        cookie: {
          savedEmail,
          savedPassword,
        },
      });
    }
  } else {
    const error = "Tài khoản không hợp lệ! ";
    res.render("admin/login", {
      data: { error },
      cookie: {
        savedEmail,
        savedPassword,
      },
    });
  }
};

const loginGoogle = async (req, res) => {
  const { google_id, tokenLogin } = req?.params;
  const user = await userModel.findOne({ google_id, tokenLogin });
  if (!user) {
    const error = "Tài khoản không chính xác!";
    res.render("admin/login", { data: { error } });
  }
  req.session.email = user.email;
  req.session.password = user.password;
  return res.redirect("/admin/success");
};
const loginFacebook = async (req, res) => {
  const { facebook_id, tokenLogin } = req?.params;
  const user = await userModel.findOne({ facebook_id, tokenLogin });
  if (!user) {
    const error = "Tài khoản không chính xác!";
    res.render("admin/login", { data: { error } });
  }
  req.session.email = user.email;
  req.session.password = user.password;
  return res.redirect("/admin/success");
};

const register = (req, res) => {
  res.render("admin/register", { data: {} });
};

const postRegister = async (req, res) => {
  const { email, password, full_name } = req.body; // 0123456

  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    const error = "Email đã được sử dụng, vui lòng chọn email khác!";
    res.render("admin/register", { data: { error } });
  } else {
    const sha1Password = sha1(password); // biến đổi lần 1 abcxyz b1
    const salt = await bcrypt.genSalt(10); // biến đổi lần 2 theo bcrypt qwer ->password b2
    const hashedPassword = await bcrypt.hash(sha1Password, salt); // mật khẩu mix giữa 2 mã hóa  b3
    const newUser = new userModel({
      email,
      password: hashedPassword,
      full_name,
    });
    await newUser.save();
    res.redirect("/admin/login");
  }
};

const showForgot = (req, res) => {
  res.render("admin/forgot", { data: {} });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });
  req.session.email = email;
  if (user) {
    const token = sign(email);
    req.session.token = token;
    const viewFolder = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewFolder, "site/mail-reset.ejs"),
      { user, token }
    );

    await transporter.sendMail({
      from: '"Vietpro Store 👻" vietpro.edu.vn@gmail.com',
      to: email,
      subject: "Reset Password ✔",
      html,
    });
    const done =
      "Hệ thống đã chấp nhận yêu cầu , vui lòng bấm vào đường link trong email của bạn để thay đổi mật khẩu";
    res.render("admin/forgot", { data: { done } });
  } else {
    const error = "Tài khoản không hợp lệ! ";
    res.render("admin/forgot", { data: { error } });
  }
};

const resetPassword = (req, res) => {
  let { token } = req.query;
  if (token === req.session.token) {
    res.render("admin/reset", {
      data: {},
    });
  } else {
    alert(
      "Link thay đổi mật khẩu không đúng hoặc đã hết hạn . Vui lòng kiểm tra lại email của bạn"
    );
    res.redirect("/admin/login");
  }
};
const resetNewPassword = async (req, res) => {
  const { password, returnPassword } = req.body;

  if (password === returnPassword) {
    const sha1Password = sha1(password);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(sha1Password, salt);

    await userModel.updateOne(
      { email: req.session.email },
      { $set: { password: hashedPassword } }
    );

    alert("Thay đổi mật khẩu thành công");
    res.redirect("/admin/login");
  } else {
    const error = "Mật khẩu không giống nhau ";
    res.render("admin/reset", { data: { error } });
  }
};

const logout = async (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
};

const loginSuccess = (req, res) => {
  res.render("admin/login_success");
};

module.exports = {
  login,
  loginGoogle,
  loginFacebook,
  logout,
  register,
  postRegister,
  postLogin,
  showForgot,
  forgotPassword,
  resetPassword,
  resetNewPassword,
  loginSuccess,
};
