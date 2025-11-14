const pagination = require("../../common/pagination");
const orderModel = require("../models/order");
const moment = require("moment");
const vndPrice = require("../../lib/VnPrice");
const axios = require("axios");

const GHN_TOKEN = process.env.GHN_TOKEN;

async function getGHNOrderStatus(ghnOrderCode) {
  try {
    if (!ghnOrderCode) return null;

    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail",
      { order_code: ghnOrderCode },
      {
        headers: {
          Token: GHN_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data;
  } catch (err) {
    console.error("Lỗi lấy trạng thái GHN:", err.response?.data || err.message);
    return null;
  }
}

// Helper: Format trạng thái để hiển thị
function formatOrderStatus(order) {
  const statusText = order.status_text || order.status;

  const statusMap = {
    ready_to_pick: { text: "Chờ lấy hàng", color: "warning", canCancel: true },
    picking: { text: "Đang lấy hàng", color: "info", canCancel: false },
    delivering: { text: "Đang giao hàng", color: "primary", canCancel: false },
    delivered: {
      text: "Đã giao thành công",
      color: "success",
      canCancel: false,
    },
    cancel: { text: "Đã hủy", color: "danger", canCancel: false },
    return: { text: "Hoàn hàng", color: "warning", canCancel: false },

    0: { text: "Đã hủy", color: "danger", canCancel: false },
    1: { text: "Đã xác nhận", color: "success", canCancel: true },
    2: { text: "Đang xử lý", color: "warning", canCancel: true },
  };

  return (
    statusMap[statusText] || {
      text: "Đang xử lý",
      color: "warning",
      canCancel: true,
    }
  );
}

const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // ✅ Lấy filter từ query string
    const { payment_method, payment_status, status } = req.query;

    let query = {};

    // ✅ Filter theo phương thức thanh toán
    if (payment_method) {
      query.payment_method = payment_method;
    }

    // ✅ Filter theo trạng thái thanh toán
    if (payment_status) {
      query.payment_status = payment_status;
    }

    // ✅ Filter theo trạng thái giao hàng
    if (status) {
      query.status = Number(status);
    }

    // Đếm tổng số đơn hàng (có filter)
    const totalRows = await orderModel.countDocuments(query);
    const totalPages = Math.ceil(totalRows / limit);

    let orders = await orderModel
      .find(query)
      .populate("items.prd_id")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    orders = await Promise.all(
      orders.map(async (order) => {
        if (order.ghn_order_code) {
          const ghnStatus = await getGHNOrderStatus(order.ghn_order_code);
          if (ghnStatus) {
            order.status_text = ghnStatus.status;
            order.ghn_status_name = ghnStatus.status_name;
          }
        }

        // Tính tổng tiền
        order.total_amount = order.items
          ? order.items.reduce(
              (sum, item) =>
                sum + Number(item.prd_price || 0) * Number(item.prd_qty || 0),
              0
            )
          : 0;

        order.statusInfo = formatOrderStatus(order);

        return order;
      })
    );

    res.render("admin/orders/order", {
      orders,
      page,
      totalPages,
      pages: pagination(page, limit, totalRows),
      totalOrders: totalRows,
      moment,
      vndPrice,
      filter: { payment_method, payment_status, status },
    });
  } catch (err) {
    console.error("Lỗi admin orders:", err);
    res.render("admin/orders/order", {
      orders: [],
      page: 1,
      totalPages: 1,
      pages: [],
      totalOrders: 0,
      moment,
      vndPrice,
      filter: {},
    });
  }
};

const detail = async (req, res) => {
  try {
    const id = req.params.id;
    let order = await orderModel.findById(id).lean();

    if (!order) {
      return res.redirect("/admin/orders");
    }

    // Lấy thông tin từ GHN
    if (order.ghn_order_code) {
      const ghnStatus = await getGHNOrderStatus(order.ghn_order_code);
      if (ghnStatus) {
        order.status_text = ghnStatus.status; // ready_to_pick, picking, delivering, delivered...
        order.ghn_status_name = ghnStatus.status_name;

        // Cập nhật lại DB
        await orderModel.updateOne(
          { _id: order._id },
          {
            $set: { status_text: ghnStatus.status },
            $push: {
              status_history: {
                status: ghnStatus.status,
                updatedAt: new Date(),
              },
            },
          }
        );
      }
    }

    // Format items
    if (order.items && order.items.length > 0) {
      order.items = order.items.map((item) => ({
        name: item.prd_name,
        price: Number(item.prd_price) || 0,
        quantity: Number(item.prd_qty) || 0,
        thumbnail: item.prd_thumbnail || "no-img.jpg",
      }));
    }

    // Tính tổng tiền
    order.total_amount = order.items
      ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      : 0;

    order.statusInfo = formatOrderStatus(order);

    // ✅ Kiểm tra có thể hủy đơn không
    // Chỉ cho phép hủy nếu: status = 2 và payment_status = unpaid
    order.canCancel =
      (order.status === 2 || order.status === 3) &&
      order.payment_status === "unpaid";
    res.render("admin/orders/orderDetail", {
      order,
      moment,
      vndPrice,
    });
  } catch (err) {
    console.error("Lỗi chi tiết đơn hàng:", err);
    res.redirect("/admin/orders");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);

    if (!order) {
      return res.status(404).send("Không tìm thấy đơn hàng");
    }

    if (![2, 3].includes(order.status)) {
      return res
        .status(400)
        .send("Không thể hủy đơn hàng đã xử lý hoặc hoàn tất");
    }

    // ✅ Không cho phép hủy đơn đã thanh toán VNPay
    if (order.payment_status === "paid" && order.payment_method === "vnpay") {
      return res
        .status(400)
        .send(
          "Không thể hủy đơn hàng đã thanh toán VNPay. Vui lòng liên hệ khách hàng để hoàn tiền."
        );
    }

    // Hủy đơn trên GHN nếu có
    if (order.ghn_order_code) {
      try {
        await axios.post(
          "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel",
          { order_codes: [order.ghn_order_code] },
          {
            headers: {
              Token: GHN_TOKEN,
              "Content-Type": "application/json",
              ShopId: "198093",
            },
          }
        );
      } catch (ghnErr) {
        console.error("Lỗi hủy đơn GHN:", ghnErr.response?.data);
      }
    }

    // Cập nhật trạng thái đơn hàng
    await orderModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 0,
          status_text: "cancel",
        },
        $push: {
          status_history: {
            status: "cancel",
            updatedAt: new Date(),
          },
        },
      }
    );

    res.redirect("/admin/orders");
  } catch (err) {
    console.error("Lỗi hủy đơn:", err);
    res.status(500).send("Không thể hủy đơn hàng");
  }
};

// Function approve order + tạo đơn GHN
const approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);

    if (!order) {
      return res.status(404).send("Không tìm thấy đơn hàng!");
    }

    // Nếu chưa có GHN order code → tạo đơn GHN
    if (!order.ghn_order_code) {
      const ghnPayload = {
        payment_type_id: order.payment_method === "cod" ? 2 : 1, // 2 = COD, 1 = prepay
        note: "Đơn hàng từ admin",
        required_note: "KHONGCHOXEMHANG",
        client_order_code: `ORD-${order._id}`,
        to_name: order.name,
        to_phone: order.phone,
        to_address: order.address,
        to_ward_code: order.wardCode,
        to_district_id: order.districtId,
        cod_amount: order.totalPrice,
        content: order.items
          .map((item) => `${item.prd_name} x ${item.prd_qty}`)
          .join(", "),
      };

      const ghnRes = await axios.post(
        "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create",
        ghnPayload,
        {
          headers: {
            Token: GHN_TOKEN,
            "Content-Type": "application/json",
            ShopId: SHOP_ID,
          },
        }
      );

      if (ghnRes.data.code === 200) {
        const ghnOrderCode = ghnRes.data.data.order_code;
        order.ghn_order_code = ghnOrderCode;
      } else {
        console.error("❌ Lỗi tạo đơn GHN:", ghnRes.data.message);
      }
    }

    // Cập nhật trạng thái đơn hàng
    await orderModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 1,
          status_text: "confirmed",
          ghn_order_code: order.ghn_order_code,
        },
        $push: {
          status_history: { status: "confirmed", updatedAt: new Date() },
        },
      }
    );

    res.redirect("/admin/orders");
  } catch (error) {
    console.error("❌ Lỗi khi duyệt đơn hàng:", error);
    res.status(500).send("Không thể duyệt đơn hàng!");
  }
};

// ✅ Thêm function cập nhật trạng thái thanh toán COD
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const order = await orderModel.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // Chỉ cho phép cập nhật trạng thái thanh toán COD
    if (order.payment_method !== "cod") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể cập nhật trạng thái thanh toán cho đơn COD",
      });
    }

    await orderModel.updateOne(
      { _id: id },
      {
        $set: {
          payment_status: payment_status,
          ...(payment_status === "paid" && { vnpay_paid_at: new Date() }),
        },
      }
    );

    res.json({ success: true, message: "Đã cập nhật trạng thái thanh toán" });
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái thanh toán:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  index,
  detail,
  cancelOrder,
  approveOrder,
  updatePaymentStatus, // ✅ Export thêm function này
};
