const productModel = require("../apps/models/product");
const Training = require("../apps/models/training");

async function getBotReply(message) {
  message = message.toLowerCase().trim();

  const training = await Training.findOne({
    question: { $regex: message, $options: "i" },
  });
  if (training) return training.answer;

  let budget = null;
  const budgetRegex = /(\d+(?:[.,]?\d{3})*)\s*(triệu|tr|m|million|vnđ|vnd)?/i;
  const match = message.match(budgetRegex);
  if (match) {
    let num = parseFloat(match[1].replace(/[.,]/g, ""));
    let unit = match[2] ? match[2].toLowerCase() : "";

    if (["triệu", "tr", "m", "million"].includes(unit)) {
      num *= 1_000_000;
    }
    budget = num;
  }

  const stopWords =
    /(mua|giá|điện thoại|smartphone|cần|tư vấn|dưới|trên|khoảng)/gi;
  let keywords = message.replace(budgetRegex, "").replace(stopWords, "").trim();

  let query = { is_delete: false };
  if (budget) {
    if (/dưới|thấp hơn/i.test(message)) query.price = { $lte: budget };
    else if (/trên|cao hơn/i.test(message)) query.price = { $gte: budget };
    else query.price = { $lte: budget };
  }
  if (keywords) {
    query.name = { $regex: keywords, $options: "i" };
  }

  const products = await productModel
    .find(query)
    .sort(budget ? { price: -1 } : {})
    .limit(5);

  if (products.length === 0 && keywords) {
    const fallback = await productModel.find({
      name: { $regex: keywords, $options: "i" },
    });
    if (fallback.length > 0) {
      let reply = `
Không tìm thấy sản phẩm đúng ngân sách, nhưng có sản phẩm gợi ý:\n\n`;
      fallback.slice(0, 5).forEach((p) => {
        reply += `• ${p.name}\n  Giá: ${p.price.toLocaleString()}đ\n\n`;
      });
      return reply;
    }
  }

  if (products.length > 0) {
    let reply = budget
      ? `Với ngân sách khoảng **${budget.toLocaleString()}đ**, bạn có thể chọn:\n\n`
      : "Mình tìm thấy sản phẩm phù hợp:\n\n";

    products.forEach((p) => {
      reply +=
        `📱 *${p.name}*\n` +
        `💰 Giá: ${p.price.toLocaleString()}đ\n` +
        `📦 Trạng thái: ${p.is_stock ? "Còn hàng" : "Hết hàng"}\n`;

      if (p.promotion) reply += `🎁 KM: ${p.promotion}\n`;
      if (p.warranty) reply += `🛡️ BH: ${p.warranty}\n`;
      if (p.accessories) reply += `🔌 PK: ${p.accessories}\n`;
      if (p.is_stock) {
        reply += `
<form method="post" action="/add-to-cart" style="margin-top:6px;">
  <input type="hidden" name="id" value="${p._id}">
  <input type="hidden" name="qty" value="1">
  <button type="submit"
    style="padding:6px 10px;background:#007bff;color:#fff;border-radius:4px;border:none;font-size:14px;cursor:pointer;">
    Thêm vào giỏ
  </button>
</form>
<br/>
`;
      } else {
        reply += `<span style="color:red;font-weight:bold;">Hết hàng – không thể thêm</span><br/><br/>`;
      }
    });
    return reply;
  }

  return "Xin lỗi, bot chưa hiểu câu hỏi của bạn. Bạn có thể hỏi lại rõ hơn không?";
}

module.exports = { getBotReply };
