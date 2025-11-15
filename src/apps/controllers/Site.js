const moment = require("moment");
const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");
const categoryModel = require("../models/category");
const commentModel = require("../models/comment");
const productModel = require("../models/product");
const customerModel = require("../models/customer");
const orderModel = require("../models/order");
const path = require("path");
const ejs = require("ejs");
const vndPrice = require("../../lib/VnPrice");
const timesAgo = require("../../lib/timesAgo");
const transporter = require("../../common/transporter");
const badWordsLists = require("../../lib/addBadWords");
const cron = require("node-cron");

const Filter = require("bad-words");
const filter = new Filter();
const badWordsList = badWordsLists.badWordsListss;

const GHN_TOKEN = process.env.GHN_TOKEN;
const SHOP_DISTRICT_ID = 1805;
const SHOP_WARD_CODE = "1B2311";
filter.addWords(...badWordsList);
const sha1 = require("js-sha1");
const bcrypt = require("bcrypt");
const pagination = require("../../common/pagination");
const _ = require("lodash");
const cleanString = (string) => {
  let cleanString = string;
  badWordsList.forEach((word) => {
    const regex = new RegExp(word, "gi");
    cleanString = cleanString.replace(regex, "*".repeat(word.length));
  });
  return cleanString;
};

async function getGHNNameById(province_id, district_id, ward_code) {
  const token = process.env.GHN_TOKEN;

  const [provinceRes, districtRes, wardRes] = await Promise.all([
    axios.get(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province",
      { headers: { token } }
    ),
    axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district",
      { province_id },
      { headers: { token, "Content-Type": "application/json" } }
    ),
    axios.get(
      `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${district_id}`,
      { headers: { token } }
    ),
  ]);

  const province =
    provinceRes.data.data.find((p) => p.ProvinceID === province_id)
      ?.ProvinceName || "";
  const district =
    districtRes.data.data.find((d) => d.DistrictID === district_id)
      ?.DistrictName || "";
  const ward =
    wardRes.data.data.find((w) => w.WardCode === ward_code)?.WardName || "";

  return { province, district, ward };
}

const home = async (req, res) => {
  const limit = 6;
  const featured = await productModel
    .find({ featured: 1 })
    .sort({ _id: -1 })
    .limit(limit);
  const lastest = await productModel.find().limit(limit).sort({ _id: -1 });
  res.render("site/index", { featured, lastest, vndPrice });
};

const category = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const skip = page * limit - limit;
  const totalRows = await productModel.find({ cat_id: id }).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  const category = await categoryModel.findById(id);
  const { title } = category;
  const products = await productModel
    .find({ cat_id: id })
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);
  const total = totalRows;
  res.render("site/category", {
    category,
    products,
    title,
    vndPrice,
    total,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};

const product = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = page * limit - limit;
  const totalRows = await commentModel
    .find({ prd_id: id, is_allowed: true })
    .countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  const product = await productModel.findById(id);
  const comments = await commentModel
    .find({ prd_id: id })
    .sort({ _id: -1 })
    .limit(limit)
    .skip(skip);

  res.render("site/product", {
    product,
    comments,
    moment,
    vndPrice,
    timesAgo,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};

const comment = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, body } = req.body;
  const comment = { prd_id: id, full_name, email, body: cleanString(body) };
  await new commentModel(comment).save();
  res.redirect(req.path);
};

const search = async (req, res) => {
  const { keyword } = req.query;
  const products = await productModel.find({
    $or: [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ],
  });
  res.render("site/search", { vndPrice, products, keyword });
};

const addToCart = async (req, res) => {
  const items = req.session.cart || [];
  const { id, qty } = req.body;
  let isProductExists = false;
  const newItems = items.map((item) => {
    if (item._id === id) {
      item.qty += Number(qty);
      isProductExists = true;
    }
    return item;
  });
  if (!isProductExists) {
    const product = await productModel.findById(id);
    newItems.push({
      _id: id,
      name: product.name,
      price: product.price,
      thumbnail: product.thumbnail,
      qty: Number(qty),
      promotion: product.promotion,
    });
  }
  req.session.cart = newItems;
  res.redirect("/cart");
};
const cart = async (req, res) => {
  const { email } = req.session;
  const customer = await customerModel.findOne({ email });
  const items = req.session.cart || [];

  // Phí ship mặc định = 0 (sẽ tính động bằng JS)
  let shippingFee = 0;

  // Chỉ tính phí ship ban đầu nếu khách đã đăng nhập VÀ có địa chỉ đầy đủ
  if (customer && customer.district_id && customer.ward_code) {
    try {
      shippingFee = await calculateShippingFee(
        customer.district_id,
        customer.ward_code,
        items
      );
    } catch (error) {
      console.error("Lỗi tính phí ship:", error);
      shippingFee = 0;
    }
  }

  res.render("site/cart", {
    items,
    vndPrice,
    email,
    customer,
    shippingFee,
  });
};

const historyOrder = async (req, res) => {
  const { email } = req.session;
  if (!email) return res.redirect("/login");
  const customer = await customerModel.findOne({ email });
  if (!customer) return res.redirect("/login");

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = page * limit - limit;
  const totalRows = await orderModel.find({ email }).countDocuments();
  const totalPages = Math.ceil(totalRows / limit);
  const orders = await orderModel
    .find({ email })
    .populate("items.prd_id")
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit);

  res.render("site/historyOrder", {
    orders,
    vndPrice,
    email,
    customer,
    pages: pagination(page, limit, totalRows),
    page,
    totalPages,
  });
};

const calculateShippingAPI = async (req, res) => {
  try {
    const { district_id, ward_code, selectedItems } = req.body;

    if (!district_id || !ward_code || !selectedItems?.length) {
      return res.json({ success: false, shippingFee: 0 });
    }

    const items = req.session.cart || [];

    const itemsToShip = items.filter((item) =>
      selectedItems.includes(item._id)
    );

    const shippingFee = await calculateShippingFee(
      Number(district_id),
      ward_code,
      itemsToShip
    );

    res.json({
      success: true,
      shippingFee,
      subtotal: itemsToShip.reduce(
        (sum, item) => sum + item.qty * item.price,
        0
      ),
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, shippingFee: 0 });
  }
};

const updateItemCart = (req, res) => {
  const { products, productsSelected } = req.body;
  const items = req.session.cart || [];

  // Cập nhật số lượng
  const updatedItems = items.map((item) => {
    if (products && products[item._id]) {
      item.qty = Number(products[item._id]["qty"]);
    }
    return item;
  });

  req.session.cart = updatedItems;

  // Redirect về cart với thông báo success (optional)
  res.redirect("/cart");
};

const deleteItemCart = (req, res) => {
  const { id } = req.params;
  req.session.cart = (req.session.cart || []).filter((item) => item._id !== id);
  res.redirect("/cart");
};
const querystring = require("qs");

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

const order = async (req, res) => {
  try {
    const { body } = req;
    const { productsSelected } = body;

    const allItems = req.session.cart || [];
    const items = allItems.filter(
      (item) => productsSelected && productsSelected.includes(item._id)
    );

    if (!items.length) return res.redirect("/cart");

    let customer = null;
    if (req.session.email) {
      customer = await customerModel.findOne({ email: req.session.email });
    }

    const name = body.name || customer?.full_name;
    const phone = body.phone || customer?.phone;
    const email = body.email || customer?.email;
    const address = body.address?.trim() || customer?.address || "";
    const provinceId = Number(body.province_id) || customer?.province_id;
    const districtId = Number(body.district_id) || customer?.district_id;
    const wardCode = body.ward_code || customer?.ward_code;
    const paymentMethod = body.payment_method || "cod";

    if (!name || !phone || !email || !provinceId || !districtId || !wardCode) {
      return res.redirect("/cart");
    }

    // ===== CHUẨN BỊ DỮ LIỆU ORDER =====
    const idsPrd = items.map((i) => i._id);
    const products = await productModel.find({ _id: { $in: idsPrd } }).lean();

    let totalPrice = 0;
    let totalWeight = 0;
    const orderItems = [];

    for (let prd of products) {
      const cart = items.find((i) => i._id === prd._id.toString());
      if (cart) {
        const subTotal = prd.price * cart.qty;
        totalPrice += subTotal;

        const weight = prd.weight || 500;
        totalWeight += weight * cart.qty;

        orderItems.push({
          prd_id: prd._id,
          prd_name: prd.name,
          prd_price: prd.price,
          prd_qty: cart.qty,
          prd_thumbnail: prd.thumbnail,
          weight,
          code: prd._id.toString(),
        });
      }
    }

    console.log(
      "Order Items:",
      orderItems,
      "TotalPrice:",
      totalPrice,
      "TotalWeight:",
      totalWeight
    );

    const shippingFee = await calculateShippingFee(districtId, wardCode, items);
    const finalTotal = totalPrice + shippingFee;

    const newOrder = new orderModel({
      name,
      phone,
      email,
      provinceId,
      districtId,
      wardCode,
      address,
      items: orderItems,
      shippingFee,
      totalPrice,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "vnpay" ? "pending_payment" : "unpaid",
      status: paymentMethod === "vnpay" ? 0 : 2, // 0 = pending, 2 = ready
      status_text:
        paymentMethod === "vnpay" ? "pending_payment" : "ready_to_pick",
    });

    await newOrder.save();
    console.log("✅ Order saved:", newOrder);

    if (paymentMethod === "vnpay") {
      process.env.TZ = "Asia/Ho_Chi_Minh";

      let date = new Date();
      let createDate = moment(date).format("YYYYMMDDHHmmss");

      let ipAddr =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

      const tmnCode = process.env.VNP_TMN_CODE;
      const secretKey = process.env.VNP_HASH_SECRET;
      const vnpUrl = process.env.VNP_URL;
      const returnUrl = process.env.VNP_RETURN_URL;

      let orderId = newOrder._id.toString();
      let amount = finalTotal;
      let locale = "vn";
      let currCode = "VND";

      let vnp_Params = {};
      vnp_Params["vnp_Version"] = "2.1.0";
      vnp_Params["vnp_Command"] = "pay";
      vnp_Params["vnp_TmnCode"] = tmnCode;
      vnp_Params["vnp_Locale"] = locale;
      vnp_Params["vnp_CurrCode"] = currCode;
      vnp_Params["vnp_TxnRef"] = orderId;
      vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
      vnp_Params["vnp_OrderType"] = "other";
      vnp_Params["vnp_Amount"] = amount * 100;
      vnp_Params["vnp_ReturnUrl"] = returnUrl;
      vnp_Params["vnp_IpAddr"] = ipAddr;
      vnp_Params["vnp_CreateDate"] = createDate;

      vnp_Params = sortObject(vnp_Params);

      let signData = querystring.stringify(vnp_Params, { encode: false });
      let hmac = crypto.createHmac("sha512", secretKey);
      let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
      vnp_Params["vnp_SecureHash"] = signed;

      let vnpUrl_final =
        vnpUrl + "?" + querystring.stringify(vnp_Params, { encode: false });

      req.session.pendingOrderId = newOrder._id.toString();
      req.session.productsSelected = productsSelected;

      return res.redirect(vnpUrl_final);
    }
    console.log("=== STEP 4: Gửi email & tạo đơn GHN ===");
    const { province, district, ward } = await getGHNNameById(
      provinceId,
      districtId,
      wardCode
    );

    // Gửi email
    const html = await ejs.renderFile(
      path.join(req.app.get("views"), "site/email-order.ejs"),
      {
        name,
        phone,
        province,
        district,
        ward,
        address,
        items: orderItems,
        totalPrice,
        shippingFee,
        finalTotal,
        vndPrice,
      }
    );
    console.log("Email HTML rendered");

    await transporter.sendMail({
      from: '"VietPro Store 👻" <vietpro.store@gmail.com>',
      to: email,
      subject: "Xác nhận đơn hàng từ VietPro Store",
      html,
    });
    console.log("✅ Email sent");

    const ghnResponse = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create",
      {
        payment_type_id: 2,
        note: "Đơn hàng từ VietPro Store",
        required_note: "KHONGCHOXEMHANG",
        from_name: "VietPro Store",
        from_phone: "0394811866",
        from_district_id: SHOP_DISTRICT_ID,
        from_address: "2 Lai Xa",
        from_ward_code: SHOP_WARD_CODE,
        to_name: name,
        to_phone: phone,
        to_ward_code: wardCode,
        to_address: address,
        to_district_id: districtId,
        cod_amount: finalTotal,
        content: "Đơn hàng VietPro",
        service_id: 53320,
        service_type_id: 2,
        weight: totalWeight,
        length: 20,
        width: 10,
        height: 10,
        items: orderItems.map((i) => ({
          name: i.prd_name,
          code: i.code,
          quantity: i.prd_qty,
          price: i.prd_price,
          weight: i.weight,
        })),
        client_order_code: `VP${Date.now()}`,
      },
      {
        headers: {
          Token: GHN_TOKEN,
          "Content-Type": "application/json",
          ShopId: "198093",
        },
      }
    );

    if (ghnResponse.data.data?.order_code) {
      await orderModel.updateOne(
        { _id: newOrder._id },
        {
          $set: {
            ghn_order_code: ghnResponse.data.data.order_code,
          },
        }
      );
    }

    req.session.cart = allItems.filter(
      (item) => !productsSelected.includes(item._id)
    );
    res.redirect("/success");
  } catch (error) {
    console.error(
      "❌ Lỗi tạo đơn hàng:",
      error.response?.data || error.message
    );
    res.status(500).send("Lỗi khi đặt hàng!");
  }
};

const vnpayReturn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    let secretKey = process.env.VNP_HASH_SECRET;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      let rspCode = vnp_Params["vnp_ResponseCode"];
      let txnRef = vnp_Params["vnp_TxnRef"]; // Đổi tên biến cho rõ ràng

      let order;
      const mongoose = require("mongoose");

      if (mongoose.Types.ObjectId.isValid(txnRef) && txnRef.length === 24) {
        order = await orderModel.findById(txnRef);
      } else {
        order = await orderModel.findOne({
          $or: [
            { vnpay_retry_txn_ref: txnRef },
            { "vnpay_retries.txn_ref": txnRef },
          ],
        });
      }

      if (!order) {
        return res.send("<h1>❌ Không tìm thấy đơn hàng!</h1>");
      }

      if (rspCode === "00") {
        await orderModel.updateOne(
          { _id: order._id }, // ← Sửa đây
          {
            $set: {
              status: 1,
              status_text: "paid",
              payment_status: "paid",
            },
          }
        );

        // Gửi email xác nhận
        const { province, district, ward } = await getGHNNameById(
          order.provinceId,
          order.districtId,
          order.wardCode
        );

        const html = await ejs.renderFile(
          path.join(req.app.get("views"), "site/email-order.ejs"),
          {
            name: order.name,
            phone: order.phone,
            province,
            district,
            ward,
            address: order.address,
            items: order.items,
            totalPrice: order.totalPrice,
            shippingFee: order.shippingFee,
            finalTotal: order.totalPrice + order.shippingFee,
            vndPrice,
          }
        );

        await transporter.sendMail({
          from: '"VietPro Store 👻" <vietpro.store@gmail.com>',
          to: order.email,
          subject: "Xác nhận đơn hàng từ VietPro Store (Đã thanh toán VNPay)",
          html,
        });

        // Tạo đơn GHN
        const totalWeight = order.items.reduce(
          (sum, item) => sum + (item.weight || 500) * item.prd_qty,
          0
        );

        const ghnResponse = await axios.post(
          "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create",
          {
            payment_type_id: 1,
            note: "Đơn hàng từ VietPro Store - Đã thanh toán VNPay",
            required_note: "KHONGCHOXEMHANG",
            from_name: "VietPro Store",
            from_phone: "0394811866",
            from_district_id: SHOP_DISTRICT_ID,
            from_address: "2 Lai Xa",
            from_ward_code: SHOP_WARD_CODE,
            to_name: order.name,
            to_phone: order.phone,
            to_ward_code: order.wardCode,
            to_address: order.address,
            to_district_id: order.districtId,
            cod_amount: 0,
            content: "Đơn hàng VietPro - Đã thanh toán",
            service_id: 53320,
            service_type_id: 2,
            weight: totalWeight,
            length: 20,
            width: 10,
            height: 10,
            items: order.items.map((i) => ({
              name: i.prd_name,
              code: i.code,
              quantity: i.prd_qty,
              price: i.prd_price,
              weight: i.weight,
            })),
            client_order_code: `VP${Date.now()}`,
          },
          {
            headers: {
              Token: GHN_TOKEN,
              "Content-Type": "application/json",
              ShopId: "198093",
            },
          }
        );

        if (ghnResponse.data.data?.order_code) {
          await orderModel.updateOne(
            { _id: order._id }, // ← Sửa đây
            {
              $set: {
                ghn_order_code: ghnResponse.data.data.order_code,
              },
              $push: {
                status_history: {
                  status: "ready_to_pick",
                  updatedAt: new Date(),
                },
              },
            }
          );
        }

        // Xóa sản phẩm đã mua khỏi giỏ hàng
        const productsSelected = req.session.productsSelected || [];
        const allItems = req.session.cart || [];
        req.session.cart = allItems.filter(
          (item) => !productsSelected.includes(item._id)
        );
        delete req.session.pendingOrderId;
        delete req.session.productsSelected;

        res.redirect("/success");
      } else {
        await orderModel.updateOne(
          { _id: order._id }, // ← Sửa đây
          {
            $set: {
              status: 0,
              status_text: "payment_failed",
              payment_status: "unpaid",
            },
            $push: {
              status_history: {
                status: "payment_failed",
                updatedAt: new Date(),
              },
            },
          }
        );

        res.render("error", {
          message: "Thanh toán thất bại. Đơn hàng đã bị hủy.",
          code: rspCode,
        });
      }
    } else {
      res.render("error", {
        message: "Chữ ký không hợp lệ",
        code: "97",
      });
    }
  } catch (err) {
    console.error("Error in payment return:", err);
    res.status(500).send("Lỗi xử lý kết quả thanh toán");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);

    if (order.ghn_order_code) {
      await axios.post(
        "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel",
        { order_codes: [order.ghn_order_code] },
        {
          headers: {
            Token: process.env.GHN_TOKEN,
            "Content-Type": "application/json",
            ShopId: "198093",
          },
        }
      );
    }

    await orderModel.updateOne(
      { _id: id },
      {
        $set: { status: 0, status_text: "cancel" },
        $push: {
          status_history: { status: "cancel", updatedAt: new Date() },
        },
      }
    );

    res.redirect("/historyOrder");
  } catch (error) {
    console.error("❌ Lỗi khi hủy đơn hàng:", error);
    res.status(500).send("Không thể hủy đơn hàng!");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (![0, 1, 2].includes(Number(status)))
      return res.status(400).send("Trạng thái không hợp lệ");

    await orderModel.updateOne(
      { _id: id },
      { $set: { status: Number(status) } }
    );

    res.redirect("/admin/orders");
  } catch (error) {
    console.error(error);
    res.redirect("/admin/orders");
  }
};

const success = (req, res) => res.render("site/success");

const login = (req, res) => res.render("site/login", { data: {} });

const postLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log("email, password", email, password);
  const customer = await customerModel.findOne({ email });
  console.log("customer", customer);

  if (!customer)
    return res.render("site/login", {
      data: { error: "Tài khoản không hợp lệ" },
    });

  const sha1Password = sha1(password);
  const validPassword = await bcrypt.compare(sha1Password, customer.password);
  if (!validPassword)
    return res.render("site/login", {
      data: { error: "Password không chính xác" },
    });

  req.session.email = email;
  req.session.password = password;
  res.redirect("/");
};

const customerInfo = (req, res) => {
  const customer = res.locals.customer;
  if (!customer) return res.redirect("/login");

  res.render("site/customer", {
    customer,
    alert: null,
    alertCls: "",
  });
};

const updateCustomerInfo = async (req, res) => {
  try {
    const { fullName, province_id, district_id, ward_code, address } = req.body;
    const email = req.session.email;

    if (!email) {
      return res.redirect("/login");
    }

    const customer = await customerModel.findOne({ email });
    if (!customer) {
      return res.redirect("/login");
    }

    if (
      customer.full_name === fullName.trim() &&
      customer.address === address.trim() &&
      customer.province_id === Number(province_id) &&
      customer.district_id === Number(district_id) &&
      customer.ward_code === ward_code
    ) {
      return res.render("site/customer", {
        customer,
        alert: "Bạn chưa thay đổi thông tin nào!",
        alertCls: "warning",
      });
    }

    await customerModel.updateOne(
      { email },
      {
        $set: {
          full_name: fullName.trim(),
          address: address.trim(),
          province_id: Number(province_id),
          district_id: Number(district_id),
          ward_code,
        },
      }
    );

    const { province, district, ward } = await getGHNNameById(
      Number(province_id),
      Number(district_id),
      ward_code
    );

    req.session.fullName = fullName.trim();

    const updatedCustomer = {
      ...customer.toObject(),
      address: address.trim(),
      full_name: fullName.trim(),
      province_id: Number(province_id),
      district_id: Number(district_id),
      ward_code,
      province,
      district,
      ward,
    };

    return res.render("site/customer", {
      customer: updatedCustomer,
      alert: "Cập nhật thông tin thành công!",
      alertCls: "success",
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật:", error);
    return res.render("site/customer", {
      customer: res.locals.customer || {},
      alert: "Cập nhật thất bại, vui lòng thử lại!",
      alertCls: "danger",
    });
  }
};

const register = (req, res) => res.render("site/register", { data: {} });

const postRegister = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      address,
      province_id,
      district_id,
      ward_code,
    } = req.body;

    const existingUser = await customerModel.findOne({ email });
    if (existingUser)
      return res.render("site/register", {
        data: { error: "Email đã được sử dụng!" },
      });

    const sha1Password = sha1(password);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(sha1Password, salt);

    await new customerModel({
      email,
      password: hashedPassword,
      full_name,
      phone,
      address: address.trim(),
      province_id: Number(province_id),
      district_id: Number(district_id),
      ward_code,
    }).save();

    req.session.email = email;
    res.redirect("/");
  } catch (err) {
    console.error("❌ Lỗi đăng ký:", err);
    res.render("site/register", { data: { error: "Đã có lỗi xảy ra!" } });
  }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

const calculateShippingFee = async (districtId, wardCode, items) => {
  try {
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weight || 500) * item.qty,
      0
    );

    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee",
      {
        service_type_id: 2,
        from_district_id: SHOP_DISTRICT_ID,
        from_ward_code: SHOP_WARD_CODE,
        insurance_value: 0,
        service_id: null,
        coupon: null,
        to_district_id: districtId,
        to_ward_code: wardCode,
        height: 10,
        length: 20,
        weight: totalWeight,
        width: 10,
      },
      {
        headers: {
          Token: "1755fed2-bf9b-11f0-a51e-f64be07fcf0a",
          "Content-Type": "application/json",
          ShopId: "198093",
        },
      }
    );

    return response.data.data.total;
  } catch (err) {
    console.error("Lỗi GHN Fee:", err.response?.data || err.message);
    return 0;
  }
};

const syncOrderStatusFromGHN = async (orderCode) => {
  try {
    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail",
      { order_code: orderCode },
      {
        headers: {
          Token: process.env.GHN_TOKEN,
          "Content-Type": "application/json",
          ShopId: "198093",
        },
      }
    );

    const statusText = response.data.data.status;
    const statusMap = {
      delivered: 1,
      cancel: 0,
      ready_to_pick: 2,
      picking: 2,
      picked: 2,
      storing: 2,
      transporting: 2,
      sorting: 2,
      delivering: 2,
      delivery_fail: 2,
      waiting_to_return: 0,
      return: 0,
      return_transporting: 0,
      returned: 0,
      lost: 0,
      damage: 0,
      exception: 0,
    };

    const status = statusMap[statusText] ?? 2;

    await orderModel.updateOne(
      { ghn_order_code: orderCode },
      {
        $set: { status_text: statusText, status },
        $push: {
          status_history: { status: statusText, updatedAt: new Date() },
        },
      }
    );
  } catch (err) {
    console.error("❌ Lỗi đồng bộ GHN:", err.response?.data || err.message);
  }
};

cron.schedule("*/10 * * * *", async () => {
  const orders = await orderModel.find({
    ghn_order_code: { $ne: null },
    status: { $in: [1, 2] },
  });
  for (const order of orders) {
    await syncOrderStatusFromGHN(order.ghn_order_code);
  }
});

const createVNPayRetryTxnRef = () => {
  const datePart = moment().format("YYYYMMDDHHmmss");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return datePart + randomPart;
};
const vnpayIPN = async (req, res) => {
  try {
    const vnp_Params = req.query;

    const secureHash = vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    const secretKey = process.env.VNP_HASH_SECRET;
    const querystring = require("qs");
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const checkSum = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === checkSum) {
      txnRef;
      await orderModel.updateOne(
        { _id: vnp_Params.vnp_TxnRef },
        { $set: { status: 1, status_text: "paid" } }
      );
      res.send("OK");
    } else {
      res.send("Fail checksum");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
};

const retryVNPayPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);

    if (!order) return res.status(404).send("Không tìm thấy đơn hàng!");

    if (order.payment_method !== "vnpay" || order.payment_status === "paid") {
      return res.status(400).send("Đơn hàng không thể thanh toán lại!");
    }

    // ===== DÙNG _id gốc làm TxnRef =====
    const txnRef = createVNPayRetryTxnRef();
    order.vnpay_retry_txn_ref = txnRef;

    process.env.TZ = "Asia/Ho_Chi_Minh";
    const createDate = moment().format("YYYYMMDDHHmmss");

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    const amount = order.totalPrice + order.shippingFee;

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: "Thanh toan cho ma GD:" + order._id,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Sắp xếp params
    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    const vnpUrl_final =
      vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    // Cập nhật trạng thái order
    await orderModel.updateOne(
      { _id: id },
      {
        $set: {
          payment_status: "pending_payment",
          status_text: "pending_payment",
          vnpay_retry_txn_ref: txnRef,
        },
        $push: {
          vnpay_retries: { txn_ref: txnRef },
        },
      }
    );

    res.redirect(vnpUrl_final);
  } catch (error) {
    console.error("❌ Lỗi retry thanh toán:", error);
    res.status(500).send("Lỗi khi xử lý thanh toán!");
  }
};

const vnpayPayment = async (req, res) => {
  try {
    let { amount, orderInfo } = req.body;

    amount = parseInt(amount);
    if (!amount || amount <= 0) {
      return res.status(400).send("Số tiền không hợp lệ");
    }

    const vnpAmount = amount * 100;
    orderInfo = orderInfo || "Thanh toán đơn hàng";

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    const pad = (n) => n.toString().padStart(2, "0");
    const now = new Date();
    const createDate =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const orderId = Date.now();

    let vnp_Params = {};
    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = "VND";
    vnp_Params["vnp_TxnRef"] = orderId;
    vnp_Params["vnp_OrderInfo"] = orderInfo;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = vnpAmount;
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_CreateDate"] = createDate;

    vnp_Params = sortObject(vnp_Params);

    let signData = qs.stringify(vnp_Params, { encode: false });

    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    let vnpUrl_final =
      vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    res.redirect(vnpUrl_final);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Error khi tạo thanh toán VNPAY");
  }
};

module.exports = {
  home,
  category,
  product,
  comment,
  search,
  addToCart,
  updateItemCart,
  deleteItemCart,
  cart,
  historyOrder,
  order,
  success,
  login,
  register,
  postRegister,
  postLogin,
  logout,
  cleanString,
  cancelOrder,
  updateOrderStatus,
  customerInfo,
  updateCustomerInfo,
  calculateShippingFee,
  vnpayIPN,
  vnpayPayment,
  vnpayReturn,
  calculateShippingAPI,
  retryVNPayPayment,
};
