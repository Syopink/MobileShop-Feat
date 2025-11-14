const express = require("express");
const router = express.Router();
const AuthController = require("../apps/controllers/Auth");
const AdminController = require("../apps/controllers/Admin");
const ProductController = require("../apps/controllers/Product");
const UserController = require("../apps/controllers/User");
const CategoryController = require("../apps/controllers/Category");
const CommentController = require("../apps/controllers/Comment");
const passport = require("passport");
const advertiesController = require("../apps/controllers/Adverties");
const configController = require("../apps/controllers/Config");
const OrderController = require("../apps/controllers/Order");
//FE
const Sitecontroller = require("../apps/controllers/Site");

const { checkLogin, checkAdmin } = require("../apps/middlewares/Auth");
const UploadMiddleware = require("../apps/middlewares/upload");
const checkCustomer = require("../apps/middlewares/site");

//FE
router.get("/", checkCustomer.checkCustomer, Sitecontroller.home);
router.get(
  "/category-:slug.:id",
  checkCustomer.checkCustomer,
  Sitecontroller.category
);
router.get(
  "/product-:slug.:id",
  checkCustomer.checkCustomer,
  Sitecontroller.product
);
router.post(
  "/product-:slug.:id",
  checkCustomer.checkCustomer,
  Sitecontroller.comment
);
router.get("/search", checkCustomer.checkCustomer, Sitecontroller.search);
router.post("/add-to-cart", Sitecontroller.addToCart);
router.get("/cart", checkCustomer.checkCustomer, Sitecontroller.cart);
router.post(
  "/update-item-cart",
  checkCustomer.checkCustomer,
  Sitecontroller.updateItemCart
);
router.get(
  "/delete-item-cart-:id",
  checkCustomer.checkCustomer,
  Sitecontroller.deleteItemCart
);

router.post("/order", Sitecontroller.order);
router.get(
  "/historyOrder",
  checkCustomer.checkCustomer,
  Sitecontroller.historyOrder
);
router.post(
  "/order/:id/cancel",
  checkCustomer.checkCustomer,
  Sitecontroller.cancelOrder
);

router.get("/success", checkCustomer.checkCustomer, Sitecontroller.success);

router.get("/login", checkCustomer.checkCustomer, Sitecontroller.login);
router.post("/login", checkCustomer.checkCustomer, Sitecontroller.postLogin);

router.get("/register", checkCustomer.checkCustomer, Sitecontroller.register);
router.post(
  "/register",
  checkCustomer.checkCustomer,
  Sitecontroller.postRegister
);
router.get(
  "/customer",
  checkCustomer.checkCustomerAuth,
  checkCustomer.checkCustomer,
  Sitecontroller.customerInfo
);
router.post(
  "/customer/update",
  checkCustomer.checkCustomerAuth,
  Sitecontroller.updateCustomerInfo
);

router.get("/logout", checkCustomer.checkCustomerAuth, Sitecontroller.logout);

//BE
router.get("/admin/login", checkLogin, AuthController.login);
router.post("/admin/login", checkLogin, AuthController.postLogin);
// chưa thêm checkadmin ở đây
router.get("/admin/register", AuthController.register);
router.post("/admin/register", AuthController.postRegister);
router.get("/admin/logout", checkAdmin, AuthController.logout);

//Forgot password
router.get("/admin/login/forgot", AuthController.showForgot);
router.post("/admin/login/forgot", AuthController.forgotPassword);
router.get("/admin/login/reset-password/", AuthController.resetPassword);
router.post(
  "/admin/login/reset-password/:token",
  AuthController.resetNewPassword
);

//Google
router.get(
  "/admin/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);
router.get(
  "/admin/auth/google/callback",
  (req, res, next) => {
    passport.authenticate(
      "google",
      { failureRedirect: "/admin/login" },
      (err, profile) => {
        req.user = profile;
        next();
      }
    )(req, res, next);
  },
  (req, res) => {
    res.redirect(
      `https://mobileshop-2ujv.onrender.com/admin/auth/google/${req.user?.id}/${req.user?.tokenLogin}`
    );
  }
);
router.get(
  "/admin/auth/google/:google_id/:tokenLogin",
  AuthController.loginGoogle
);

//Facebook
// admin/auth/facebook
router.get(
  "/admin/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// admin/auth/facebook/callback
router.get(
  "/admin/auth/facebook/callback",
  (req, res, next) => {
    passport.authenticate(
      "facebook",
      { failureRedirect: "/admin/login" },
      (err, profile) => {
        req.user = profile;
        next();
      }
    )(req, res, next);
  },
  (req, res) => {
    res.redirect(
      `https://mobileshop-2ujv.onrender.com/admin/auth/facebook/${req.user?.id}/${req.user?.tokenLogin}`
    );
  }
);

router.get(
  "/admin/auth/facebook/:facebook_id/:tokenLogin",
  AuthController.loginFacebook
);

router.get("/admin/success", checkAdmin, AuthController.loginSuccess);
router.get("/admin/dashboard", checkAdmin, AdminController.index);

router.get("/admin/products", checkAdmin, ProductController.index);
// router.post("/admin/products",ProductController.index)
router.get(
  "/admin/products/create",
  checkAdmin,
  ProductController.productsCreate
);
router.post(
  "/admin/products/store",
  checkAdmin,
  UploadMiddleware.single("thumbnail"),
  ProductController.productsStore
);
router.post(
  "/admin/products/update/:id",
  checkAdmin,
  UploadMiddleware.single("thumbnail"),
  ProductController.productsUpdate
);
router.get(
  "/admin/products/edit/:id",
  checkAdmin,
  ProductController.productsEdit
);
router.get(
  "/admin/products/delete/:id",
  checkAdmin,
  ProductController.productsDelete
);
router.get(
  "/admin/products/trash",
  checkAdmin,
  ProductController.productsTrash
);
router.get(
  "/admin/products/trash/restore/:id",
  checkAdmin,
  ProductController.productsTrashRestore
);
router.get(
  "/admin/products/trash/delete/:id",
  checkAdmin,
  ProductController.productsTrashDelete
);

router.get("/admin/users", checkAdmin, UserController.index);
router.get("/admin/users/create", checkAdmin, UserController.create);
router.post("/admin/users/store", checkAdmin, UserController.store);
router.get("/admin/users/edit/:id", checkAdmin, UserController.edit);
router.post("/admin/users/update/:id", checkAdmin, UserController.update);
router.get("/admin/users/delete/:id", checkAdmin, UserController.Delete);
router.get("/admin/users/trash", checkAdmin, UserController.userTrash);
router.get(
  "/admin/users/trash/restore/:id",
  checkAdmin,
  UserController.userTrashRestore
);
router.get(
  "/admin/users/trash/delete/:id",
  checkAdmin,
  UserController.userTrashDelete
);

router.get("/admin/category", checkAdmin, CategoryController.category);
router.get("/admin/category/create", checkAdmin, CategoryController.create);
router.post("/admin/category/store", checkAdmin, CategoryController.store);
router.get("/admin/category/edit/:id", checkAdmin, CategoryController.edit);
router.post(
  "/admin/category/update/:id",
  checkAdmin,
  CategoryController.update
);
router.get("/admin/category/delete/:id", checkAdmin, CategoryController.Delete);
router.get(
  "/admin/category/trash",
  checkAdmin,
  CategoryController.categoryTrash
);
router.get(
  "/admin/category/trash/restore/:id",
  checkAdmin,
  CategoryController.categoryTrashRestore
);
router.get(
  "/admin/category/trash/delete/:id",
  checkAdmin,
  CategoryController.categoryTrashDelete
);

router.get("/admin/comments", checkAdmin, CommentController.index);
router.get(
  "/admin/comments/create",
  checkAdmin,
  CommentController.commentsCreate
);
router.get(
  "/admin/comments/admit/:id",
  checkAdmin,
  CommentController.commentsAdmit
);
router.get(
  "/admin/comments/edit/:id",
  checkAdmin,
  CommentController.commentsEdit
);
router.post(
  "/admin/comments/update/:id",
  checkAdmin,
  CommentController.commentsUpdate
);
router.get(
  "/admin/comments/delete/:id",
  checkAdmin,
  CommentController.commentsDelete
);
// banner & slider

router.get("/admin/banners", checkAdmin, advertiesController.banner);
router.get(
  "/admin/create-banner",
  checkAdmin,
  advertiesController.createBanner
);
router.post(
  "/admin/create-banner",
  checkAdmin,
  UploadMiddleware.single("thumbnail"),
  advertiesController.storeBanner
);
router.get(
  "/admin/delete-banners/:id",
  checkAdmin,
  advertiesController.delBanner
);

router.get("/admin/sliders", checkAdmin, advertiesController.slider);
router.get(
  "/admin/create-slider",
  checkAdmin,
  advertiesController.createSlider
);
router.post(
  "/admin/create-slider",
  checkAdmin,
  UploadMiddleware.single("thumbnail"),
  advertiesController.storeSlider
);
router.get(
  "/admin/delete-sliders/:id",
  checkAdmin,
  advertiesController.delSlider
);
// config
router.get("/admin/configs", checkAdmin, configController.index);
router.get("/admin/create-config", checkAdmin, configController.createConfig);
router.post(
  "/admin/create-config",
  checkAdmin,
  UploadMiddleware.fields([
    { name: "logo_header", maxCount: 1 },
    { name: "logo_footer", maxCount: 1 },
  ]),
  configController.storeConfig
);
router.get("/admin/edit-config/:id", checkAdmin, configController.editConfig);
router.post(
  "/admin/edit-config/:id",
  checkAdmin,
  UploadMiddleware.fields([
    { name: "logo_header", maxCount: 1 },
    { name: "logo_footer", maxCount: 1 },
  ]),
  configController.updateConfig
);
router.get("/admin/delete-config/:id", checkAdmin, configController.delConfig);

router.get("/admin/configs/approve/:id", checkAdmin, configController.approve);
//GET admin/configs/hidden/:id
router.get("/admin/configs/hidden/:id", checkAdmin, configController.hidden);

//order
router.get("/admin/orders", checkAdmin, OrderController.index);
router.get("/admin/orders/detail/:id", checkAdmin, OrderController.detail);
router.post("/admin/order/:id/cancel", checkAdmin, OrderController.cancelOrder);
router.post(
  "/admin/order/:id/approve",
  checkAdmin,
  OrderController.approveOrder
);
router.post(
  "/admin/order/:id/update-payment",
  checkAdmin,
  OrderController.updatePaymentStatus
);
router.post("/vnpay_payment", Sitecontroller.vnpayPayment);
router.get("/payment_return", Sitecontroller.vnpayReturn);
router.get("/vnpay_ipn", Sitecontroller.vnpayIPN);

router.post("/api/calculate-shipping", Sitecontroller.calculateShippingAPI);

//chat
router.get("/chat", (req, res) => {
  res.render("chat");
});

module.exports = router;
